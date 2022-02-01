import {
    IbGibAddr, TransformResult, V1,
} from 'ts-gib';
import {
    GIB, IbGib_V1, Rel8n,
    Factory_V1 as factory,
} from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import { IbGibSpaceAny } from '../spaces/space-base-v1';
import * as c from '../constants';
import {
    GetIbGibOpts, GetIbGibResult,
    PutIbGibOpts, PutIbGibResult,
    DeleteIbGibOpts, DeleteIbGibResult,
} from '../types/legacy';
import {
    getRootIb,
    getSpecialConfigKey, getSpecialIbgibIb, tagTextToIb,
} from '../helper';
import { LatestEventInfo, RootData, SpecialIbGibType, TagData, } from '../types';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;


/**
 * Two spaces can be equivalent if they point to the same area.
 *
 * @returns true if the "same" space
 */
export function isSameSpace({
    a,
    b,
    mustHaveSameData,
}: {
    a: IbGibSpaceAny,
    b: IbGibSpaceAny,
    /**
     * If true, then only same exact internal data will do.
     * Be careful if they have last modified timestamps.
     */
    mustHaveSameData?: boolean,
}): boolean {
    const lc = `[${isSameSpace.name}]`;

    if (!a) { throw new Error(`${lc} a is falsy`)};
    if (!b) { throw new Error(`${lc} b is falsy`)};

    // try by data
    if (a.data && JSON.stringify(a.data) === JSON.stringify(b.data)) {
        return true;
    } else if (mustHaveSameData) {
        return false;
    }

    // try by uuid
    if (a.data?.uuid && b.data?.uuid) { return a.data!.uuid === b.data!.uuid; }

    // try by tjp
    if (a.rel8ns?.tjp?.length === 1 && b.rel8ns?.tjp?.length === 1) {
        return a.rel8ns.tjp[0] === b.rel8ns.tjp[0];
    }

    // try by gib (last resort), can't both be falsy or primitive (maybe overkill)
    if (!a.gib && !b.gib) {
        throw new Error(`${lc} Invalid spaces. both a.gib and b.gib are falsy, neither has uuid and neither has tjp.`);
    }
    if (a.gib === GIB && b.gib === GIB) { throw new Error(`${lc} both a and b are primitives`); }
    return a.gib === b.gib;
}

/**
 * wrapper for dealing with a space.
 *
 * @returns legacy `GetIbGibResult`
 */
export async function getFromSpace({
    addr,
    isMeta,
    isDna,
    space,
}: GetIbGibOpts): Promise<GetIbGibResult> {
    let lc = `[${getFromSpace.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 4d188d6c863246f28aa575753a052304)`); }
        if (!addr) { throw new Error(`addr required`); }
        lc = `${lc}(${addr})`;
        if (logalot) { console.log(`${lc} starting...`); }

        const argGet = await space.argy({
            ibMetadata: space.getSpaceArgMetadata(),
            argData: {
                cmd: 'get',
                ibGibAddrs: [addr],
                isMeta,
                isDna,
            },
        });
        const result = await space.witness(argGet);
        if (result?.data?.success) {
            if (logalot) { console.log(`${lc} got.`) }
            return {
                success: true,
                ibGibs: result.ibGibs,
            }
        } else {
            if (logalot) { console.log(`${lc} didn't get.`) }
            return {
                success: false,
                errorMsg: result.data?.errors?.join('|') || `${lc} something went wrong`,
            }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return { errorMsg: error.message, }
    }
}

/**
 * Wrapper for saving ibgib in a given space.
 *
 * ## warnings
 *
 * The given space doesn't have to work this way.
 * This is a convenience for me ATOW.
 */
export async function putInSpace({
    ibGib,
    ibGibs,
    isMeta,
    isDna,
    force,
    space,
}: PutIbGibOpts): Promise<PutIbGibResult> {
    const lc = `[${putInSpace.name}]`;
    try {
        if (!ibGib && (ibGibs ?? []).length === 0) { throw new Error(`ibGib or ibGibs required. (E: e59c4de3695f4dd28c8fe82dbb9c4e90)`); }
        if (!space) { throw new Error(`space required. (E: dd0b7189c67c43c586b905a8ed6f51c9)`); }

        if (ibGib && (ibGibs ?? []).length > 0) {
            console.warn(`${lc} Both ibGib and ibGibs is assigned, whereas this is intended to be exclusive one or the other. (W: 4c797835b620445f88e4cba6b5aa3460)`)
            if (!ibGibs.some(x => x.gib === ibGib.gib)) {
                ibGibs = ibGibs.concat([ibGib]);
            }
        }
        ibGibs = ibGibs ?? [ibGib];

        if (logalot) { console.log(`${lc} ibGibs.length: ${ibGibs.length}`)}
        const argPutIbGibs = await space.argy({
            ibMetadata: space.getSpaceArgMetadata(),
            argData: { cmd: 'put', isMeta, force, isDna, },
            ibGibs,
        });
        const resPutIbGibs = await space.witness(argPutIbGibs);
        if (resPutIbGibs.data?.success) {
            if ((resPutIbGibs.data!.warnings ?? []).length > 0) {
                resPutIbGibs.data!.warnings!.forEach((warning: string) => console.warn(`${lc} ${warning}`));
            }
            return { success: true }
        } else {
            const errorMsg = resPutIbGibs?.data?.errors?.length > 0 ?
                resPutIbGibs.data.errors.join('\n') :
                '(UNEXPECTED) unknown error putting ibGibs (E: 3d7426d4527243b79c5e55eb25f3fa73)';
            throw new Error(errorMsg);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return { errorMsg: error.message, }
    }
}

  /**
   * Wrapper for removing ibgib from the a given space, else the current space.
   */
export async function deleteFromSpace({
    addr,
    isMeta,
    isDna,
    space,
}: DeleteIbGibOpts): Promise<DeleteIbGibResult> {
    const lc = `[${deleteFromSpace.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 40ab3b51e91c4b5eb4f215baeefbcef0)`); }

        const argDel = await space.argy({
            ibMetadata: space.getSpaceArgMetadata(),
            argData: {
                cmd: 'delete',
                ibGibAddrs: [addr],
                isMeta,
                isDna,
            },
        });
        const result = await space.witness(argDel);
        if (result.data?.success) {
            return { success: true, }
        } else {
            if (result.data?.warnings?.length > 0) {
                console.warn(`${lc} warnings with delete (${addr}): ${result.data!.warnings!.join('|')}`);
            }
            if (result.data?.addrs?.length > 0) {
                console.warn(`${lc} partial addrs deleted: ${result.data!.addrs!.join('|')}`);
            }
            return {
                errorMsg: result.data?.errors?.join('|') || `${lc} something went wrong`,
            }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return { errorMsg: error.message };
    }
}

/**
 * Gets all dependency ibgibs from graph.
 *
 * ## notes
 *
 * This function recursively calls itself until `gotten` is fully populated with
 * results and then returns `gotten`.
 *
 * @returns entire dependency graph of given ibGib OR ibGib address.
 */
