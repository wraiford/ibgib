import { getIbGibAddr, clone, getTimestamp } from '../../helper';
import { sha256v1 } from '../sha256v1';
import { IbGib_V1, IbGibData_V1, IbGibRel8ns_V1, Rel8n } from '../types';
import { TransformOpts_Rel8, TransformResult, IbGibAddr } from '../../types';
import { IBGIB_DELIMITER, GIB, FORBIDDEN_RENAME_REMOVE_REL8N_NAMES } from '../constants';
import { buildDna, isPrimitive } from './transform-helper';
/**
 * Original-ish V1 transform behavior.
 *
 * NOTE:
 *   This is NOT going to do the plan^gib stuff ATM.
 *   Also this does NOT add any identity information ATM.
 */
/**
 * Relate (and/or unrelate) other ibGib(s), thus mutating it **extrinsically**.
 */
export async function rel8(
    opts: TransformOpts_Rel8<IbGib_V1>
): Promise<TransformResult<IbGib_V1>> {
    const {
        noTimestamp, dna, src, linkedRel8ns,
        rel8nsToAddByAddr, rel8nsToRemoveByAddr,
        type = 'rel8'
    } = opts;
    const lc = '[rel8_v1]';
    if (type !== 'rel8') { throw new Error(`${lc} not a rel8 transform.`); }
    if (!opts.type) { opts.type = 'rel8' }

    // #region validation

    if (type !== 'rel8') { throw new Error(`${lc} not a rel8 transform.`); }
    if (!opts.type) { opts.type = 'rel8' }

    if (!src) { throw new Error(`${lc} src required.`); }
    if (!src!.ib) { throw new Error(`${lc} src.ib required.`); }
    if (src!.ib!.includes(IBGIB_DELIMITER)) {
        throw new Error(`${lc} ib can't contain hardcoded delimiter (${IBGIB_DELIMITER}) right now.`);
    }

    // if (!src.gib || src.gib === GIB) { throw new Error(`${lc} cannot relate to primitive ibGib.`); }
    if (isPrimitive({ibGib: src})) { throw new Error(`${lc} cannot relate/unrelate primitive ibgib`); }

    // if neither add nor remove specified, what are we even doing?
    const isAdding = rel8nsToAddByAddr && Object.keys(rel8nsToAddByAddr!).length > 0;
    const isRemoving = rel8nsToRemoveByAddr && Object.keys(rel8nsToRemoveByAddr!).length > 0;
    if (!(isAdding || isRemoving)) {
        throw new Error(`${lc} gotta provide relations to either add or remove.`);
    }

    const srcAddr = getIbGibAddr({ ib: src.ib, gib: src.gib });
    if (opts.srcAddr && srcAddr !== opts.srcAddr) { throw new Error(`${lc} srcAddr from src does not equal opts.srcAddr`); }
    opts.srcAddr = srcAddr;

    // validate all ibgib addresses to add/remove
    const fnValidIbGibAddr = (s: string) => {
        // for now, only requiring a single character and trailing delim.
        // i.e. primitive with implied 'gib'
        return s && typeof (s) === 'string' && s.length >= 2 &&
            s.includes('^') && s.split('^')[0].length >= 1;
    };
    Object.keys(rel8nsToAddByAddr || {})
        .map(x => (rel8nsToAddByAddr || {})[x])
        .forEach(rel8ds => {
            if (!(rel8ds && rel8ds.every(rel8d => fnValidIbGibAddr(rel8d)))) {
                throw new Error(`${lc} Invalid rel8n attempt. Must be valid ibGibs. Did you include a delimiter (^)?`);
            }
        });
    Object.keys(rel8nsToRemoveByAddr || {})
        .map(x => (rel8nsToRemoveByAddr || {})[x])
        .forEach(rel8ds => {
            if (!(rel8ds && rel8ds.every(rel8d => fnValidIbGibAddr(rel8d)))) {
                throw new Error(`${lc} Invalid remove rel8n attempt. Must be valid ibGibs. Did you include a delimiter (^)?`);
            }
        });

    // #endregion validation

    const newIbGib = <IbGib_V1<IbGibData_V1>>clone(src);

    const data: any = clone(src.data || {});

    if (!noTimestamp) { data.timestamp = getTimestamp(); }

    const rel8ns: IbGibRel8ns_V1 = clone(src.rel8ns || {});
    rel8ns.past = linkedRel8ns?.includes(Rel8n.past) ?
        [srcAddr] :
        (rel8ns.past || []).concat([srcAddr]);
    Object.keys(rel8nsToAddByAddr || {}).forEach(rel8nName => {
        if (FORBIDDEN_RENAME_REMOVE_REL8N_NAMES.includes(rel8nName)) {
            throw new Error(`${lc} Cannot manually add relationship: ${rel8nName}.`);
        }
        const existingRel8d = rel8ns[rel8nName] || [];
        const toAddRel8d = rel8nsToAddByAddr![rel8nName];
        const newRel8d = toAddRel8d!.filter(x => !existingRel8d.includes(x));
        rel8ns[rel8nName] = existingRel8d.concat(newRel8d);
    });
    Object.keys(rel8nsToRemoveByAddr || {}).forEach(rel8nName => {
        if (FORBIDDEN_RENAME_REMOVE_REL8N_NAMES.includes(rel8nName)) {
            throw new Error(`${lc} Cannot manually remove relationship: ${rel8nName}.`);
        }
        const existingRel8d = rel8ns[rel8nName] || [];
        const toRemoveRel8d = rel8nsToRemoveByAddr![rel8nName] || [];
        const prunedRel8d = existingRel8d.filter((x: IbGibAddr) => !toRemoveRel8d!.includes(x));
        if (prunedRel8d.length > 0) {
            rel8ns[rel8nName] = prunedRel8d;
        }
        else {
            delete rel8ns[rel8nName];
        }
    });

    newIbGib.rel8ns = rel8ns;
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
