import { getIbGibAddr, clone, getTimestamp } from '../../helper';
import { sha256v1 } from '../sha256v1';
import { IbGib_V1, IbGibData_V1, IbGibRel8ns_V1, Rel8n } from '../types';
import { TransformOpts_Mut8, TransformResult } from '../../types';
import { IBGIB_DELIMITER, GIB } from '../constants';
import { buildDna, isPrimitive } from './transform-helper';

/**
 * Original-ish V1 transform behavior.
 * Going to create a new ibGib which mut8s internal data (or the ib) from the src ibgib.
 *
 * Takes the immutable src ibGib record, applies a mutation to its internal (intrinsic)
 * `data` field, creates a new ibGib with the new intrinsic data.
 *
 * ### remember, ibgib basic structure
 *
 * Remember, the ibGib has the following basic structure (here represented in JSON):
 * {
 *   ib: 'some ib, can be a simple name, or other metadata, up to very complex metadata.',
 *   gib: 'ABC123', // hash of the other three fields of our JSON data structure
 *   rel8ns: {
 *      'link name': [ 'other ibgib^ABC345', 'yo^456789' ],
 *      'called an edge in other jargon': [ 'ib^gib' ],
 *      'past': ['ib^gib']
 *      ...
 *   },
 *   data: {
 *     'intrinsic data': 'intrinsic value',
 *     'copied each datum': 'so should be relatively small in practice',
 *     'can...': {
 *       '...also be objects if you really': ['want']
 *      }
 *   }
 * }
 *
 * So this transform is primarily concerned with that `data` property (though we can mut8 the ib also).
 * If it's really anything complex, most likely it would be better to do
 * another ibGib and link to it via the `rel8ns` (in the same way that in OOP it
 * is good to have single responsibility for class architecture).
 *
 * ### what we can do with mutations
 *
 * We can mutate the `ib` value. So if we need to change metadata (e.g. a 'rename'), we can.
 * This has implications for updating pointer refs and the tpj, but that's more advanced.
 *
 * We can also mutate the intrinsic `data` property, which is basically a JS object style of
 * key/value store.
 *
 * ### notes
 *   * This is NOT going to do the plan^gib stuff ATM.
 *   * This does NOT add any identity information ATM.
 *
 */
export async function mut8<TNewData = any>(
    opts: TransformOpts_Mut8<IbGib_V1, TNewData>
): Promise<TransformResult<IbGib_V1>> {
    const {
        noTimestamp, dna, src, linkedRel8ns,
        dataToRename, dataToRemove, dataToAddOrPatch,
        mut8Ib,
        type = 'mut8'
    } = opts;
    const lc = '[mut8_v1]';
    // #region validation

    if (type !== 'mut8') { throw new Error(`${lc} not a mut8 transform.`); }
    if (!opts.type) { opts.type = 'mut8' }

    if (!src) { throw new Error(`${lc} src required to mut8.`); }
    if (!src!.ib) { throw new Error(`${lc} src.ib required.`); }
    if (src!.ib!.includes(IBGIB_DELIMITER)) {
        throw new Error(`${lc} ib can't contain hardcoded delimiter (${IBGIB_DELIMITER}) right now.`);
    }

    if (!mut8Ib && !dataToRename && !dataToRemove && !dataToAddOrPatch) {
        throw new Error(`${lc} gotta provide either a mut8Ib or some data to change.`);
    }

    const srcAddr = getIbGibAddr({ ib: src!.ib, gib: src.gib });
    if (opts.srcAddr && srcAddr !== opts.srcAddr) { throw new Error(`${lc} srcAddr from src does not equal opts.srcAddr`); }
    opts.srcAddr = srcAddr;

    // const srcIsPrimitive = src.gib === GIB || !src.gib;
    // if (srcIsPrimitive) { throw new Error(`${lc} cannot mutate primitive ibgib`); }
    if (isPrimitive({ibGib: src})) { throw new Error(`${lc} cannot mutate primitive ibgib`); }

    // #endregion

    const newIbGib = <IbGib_V1<IbGibData_V1>>clone(src);

    const srcRel8ns = src.rel8ns ? src.rel8ns : {};
    const rel8ns: IbGibRel8ns_V1 = clone(srcRel8ns);
    rel8ns.past = linkedRel8ns?.includes(Rel8n.past) ?
        [srcAddr] :
        (rel8ns.past || []).concat([srcAddr]);

    let data: any = src?.data ? clone(src!.data) : {};
    if (dataToRename) { data = renameOrRemove(data, dataToRename, 'rename'); }
    if (dataToRemove) { data = renameOrRemove(data, dataToRemove, 'remove'); }
    if (dataToAddOrPatch) { data = patch(data, dataToAddOrPatch); }
    if (!noTimestamp) { data.timestamp = getTimestamp(); }

    newIbGib.ib = mut8Ib ? mut8Ib : newIbGib.ib;
    newIbGib.rel8ns = rel8ns;
    if (Object.keys(data).length > 0) {
        newIbGib.data = data;
    } else {
        // we've removed the last key in the data object so delete it
        delete newIbGib.data;
    }
    newIbGib.gib = await sha256v1(newIbGib, '');

    let transformDna: IbGib_V1 | null = null;
    if (dna) {
        transformDna = await buildDna(opts);
        const dnaAddr = getIbGibAddr({ ibGib: transformDna });
        rel8ns.dna = linkedRel8ns?.includes(Rel8n.dna) ?
            rel8ns.dna = [dnaAddr] :
            rel8ns.dna = (rel8ns.dna || []).concat(dnaAddr);
    }

    const result: TransformResult<IbGib_V1> = { newIbGib };
    if (transformDna) { result.dnas = [transformDna]; }

    return result;
}