export async function getDependencyGraph({
    ibGib,
    ibGibAddr,
    gotten,
    skipRel8nNames,
    space,
}: {
    /**
     * source ibGib to grab dependencies of.
     *
     * caller must provide this or `ibGibAddr`
     */
    ibGib?: IbGib_V1,
    /**
     * source ibGib address to grab dependencies of.
     *
     * caller must provide this or `ibGib`
     */
    ibGibAddr?: IbGibAddr,
    /**
     * object that will be populated through recursive calls to this function.
     *
     * First caller of this function should not provide this and I'm not atow
     * coding a separate implementation function to ensure this.
     */
    gotten?: { [addr: string]: IbGib_V1 },
    /**
     * Skip these particular rel8n names.
     *
     * ## driving intent
     *
     * I'm adding this to be able to skip getting dna ibgibs.
     */
    skipRel8nNames?: string[],
    space: IbGibSpaceAny,
}): Promise<{ [addr: string]: IbGib_V1 }> {
    const lc = `[${getDependencyGraph.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 9f38166ab70340cb919174f8d26af909)`); }
        if (!ibGib && !ibGibAddr) { throw new Error(`either ibGib or ibGibAddr required. (E: b6d08699651f455697f0d05a41edb039)`); }

        skipRel8nNames = skipRel8nNames || [];

        if (!ibGib) {
            const resGet = await getFromSpace({addr: ibGibAddr, space});
            if (resGet.success && resGet.ibGibs?.length === 1) {
                ibGib = resGet.ibGibs![0];
            } else {
                throw new Error(`Could not retrieve ibGib. (E: 410213e9c6ee4b009c2df8e1eba804c4)`);
            }
        }
        const { gib } = h.getIbAndGib({ibGib});
        if (gib === GIB) { throw new Error(`cannot get dependency graph of primitive.`); }

        ibGibAddr = h.getIbGibAddr({ibGib});

        // hack: todo: needs major optimization
        gotten = gotten || {};

        if (!Object.keys(gotten).includes(ibGibAddr)) { gotten[ibGibAddr] = ibGib; }

        const rel8ns = ibGib.rel8ns || {};
        const rel8nNames = (Object.keys(rel8ns) || []).filter(x => !skipRel8nNames.includes(x));
        for (let i = 0; i < rel8nNames.length; i++) {
            const rel8nName = rel8nNames[i];
            const rel8dAddrs = rel8ns[rel8nName];
            const rel8dAddrsNotGottenYet =
                rel8dAddrs
                .filter(addr => !Object.keys(gotten).includes(addr))
                .filter(addr => h.getIbAndGib({ibGibAddr: addr}).gib !== GIB);
            for (let j = 0; j < rel8dAddrsNotGottenYet.length; j++) {
                const rel8dAddr = rel8dAddrsNotGottenYet[j];
                const resGet = await getFromSpace({addr: rel8dAddr, space});
                if (resGet.success && resGet.ibGibs?.length === 1) {
                    gotten = await getDependencyGraph({ibGib: resGet.ibGibs[0], gotten, space}); // recursive
                } else {
                    throw new Error(`failure getting rel8dAddr: ${rel8dAddr}`);
                }
            }
        }

        return gotten;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Convenience function for persisting a transform result, which has
 * a newIbGib and optionally intermediate ibGibs and/or dnas.
 *
 * it persists these ibgibs into the given space, else the current space.
 */
export async function persistTransformResult({
    resTransform,
    space,
    isMeta,
    force,
}: {
    resTransform: TransformResult<IbGib_V1>,
    space: IbGibSpaceAny,
    isMeta?: boolean,
    force?: boolean,
}): Promise<void> {
    const lc = `[${persistTransformResult.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: cf94f1d74f1c4561bb88025a2095965b)`); }

        const { newIbGib, intermediateIbGibs, dnas } = resTransform;
        const ibGibs = [newIbGib, ...(intermediateIbGibs || [])];
        const argPutIbGibs = await space.argy({
            ibMetadata: space.getSpaceArgMetadata(),
            argData: { cmd: 'put', isMeta, force },
            ibGibs: ibGibs.concat(),
        });
        const resPutIbGibs = await space.witness(argPutIbGibs);
        if (resPutIbGibs.data?.success) {
            if (resPutIbGibs.data!.warnings?.length > 0) {
                resPutIbGibs.data!.warnings!.forEach((warning: string) => console.warn(`${lc} ${warning}`));
            }
        } else {
            const errorMsg = resPutIbGibs?.data?.errors?.length > 0 ?
                resPutIbGibs.data.errors.join('\n') :
                'unknown error putting ibGibs';
            throw new Error(errorMsg);
        }

        if (dnas?.length > 0) {
            const argPutDnas = await space.argy({
                ibMetadata: space.getSpaceArgMetadata(),
                argData: { cmd: 'put', isDna: true, force },
                ibGibs: dnas.concat(),
            });
            const resPutDnas = await space.witness(argPutDnas);
            if (resPutDnas.data?.success) {
                if (resPutDnas.data!.warnings?.length > 0) {
                    resPutDnas.data!.warnings!.forEach((warning: string) => console.warn(`${lc} ${warning}`));
                }
            } else {
                const errorMsg = resPutDnas?.data?.errors?.length > 0 ?
                resPutDnas.data.errors.join('\n') :
                'unknown error putting dna ibGibs';
                throw new Error(errorMsg);
            }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function getSyncSpaces({
    space,
}: {
    space: IbGibSpaceAny,
}): Promise<IbGibSpaceAny[]> {
    const lc = `[${getSyncSpaces.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: c03f80eca6b045b9a73b0aafa44cdf26)`); }
        let syncSpaces = await getSpecialRel8dIbGibs<IbGibSpaceAny>({
            type: "outerspaces",
            rel8nName: c.SYNC_SPACE_REL8N_NAME,
            space,
        });
        return syncSpaces;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function getSpecialRel8dIbGibs<TIbGib extends IbGib_V1 = IbGib_V1>({
    type,
    rel8nName,
    space,
}: {
    type: SpecialIbGibType,
    rel8nName: string,
    space: IbGibSpaceAny,
}): Promise<TIbGib[]> {
    const lc = `[${getSpecialRel8dIbGibs.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: f73868a952ac4181a4f90ee6d86cacf3)`); }

        let special = await getSpecialIbgib({type, space});
        if (!special) { throw new Error(`couldn't get special (${type})`) };
        const rel8dAddrs = special.rel8ns[rel8nName] || [];
        const rel8dIbgibs = [];
        for (let i = 0; i < rel8dAddrs.length; i++) {
            const addr = rel8dAddrs[i];
            let resGet = await getFromSpace({addr, space});
            if (resGet.success && resGet.ibGibs?.length === 1) {
                rel8dIbgibs.push(resGet.ibGibs[0]);
            } else {
                throw new Error(`couldn't get addr: ${addr}`);
            }
        }
        return rel8dIbgibs;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Gets one of the app's special ibGibs, e.g., TagsIbGib.
 *
 * When initializing tags, this will generate some boilerplate tags.
 * I'm going to be doing roots here also, and who knows what else, but each
 * one will have its own initialize specifics.
 *
 * @param initialize initialize (i.e. create) ONLY IF IbGib not found. Used for initializing app (first run).
 *
 * @see {@link createSpecial}
 * @see {@link createTags}
 */
