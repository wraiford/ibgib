import { getIbGibAddr, clone, getUUID, getTimestamp } from '../../helper';
import { sha256v1 } from '../sha256v1';
import { IbGib_V1, IbGibData_V1, IbGibRel8ns_V1, Rel8n } from '../types';
import { TransformOpts_Fork, TransformResult } from '../../types';
import { IBGIB_DELIMITER, ROOT_ADDR } from '../constants';
import { buildDna } from './transform-helper';

/**
 * Original-ish V1 transform behavior.
 * Going to create an ibGib containing the fork data.
 * Apply that fork and create a resulting ibGib.
 *
 * Takes the src ibGib, clears its past and adds a link to
 * the src via the 'ancestor' rel8n.
 *
 * NOTE:
 *   This is NOT going to do the plan^gib stuff ATM.
 *   Also this does NOT add any identity information ATM.
 */
export async function fork(opts: TransformOpts_Fork<IbGib_V1>): Promise<TransformResult<IbGib_V1>> {
    const {
        noTimestamp, dna, src,
        linkedRel8ns,
        destIb, uuid, tpj,
        cloneRel8ns, cloneData,
        type = 'fork'
    } = opts;
    const lc = '[fork_v1]';
    // #region validation
    if (type !== 'fork') { throw new Error(`${lc} not a fork transform.`); }
    if (!opts.type) { opts.type = 'fork' }

    if (!src) { throw new Error(`${lc} src required to fork.`); }
    if (!src!.ib) { throw new Error(`${lc} src.ib required.`); }
    // destIb is not required, as it just reuses src.ib
    if (destIb && destIb.includes(IBGIB_DELIMITER)) {
        throw new Error(`${lc} destIb can't contain (hardcoded) delimiter right now.`);
    }

    // #endregion

    const srcAddr = getIbGibAddr({ ib: src!.ib, gib: src.gib });
    const srcIsRoot = srcAddr === ROOT_ADDR;
    opts.srcAddr = srcAddr;

    const rel8ns: IbGibRel8ns_V1 =
        cloneRel8ns && src.rel8ns && Object.keys(src.rel8ns).length > 0 ?
        clone(src.rel8ns) :
        {};
    const data: any = cloneData && src?.data ? clone(src!.data) : {};
    const ancestor = linkedRel8ns?.includes(Rel8n.ancestor) ?
        [srcAddr] :
        (rel8ns.ancestor || []).concat([srcAddr]);
    rel8ns.ancestor = ancestor;

    const newIbGib = <IbGib_V1<IbGibData_V1>>clone(src);
    if (noTimestamp && tpj?.timestamp) {
        throw new Error(`${lc} both noTimestamp and tpj.timestamp selected.`);
    }
    if (!noTimestamp || tpj?.timestamp) { data.timestamp = getTimestamp(); }
    if (tpj?.uuid || uuid) { data.uuid = await getUUID(); }

    newIbGib.ib = destIb || 'ib';
    // rel8ns ignored if forking from the root ib^gib
    if (srcAddr !== ROOT_ADDR) { newIbGib.rel8ns = rel8ns; }
    if (Object.keys(data).length > 0) { newIbGib.data = data; }

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
    if (transformDna) { result.dnas = [transformDna!] }
    return result;
}