function renameOrRemove(obj: any, info: any, which: 'rename' | 'remove'): any {
    const lc = `[renameOrRemove]`;
    const FORBIDDEN_RENAME_REMOVE_KEYS = ['timestamp'];
    Object.keys(info).forEach(key => {
        if (FORBIDDEN_RENAME_REMOVE_KEYS.includes(key)) {
            throw new Error(`${lc} Cannot rename to ${key}.`);
        }
        if (Object.keys(obj).includes(key)) {
            let infoVal = info[key];
            if (typeof (infoVal) === 'string') {
                // rename
                if (FORBIDDEN_RENAME_REMOVE_KEYS.includes(infoVal)) {
                    throw new Error(`${lc} Cannot rename to ${infoVal}.`);
                }
                if (which === 'rename') {
                    obj[infoVal] = obj[key];
                }
                delete obj[key];
            }
            else {
                // recurse
                obj[key] = renameOrRemove(obj[key], infoVal, which);
            }
        }
        else {
            console.log(`${lc} key to ${which} does not exist`);
        }
    });
    return obj;
};

/**
 * Patches obj (active mutate, does not copy) with patchObj data. Special keys
 * can rename/remove keys, otherwise is an additive patch.
 *
 * @param obj source obj to patch, possibly is a subobject in a recursive call
 * @param patchInfo data to patch into obj, possibly containing nested objects
 */
function patch(obj: any, patchInfo: any): any {
    Object.keys(patchInfo).forEach(patchKey => {
        // grab the patchVal before updating patchKey
        let patchVal = patchInfo[patchKey];
        let objVal = obj[patchKey];
        if (objVal) {
            if (Array.isArray(patchVal) || Array.isArray(objVal)) {
                // both are arrays, so full replace
                obj[patchKey] = patchVal;
            }
            else if (typeof (patchVal) === 'object' && typeof (objVal) === 'object') {
                // {a: {b: 2}}, {a: {b: 3, c: 4}}
                // patchKey = 'a';
                // patchVal = {b: 3, c: 4}
                // objVal = {b: 2}
                // recurse
                obj[patchKey] = patch(objVal, patchVal);
            }
            else {
                // not both objects, so full replace
                obj[patchKey] = patchVal;
            }
        }
        else {
            // does not exist yet, so set new
            obj[patchKey] = patchVal;
        }
    });
    return obj;
};