export async function getSpecialIbgib({
    type,
    initialize,
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
    fnGetInitializing,
    fnSetInitializing,
}: {
    type: SpecialIbGibType,
    initialize?: boolean,
    space: IbGibSpaceAny,
    /**
     * Only required if `initialize` is true.
     */
    defaultSpace?: IbGibSpaceAny,
    /**
     * Only required if `initialize` is true.
     */
    fnUpdateBootstrap?: (newSpaceAddr: IbGibAddr) => Promise<void>,
    /**
     * Only required if `initialize` is true.
     */
    fnBroadcast?: (info: LatestEventInfo) => void,
    /**
     * Initialization lock getter function.
     */
    fnGetInitializing?: () => boolean,
    /**
     * Initialization lock setter function.
     *
     * Because we don't want to initialize while we're initializing.
     */
    fnSetInitializing?: (x: boolean) => void,
}): Promise<IbGib_V1 | null> {
    const lc = `[${getSpecialIbgib.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: d454b31d58764a9bb9c4e47fb5ef38b5)`); }

        let key = getSpecialConfigKey({type});
        let addr = await getConfigAddr({key, space});

        if (!addr) {
            if (initialize && !(fnGetInitializing || fnSetInitializing)) { throw new Error(`if initialize, you must provide fnGetInitializeLock & fnSetInitializeLock. (E: 8eb322625d0c4538be089800882487de)`); }
            if (initialize && !fnGetInitializing()) {
                // this._initializing = true;
                fnSetInitializing(true);
                try {
                    addr = await createSpecial({type, space, defaultSpace, fnBroadcast, fnUpdateBootstrap});
                } catch (error) {
                    console.error(`${lc} error initializing: ${error.message}`);
                } finally {
                    // this._initializing = false;
                    fnSetInitializing(false);
                }
            }
            if (!addr) {
                // if (this._initializing) {
                if (fnGetInitializing()) {
                    console.warn(`${lc} couldn't get addr, but we're still initializing...`);
                    return null;
                } else {
                    throw new Error(`Special address not in config and couldn't initialize it either.`);
                }
            }
        }
        // if (!addr) {
        //     if (initialize) {
        //         addr = await createSpecial({type, space, defaultSpace, fnUpdateBootstrap, fnBroadcast});
        //     } else {
        //         throw new Error(`addr not found and initialize is false. (E: 6fc2375c0ba74972aa53da923c963411)`);
        //     }
        // }



        if (logalot) { console.log(`addr: ${addr}`); }

        let resSpecial = await getFromSpace({addr: addr, isMeta: true, space});
        if (!resSpecial.success) { throw new Error(resSpecial.errorMsg); }
        if (resSpecial.ibGibs?.length !== 1) { throw new Error(`no ibGib in result`); }
        return resSpecial.ibGibs![0];
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

/**
 * Gets a config addr from the current space via the given key
 * as the space's rel8n name.
 *
 * For example, for `key = tags`, a space may look like:
 *
 * ```json
 * {
 *    ib: space xyz,
 *    gib: e89ff8a1c4954db28432007615a78952,
 *    rel8ns: {
 *      past: [space xyz^21cb29cc353f45a491d2b49ff2f130db],
 *      ancestor: [space^gib],
 *      tags: [tags^99b388355f8f4a979ca30ba284d3a686], // <<< rel8n with name specified by key
 *    }
 * }
 * ```
 *
 * @param key config key
 * @returns addr in config if exists, else undefined
 */
export async function getConfigAddr({
    key,
    space,
}: {
    key: string,
    space: IbGibSpaceAny,
}): Promise<string | undefined> {
    const lc = `[${getConfigAddr.name}](${key})`;
    try {
        if (logalot) { console.log(`${lc} getting...`) }
        if (!space) { throw new Error(`space required. (E: 4f135d4276e64054ba21aeb9c304ecec)`); }

        if (!space.rel8ns) {
            console.warn(`${lc} space.rel8ns falsy.`);
            return undefined;
        }
        if (!space.rel8ns[key]) {
            console.warn(`${lc} space.rel8ns[${key}] falsy.`);
            return undefined;
        }
        if (space.rel8ns![key].length === 1) {
            if (logalot) { console.log(`${lc} got`); }
            return space.rel8ns![key]![0];
        } else if (space.rel8ns[key].length > 1) {
            console.warn(`${lc} more than one config addr with ${key} rel8n.`)
            return space.rel8ns![key]![0];
        } else {
            if (logalot) { console.log(`${lc} didn't find`); }
            // key not found or
            return undefined;
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return undefined;
    }
}

export async function setConfigAddr({
    key,
    addr,
    space,
    defaultSpace,
    fnUpdateBootstrap,
}: {
    key: string,
    addr: string,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
}): Promise<IbGibSpaceAny> {
    const lc = `[${setConfigAddr.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: c28b663c991d44419aef1026cc689636)`); }
        if (!defaultSpace) { throw new Error(`defaultSpace required. (E: d3707ae5265d464891ad216f64be6184)`); }

        // rel8 the `addr` to the current space via rel8n named `key`
        const rel8nsToAddByAddr = { [key]: [addr] };
        const resNewSpace = await V1.rel8({
            src: space.toDto(),
            dna: false,
            linkedRel8ns: ["past", "ancestor", key], // we only want the most recent key address
            rel8nsToAddByAddr,
            nCounter: true,
        });

        if (!resNewSpace.newIbGib) { throw new Error(`create new space failed.`); }

        // persist the new space in both default space and its own space
        // (will actually have the space witness its future self interestingly
        // enough...perhaps should have the new space witness itself instead

        // witness in the default space
        // in refactoring, may have to make this optional...hmm
        await persistTransformResult({isMeta: true, resTransform: resNewSpace, space: defaultSpace});

        // witness in the given space
        await persistTransformResult({isMeta: true, resTransform: resNewSpace, space});

        // update the bootstrap^gib with the new space address,
        const newSpace = <IbGibSpaceAny>resNewSpace.newIbGib;
        const newSpaceAddr = h.getIbGibAddr({ibGib: newSpace});

        // must update the original space reference any time we change it.
        // messy atm...
        space.loadDto(newSpace);

        // if (isSameSpace({a: space, b: this.localUserSpace})) {
        //     if (logalot) { console.log(`${lc} space is localUserSpace, so updating localUserSpace.`); }
        //     this.localUserSpace = <IonicSpace_V1<AppSpaceData, AppSpaceRel8ns>>space;
        // } else {
        //     if (logalot) { console.log(`${lc} space is NOT localUserSpace, so NOT updating localUserSpace.`); }
        // }

        // so the proper space (config) is loaded on next app start
        if (fnUpdateBootstrap) {
            // await this.updateBootstrapIbGibSpaceAddr({ newSpaceAddr, localDefaultSpace: this._localDefaultSpace });
            await fnUpdateBootstrap(newSpaceAddr);
        } else {
            console.warn(`${lc} fnUpdateBootstrap is falsy. (W: 9fb874de2b19454dac18645e61ac463f)`);
        }

        return newSpace;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function getCurrentRoot({
    space,
}: {
    space: IbGibSpaceAny,
}): Promise<IbGib_V1<RootData> | undefined> {
    const lc = `[${getCurrentRoot.name}]`;

    try {
        if (!space) { throw new Error(`space required. (E: f0d546101fba4c169256158114ab3c56)`); }

        // if (isSameSpace({a: space, b: this.localUserSpace}) && this._localUserSpaceCurrentRoot) {
        //     return this._localUserSpaceCurrentRoot;
        // }

        const roots = await getSpecialIbgib({type: "roots", space});
        if (!roots) { throw new Error(`Roots not initialized.`); }
        if (!roots.rel8ns) { throw new Error(`Roots not initialized properly. No rel8ns.`); }
        if (!roots.rel8ns.current) { throw new Error(`Roots not initialized properly. No current root.`); }
        if (roots.rel8ns.current.length === 0) { throw new Error(`Invalid Roots: empty current root rel8n.`); }
        if (roots.rel8ns.current.length > 1) { throw new Error(`Invalid Roots: multiple current roots selected.`); }

        const currentRootAddr = roots.rel8ns.current[0]!;
        const resCurrentRoot =
        await getFromSpace({addr: currentRootAddr, isMeta: true, space});
        if (resCurrentRoot.ibGibs?.length === 1) {
            return <IbGib_V1<RootData>>resCurrentRoot.ibGibs![0];
        } else {
            throw new Error(`could not get current root. addr: ${currentRootAddr}`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return undefined;
    }
}

export async function setCurrentRoot({
    root,
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    root: IbGib_V1<RootData>,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<void> {
    const lc = `[${setCurrentRoot.name}]`;
    try {
        if (!root) { throw new Error(`root required.`); }

        if (!space) { throw new Error(`space required. (E: 186af2731c5342a78b063a0a4346f3db)`); }

        const rootAddr = h.getIbGibAddr({ibGib: root});

        // get the roots and update its "current" rel8n
        const roots = await getSpecialIbgib({type: "roots", space});
        if (!roots) { throw new Error(`Roots not initialized.`); }

        // we'll rel8 current with a linkedRel8n, thus ensuring a maximum of only
        // one rel8d addr (the one we're adding here)
        const rel8nsToAddByAddr = { current: [rootAddr] };
        const resNewRoots = await V1.rel8({
            src: roots,
            dna: false,
            linkedRel8ns: ["past", "ancestor", "current"], // current here ensures only 1 rel8n
            rel8nsToAddByAddr,
            nCounter: true,
        });
        await persistTransformResult({isMeta: true, resTransform: resNewRoots, space});

        const configKey = getSpecialConfigKey({type: "roots"});
        let newRootsAddr = h.getIbGibAddr({ibGib: resNewRoots.newIbGib});
        await setConfigAddr({key: configKey, addr: newRootsAddr, space, defaultSpace, fnUpdateBootstrap});

        // if (isSameSpace({a: space, b: this.localUserSpace})) {
        //     if (logalot) { console.warn(`${lc} updating current root`)}
        //     this._localUserSpaceCurrentRoot = root;
        // } else {
        //     if (logalot) { console.warn(`${lc} NOT updating current root`)}
        // }

        // how to let others know roots has changed?
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Every tjp should be related to one of the roots in a space.
 *
 * You should NOT relate every ibgib frame of a given ibGib.
 */
export async function rel8ToCurrentRoot({
    ibGib,
    linked,
    rel8nName,
    space,
    fnBroadcast,
    defaultSpace,
    fnUpdateBootstrap,
}: {
    ibGib: IbGib_V1,
    linked?: boolean,
    rel8nName?: string,
    space: IbGibSpaceAny,
    fnBroadcast: (info: LatestEventInfo) => void,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
}): Promise<void> {
    const lc = `[${rel8ToCurrentRoot.name}]`;

    try {
        if (!space) { throw new Error(`space required. (E: f2758eab3bb844d2b749515672d9e392)`); }

        let currentRoot = await getCurrentRoot({space});
        if (!currentRoot) { throw new Error('currentRoot undefined'); }

        // todo: change this to only rel8 if the tjp doesn't already exist on the root
        let ibGibAddr = h.getIbGibAddr({ibGib});

        // check to see if it's already rel8d. If so, we're done.
        // NOTE: (very) naive!
        if (currentRoot.rel8ns[rel8nName] &&
            currentRoot.rel8ns[rel8nName].includes(ibGibAddr)) {
            // already rel8d
            return;
        }

        rel8nName = rel8nName || c.DEFAULT_ROOT_REL8N_NAME;

        // we only need to add the ibgib itself to the root, not the tjp
        // and not any dependent ibgibs. ...wakka doodle.
        const resNewRoot = await V1.rel8({
            src: currentRoot,
            dna: false,
            linkedRel8ns: linked ? ["past", "ancestor", rel8nName] : ["past", "ancestor"],
            rel8nsToAddByAddr: { [rel8nName]: [ibGibAddr] },
            nCounter: true,
        });
        await persistTransformResult({isMeta: true, resTransform: resNewRoot, space});
        const newRoot = <IbGib_V1<RootData>>resNewRoot.newIbGib;
        const newRootAddr = h.getIbGibAddr({ibGib: newRoot});
        if (logalot) { console.log(`${lc} updating _currentRoot root. newRootAddr: ${newRootAddr}`); }
        await registerNewIbGib({ibGib: newRoot, space, fnBroadcast, defaultSpace, fnUpdateBootstrap});
        await setCurrentRoot({root: newRoot, space, defaultSpace, fnUpdateBootstrap, fnBroadcast});

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return;
    }
}

/**
 * Used for tracking tjpAddr -> latest ibGibAddr.
 *
 * Call this when you create a new ibGib.
 *
 * Need to put this in another service at some point, but crunch crunch
 * like pacman's lunch.
 */
export async function registerNewIbGib({
    ibGib,
    space,
    fnBroadcast,
    defaultSpace,
    fnUpdateBootstrap,
}: {
    ibGib: IbGib_V1,
    space: IbGibSpaceAny,
    fnBroadcast: (info: LatestEventInfo) => void,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
}): Promise<void> {
    let lc = `[${registerNewIbGib.name}]`;
    try {
        const ibGibAddr: IbGibAddr = h.getIbGibAddr({ibGib});
        lc = `${lc}[${ibGibAddr}]`;

        if (!space) { throw new Error(`space required. (E: ea0c03256f8a4062b460aa4de11f1e3e)`); }

        if (logalot) { console.log(`${lc} starting...`); }

        // this is the latest index ibGib. It's just the mapping of tjp -> latestAddr.
        // Other refs to "latest" in this function
        // will refer to the actual/attempted latest of the ibGib arg.
        let specialLatest = await getSpecialIbgib({type: "latest", space});
        if (!specialLatest.rel8ns) { specialLatest.rel8ns = {}; }

        // get the tjp for the rel8nName mapping, and also for some checking logic
        let tjp = await getTjpIbGib({ibGib, space});
        if (!tjp) {
            console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself.`);
            tjp = ibGib;
        }
        let tjpAddr = h.getIbGibAddr({ibGib: tjp});

        // either we're adding the given ibGib, replacing the existing with the ibGib,
        // or doing nothing. We can do this with our current vars in a closure at this point.
        const replaceLatest: () => Promise<void> = async () => {
            if (logalot) { console.log(`${lc} adding/replacing latest. tjp: ${tjpAddr}`); }
            await rel8ToSpecialIbGib({
                type: "latest",
                rel8nName: tjpAddr,
                ibGibsToRel8: [ibGib],
                linked: true, // this ensures only one latest ibGib mapped at a time
                deletePreviousSpecialIbGib: true, // the latest mapping is ephemeral
                severPast: true,
                // skipRel8ToRoot: true,
                space,
                defaultSpace,
                fnUpdateBootstrap,
            });
            fnBroadcast({tjpAddr, latestAddr: ibGibAddr, latestIbGib: ibGib});
            // this._latestSubj.next({tjpAddr, latestAddr: ibGibAddr, latestIbGib: ibGib});
        }

        let existingMapping = specialLatest.rel8ns[tjpAddr] || [];
        if (existingMapping.length > 0) {
            if (logalot) { console.log(`${lc} tjp mapping exists. Checking which is newer.`) }
            let existingLatestAddr = existingMapping[0];
            let resExistingLatest = await getFromSpace({addr: existingLatestAddr, space});
            if (!resExistingLatest.success || resExistingLatest.ibGibs?.length !== 1) {
                console.error(`Didn't find existing latest ibGib (${existingLatestAddr}). I haven't implemented more robust multi-node/distributed strategies for this scenario yet. User chose YES to replace.`);
                await replaceLatest();
                return;
            }

            const existingLatest = resExistingLatest.ibGibs![0];

            // if there is an nCounter, then we can go by that. Otherwise, we'll have to
            // brute force it.
            const ibGibHasNCounter =
                ibGib.data?.n &&
                typeof ibGib.data!.n! === 'number' &&
                ibGib.data!.n! >= 0;
            if (ibGibHasNCounter) {
                // #region ibGib.data.n counter method
                if (logalot) { console.log(`found ibGib.data.n (version counter), using this to determine latest ibGib: ${ibGib.data!.n!}`); }
                const n_ibGib = <number>ibGib.data!.n!;

                const existingLatestHasNCounter =
                    existingLatest.data?.n &&
                    typeof existingLatest.data!.n! === 'number' &&
                    existingLatest.data!.n! >= 0;

                if (existingLatestHasNCounter) {
                    // both have counters, so compare by those.
                    const n_existingLatest = <number>existingLatest.data!.n!;
                    if (n_ibGib > n_existingLatest) {
                        // is newer
                        await replaceLatest();
                    } else {
                        // is not newer, so we don't need to do anything else.
                        return;
                    }
                } else {
                    // only the new one has the counter, so that wins by default
                    await replaceLatest();
                }
                // #endregion

            } else {
                if (logalot) { console.log(`${lc} no nCounter found. Trying brute force method.`); }
                // #region brute force latest
                let latestAddr = await getLatestAddr_Brute({
                    ibGib, ibGibAddr,
                    existingLatest, existingLatestAddr,
                    tjpAddr,
                    space,
                });
                if (latestAddr === ibGibAddr) {
                    await replaceLatest();
                } else {
                    return;
                }
                // #endregion
            }
        } else {
            // no existing mapping, so go ahead and add.
            if (logalot) { console.log(`${lc} no existing tjp mapping. ${tjpAddr} -> ${ibGibAddr}`); }
            await replaceLatest();
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export async function rel8ToSpecialIbGib({
    type,
    rel8nName,
    ibGibsToRel8,
    // isMeta,
    linked,
    // skipRel8ToRoot,
    severPast,
    deletePreviousSpecialIbGib,
    space,
    defaultSpace,
    fnUpdateBootstrap,
}: {
    type: SpecialIbGibType,
    rel8nName: string,
    /**
     * multiple ibgibs to rel8
     */
    ibGibsToRel8: IbGib_V1[],
    // isMeta: boolean,
    linked?: boolean,
    // skipRel8ToRoot?: boolean,
    /**
     * Clears out the special.rel8ns.past array to an empty array.
     *
     * {@see deletePreviousSpecialIbGib} for driving use case.
     */
    severPast?: boolean,
    /**
     * Deletes the previous special ibGib.
     *
     * ## driving use case
     *
     * the latest ibGib is one that is completely ephemeral. It doesn't get attached
     * to the current root, and it only has the current instance. So we don't want to
     * keep around past incarnations.
     */
    deletePreviousSpecialIbGib?: boolean,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
}): Promise<IbGibAddr> {
    const lc = `[${rel8ToSpecialIbGib.name}](type:${type},rel8nName:${rel8nName})`;
    try {
        if (!space) { throw new Error(`space required. (E: 956192eea28047eba6dad81620bb96fb)`); }

        const addrsToRel8 = ibGibsToRel8.map(ibGib => h.getIbGibAddr({ibGib}));

        // get the special ibgib
        const configKey = getSpecialConfigKey({type});
        let specialAddr = await getConfigAddr({key: configKey, space});
        if (!specialAddr) { throw new Error(`specialAddr not found`) };
        let resGetSpecial = await getFromSpace({addr: specialAddr, isMeta: true, space});
        if (!resGetSpecial.success) { throw new Error(`couldn't get special`) }
        if (!resGetSpecial.ibGibs) { throw new Error(`resGetSpecial.ibGibs falsy`) }
        if (resGetSpecial.ibGibs!.length !== 1) { throw new Error(`resGetSpecial.ibGibs count is not 1 (${resGetSpecial.ibGibs!.length})`) }

        // rel8 the new tag to the special ibgib.
        const resNewSpecial = await V1.rel8({
            src: resGetSpecial.ibGibs![0],
            rel8nsToAddByAddr: { [rel8nName]: addrsToRel8 },
            dna: false,
            linkedRel8ns: linked ? [Rel8n.past, rel8nName] : [Rel8n.past],
            nCounter: true,
        });

        if (severPast) { resNewSpecial.newIbGib.rel8ns.past = []; }

        if (resNewSpecial.intermediateIbGibs) { throw new Error('new special creates intermediate ibgibs. so severing past is harder.'); }

        // persist
        await persistTransformResult({resTransform: resNewSpecial, isMeta: true, space});


        // rel8 the new special ibgib to the root, but only if it's not a root itself.
        // if (type !== 'roots' && !skipRel8ToRoot) {
        //   await this.rel8ToCurrentRoot({
        //     ibGib: resNewSpecial.newIbGib,
        //     linked: true,
        //     space,
        //   });
        // }

        // return the new special address (not the incoming new ibGib)
        const { newIbGib: newSpecialIbGib } = resNewSpecial;
        let newSpecialAddr = h.getIbGibAddr({ibGib: newSpecialIbGib});

        await setConfigAddr({key: configKey, addr: newSpecialAddr, space, defaultSpace, fnUpdateBootstrap});

        // delete if required, only after updating config with the new special addr.
        if (deletePreviousSpecialIbGib) {
            await deleteFromSpace({addr: specialAddr, isMeta: true, space});
        }

        return newSpecialAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function getTjpIbGib({
    ibGib,
    naive = true,
    space,
}: {
    ibGib: IbGib_V1<any>,
    naive?: boolean,
    space: IbGibSpaceAny,
}): Promise<IbGib_V1<any>> {
    const lc = `[${getTjpIbGib.name}]`;

    try {
        if (!space) { throw new Error(`space required. (E: 941f973d50e84415b58724af173f52c2)`); }
        if (!ibGib) { throw new Error('ibGib required.'); }

        let ibGibAddr = h.getIbGibAddr({ibGib});
        const {gib} = h.getIbAndGib({ibGibAddr});
        if (gib === GIB) { return ibGib; }
        let isTjp = await isTjp_Naive({ibGib, naive});
        if (isTjp) { return ibGib; }

        // the given ibGib arg isn't itself the tjp
        if (!ibGib.rel8ns) { throw new Error('ibGib.rel8ns required.'); }

        if (ibGib.rel8ns!.tjp && ibGib.rel8ns!.tjp.length > 0) {
        let firstTjpAddr = ibGib.rel8ns!.tjp[0];
        let resGetTjpIbGib = await getFromSpace({addr: firstTjpAddr, space});
        if (resGetTjpIbGib.success && resGetTjpIbGib.ibGibs?.length === 1) { return resGetTjpIbGib.ibGibs[0] }
        }

        // couldn't get the tjp from the rel8ns.tjp, so look for manually in past.
        // but we can't just get the earliest in the 'past', because the tjp
        // may be one of the intermediates!
        // So, check the immediate past ibGib recursively.

        const past = ibGib.rel8ns!.past || [];
        if (past.length === 0) {
        console.warn(`${lc} past.length === 0, but assumption atow is that code wouldnt reach here if that were the case.`)
        return ibGib;
        }
        const pastIbGibAddr = past[past.length-1];
        const resGetPastIbGib = await getFromSpace({addr: pastIbGibAddr, space});
        if (!resGetPastIbGib.success || resGetPastIbGib.ibGibs?.length !== 1) { throw new Error(`get past failed. addr: ${pastIbGibAddr}`); }
        const pastIbGib = resGetPastIbGib.ibGibs![0];

        // call this method recursively!
        return await getTjpIbGib({ibGib: pastIbGib, naive, space});
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Returns true if the given {@param ibGib} is the temporal junction
 * point for a given ibGib timeline.
 */
export async function isTjp_Naive({
    ibGib,
    naive = true,
}: {
    ibGib: IbGib_V1<any>,
    naive?: boolean,
}): Promise<boolean> {
    const lc = `[${isTjp_Naive.name}]`;
    try {
        if (!ibGib) { throw new Error('ibGib required.'); }
        if (naive) {
            if (ibGib.data) {
                if (ibGib.data!.isTjp) { return true; }
                if (!ibGib.rel8ns) { throw new Error('ibGib.rel8ns required.'); }
                if (ibGib.rel8ns.past && ibGib.rel8ns.past.length > 0) { return false; }
                if (ibGib.rel8ns.past && ibGib.rel8ns.past.length === 0) { return true; }
                return false;
            } else {
                throw new Error('loaded ibGib required (data).');
            }
        } else {
            throw new Error('only naive implemented right now.');
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

// #region creates

/**
 * Routing function to various `create_____` functions.
 *
 * @returns address of newly created special.
 */
export async function createSpecial({
    type,
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    type: SpecialIbGibType,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial.name}]`;
    try {
        if (!space) { throw new Error(`space falsy and localUserSpace not initialized.`); }

        switch (type) {
        case "roots":
            return createRootsIbGib({space, defaultSpace, fnBroadcast, fnUpdateBootstrap});

        case "tags":
            return createTags({space, defaultSpace, fnBroadcast, fnUpdateBootstrap});

        case "latest":
            return createLatest({space, defaultSpace, fnBroadcast, fnUpdateBootstrap});

        case "secrets":
            return createSecrets({space, defaultSpace, fnBroadcast, fnUpdateBootstrap});

        case "encryptions":
            return createEncryptions({space, defaultSpace, fnBroadcast, fnUpdateBootstrap});

        case "outerspaces":
            return createOuterSpaces({space, defaultSpace, fnBroadcast, fnUpdateBootstrap});

        default:
            throw new Error(`not implemented. type: ${type}`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
    }
}

/**
 * Creates a new special ibgib, persists it and if not skipped, relates
 * it to the current root.
 *
 * @returns newly created ibgib (not just address)
 */
export async function createSpecialIbGib({
    type,
    skipRel8ToRoot,
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    type: SpecialIbGibType,
    skipRel8ToRoot?: boolean,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGib_V1> {
    const lc = `[${createSpecialIbGib.name}][${type || 'falsy type?'}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        const specialIb = getSpecialIbgibIb({type});
        const src = factory.primitive({ib: specialIb});
        const resNewSpecial = await V1.fork({
            src,
            destIb: specialIb,
            linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
            tjp: { uuid: true, timestamp: true },
            dna: false,
            nCounter: true,
        });
        await persistTransformResult({resTransform: resNewSpecial, isMeta: true, space});
        if (type !== 'roots' && !skipRel8ToRoot) {
            await rel8ToCurrentRoot({
                ibGib: resNewSpecial.newIbGib,
                linked: true,
                space,
                defaultSpace,
                fnBroadcast,
                fnUpdateBootstrap,
            });
        }
        if (logalot) { console.log(`${lc} complete.`); }
        return resNewSpecial.newIbGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Creates a new tags^gib instance (unique to current space), as well as
 * default initial tags, e.g. "home", "favorites", etc., and relates these
 * individual tags to the tags ibGib itself.
 *
 * Stores the tags ibGib's addr in config.
 */
export async function createTags({
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createTags.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 9c05b9bd355943a39ca47afef67a50eb)`); }

        const configKey = getSpecialConfigKey({type: "tags"});
        const special = await createSpecialIbGib({
            type: "tags",
            space,
            defaultSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        let addr = h.getIbGibAddr({ibGib: special});
        await setConfigAddr({key: configKey, addr: addr, space, defaultSpace, fnUpdateBootstrap});

        // at this point, our tags ibGib has no associated tag ibGibs.
        // add home, favorite tags
        const initialTagDatas: TagData[] = [
            { text: 'home', icon: 'home-outline' },
            { text: 'favorite', icon: 'heart-outline' },
        ];
        for (const data of initialTagDatas) {
            const resCreate = await createTagIbGib({...data, space, defaultSpace, fnBroadcast, fnUpdateBootstrap});
            addr = resCreate.newTagsAddr;
            await setConfigAddr({key: configKey, addr: addr, space, defaultSpace, fnUpdateBootstrap});
        }

        return addr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

export async function createTagIbGib({
    text,
    icon,
    description,
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    text: string,
    icon?: string,
    description?: string,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<{newTagIbGib: IbGib_V1, newTagsAddr: string}> {
    const lc = `[${createTagIbGib.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 5def0b1afab74b0c9286e3ac5060cb8f)`); }

        if (!text) { throw new Error(`${lc} text required`); }
        icon = icon || c.DEFAULT_TAG_ICON;
        description = description || c.DEFAULT_TAG_DESCRIPTION;
        const tagIb = tagTextToIb(text);
        const tagPrimitive = factory.primitive({ib: "tag"});
        const resNewTag = await factory.firstGen({
            parentIbGib: tagPrimitive,
            ib: tagIb,
            data: { text, icon, description },
            linkedRel8ns: [ Rel8n.past, Rel8n.ancestor ],
            tjp: { uuid: true, timestamp: true },
            dna: true,
            nCounter: true,
        });
        const { newIbGib: newTag } = resNewTag;
        await persistTransformResult({resTransform: resNewTag, isMeta: true, space});
        await registerNewIbGib({ibGib: newTag, space, defaultSpace, fnBroadcast, fnUpdateBootstrap});
        const newTagsAddr = await rel8TagToTagsIbGib({tagIbGib: newTag, space, defaultSpace, fnUpdateBootstrap});
        return { newTagIbGib: newTag, newTagsAddr };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function createRootsIbGib({
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createRootsIbGib.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: d12a8ea31163429fb6e53ff8e7579c57)`); }

        const configKey = getSpecialConfigKey({type: "roots"});
        // const rootsIbGib = await createSpecialIbGib({type: "roots", space});
        const rootsIbGib = await createSpecialIbGib({
            type: "roots",
            space,
            defaultSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        let rootsAddr = h.getIbGibAddr({ibGib: rootsIbGib});
        await setConfigAddr({key: configKey, addr: rootsAddr, space, defaultSpace, fnUpdateBootstrap});

        // at this point, our ibGib has no associated ibGibs.
        // so we add initial roots
        const rootNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

        let firstRoot: IbGib_V1<RootData> = null;
        const initialDatas: RootData[] = rootNames.map(n => {
            return {
                text: `${n}root`,
                icon: c.DEFAULT_ROOT_ICON,
                description: c.DEFAULT_ROOT_DESCRIPTION
            };
        });
        for (let i = 0; i < initialDatas.length; i++) {
            const data = initialDatas[i];
            const resCreate = await createRootIbGib({
                ...data,
                space,
                defaultSpace,
                fnUpdateBootstrap,
                fnBroadcast,
            });
            if (!firstRoot) { firstRoot = resCreate.newRootIbGib; }
            rootsAddr = resCreate.newRootsAddr;
            // update the config for the updated **roots** ibgib.
            // that roots ibgib is what points to the just created new root.
            await setConfigAddr({key: configKey, addr: rootsAddr, space, defaultSpace, fnUpdateBootstrap});
        }

        // initialize current root
        await setCurrentRoot({root: firstRoot, space, defaultSpace, fnUpdateBootstrap, fnBroadcast});
        // hack: the above line updates the roots in config. so get **that** addr.

        rootsAddr = await getConfigAddr({key: configKey, space});
        if (!rootsAddr) { throw new Error('no roots address in config?'); }
        return rootsAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createRootIbGib({
    text,
    icon,
    description,
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    text: string,
    icon?: string,
    description?: string,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<{newRootIbGib: IbGib_V1<RootData>, newRootsAddr: string}> {
    const lc = `[${createRootIbGib.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: cfa876e5c8c64a53a463ca7a645571c8)`); }

        text = text || c.DEFAULT_ROOT_TEXT;
        icon = icon || c.DEFAULT_ROOT_ICON;
        description = description || c.DEFAULT_ROOT_DESCRIPTION;
        const ib = getRootIb(text);
        const parentIbGib = factory.primitive({ib: "root"});
        const resNewIbGib = await factory.firstGen({
            parentIbGib,
            ib,
            data: { text, icon, description },
            linkedRel8ns: [ Rel8n.past, Rel8n.ancestor ],
            tjp: { uuid: true, timestamp: true },
            dna: true,
        });
        const { newIbGib } = resNewIbGib;
        await persistTransformResult({
            resTransform: resNewIbGib,
            isMeta: true,
            space,
        });
        const newRootsAddr = await rel8ToSpecialIbGib({
            type: "roots",
            rel8nName: c.ROOT_REL8N_NAME,
            ibGibsToRel8: [newIbGib],
            // isMeta: true,
            space,
            defaultSpace,
            fnUpdateBootstrap,
        });
        return { newRootIbGib: <IbGib_V1<RootData>>newIbGib, newRootsAddr };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

async function createLatest({
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createLatest.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 173b08d7eb114238b32280c3efce9d1a)`); }

        const configKey = getSpecialConfigKey({type: "latest"});
        // const special =
        //     await createSpecialIbGib({type: "latest", skipRel8ToRoot: true, space});
        const special = await createSpecialIbGib({
            type: "latest",
            space,
            skipRel8ToRoot: true,
            defaultSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        let specialAddr = h.getIbGibAddr({ibGib: special});
        await setConfigAddr({key: configKey, addr: specialAddr, space, defaultSpace, fnUpdateBootstrap});

        // right now, the latest ibgib doesn't have any more initialization,
        // since it is supposed to be as ephemeral and non-tracked as possible.

        return specialAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createSecrets({
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSecrets.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 340960cd5ad24addb300b23d9722e30a)`); }

        let secretsAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({type: "secrets"});
        // const existing = await this.getSpecialIbgib({type: "secrets", space});
        // if (existing) {
        //   console.warn(`${lc} tried to create new special when one already exists. Aborting create.`);
        //   secretsAddr = h.getIbGibAddr({ibGib: existing});
        //   return secretsAddr;
        // }

        // special ibgib doesn't exist, so create it (empty)
        // const secretsIbgib = await createSpecialIbGib({type: "secrets", space});
        const secretsIbgib = await createSpecialIbGib({
            type: "secrets",
            space,
            defaultSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        secretsAddr = h.getIbGibAddr({ibGib: secretsIbgib});
        await setConfigAddr({key: configKey, addr: secretsAddr, space, defaultSpace, fnUpdateBootstrap});

        // // now that we've created the secrets ibgib, give the user a chance
        // // to go ahead and populate one (or more) now.
        // const createdSecrets: IbGib_V1[] = [];
        // let createAnother = true;
        // do {
        //   const secret = await this.promptCreateSecretIbGib();
        //   if (secret) {
        //     createdSecrets.push(secret);
        //   } else {
        //     createAnother = false;
        //   }
        // } while (createAnother)

        // if the user created one or more outerspace ibgibs,
        // rel8 them all to the special outerspaces ibgib
        // if (createdSecrets.length > 0) {
        //   secretsAddr = await this.rel8ToSpecialIbGib({
        //     type: "secrets",
        //     rel8nName: c.SECRET_REL8N_NAME,
        //     ibGibsToRel8: createdSecrets,
        //   });
        // }

        return secretsAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createEncryptions({
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createEncryptions.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 5084e698b6924e7090697ca50075ca59)`); }

        let addr: IbGibAddr;
        const configKey = getSpecialConfigKey({type: "encryptions"});
        // const existing = await this.getSpecialIbgib({type: "encryptions", space});
        // if (existing) {
        //   console.warn(`${lc} tried to create new special when one already exists. Aborting create.`);
        //   addr = h.getIbGibAddr({ibGib: existing});
        //   return addr;
        // }

        // special ibgib doesn't exist, so create it (empty)
        // const encryptionsIbgib = await createSpecialIbGib({type: "encryptions", space});
        const encryptionsIbgib = await createSpecialIbGib({
            type: "encryptions",
            space,
            defaultSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        addr = h.getIbGibAddr({ibGib: encryptionsIbgib});
        await setConfigAddr({key: configKey, addr: addr, space, defaultSpace, fnUpdateBootstrap});

        // // now that we've created the secrets ibgib, give the user a chance
        // // to go ahead and populate one (or more) now.
        // const createdEncryptions: IbGib_V1[] = [];
        // let createAnother = true;
        // do {
        //   const secret = await this.promptCreateEncryptionIbGib();
        //   if (secret) {
        //     createdEncryptions.push(secret);
        //   } else {
        //     createAnother = false;
        //   }
        // } while (createAnother)

        // if the user created one or more outerspace ibgibs,
        // rel8 them all to the special outerspaces ibgib
        // if (createdEncryptions.length > 0) {
        //   secretsAddr = await this.rel8ToSpecialIbGib({
        //     type: "secrets",
        //     rel8nName: c.SECRET_REL8N_NAME,
        //     ibGibsToRel8: createdEncryptions,
        //   });
        // }

        return addr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createOuterSpaces({
    space,
    defaultSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
    fnBroadcast: (info: LatestEventInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createOuterSpaces.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 99dd9e92535c470482eb9f6625a33831)`); }

        let outerSpacesAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({type: "outerspaces"});
        // const existing = await this.getSpecialIbgib({type: "outerspaces", space});
        // if (existing) {
        //   console.warn(`${lc} tried to create new special when one already exists. Aborting create.`);
        //   outerSpacesAddr = h.getIbGibAddr({ibGib: existing});
        //   return outerSpacesAddr;
        // }

        // special outerspaces ibgib doesn't exist, so create it (empty)
        // const outerSpacesIbGib = await createSpecialIbGib({type: "outerspaces", space});
        const outerSpacesIbGib = await createSpecialIbGib({
            type: "outerspaces",
            space,
            defaultSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        outerSpacesAddr = h.getIbGibAddr({ibGib: outerSpacesIbGib});
        await setConfigAddr({key: configKey, addr: outerSpacesAddr, space, defaultSpace, fnUpdateBootstrap});

        // // now that we've created the outerspaces ibgib, give the user a chance
        // // to go ahead and populate one (or more) now.
        // const createdOuterspaces: IbGib_V1[] = [];
        // let createAnother = true;
        // do {
        //   const outerSpace = await this.promptCreateOuterSpaceIbGib();
        //   if (outerSpace) {
        //     createdOuterspaces.push(outerSpace);
        //   } else {
        //     createAnother = false;
        //   }
        // } while (createAnother)

        // // if the user created one or more outerspace ibgibs,
        // // rel8 them all to the special outerspaces ibgib
        // if (createdOuterspaces.length > 0) {
        //   outerSpacesAddr = await this.rel8ToSpecialIbGib({
        //     type: "outerspaces",
        //     rel8nName: c.SYNC_SPACE_REL8N_NAME,
        //     ibGibsToRel8: createdOuterspaces,
        //   });
        // }

        return outerSpacesAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

/**
 * We are NOT searching through all of our data looking for a needle in a haystack.
 * What we ARE doing is we are looking through the past of the existing latest and
 * the prospective latest (the given ibGib param) and comparing between the two.
 *
 * Since `past` rel8n is usually a linked rel8n now, we may have to traverse it all
 * the way to its beginning for each possibility.
 *
 * @returns either {@param ibGibAddr} or {@param existingLatestAddr}
 */
async function getLatestAddr_Brute({
    ibGib, ibGibAddr,
    existingLatest, existingLatestAddr,
    tjpAddr,
    space,
}: {
    ibGib: IbGib_V1<any>, ibGibAddr: string,
    existingLatest: IbGib_V1<any>, existingLatestAddr: string,
    tjpAddr: string,
    space: IbGibSpaceAny,
}): Promise<string> {
    const lc = `[${getLatestAddr_Brute.name}][${ibGibAddr}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!space) { throw new Error(`space required. (E: 64eb9a271f5d43deadec30b9638746c8)`); }

        // no nCounter, so we need to brute force.
        // The easiest way is to check each's past, as the most common
        // scenario would be registering a newer one, or less likely, a timing issue
        // with registering a previous ibGib frame.

        let ibGibPast = ibGib.rel8ns?.past || [];
        let existingLatestPast = existingLatest.rel8ns?.past || [];

        // going to check a bunch of specific, easy cases to narrow things down.

        if (ibGibPast.length === 1 && existingLatestPast.length === 0) {
            if (logalot) { console.log(`prospective has a past, so it "must" be newer. (won't quote "must" anymore)`); }
            return ibGibAddr;
        } else if (existingLatestPast.length === 1 && ibGibPast.length === 0) {
            if (logalot) { console.log(`existing has a past, so it must be newer.`); }
            return existingLatestAddr;
        } else if (existingLatestPast.length === 0 && ibGibPast.length === 0) {
            console.warn(`${lc} neither existing latest nor prospective new ibGib has a past, so keeping existing.`);
            return existingLatestAddr;
        } else if (existingLatestPast.includes(ibGibAddr)) {
            if (logalot) { console.log(`existing by definition is newer`); }
            return existingLatestAddr;
        } else if (ibGibPast.includes(existingLatestAddr)) {
            if (logalot) { console.log(`ibGib by definition is newer`); }
            return ibGibAddr;
        } else if (existingLatestAddr === ibGibAddr) {
            if (logalot) { console.log(`they're the same!`); }
            return existingLatestAddr;
        } else if (existingLatestAddr === tjpAddr && existingLatest.rel8ns?.tjp?.length === 1) {
            if (logalot) { console.log(`ibGib must be newer because the existingLatestAddr is the tjp, which is by definition first in unique past.`); }
            return ibGibAddr;
        } else if (ibGibAddr === tjpAddr && ibGib.rel8ns?.tjp?.length === 1) {
            if (logalot) { console.log(`existing must be newer because the ibGibAddr is the tjp, which is by definition first in unique past.`); }
            return existingLatestAddr;
        }

        // well, neither one really gives us any indicator alone
        // so load each one in the past
        if (logalot) { console.log(`${lc} brute forcing through iterating the pasts.`); }
        let newerAddr: string | undefined;
        let firstIterationCount = -1; // klugy hack, but is an ugly method anyway (brute after all!)

        let getPastCount: (x: IbGib_V1<any>, n: number, otherAddr: string) => Promise<number> =
            async (x, n, otherAddr) => {
                let xPast = x.rel8ns?.past || [];
                if (xPast.includes(otherAddr)) {
                    // no need to proceed further, since the other is found in the past of x, so x is newer
                    newerAddr = h.getIbGibAddr({ibGib: x});
                    return -1;
                }
                if (xPast.length === 0) { return n; } // no more past to increment
                let newCount = n + xPast.length;
                if (firstIterationCount !== -1 && newCount > firstIterationCount) {
                    // we've determined that the second iteration has a longer past,
                    // so we don't need to look further
                    newerAddr = h.getIbGibAddr({ibGib: x});
                    return -1;
                }
                // load up the earliest one and call recursively
                let resNextX = await getFromSpace({addr: xPast[0], space});
                if (!resNextX.success || resNextX.ibGibs?.length !== 1) { throw new Error(`Couldn't load past addr (xPast[0]): ${xPast[0]}`); }
                return getPastCount(resNextX.ibGibs![0], n + xPast.length, otherAddr);
            }

        if (logalot) { console.log(`${lc} doing ibGibPastCount`); }
        let ibGibPastCount = await getPastCount(ibGib, 0, existingLatestAddr);
        if (newerAddr) { return newerAddr; }

        // we didn't hit upon it, so set the firstIterationCount so we don't spend unnecessary cycles
        if (logalot) { console.log(`${lc} Doing existingPastCount`); }
        firstIterationCount = ibGibPastCount;
        let existingPastCount = await getPastCount(existingLatest, 0, ibGibAddr);
        if (newerAddr) { return newerAddr; }

        // we didn't yet determine it, so whichever has the longer past is newer
        if (ibGibPastCount > existingPastCount) {
            if (logalot) { console.log(`${lc} ibGibPastCount (${ibGibPastCount}) is longer than existingPastCount (${existingPastCount}), so ibGib is newer.`); }
            newerAddr = ibGibAddr;
        } else {
            if (logalot) { console.log(`${lc} existingPastCount (${existingPastCount}) is longer than ibGibPastCount (${ibGibPastCount}), so ibGib is newer.`); }
            newerAddr = existingLatestAddr;
        }
        return newerAddr;

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

// #endregion


/**
 * Relates the given tag to the TagsIbGib, saves the generated
 * TagsIbGib and updates the settings to point to the new TagsIbGib.
 *
 * @param tagIbGib to add to Tags
 */
function rel8TagToTagsIbGib({
    tagIbGib,
    space,
    defaultSpace,
    fnUpdateBootstrap,
}: {
    tagIbGib: IbGib_V1,
    space: IbGibSpaceAny,
    defaultSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpaceAddr: IbGibAddr) => Promise<void>,
}): Promise<IbGibAddr> {
    return rel8ToSpecialIbGib({
        type: "tags",
        rel8nName: c.TAG_REL8N_NAME,
        ibGibsToRel8: [tagIbGib],
        space,
        defaultSpace,
        fnUpdateBootstrap,
    });
}
