import * as h from 'ts-gib/dist/helper';
import {
    Ib, IbGibAddr, TransformResult, V1,
} from 'ts-gib';
import {
    GIB, IbGib_V1, Rel8n,
    Factory_V1 as factory,
    isPrimitive,
    IBGIB_DELIMITER,
} from 'ts-gib/dist/V1';
import { getGib, } from 'ts-gib/dist/V1/transforms/transform-helper';


import { IbGibSpaceAny, SpaceBase_V1 } from '../witnesses/spaces/space-base-v1';
import * as c from '../constants';
import {
    GetIbGibOpts, GetIbGibResult,
    PutIbGibOpts, PutIbGibResult,
    DeleteIbGibOpts, DeleteIbGibResult,
} from '../types/legacy';
import { validateBootstrapIbGib, validateIbGibAddr, } from './validate';
import { getRootIb, getSpecialConfigKey, getSpecialIbGibIb, getSpecialTypeFromIb, getTimelinesGroupedByTjp, getTjpAddrs, isTjp_Naive, splitPerTjpAndOrDna, tagTextToIb } from './ibgib';
import { TagData_V1, TagIbGib_V1 } from '../types/tag';
import { IbGibTimelineUpdateInfo, RootData, SpecialIbGibType } from '../types/ux';
import { SpaceLockScope, IbGibSpaceLockIbGib, BootstrapIbGib, SpaceId, IbGibSpaceLockOptions, BootstrapData, BootstrapRel8ns, TxId, IbGibSpaceResultIbGib, IbGibSpaceResultData, IbGibSpaceResultRel8ns } from '../types/space';
import { isExpired, getExpirationUTCString, getTimestampInTicks } from './utils';
import { IbGibCacheService, TjpIbGibAddr } from '../types/ibgib';
import { getAppIb, } from './app';
import { isSpecial } from '../helper/ibgib';
import { AppIbGib_V1 } from '../types/app';
import { DEFAULT_CHAT_APP_DATA_V1, DEFAULT_CHAT_APP_REL8NS_V1 } from '../types/chat-app';
import { DEFAULT_RAW_APP_DATA_V1, DEFAULT_RAW_APP_REL8NS_V1 } from '../types/raw-app';
import { DEFAULT_TODO_APP_DATA_V1, DEFAULT_TODO_APP_REL8NS_V1 } from '../types/todo-app';

const logalot = c.GLOBAL_LOG_A_LOT || false;


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

    if (!a) { throw new Error(`${lc} a is falsy`) };
    if (!b) { throw new Error(`${lc} b is falsy`) };

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
    addrs,
    isMeta,
    isDna,
    space,
    force,
}: GetIbGibOpts): Promise<GetIbGibResult> {
    let lc = `[${getFromSpace.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!space) { throw new Error(`space required. (E: 4d188d6c863246f28aa575753a052304)`); }
        if (!addr && (addrs ?? []).length === 0) { throw new Error(`addr or addrs required. (E: 1a0b92564ba942f1ba91a089ac1a2125)`); }

        if (addr && addrs?.length > 0) {
            console.warn(`${lc} both addr and addrs provided, but supposed to be used one or the other. (W: 87226c2ac50e4ea28211334a7b58782f)`);
            if (!addrs.includes(addr)) {
                addrs.push(addr);
            }
        }
        addrs = (addrs ?? []).length > 0 ? addrs : [addr];

        const argGet = await space.argy({
            ibMetadata: getSpaceArgMetadata({ space }),
            argData: {
                cmd: 'get',
                ibGibAddrs: addrs,
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
                rawResultIbGib: result,
            }
        } else {
            if (logalot) { console.log(`${lc} didn't get.`) }
            return {
                success: false,
                errorMsg: result.data?.errors?.join('|') || `${lc} something went wrong. addrs: ${addrs.join('\n')} (E: b9e9d5ce0cde4122bfb74f7688db85e0)`,
                rawResultIbGib: result,
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

        if (logalot) { console.log(`${lc} ibGibs.length: ${ibGibs.length}`) }
        const argPutIbGibs = await space.argy({
            ibMetadata: getSpaceArgMetadata({ space }),
            argData: {
                cmd: 'put', isMeta, force, isDna,
                ibGibAddrs: ibGibs.map(x => h.getIbGibAddr({ ibGib: x })),
            },
            ibGibs: ibGibs.concat(),
        });
        const resPutIbGibs = await space.witness(argPutIbGibs);
        if (resPutIbGibs.data?.success) {
            if ((resPutIbGibs.data!.warnings ?? []).length > 0) {
                resPutIbGibs.data!.warnings!.forEach((warning: string) => console.warn(`${lc} ${warning}`));
            }
            return { success: true }
        } else {
            const errorMsg = resPutIbGibs?.data?.errors?.length > 0 ?
                `Error(s) putting in local space:\n${resPutIbGibs.data.errors.join('\n')}` :
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
    let lc = `[${deleteFromSpace.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 40ab3b51e91c4b5eb4f215baeefbcef0)`); }
        if (!space.data) { throw new Error(`space.data required. (E: 0d02c8e85ee143b8bd6a1a1db0d9af1b)`); }
        lc = `${lc}[${space.data.name || 'noname?'}][${space.data.uuid || 'nouuid?'}]`;

        const argDel = await space.argy({
            ibMetadata: getSpaceArgMetadata({ space }),
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
            const errorMsg: string = result.data?.errors?.join('|') || `${lc} something went wrong (E: e397fd09b4a746a3ba3305d6ea0893cb)`;
            if (errorMsg.includes('File does not exist')) {
                if (logalot) { console.log(`${lc} tried to delete file that does not exist. (I: cb5d1348ccbc58bf0bfc95f3006f1e22)`); }
            }
            return { errorMsg }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return { errorMsg: error.message };
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
            ibMetadata: getSpaceArgMetadata({ space }),
            argData: {
                cmd: 'put', isMeta, force,
                ibGibAddrs: ibGibs.map(x => h.getIbGibAddr({ ibGib: x })),
            },
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
                ibMetadata: getSpaceArgMetadata({ space }),
                argData: {
                    cmd: 'put', isDna: true, force,
                    ibGibAddrs: dnas.map(x => h.getIbGibAddr({ ibGib: x })),
                },
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

        let special = await getSpecialIbGib({ type, space });
        if (!special) { throw new Error(`couldn't get special (${type})`) };
        const rel8dAddrs = special.rel8ns[rel8nName] || [];
        const rel8dIbgibs = [];
        for (let i = 0; i < rel8dAddrs.length; i++) {
            const addr = rel8dAddrs[i];
            let resGet = await getFromSpace({ addr, space });
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
 * @see {@link createSpecial_Tags}
 */
export async function getSpecialIbGib({
    type,
    initialize,
    space,
    zeroSpace,
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
    zeroSpace?: IbGibSpaceAny,
    /**
     * Only required if `initialize` is true.
     */
    fnUpdateBootstrap?: (newSpace: IbGibSpaceAny) => Promise<void>,
    /**
     * Only required if `initialize` is true.
     */
    fnBroadcast?: (info: IbGibTimelineUpdateInfo) => void,
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
    const lc = `[${getSpecialIbGib.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: d454b31d58764a9bb9c4e47fb5ef38b5)`); }

        let key = getSpecialConfigKey({ type });
        let addr = await getConfigAddr({ key, space });

        if (!addr) {
            if (initialize && !(fnGetInitializing || fnSetInitializing)) { throw new Error(`if initialize, you must provide fnGetInitializeLock & fnSetInitializeLock. (E: 8eb322625d0c4538be089800882487de)`); }
            if (initialize && !fnGetInitializing()) {
                fnSetInitializing(true);
                try {
                    addr = await createSpecial({ type, space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
                } catch (error) {
                    console.error(`${lc} error initializing: ${error.message}`);
                } finally {
                    fnSetInitializing(false);
                }
            }
            if (!addr) {
                if (fnGetInitializing && fnGetInitializing()) {
                    console.warn(`${lc} couldn't get addr, but we're still initializing...`);
                    return null;
                } else {
                    throw new Error(`Special address not in config and couldn't initialize it either.`);
                }
            }
        }

        if (logalot) { console.log(`${lc} getting addr: ${addr}`); }

        let resSpecial = await getFromSpace({ addr, isMeta: true, space });

        // I'm putting in this check in case we're getting a meta that wasn't
        // saved into the meta folder.
        if (!resSpecial.success) {
            resSpecial = await getFromSpace({ addr, isMeta: false, space });
            if (resSpecial.success) {
                console.warn(`${lc} special ibgib was not stored in meta folder...putting in meta folder now for the future (W: e6f5571fd98c449bb2809359be5057cc)`);
                const resPutInMeta = await putInSpace({ ibGib: resSpecial.ibGibs[0], isMeta: true, space });
                if (!resPutInMeta.success) {
                    console.warn(`${lc} (UNEXPECTED) tried to put special in meta but success was false? (W: b934b53571c24057af172c790e6a7240)`)
                }
            }
        }
        if (!resSpecial.success) { throw new Error(resSpecial.errorMsg); }
        if (resSpecial.ibGibs?.length !== 1) { throw new Error(`no ibGib in result (E: 3a42abdddc3648e292d63dc45c560064)`); }
        const specialIbGib = resSpecial.ibGibs[0];

        // I'm putting this check in here because it's bad not to have the
        // latest special associated with a space
        if (type !== 'latest') {
            let resLatest = await getLatestAddrs({ ibGibs: [specialIbGib], space });
            if (resLatest?.data?.success && resLatest.data.addrs?.length === 1) {
                if (resLatest.data.addrs[0] !== h.getIbGibAddr({ ibGib: specialIbGib })) {
                    console.warn(`${lc} latest addr is not the one associated with the local space. (W: 141b69dc3c414efc9645bb76fcf12df9)`)
                }
            }
        }

        return specialIbGib;
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
    zeroSpace,
    fnUpdateBootstrap,
}: {
    key: string,
    addr: string,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
}): Promise<IbGibSpaceAny> {
    const lc = `[${setConfigAddr.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: c28b663c991d44419aef1026cc689636)`); }
        if (!zeroSpace) { throw new Error(`zeroSpace required. (E: d3707ae5265d464891ad216f64be6184)`); }

        // rel8 the `addr` to the current space via rel8n named `key`
        // note that since we are replacing the pointer, we include the key
        // in `linkedRel8ns` which will keep only the most recent
        const rel8nsToAddByAddr = { [key]: [addr] };
        const resNewSpace = await V1.rel8({
            src: space.toIbGibDto(),
            dna: false,
            linkedRel8ns: ["past", "ancestor", key], // we only want the most recent key address
            rel8nsToAddByAddr,
            nCounter: true,
        });

        if (!resNewSpace.newIbGib) { throw new Error(`create new space failed.`); }

        // persist the new space in both default space and its own space
        // (will actually have the space witness its future self interestingly
        // enough...perhaps should have the new space witness itself instead

        // witness in the default zero space
        // in refactoring, may have to make this optional...hmm
        await persistTransformResult({ isMeta: true, resTransform: resNewSpace, space: zeroSpace });

        // witness in the given space
        await persistTransformResult({ isMeta: true, resTransform: resNewSpace, space });

        // going to update the bootstrap^gib with the new space address, but first...
        const newSpace = <IbGibSpaceAny>resNewSpace.newIbGib;

        // ...must update the original space reference any time we change it.
        // messy atm...
        await space.loadIbGibDto(newSpace);

        // ...now update so the proper space (config) loads on next app start
        if (fnUpdateBootstrap) {
            await fnUpdateBootstrap(newSpace);
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

        const roots = await getSpecialIbGib({ type: "roots", space });
        if (!roots) { throw new Error(`Roots not initialized. (E: 89b1ba12ed12416aac41cef9fdaf1fc2)`); }
        if (!roots.rel8ns) { throw new Error(`Roots not initialized properly. No rel8ns. (E: 8513a07cf530484db9521a2a3a27b7f6)`); }
        if (!roots.rel8ns.current) { throw new Error(`Roots not initialized properly. No current root. (E: 459c3a007a30486d96fb8d83f696e239)`); }
        if (roots.rel8ns.current.length === 0) { throw new Error(`Invalid Roots: empty current root rel8n. (E: bede5864090440bca01ea7ab7fd107d6)`); }
        if (roots.rel8ns.current.length > 1) { throw new Error(`Invalid Roots: multiple current roots selected. (E: 97561acbf63a48ecaa037697bd26555a)`); }

        const currentRootAddr = roots.rel8ns.current[0]!;
        const resCurrentRoot =
            await getFromSpace({ addr: currentRootAddr, isMeta: true, space });
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
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    root: IbGib_V1<RootData>,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<void> {
    const lc = `[${setCurrentRoot.name}]`;
    try {
        if (!root) { throw new Error(`root required.`); }

        if (!space) { throw new Error(`space required. (E: 186af2731c5342a78b063a0a4346f3db)`); }

        const rootAddr = h.getIbGibAddr({ ibGib: root });

        // get the roots and update its "current" rel8n
        const roots = await getSpecialIbGib({ type: "roots", space });
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
        await persistTransformResult({ isMeta: true, resTransform: resNewRoots, space });

        const configKey = getSpecialConfigKey({ type: "roots" });
        let newRootsAddr = h.getIbGibAddr({ ibGib: resNewRoots.newIbGib });
        await setConfigAddr({ key: configKey, addr: newRootsAddr, space, zeroSpace, fnUpdateBootstrap });

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
    zeroSpace,
    fnUpdateBootstrap,
}: {
    ibGib: IbGib_V1,
    linked?: boolean,
    rel8nName?: string,
    space: IbGibSpaceAny,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
}): Promise<void> {
    const lc = `[${rel8ToCurrentRoot.name}]`;

    try {
        if (!space) { throw new Error(`space required. (E: f2758eab3bb844d2b749515672d9e392)`); }

        let currentRoot = await getCurrentRoot({ space });
        if (!currentRoot) { throw new Error('currentRoot undefined'); }

        // todo: change this to only rel8 if the tjp doesn't already exist on the root
        let ibGibAddr = h.getIbGibAddr({ ibGib });

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
        await persistTransformResult({ isMeta: true, resTransform: resNewRoot, space });
        const newRoot = <IbGib_V1<RootData>>resNewRoot.newIbGib;
        const newRootAddr = h.getIbGibAddr({ ibGib: newRoot });
        if (logalot) { console.log(`${lc} updating _currentRoot root. newRootAddr: ${newRootAddr}`); }
        await registerNewIbGib({ ibGib: newRoot, space, fnBroadcast, zeroSpace, fnUpdateBootstrap });
        await setCurrentRoot({ root: newRoot, space, zeroSpace, fnUpdateBootstrap, fnBroadcast });

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
    zeroSpace,
    fnUpdateBootstrap,
}: {
    ibGib: IbGib_V1,
    space: IbGibSpaceAny,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
}): Promise<void> {
    let lc = `[${registerNewIbGib.name}]`;
    try {
        const ibGibAddr: IbGibAddr = h.getIbGibAddr({ ibGib });
        lc = `${lc}[${ibGibAddr}]`;

        if (!space) { throw new Error(`space required. (E: ea0c03256f8a4062b460aa4de11f1e3e)`); }

        if (logalot) { console.log(`${lc} starting...`); }

        // this is the latest index ibGib. It's just the mapping of tjp -> latestAddr.
        // Other refs to "latest" in this function
        // will refer to the actual/attempted latest of the ibGib arg.
        let specialLatest = await getSpecialIbGib({ type: "latest", space });
        if (!specialLatest.rel8ns) { specialLatest.rel8ns = {}; }

        // get the tjp for the rel8nName mapping, and also for some checking logic
        let tjp = await getTjpIbGib({ ibGib, space });
        if (!tjp) {
            console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself.`);
            tjp = ibGib;
        }
        let tjpAddr = h.getIbGibAddr({ ibGib: tjp });

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
                zeroSpace,
                fnUpdateBootstrap,
                fnBroadcast,
            });
            if (fnBroadcast) {
                fnBroadcast({ tjpAddr, latestAddr: ibGibAddr, latestIbGib: ibGib });
            }
        }

        let existingMapping = specialLatest.rel8ns[tjpAddr] || [];
        if (existingMapping.length > 0) {
            if (logalot) { console.log(`${lc} tjp mapping exists. Checking which is newer.`) }
            let existingLatestAddr = existingMapping[0];

            // check to see if ibgib is already the latest
            if (existingLatestAddr === ibGibAddr) {
                if (logalot) { console.log(`${lc} Neither is newer because ibGibAddr is already registered as latest, so returning without any further action. (I: 7f5bd5d3391be95919240f0e97976e22)`); }
                return; /* <<<< returns early */
            }

            // not the latest or not registered, so get the full existing latest
            // ibgib analyze to see if the incoming ibgib is indeed newer
            let resExistingLatest = await getFromSpace({ addr: existingLatestAddr, space });
            if (!resExistingLatest.success || resExistingLatest.ibGibs?.length !== 1) {
                console.error(`Didn't find existing latest ibGib (${existingLatestAddr}). I haven't implemented more robust multi-node/distributed strategies for this scenario yet. User chose YES to replace.`);
                await replaceLatest();
                return;
            }
            const existingLatest = resExistingLatest.ibGibs![0];

            // if there is an nCounter, then we can go by that. Otherwise, we'll
            // try to brute force "latest" comparison
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

/**
 * Performs a rel8 transform on the special ibgib corresponding to the incoming
 * `type`.
 *
 * ## special ibgibs
 *
 * much metadata configuration is stored via "special" ibgibs. Most of these are
 * tracked in a space's ibgib directly, and the space itself is tracked in the
 * bootstrap. So when storing configuration data, I usually create a new special
 * ibgib. this function performs the plumbing for the rel8 transform related to
 * that special ibgib.
 *
 * ## notes
 *
 * * special ibgib must exist in the space, i.e. previously initialized
 * * i'm using this atm for mainly the local ionic space, but sometimes
 *   might be good in sync space, i dunno at this point.
 *   * I've migrated a lot of local space behavior into this space-agnostic file.
 *
 * @returns new special ibgib addr
 */
export async function rel8ToSpecialIbGib({
    type,
    rel8nName,
    ibGibsToRel8,
    ibGibsToUnRel8,
    linked,
    severPast,
    deletePreviousSpecialIbGib,
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    /**
     * the "name" of the special ibgib.
     *
     * This will drive deterministically what the special ibgib's `ib` will be,
     * among other things.
     */
    type: SpecialIbGibType,
    /**
     * The rel8nName by which to rel8 the target incoming `ibGibsToRel8`.
     */
    rel8nName: string,
    /**
     * multiple ibgibs to rel8
     */
    ibGibsToRel8?: IbGib_V1[],
    /**
     * multiple ibgibs to UNrel8
     */
    ibGibsToUnRel8?: IbGib_V1[],
    /**
     * If linked, then the rel8nName will only contain one address, i.e. the
     * last rel8d ibgib's address.
     *
     * This depends on your use case.
     */
    linked?: boolean,
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
    /**
     * The space in which the special ibgib resides.
     */
    space: IbGibSpaceAny,
    /**
     * The default zero space that contains metaspace information, i.e.
     * bootstrap ibgib, space ibgibs, etc.
     */
    zeroSpace: IbGibSpaceAny,
    /**
     * The function by which to update the bootstrap ibgib.
     *
     * This is necessary, because when you update a special ibgib,
     * the address of that special ibgib must be updated in the given
     * `space`. This will require an update to the space's address, which
     * itself is tracked in the bootstrap ibgib.
     */
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    /**
     * Use this if you want to broadcast the new space's address after this
     * function performs the rel8 transform.
     */
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr> {
    const lc = `[${rel8ToSpecialIbGib.name}](type:${type},rel8nName:${rel8nName})`;
    try {
        if (!space) { throw new Error(`space required. (E: 956192eea28047eba6dad81620bb96fb)`); }
        if ((ibGibsToRel8 ?? []).length === 0 && (ibGibsToUnRel8 ?? []).length === 0) {
            throw new Error(`either ibGibsToRel8 or ibGibsToUnRel8 required. (E: 5add49c8e46a54e2c6b057c22646a822)`);
        }

        const addrsToRel8 = ibGibsToRel8?.map(ibGib => h.getIbGibAddr({ ibGib }));
        const addrsToUnRel8 = ibGibsToUnRel8?.map(ibGib => h.getIbGibAddr({ ibGib }));

        // get the special ibgib
        const configKey = getSpecialConfigKey({ type });
        let specialAddr = await getConfigAddr({ key: configKey, space });
        if (!specialAddr) { throw new Error(`specialAddr not found`) };
        let resGetSpecial = await getFromSpace({ addr: specialAddr, isMeta: true, space });
        if (!resGetSpecial.success) { throw new Error(`couldn't get special`) }
        if (!resGetSpecial.ibGibs) { throw new Error(`resGetSpecial.ibGibs falsy`) }
        if (resGetSpecial.ibGibs!.length !== 1) { throw new Error(`resGetSpecial.ibGibs count is not 1 (${resGetSpecial.ibGibs!.length})`) }

        // rel8 the new tag to the special ibgib.
        const resNewSpecial = await V1.rel8({
            src: resGetSpecial.ibGibs![0],
            rel8nsToAddByAddr: addrsToRel8 ? { [rel8nName]: addrsToRel8 } : undefined,
            rel8nsToRemoveByAddr: addrsToUnRel8 ? { [rel8nName]: addrsToUnRel8 } : undefined,
            dna: false,
            linkedRel8ns: linked ? [Rel8n.past, rel8nName] : [Rel8n.past],
            nCounter: true,
        });
        const newSpecialIbGib = resNewSpecial.newIbGib;

        // sever
        if (severPast) {
            if (resNewSpecial.intermediateIbGibs) { throw new Error('new special creates intermediate ibgibs. so severing past is harder. (E: b580c0c56253494192e9c62212ee187d)'); }
            newSpecialIbGib.rel8ns.past = [];
            newSpecialIbGib.gib = await getGib({ ibGib: newSpecialIbGib });
        }

        // persist
        await persistTransformResult({ resTransform: resNewSpecial, isMeta: true, space });

        // return the new special address (not the incoming new ibGib)
        const newSpecialAddr = h.getIbGibAddr({ ibGib: newSpecialIbGib });
        const specialTjpAddrs = getTjpAddrs({ ibGibs: [newSpecialIbGib] });
        const specialTjpAddr = specialTjpAddrs?.length > 0 ? specialTjpAddrs[0] : null;

        // update the space ibgib which contains the special/config information
        await setConfigAddr({ key: configKey, addr: newSpecialAddr, space, zeroSpace, fnUpdateBootstrap });

        // delete if required, only after updating config with the new special addr.
        if (deletePreviousSpecialIbGib) {
            await deleteFromSpace({ addr: specialAddr, isMeta: true, space });
        }

        // I'm thinking we also want to register the special ibgib in the latest index...
        if (type === 'latest') {
            // we're relating somethign to the latest index special ibgib (most
            // likely via registerNewIbgib), and we have a new latest index.
            // we already have updated our reference to space(?) so I'm
            // not sure what the problem is right now...
        } else {
            // we're relating something to a special ibgib that is NOT the
            // latest index, so our new special ibgib needs to be registered
            // with that latest index.
            await registerNewIbGib({
                ibGib: newSpecialIbGib,
                zeroSpace,
                fnBroadcast,
                fnUpdateBootstrap,
                space,
            });
        }

        if (fnBroadcast && specialTjpAddr) {
            fnBroadcast({
                tjpAddr: specialTjpAddr,
                latestIbGib: newSpecialIbGib,
                latestAddr: newSpecialAddr,
            });
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
}): Promise<IbGib_V1<any> | undefined> {
    const lc = `[${getTjpIbGib.name}]`;

    try {
        if (!space) { throw new Error(`space required. (E: 941f973d50e84415b58724af173f52c2)`); }
        if (!ibGib) { throw new Error('ibGib required.'); }

        let ibGibAddr = h.getIbGibAddr({ ibGib });
        const { gib } = h.getIbAndGib({ ibGibAddr });
        if (gib === GIB) { return ibGib; }
        let isTjp = await isTjp_Naive({ ibGib, naive });
        if (isTjp) { return ibGib; }

        // the given ibGib arg isn't itself the tjp

        // if no rel8ns, then there is no tjp ibgib, since this is not
        // intrinsically the tjp and there is no 'tjp' or 'past' rel8n to check
        if (!ibGib.rel8ns) {
            if (logalot) { console.log(`${lc} ibgib not tjp in data, and rel8ns is falsy. so tjp is undefined (I: acdadb76a7568807db7a68f6f866de22)`); }
            return undefined; // <<<< returns early
        }

        // check explicitly listed tjp in rel8ns
        if (ibGib.rel8ns!.tjp && ibGib.rel8ns!.tjp.length > 0) {
            let firstTjpAddr = ibGib.rel8ns!.tjp[0];
            let resGetTjpIbGib = await getFromSpace({ addr: firstTjpAddr, space });
            if (resGetTjpIbGib.success && resGetTjpIbGib.ibGibs?.length === 1) {
                return resGetTjpIbGib.ibGibs[0]
            } else {
                const resErrorMsg = resGetTjpIbGib.errorMsg ?? '[unspecified error in get result]';
                throw new Error(`ibGib references tjp but could not retrieve from space. res error: ${resErrorMsg} (E: 94f0340706ad48c794c6a62c1b235a22)`);
            }
        }

        // couldn't get the tjp from the rel8ns.tjp, so look for manually in past.
        // but we can't just get the earliest in the 'past', because the tjp
        // may be one of the intermediates!
        // So, check the immediate past ibGib recursively.

        const past = ibGib.rel8ns!.past || [];
        if (past.length === 0) {
            console.warn(`${lc} past.length === 0, so there is no tjp.`)
            if (logalot) { console.log(`${lc} ibgib is not tjp in data, not in tjp rel8n, and past is empty. so tjp is undefined (I: bf06f664917dcf4492fb9c4c106a6222)`); }
            return undefined; // <<<< returns early
        }
        const pastIbGibAddr = past[past.length - 1];
        const resGetPastIbGib = await getFromSpace({ addr: pastIbGibAddr, space });
        if (!resGetPastIbGib.success || resGetPastIbGib.ibGibs?.length !== 1) { throw new Error(`get past failed. addr: ${pastIbGibAddr}`); }
        const pastIbGib = resGetPastIbGib.ibGibs![0];

        // call this method recursively!
        return await getTjpIbGib({ ibGib: pastIbGib, naive, space });
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
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    type: SpecialIbGibType,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial.name}]`;
    try {
        if (!space) { throw new Error(`space falsy and localUserSpace not initialized. (E: 66e7d3ff098248f0a5ddda51853c92e6)`); }

        switch (type) {
            case "roots": return createSpecial_Roots({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "tags": return createSpecial_Tags({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "latest": return createSpecial_Latest({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "secrets": return createSpecial_Secrets({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "encryptions": return createSpecial_Encryptions({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "outerspaces": return createSpecial_OuterSpaces({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "autosyncs": return createSpecial_Autosyncs({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "robbots": return createSpecial_Robbots({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            case "apps": return createSpecial_Apps({ space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            default: return createSpecial_Default({ type, space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
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
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    type: SpecialIbGibType,
    skipRel8ToRoot?: boolean,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGib_V1> {
    const lc = `[${createSpecialIbGib.name}][${type || 'falsy type?'}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        const specialIb = getSpecialIbGibIb({ type });
        const src = factory.primitive({ ib: specialIb });
        const resNewSpecial = await V1.fork({
            src,
            destIb: specialIb,
            linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
            tjp: { uuid: true, timestamp: true },
            dna: false,
            nCounter: true,
        });
        await persistTransformResult({ resTransform: resNewSpecial, isMeta: true, space });
        if (type !== 'roots' && !skipRel8ToRoot) {
            await rel8ToCurrentRoot({
                ibGib: resNewSpecial.newIbGib,
                linked: true,
                space,
                zeroSpace,
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
export async function createSpecial_Tags({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Tags.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 9c05b9bd355943a39ca47afef67a50eb)`); }

        const configKey = getSpecialConfigKey({ type: "tags" });
        const special = await createSpecialIbGib({
            type: "tags",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        let addr = h.getIbGibAddr({ ibGib: special });
        await setConfigAddr({ key: configKey, addr: addr, space, zeroSpace, fnUpdateBootstrap });

        // at this point, our tags ibGib has no associated tag ibGibs.
        // add home, favorite tags
        const initialTagDatas: TagData_V1[] = [
            { text: 'home', icon: 'home-outline' },
            { text: 'favorite', icon: 'heart-outline' },
        ];
        for (const data of initialTagDatas) {
            const resCreate = await createTagIbGibAndSundry({ ...data, space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
            addr = resCreate.newTagsAddr;
            await setConfigAddr({ key: configKey, addr: addr, space, zeroSpace, fnUpdateBootstrap });
        }

        return addr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

/**
 * 1. Creates a new tag ibgib with the given properties.
 * 2. Persists graph in given {@link space}
 * 3. Registers the new tag ibgib in that space, using the given
 *    {@link fnUpdateBootstrap} and {@link fnBroadcast} functions.
 * 4. Relates the new tag to the special tags ibgib.
 *
 * @returns the new tag ibgib and new tags address.
 */
export async function createTagIbGibAndSundry({
    text,
    icon,
    description,
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    text: string,
    icon?: string,
    description?: string,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<{ newTagIbGib: TagIbGib_V1, newTagsAddr: string }> {
    const lc = `[${createTagIbGibAndSundry.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!space) { throw new Error(`space required. (E: 5def0b1afab74b0c9286e3ac5060cb8f)`); }

        if (!text) { throw new Error(`${lc} text required`); }
        icon = icon || c.DEFAULT_TAG_ICON;
        description = description || c.DEFAULT_TAG_DESCRIPTION;
        const tagIb = tagTextToIb(text);
        const tagPrimitive = factory.primitive({ ib: "tag" });
        const resNewTag = await factory.firstGen({
            parentIbGib: tagPrimitive,
            ib: tagIb,
            data: { text, icon, description },
            linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
            tjp: { uuid: true, timestamp: true },
            dna: true,
            nCounter: true,
        });
        const newTag = <TagIbGib_V1>resNewTag.newIbGib;
        await persistTransformResult({ resTransform: resNewTag, isMeta: true, space });
        await registerNewIbGib({ ibGib: newTag, space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
        const newTagsAddr = await rel8TagToTagsIbGib({
            tagIbGib: newTag, space, zeroSpace, fnUpdateBootstrap, fnBroadcast,
        });
        return { newTagIbGib: newTag, newTagsAddr };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export async function createSpecial_Roots({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Roots.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: d12a8ea31163429fb6e53ff8e7579c57)`); }

        const configKey = getSpecialConfigKey({ type: "roots" });
        // const rootsIbGib = await createSpecialIbGib({type: "roots", space});
        const rootsIbGib = await createSpecialIbGib({
            type: "roots",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        let rootsAddr = h.getIbGibAddr({ ibGib: rootsIbGib });
        await setConfigAddr({ key: configKey, addr: rootsAddr, space, zeroSpace, fnUpdateBootstrap });

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
                zeroSpace,
                fnUpdateBootstrap,
                fnBroadcast,
            });
            if (!firstRoot) { firstRoot = resCreate.newRootIbGib; }
            rootsAddr = resCreate.newRootsAddr;
            // update the config for the updated **roots** ibgib.
            // that roots ibgib is what points to the just created new root.
            await setConfigAddr({ key: configKey, addr: rootsAddr, space, zeroSpace, fnUpdateBootstrap });
        }

        // initialize current root
        await setCurrentRoot({ root: firstRoot, space, zeroSpace, fnUpdateBootstrap, fnBroadcast });
        // hack: the above line updates the roots in config. so get **that** addr.

        rootsAddr = await getConfigAddr({ key: configKey, space });
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
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    text: string,
    icon?: string,
    description?: string,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<{ newRootIbGib: IbGib_V1<RootData>, newRootsAddr: string }> {
    const lc = `[${createRootIbGib.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: cfa876e5c8c64a53a463ca7a645571c8)`); }

        text = text || c.DEFAULT_ROOT_TEXT;
        icon = icon || c.DEFAULT_ROOT_ICON;
        description = description || c.DEFAULT_ROOT_DESCRIPTION;
        const ib = getRootIb(text);
        const parentIbGib = factory.primitive({ ib: "root" });
        const resNewIbGib = await factory.firstGen({
            parentIbGib,
            ib,
            data: { text, icon, description },
            linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
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
            zeroSpace,
            fnUpdateBootstrap,
            fnBroadcast,
        });
        return { newRootIbGib: <IbGib_V1<RootData>>newIbGib, newRootsAddr };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

async function createSpecial_Latest({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Latest.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 173b08d7eb114238b32280c3efce9d1a)`); }

        const configKey = getSpecialConfigKey({ type: "latest" });
        // const special =
        //     await createSpecialIbGib({type: "latest", skipRel8ToRoot: true, space});
        const special = await createSpecialIbGib({
            type: "latest",
            space,
            skipRel8ToRoot: true,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        let specialAddr = h.getIbGibAddr({ ibGib: special });
        await setConfigAddr({ key: configKey, addr: specialAddr, space, zeroSpace, fnUpdateBootstrap });

        // right now, the latest ibgib doesn't have any more initialization,
        // since it is supposed to be as ephemeral and non-tracked as possible.

        return specialAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createSpecial_Secrets({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Secrets.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 340960cd5ad24addb300b23d9722e30a)`); }

        let secretsAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({ type: "secrets" });

        // special ibgib doesn't exist, so create it (empty)
        // const secretsIbgib = await createSpecialIbGib({type: "secrets", space});
        const secretsIbgib = await createSpecialIbGib({
            type: "secrets",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        secretsAddr = h.getIbGibAddr({ ibGib: secretsIbgib });
        await setConfigAddr({ key: configKey, addr: secretsAddr, space, zeroSpace, fnUpdateBootstrap });

        return secretsAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createSpecial_Encryptions({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Encryptions.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 5084e698b6924e7090697ca50075ca59)`); }

        let addr: IbGibAddr;
        const configKey = getSpecialConfigKey({ type: "encryptions" });

        // special ibgib doesn't exist, so create it (empty)
        // const encryptionsIbgib = await createSpecialIbGib({type: "encryptions", space});
        const encryptionsIbgib = await createSpecialIbGib({
            type: "encryptions",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        addr = h.getIbGibAddr({ ibGib: encryptionsIbgib });
        await setConfigAddr({ key: configKey, addr: addr, space, zeroSpace, fnUpdateBootstrap });

        return addr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createSpecial_OuterSpaces({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_OuterSpaces.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: 99dd9e92535c470482eb9f6625a33831)`); }

        let outerSpacesAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({ type: "outerspaces" });

        // special outerspaces ibgib doesn't exist, so create it (empty)
        // const outerSpacesIbGib = await createSpecialIbGib({type: "outerspaces", space});
        const outerSpacesIbGib = await createSpecialIbGib({
            type: "outerspaces",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        outerSpacesAddr = h.getIbGibAddr({ ibGib: outerSpacesIbGib });
        await setConfigAddr({ key: configKey, addr: outerSpacesAddr, space, zeroSpace, fnUpdateBootstrap });

        return outerSpacesAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

async function createSpecial_Autosyncs({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Autosyncs.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: f01cf6a4a460486796e16d505d629522)`); }

        let autosyncsAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({ type: "autosyncs" });

        const autosyncsIbGib = await createSpecialIbGib({
            type: "autosyncs",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        autosyncsAddr = h.getIbGibAddr({ ibGib: autosyncsIbGib });
        await setConfigAddr({ key: configKey, addr: autosyncsAddr, space, zeroSpace, fnUpdateBootstrap });

        return autosyncsAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

export async function createSpecial_Robbots({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Robbots.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: f01cf6a4a460486796e16d505d629522)`); }

        let robbotsAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({ type: "robbots" });

        const robbotsIbGib = await createSpecialIbGib({
            type: "robbots",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        robbotsAddr = h.getIbGibAddr({ ibGib: robbotsIbGib });
        await setConfigAddr({ key: configKey, addr: robbotsAddr, space, zeroSpace, fnUpdateBootstrap });

        return robbotsAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

export async function createSpecial_Apps({
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Apps.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: f01cf6a4a460486796e16d505d629522)`); }

        let appsAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({ type: "apps" });

        const appsIbGib = await createSpecialIbGib({
            type: "apps",
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        appsAddr = h.getIbGibAddr({ ibGib: appsIbGib });
        await setConfigAddr({ key: configKey, addr: appsAddr, space, zeroSpace, fnUpdateBootstrap });

        // at this point, our apps ibGib has no associated app ibGibs.
        // so create our initial apps.
        // appsAddr = await createApps_Chat({ space, zeroSpace, fnUpdateBootstrap, fnBroadcast });
        appsAddr = await createApp({
            defaultAppData: DEFAULT_CHAT_APP_DATA_V1,
            defaultAppRel8ns: DEFAULT_CHAT_APP_REL8NS_V1,
            space, zeroSpace, fnUpdateBootstrap, fnBroadcast,
        });
        // appsAddr = await createApps_Raw({ space, zeroSpace, fnUpdateBootstrap, fnBroadcast });
        appsAddr = await createApp({
            defaultAppData: DEFAULT_RAW_APP_DATA_V1,
            defaultAppRel8ns: DEFAULT_RAW_APP_REL8NS_V1,
            space, zeroSpace, fnUpdateBootstrap, fnBroadcast,
        });
        // appsAddr = await createApps_Todo({ space, zeroSpace, fnUpdateBootstrap, fnBroadcast });
        appsAddr = await createApp({
            defaultAppData: DEFAULT_TODO_APP_DATA_V1,
            defaultAppRel8ns: DEFAULT_TODO_APP_REL8NS_V1,
            space, zeroSpace, fnUpdateBootstrap, fnBroadcast,
        });

        return appsAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

export async function createApp({
    defaultAppData,
    defaultAppRel8ns,
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    /**
     * object that contains all of the default "data" for the app.  Data here
     * does not mean an app's data like other apps. In ibgib, data is
     * everywhere. This means particularly the defalut app ibGib's data, i.e.
     * `ibGib.data`.
     */
    defaultAppData: any,
    defaultAppRel8ns: any,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createApp.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 677f68789abdc7316887e8f38c764e22)`); }

        // #region torn from chat-app-v1.ts because of circular dependency...eesh

        if (logalot) { console.log(`${lc} starting...`); }
        let data = h.clone(defaultAppData);
        let rel8ns = defaultAppRel8ns ? h.clone(defaultAppRel8ns) : undefined;
        data.uuid = data.uuid ?? await h.getUUID();
        let { classname } = data;

        const ib = getAppIb({ appData: data, classname });

        const resNewApp = <TransformResult<AppIbGib_V1>>await factory.firstGen({
            ib,
            parentIbGib: factory.primitive({ ib: `app ${classname}` }),
            data: data,
            rel8ns,
            dna: true,
            linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
            nCounter: true,
            tjp: { timestamp: true },
        });

        // #endregion torn from chat-app-v1.ts because of circular dependency...eesh

        await persistTransformResult({ resTransform: resNewApp, space });
        await registerNewIbGib({
            ibGib: resNewApp.newIbGib,
            fnBroadcast, fnUpdateBootstrap,
            space, zeroSpace
        });
        let appsAddr = await rel8ToSpecialIbGib({
            type: "apps",
            rel8nName: c.APP_REL8N_NAME,
            ibGibsToRel8: [resNewApp.newIbGib],
            fnBroadcast, fnUpdateBootstrap,
            space, zeroSpace,
        });

        return appsAddr;

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

async function createSpecial_Default({
    type,
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    type: SpecialIbGibType,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr | null> {
    const lc = `[${createSpecial_Autosyncs.name}]`;
    try {
        if (!space) { throw new Error(`space required. (E: c7bbafcbe901418db4c6048f17f53091)`); }

        if (logalot) { console.log(`${lc} creating special of type: ${type} (I: 283c8bb30ed6f9698b74b886c6078622)`); }

        let specialAddr: IbGibAddr;
        const configKey = getSpecialConfigKey({ type });

        const specialIbGib = await createSpecialIbGib({
            type,
            space,
            zeroSpace,
            fnBroadcast,
            fnUpdateBootstrap,
        });
        specialAddr = h.getIbGibAddr({ ibGib: specialIbGib });
        await setConfigAddr({ key: configKey, addr: specialAddr, space, zeroSpace, fnUpdateBootstrap });

        return specialAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return null;
    }
}

/**
 * 1. Creates a new robbot ibgib with the given properties.
 * 2. Persists graph in given {@link space}
 * 3. Registers the new robbot ibgib in that space, using the given
 *    {@link fnUpdateBootstrap} and {@link fnBroadcast} functions.
 * 4. Relates the new robbot to the special robbots ibgib.
 *
 * @returns the new robbot ibgib and new robbots address.
 */
// export async function createRobbotIbGib({
//     robbotData,
//     space,
//     zeroSpace,
//     fnUpdateBootstrap,
//     fnBroadcast,
// }: {
//     robbotData: RobbotData_V1,
//     space: IbGibSpaceAny,
//     zeroSpace: IbGibSpaceAny,
//     fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
//     fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
// }): Promise<{ newRobbotIbGib: RobbotIbGib_V1, newRobbotsAddr: string }> {
//     const lc = `[${createRobbotIbGib.name}]`;
//     try {
//         if (logalot) { console.log(`${lc} starting...`); }
//         if (!space) { throw new Error(`space required. (E: 5def0b1afab74b0c9286e3ac5060cb8f)`); }
//         if (!robbotData) { throw new Error(`robbotData required (E: cd0304401a2f5a63d86dd71f76f31222)`); }

//         const ib = getRobbotIb({ robbotData });
//         const resNewRobbot = await factory.firstGen({
//             parentIbGib: factory.primitive({ ib: "robbot" }),
//             ib,
//             data: robbotData,
//             linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
//             tjp: { uuid: true, timestamp: true },
//             dna: true,
//             nCounter: true,
//         });
//         const newRobbot = <RobbotIbGib_V1>resNewRobbot.newIbGib;
//         await persistTransformResult({ resTransform: resNewRobbot, isMeta: true, space });
//         await registerNewIbGib({ ibGib: newRobbot, space, zeroSpace, fnBroadcast, fnUpdateBootstrap });
//         const newRobbotsAddr = await rel8ToSpecialIbGib({
//             type: "robbots",
//             rel8nName: c.ROBBOT_REL8N_NAME,
//             ibGibsToRel8: [newRobbot],
//             space,
//             zeroSpace,
//             fnUpdateBootstrap,
//             fnBroadcast,
//         });
//         return { newRobbotIbGib: newRobbot, newRobbotsAddr };
//     } catch (error) {
//         console.error(`${lc} ${error.message}`);
//         throw error;
//     } finally {
//         if (logalot) { console.log(`${lc} complete.`); }
//     }
// }


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
                    newerAddr = h.getIbGibAddr({ ibGib: x });
                    return -1;
                }
                if (xPast.length === 0) { return n; } // no more past to increment
                let newCount = n + xPast.length;
                if (firstIterationCount !== -1 && newCount > firstIterationCount) {
                    // we've determined that the second iteration has a longer past,
                    // so we don't need to look further
                    newerAddr = h.getIbGibAddr({ ibGib: x });
                    return -1;
                }
                // load up the earliest one and call recursively
                let resNextX = await getFromSpace({ addr: xPast[0], space });
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
export function rel8TagToTagsIbGib({
    tagIbGib,
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    tagIbGib: IbGib_V1,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<IbGibAddr> {
    return rel8ToSpecialIbGib({
        type: "tags",
        rel8nName: c.TAG_REL8N_NAME,
        ibGibsToRel8: [tagIbGib],
        space,
        zeroSpace,
        fnUpdateBootstrap,
        fnBroadcast,
    });
}


/**
 * Throws an error if any duplicates found in either array.
 *
 * ## notes
 *
 * Only pass in ibGib or ibGibAddrs, not both. Warns if both are passed in though.
 *
 * @throws if both params are falsy or if addrs || mapped addrs contains duplicates.
 */
export function throwIfDuplicates({
    ibGibs,
    ibGibAddrs,
}: {
    ibGibs?: IbGib_V1[],
    ibGibAddrs?: IbGibAddr[],
}): void {
    const lc = `[${throwIfDuplicates.name}]`;
    try {
        if (!ibGibs && !ibGibAddrs) { throw new Error(`either ibGibs or ibGibAddrs required. (E: 37776788620f4966b0964945ce181fc6)`); }
        if (ibGibs && ibGibAddrs) { console.warn(`${lc} both ibGibs and ibGibAddrs provided. You should only provide one. Only ibGibAddrs will be checked. (W: dc13f9e197834e2daaba3bcfd08418db)`); }

        const addrs = ibGibAddrs ? ibGibAddrs.concat() : ibGibs.map(x => h.getIbGibAddr({ ibGib: x }));
        for (let i = 0; i < addrs.length; i++) {
            const addr = addrs[i];
            if (addrs.filter(x => x === addr).length > 1) { throw new Error(`duplicate addr found: ${addr} (E: 70fbef040dd449c38c667d53b8092053)`); }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function getSpaceLockAddr({
    space,
    scope,
}: {
    space: IbGibSpaceAny,
    scope: SpaceLockScope,
}): IbGibAddr {
    const lc = `[${getSpaceLockAddr.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!space) { throw new Error(`space required. (E: 3ba16e6c3e5e47948b0e63448da11752)`); }
        if (!space.data?.uuid) { throw new Error(`invalid space (space.data.uuid falsy) (E: 273262b32f2ef27b2e690bc699f33822)`); }
        if (!scope) { throw new Error(`scope required. (E: f47801d6c45e2247b42a53d9b604b522)`); }
        while (scope.includes(IBGIB_DELIMITER)) {
            if (logalot) { console.log(`${lc} scope contains ibgib delimiter...replacing... (I: 0f456fd7cc6552a799673a0c5b4a7d22)`); }
            scope = scope.replace(IBGIB_DELIMITER, '_');
        }

        const spaceId = space.data!.uuid;
        const ib = `${c.SPACE_LOCK_IB_TERM} ${spaceId} ${scope}`;
        const gib = GIB;
        return h.getIbGibAddr({ ib, gib });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * Executes some function `fn` against/in a given `space` while
 * performing lock plumbing in that space.
 *
 * By this, I mean that this function takes care of acquiring the lock,
 * attempting retries according to the parameters, and then unlocking
 * the space regardless of result/error.
 *
 * @returns result of inner `fn` with `TResult`
 */
export async function execInSpaceWithLocking<TResult>({
    space,
    scope,
    secondsValid,
    maxDelayMs,
    fn,
    callerInstanceId,
    maxLockAttempts,
}: {
    space: IbGibSpaceAny,
    scope: string,
    secondsValid: number,
    /**
     * If resource locked, will delay at max this ms.
     */
    maxDelayMs?: number,
    fn: () => Promise<TResult>,
    /**
     * for use differentiating among tabs.
     *
     * ## intent
     * the idea is the ibgibs service has an instance id and passes it in here.
     */
    callerInstanceId?: string,
    /**
     * if given, will try to acquire lock at most this many times, else
     * will default to {@link c.DEFAULT_MAX_DELAY_RETRY_LOCK_ACQUIRE_ATTEMPTS}.
     */
    maxLockAttempts?: number,
}): Promise<TResult> {
    const lc = `[${execInSpaceWithLocking.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        // #region validation

        if (!space) { throw new Error(`space required. (E: 66fd8f21a5b2b572d18cdeb9472a7722)`); }
        if (!secondsValid) { throw new Error(`secondsValid required. (E: 92c5610e57ceede5ce83cff86d5c2a22)`); }
        if (secondsValid < 0) { throw new Error(`secondsValid must be positive. (E: 970a7510c517235d7a355a843d18d222)`); }
        // if (secondsValid > c.MAX_LOCK_SECONDS_VALID) { throw new Error(`secondsValid arg (${secondsValid}) exceeds max secondsValid (${c.MAX_LOCK_SECONDS_VALID}) (E: 4cffe49a23c8f1698bf7c78eaccbb722)`); }
        if (!fn) { throw new Error(`fnGet required (E: 7022e280252ec2faf756b6db05c56e22)`); }

        // #endregion validation

        let resultFn: TResult;

        if (logalot) { console.log(`${lc} attempting to acquire lock with scope ${scope} (I: fed36d42a975b1c52897a4df804ac722)`); }
        let lockIbGib: IbGibSpaceLockIbGib;
        maxDelayMs =
            (maxDelayMs ?? 0) > 0 ? maxDelayMs : c.DEFAULT_MAX_DELAY_MS_RETRY_LOCK_ACQUIRE
        let attempts = 0;
        maxLockAttempts =
            maxLockAttempts > 0 ?
                maxLockAttempts :
                c.DEFAULT_MAX_DELAY_RETRY_LOCK_ACQUIRE_ATTEMPTS;
        do {
            lockIbGib = await lockSpace({
                space,
                scope,
                secondsValid,
                instanceId: callerInstanceId,
            });
            if (lockIbGib?.data?.success) { break; }
            /** Delay a small random amount of time before trying again. */
            let delayMs = Math.ceil(Math.random() * maxDelayMs);
            await h.delay(delayMs);
        } while (attempts < maxLockAttempts);
        if (lockIbGib?.data?.success) {
            if (logalot) { console.log(`${lc} lock acquired. (I: d847fa953ee131a57e1a89c537342722)`); }
        } else {
            throw new Error(`could not acquire lock after ${attempts} attempts with intermittent delays of ${maxDelayMs} ms (E: 898c559dbd0c9bf20c14cf87a8f1e222)`);
        }

        // execute the actual get inside an additional try..catch..finally
        // to ensure (attempted) unlockSpace call.
        const lc2 = `${lc}[fn]`;
        try {
            if (logalot) { console.log(`${lc2} starting... (I: c2f7bedf95d3f1dd1f76de34a68d3f22)`); }
            resultFn = await fn();
        } catch (error) {
            console.error(`${lc2} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc2} unlocking space with scope: ${scope} (I: 21034d9c3395499756e9000e40417d22)`); }
            await unlockSpace({ space: space, scope: scope, instanceId: callerInstanceId });
            if (logalot) { console.log(`${lc2} complete. (I: 79d8ac03714a4d429c7e6c2ac6e18d22)`); }
        }

        return resultFn;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * Gets the bootstrap ibgib in the given `zeroSpace`.
 *
 * @example
 *
 * ```json
 * {
 *     "ib":"bootstrap",
 *     "gib":"gib",
 *     "data":{
 *         "defaultSpaceId":"d455d9a72807617634ccbf1e532b71037c45762f824ec85fcd9a4c2275562f33",
 *         "spaceIds":["d455d9a72807617634ccbf1e532b71037c45762f824ec85fcd9a4c2275562f33"]
 *     },
 *     "rel8ns":{
 *         "d455d9a72807617634ccbf1e532b71037c45762f824ec85fcd9a4c2275562f33":[
 *             "witness space IonicSpace_V1 oij d455d9a72807617634ccbf1e532b71037c45762f824ec85fcd9a4c2275562f33^B336251655E8C56B38E9E86F20E0E42E6C153785F1A0A798ADE6916E71CF055B"
 *         ]
 *     }
 * }
 * ```
 *
 * @returns bootstrapIbGib if found
 */
export async function getValidatedBootstrapIbGib({
    zeroSpace,
}: {
    zeroSpace: IbGibSpaceAny,
}): Promise<BootstrapIbGib | null> {
    const lc = `[${getValidatedBootstrapIbGib.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!zeroSpace) { throw new Error(`zeroSpace required. (E: 66fd8f21a5b2b572d18cdeb9472a7722)`); }

        const bootstrapAddr = c.BOOTSTRAP_IBGIB_ADDR;

        if (logalot) { console.log(`${lc} getting from zeroSpace...`); }
        const argGet = await zeroSpace.argy({
            ibMetadata: getSpaceArgMetadata({ space: zeroSpace }),
            argData: {
                cmd: 'get',
                ibGibAddrs: [bootstrapAddr],
                isMeta: true,
            },
        });
        const resGetBootstrapIbGib = await zeroSpace.witness(argGet);

        if (resGetBootstrapIbGib?.data?.success && resGetBootstrapIbGib.ibGibs?.length === 1) {
            // bootstrap found
            const bootstrapIbGib = resGetBootstrapIbGib!.ibGibs![0]!;
            if (logalot) { console.log(`${lc} bootstrapibGib found: ${h.pretty(bootstrapIbGib)}`); }
            if (await validateBootstrapIbGib(bootstrapIbGib)) {
                return <BootstrapIbGib>bootstrapIbGib;
            } else {
                if (logalot) { console.log(`${lc} bootstrapIbGib was invalid. (I: cce66b26805404fc85525d565e1f8b22)`); }
                return null;
            }
        } else {
            if (logalot) { console.log(`${lc} bootstrapIbGib NOT found. (I: 421562993bf3464eb507d2967d311e22)`); }
            return null;
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}


/**
 * So when loading the local user space, even if the class changes or default
 * constructors change, the internal `data` is loaded from file.
 */
export async function getLocalSpace<TSpace extends IbGibSpaceAny>({
    zeroSpace,
    bootstrapIbGib,
    localSpaceId,
    lock,
    callerInstanceId,
    fnDtoToSpace,
    localSpaceCacheSvc,
}: {
    /**
     * A zero space is a space that is built with default settings that
     * is not specific to a user.
     *
     * This is the foundational space that all spaces share, out of which
     * a bootstrap ibgib can be found that will itself have rel8ns to other
     * spaces.
     *
     * ## notes
     *
     * This is what I was calling a zeroSpace, but that will in the future
     * mean a default space among a group of spaces.
     */
    zeroSpace: IbGibSpaceAny,
    /**
     * bootstrap ibGib, if provided, which was found in the zero space.
     * The bootstrap ibgib should have a rel8n entry to the local space.
     *
     * ## future
     *
     * We will have multiple local spaces to choose from, with a default
     * being the one that we're referring to atow.
     */
    bootstrapIbGib?: BootstrapIbGib,
    /**
     * If provided, will look for the space via this id in the bootstrap ibgib.
     * If not provided, will use the bootstrap ibgib's default spaceId.
     */
    localSpaceId?: SpaceId,
    /**
     * If true, we will lock on getting the bootstrap ibgib (if needed), as
     * well as getting the user space.
     */
    lock?: boolean,
    /**
     * for use differentiating among tabs.
     *
     * ## intent
     * the idea is the ibgibs service has an instance id and passes it in here.
     */
    callerInstanceId: string,
    /**
     * function that turns the space dto into the space witness.
     *
     * ## intent
     *
     * When loading a space, the only part stored is the ibgib data. You still
     * need a function that hydrates a witness class with that data.
     */
    fnDtoToSpace: (spaceDto: IbGib_V1) => Promise<TSpace>,
    /**
     * Optional caching service
     */
    localSpaceCacheSvc?: IbGibCacheService,
}): Promise<TSpace> {
    const lc = `[${getLocalSpace.name}]`;
    try {
        if (!zeroSpace) { throw new Error(`zeroSpace required. (E: 0793781a98c456a666cfa9eb960bcd22)`); }

        if (!bootstrapIbGib) {
            if (logalot) { console.log(`${lc} bootstrap falsy, so loading it... (I: f2366e38283495a38b5501297aa34422)`); }
            if (lock) {
                const bootstrapAddr = c.BOOTSTRAP_IBGIB_ADDR;
                if (logalot) { console.log(`${lc} using locked version of loading bootstrap... (I: 52b9b11999674e586d051c2b23f59b22)`); }
                bootstrapIbGib = await execInSpaceWithLocking<BootstrapIbGib>({
                    space: zeroSpace,
                    scope: bootstrapAddr,
                    fn: () => { return getValidatedBootstrapIbGib({ zeroSpace }); },
                    callerInstanceId,
                    secondsValid: c.DEFAULT_SECONDS_VALID_LOCAL,
                });
            } else {
                if (logalot) { console.log(`${lc} lock is false, so just getting the bootstrap ibgib (I: 49d55e5a824510bb3ee0ccd9f5ec3322)`); }
                bootstrapIbGib = await getValidatedBootstrapIbGib({ zeroSpace });
            }
        }

        if (!bootstrapIbGib) { throw new Error(`bootstrapIbGib falsy. not initialized? (E: 91f5c82b5e124178d958701ebcb09822)`); }

        localSpaceId = localSpaceId ?? bootstrapIbGib.data[c.BOOTSTRAP_DATA_DEFAULT_SPACE_ID_KEY];
        const localSpaceAddr = bootstrapIbGib.rel8ns![localSpaceId][0]; // guaranteed b/c bootstrap was validated

        const fnGet: () => Promise<TSpace> = async () => {

            const argGet = await zeroSpace.argy({
                ibMetadata: getSpaceArgMetadata({ space: zeroSpace }),
                argData: {
                    cmd: 'get',
                    ibGibAddrs: [localSpaceAddr],
                    isMeta: true,
                },
            });
            const resLocalSpace = await zeroSpace.witness(argGet);
            if (resLocalSpace?.data?.success && resLocalSpace.ibGibs?.length === 1) {
                const localSpaceDto = <TSpace>resLocalSpace.ibGibs[0];
                const localSpace = await fnDtoToSpace(localSpaceDto);
                if (localSpaceCacheSvc) { localSpace.cacheSvc = localSpaceCacheSvc; }
                return localSpace;
            } else {
                throw new Error(`Could not get local space addr (${localSpaceAddr}) specified in bootstrap space (${h.getIbGibAddr({ ibGib: bootstrapIbGib })}). (E: 6d6b45e7eae4472697ddc971438e4922)`);
            }
        }

        if (lock) {
            if (logalot) { console.log(`${lc} getting localSpaceId (${localSpaceId}) WITH locking (I: c48a0e4ac5971cdbc57273dd35f8a522)`); }
            return await execInSpaceWithLocking({
                space: zeroSpace,
                scope: localSpaceId,
                fn: () => { return fnGet(); },
                callerInstanceId,
                secondsValid: c.DEFAULT_SECONDS_VALID_LOCAL,
            });
        } else {
            if (logalot) { console.log(`${lc} getting localSpaceId (${localSpaceId}) WITHOUT locking (I: 48e504835dee4006839df8820d860b22)`); }
            return fnGet();
        }

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function lockSpace({
    space,
    scope,
    secondsValid,
    instanceId,
}: IbGibSpaceLockOptions): Promise<IbGibSpaceLockIbGib> {
    const lc = `[${lockSpace.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!space) { throw new Error(`space required. (E: 5c0a7197a75f483a82d74e5eea60df37)`); }
        if (!scope) { throw new Error(`scope required. (E: c7f1dde9570f4df3b450faa2c2f85122)`); }
        if (!secondsValid) { throw new Error(`secondsValid required and positive (E: b42b6733638b46c06c9aff59a6c49822)`); }
        if (secondsValid < 0) { throw new Error(`secondsValid must be positive (E: bbe3b6d567583bfb35a1c0825eb29622)`); }

        /** what we will return */
        let resLockIbGib: IbGibSpaceLockIbGib;

        /** space lock address is deterministic ibgib primitive (gib === 'gib') */
        const spaceLockAddr = getSpaceLockAddr({ space, scope });

        // check for existing lock...
        let existingLock: IbGibSpaceLockIbGib;

        // ...in space's backing store (file, IndexedDB entry, DB, etc.)

        let getLock = await getFromSpace({
            addr: spaceLockAddr, isMeta: true, space, force: true
        });
        if (getLock.success && getLock.ibGibs?.length === 1) {
            existingLock = <IbGibSpaceLockIbGib>getLock.ibGibs[0];
            if (isExpired({ expirationTimestampUTC: existingLock.data.expirationUTC })) {
                // lock expired, so log only. skipping delete atow because should be overwritten
                // when the new lock is in place.
                if (logalot) { console.log(`${lc} ignoring expired existing lock in space at ${spaceLockAddr}. Should be overwritten (I: 7421c5b051724b189f88cecbbd449b22)`); }
                existingLock = undefined;
            }
        } else {
            if (logalot) { console.log(`${lc} existing lock not found for ${spaceLockAddr} (I: 191af56ec4e2db3d19084e46bf949222)`); }
        }

        // populate resLockIbGib if/else existingLock
        if (existingLock) {
            // valid lock already exists, so return informing caller.  this includes
            // the existing lock's info, i.e. its expiration
            resLockIbGib = <IbGibSpaceLockIbGib>h.clone(existingLock);
            resLockIbGib.data.alreadyLocked = true;
            resLockIbGib.data.success = false;
        } else {
            // not yet locked so immediately lock in memory for space, then via
            // `space.put(lock)`
            const { ib, gib } = h.getIbAndGib({ ibGibAddr: spaceLockAddr });
            resLockIbGib = <IbGibSpaceLockIbGib>{
                ib, gib,
                data: {
                    scope,
                    secondsValid,
                    instanceId,
                    expirationUTC: getExpirationUTCString({ seconds: secondsValid }),
                }
            };
            const resPut = await putInSpace({ ibGib: resLockIbGib, isMeta: true, force: true, space });
            if (resPut.success) {
                resLockIbGib.data.success = true;
            } else {
                const emsg = `${lc} there was an error putting the lock in the space: ${resPut.errorMsg}`;
                resLockIbGib.data.success = false;
                resLockIbGib.data.errorMsg = emsg;
                console.error(emsg);
            }
        }

        return resLockIbGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export async function unlockSpace({
    space,
    scope,
    instanceId,
}: IbGibSpaceLockOptions): Promise<IbGibSpaceLockIbGib> {
    const lc = `[${unlockSpace.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!space) { throw new Error(`space required. (E: 5c0a7197a75f483a82d74e5eea60df37)`); }
        if (!scope) { throw new Error(`scope required. (E: c7f1dde9570f4df3b450faa2c2f85122)`); }

        /** space lock address is deterministic ibgib primitive (gib === 'gib') */
        const spaceLockAddr = getSpaceLockAddr({ space, scope });

        // delete in file if it exists
        let resDelete = await deleteFromSpace({ addr: spaceLockAddr, isMeta: true, space, force: true });
        if (resDelete.success) {
            const { ib, gib } = h.getIbAndGib({ ibGibAddr: spaceLockAddr });
            return <IbGibSpaceLockIbGib>{
                ib, gib,
                data: {
                    // action: 'unlock',
                    success: true,
                    instanceId,
                    scope,
                }
            };
        } else {
            /** May NOT be an error, just setting this here is convenient to code. */
            const emsg = `Delete lock in space failed. delete errorMsg: ${resDelete.errorMsg}`;
            if (emsg.includes('not implemented')) {
                // rethrow error if space has not implemented a delete command handler
                throw new Error(emsg);
            } else if (
                emsg.toLowerCase().includes(`does not exist`) ||
                emsg.toLowerCase().includes(`doesn't exist`) ||
                emsg.toLowerCase().includes(`not found`)
            ) {
                // don't want to warn if just file didn't exist
                if (logalot) { console.log(`${lc} ${emsg} (I: b647916fd0f3e5366e9387131be21c22)`); }
                const { ib, gib } = h.getIbAndGib({ ibGibAddr: spaceLockAddr });
                return <IbGibSpaceLockIbGib>{
                    ib, gib,
                    data: {
                        action: 'unlock',
                        success: true,
                        instanceId,
                        scope,
                    }
                };
            } else {
                console.warn(`${lc} ${emsg} (W: 14c84fcac15944bd9a417099964d5d9d)`);
            }
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * Updates the bootstrap^gib record in the default space data store
 * with the 'space' rel8n set to the `newSpaceAddr`.
 *
 * This way, if the app closes at this point, it will know to look at this
 * space when it loads.
 *
 * ## notes
 *
 * I'm probably typing this all over, but the bootstrap^gib is the
 * first record that the app looks at to know what space to load.
 * The space itself has configuration and has a proper gib hash
 * so it's verifiable. But the initial bootstrap^gib record is
 * NOT, since it only has 'gib' as its address (and thus its not hashed).
 *
 * In the future, this could be alleviated by asking other witnesses
 * "Hey what was my last bootstrap^gib hash", but there's no way to
 * do it beyond this without using some kind of authentication/secret(s)
 * that generate the record, i.e. encrypting bootstrap^gib cleverly.
 */
export async function updateBootstrapIbGib({
    space,
    zeroSpace,
    setSpaceAsDefault,
    createIfNotFound,
}: {
    /**
     * space to add/replace in the bootstrap^gib ibgib.
     */
    space: IbGibSpaceAny,
    /**
     * default "zero" space which contains a bootstrap^gib ibgib.
     */
    zeroSpace?: IbGibSpaceAny,
    /**
     * set the space as the default local space in the bootstrap^gib ibgib.
     */
    setSpaceAsDefault?: boolean,
    /**
     * If bootstrap not found, create a new one
     */
    createIfNotFound?: boolean,
}): Promise<void> {
    const lc = `[${updateBootstrapIbGib.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!space) { throw new Error(`space required. (E: 6fc19548fa7d1d5219e19871f280a322)`); }
        if (!space.data?.uuid) { throw new Error(`space.data.uuid required (E: 6483188ca6f2ed2085fd355595f3ab22)`); }
        if (!zeroSpace) { throw new Error(`zeroSpace required. (E: abbf156e18b1018d96273e22a260f122)`); }

        const spaceId = space.data.uuid;
        const newSpaceAddr = h.getIbGibAddr({ ibGib: space });

        /** validated bootstrap ibgib or null */
        let bootstrapIbGib = await getValidatedBootstrapIbGib({ zeroSpace });
        if (!bootstrapIbGib) {
            if (!createIfNotFound) {
                if (logalot) { console.log(`${lc} bootstrapIbGib not found but createIfNotFound falsy, so returning early. (I: 5c67d85a8599a5ba4a6780f26a66ea22)`); }
                return; /* <<<< returns early */
            }

            // create the bootstrap^gib space that points to user space
            if (logalot) { console.log(`${lc} creating new bootstrap ibgib for spaceId (${spaceId}) with address of (${newSpaceAddr}) (I: 651959c27bf2ebc5be1f7f44e2b9e422)`); }
            const { ib: bootstrapIb, gib } = h.getIbAndGib({ ibGibAddr: c.BOOTSTRAP_IBGIB_ADDR });
            bootstrapIbGib = <any>factory.primitive({ ib: bootstrapIb });
            bootstrapIbGib.gib = gib;
            bootstrapIbGib.data = <BootstrapData>{
                /**
                 * first space is automatically set as default, regardless of
                 * `setSpaceAsDefault` value
                 */
                [c.BOOTSTRAP_DATA_DEFAULT_SPACE_ID_KEY]: spaceId,
                [c.BOOTSTRAP_DATA_KNOWN_SPACE_IDS_KEY]: [spaceId],
            };
            bootstrapIbGib.rel8ns = <BootstrapRel8ns>{
                /**
                 * individual spaces indexed by spaceId, should be length === 1
                 * with the value being the most recent.
                 */
                [spaceId]: [newSpaceAddr],
            };
        } else {
            // update existing bootstrap with newSpaceAddr for given spaceId
            if (logalot) { console.log(`${lc} updating existing bootstrap (I: 977d4aa7ed47bef73b35743c05ce0722)`); }
            if (bootstrapIbGib.data.spaceIds.includes(spaceId)) {
                if (logalot) { console.log(`${lc} space already rel8d to bootstrap, possibly updating its addr (I: b5e2c515ef732d4bbcf02625a9e7c722)`); }
                const existingSpaceAddr = bootstrapIbGib.rel8ns[spaceId][0]; // guaranteed b/c bootstrap validated
                if (existingSpaceAddr === newSpaceAddr) {
                    if (logalot) { console.log(`${lc} bootstrap already rel8d to space (I: c1be027b23e7350c64790a631cae2822)`); }
                } else {
                    if (logalot) { console.log(`${lc} updating rel8ns[${spaceId}] with newSpaceAddr (${newSpaceAddr}). (Old address: ${existingSpaceAddr})(I: 297a9b0061fd471b8d28a06e04a6ad22)`); }
                    bootstrapIbGib.rel8ns[spaceId] = [newSpaceAddr];
                }
            } else {
                // new space being rel8d to bootstrap
                if (logalot) { console.log(`${lc} new space being rel8d. adding spaceId to data.spaceIds and amending rel8ns (I: 40903d71719aa1d56e498299f5699a22)`); }
                bootstrapIbGib.data.spaceIds.push(spaceId);
                bootstrapIbGib.rel8ns[spaceId] = [newSpaceAddr];
            }
            if (setSpaceAsDefault) {
                if (logalot) { console.log(`${lc} setting spaceId (${spaceId}) as default space (I: f85eda6c6ad2b0bec9750ce3c7795b22)`); }
                bootstrapIbGib.data[c.BOOTSTRAP_DATA_DEFAULT_SPACE_ID_KEY] = spaceId;
            }
        }

        if (logalot) { console.log(`${lc} saving bootstrapIbGib: ${h.pretty(bootstrapIbGib)} (I: 3cceca0b98dde90e4a58a734be252322)`); }

        // save the bootstrap^gib in the zero space for future space loadings,
        // especially when the app first starts up
        const argPutBootstrap = await zeroSpace.argy({
            ibMetadata: bootstrapIbGib.ib,
            argData: {
                cmd: 'put', isMeta: true, force: true,
                ibGibAddrs: [h.getIbGibAddr({ ibGib: bootstrapIbGib })],
            },
            ibGibs: [bootstrapIbGib],
        });
        if (logalot) { console.log(`${lc} zeroSpace will witness/put... (I: 1be9aca22ffc4951b6690965a7aeae5b)`); }
        const resPutBootstrap = await zeroSpace.witness(argPutBootstrap);
        if (resPutBootstrap?.data?.success) {
            if (logalot) { console.log(`${lc} zero space put complete. (I: ac3056d655e841f1a3c442bcc64942f9)`); }
        } else {
            throw new Error(`${resPutBootstrap?.data?.errors?.join('|') || "There was a problem with zeroSpace witnessing the bootstrap^gib primitive pointing to the new user space"}`);
        }
        if (logalot) { console.log(`${lc} complete.`); }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }

}

export function getSpaceArgMetadata({ space }: { space: IbGibSpaceAny }): string {
    return `${space.ib} ${getTimestampInTicks()}`;
}

export function getSpaceResultMetadata({ space }: { space: IbGibSpaceAny }): string {
    return `${space.ib} ${getTimestampInTicks()}`;
}

export function getSpaceIb({
    space,
    classname,
}: {
    space: IbGibSpaceAny,
    classname: string,
}): Ib {
    const lc = `[${getSpaceIb.name}]`;
    try {
        if (!space) { throw new Error(`space required (E: 4dabec34ee77d67c9cc30ee3c3049622)`); }
        if (!classname) { throw new Error(`classname required (E: fa3af4613ad56742dab51d1b0d839322)`); }
        if (classname.includes(' ')) { throw new Error(`invalid classname. cannot contain spaces (E: 243adbf720dcce7904e2665933208b22)`); }
        const name = space.data?.name || c.IBGIB_SPACE_NAME_DEFAULT;
        if (name.includes(' ')) { throw new Error(`invalid space name. cannot contain spaces (E: a8450e1651081412c8ac018520182422)`); }
        const id = space.data?.uuid || undefined;
        if (id.includes(' ')) { throw new Error(`invalid space id. cannot contain spaces (E: 8696830fe7f54bfa85e670a063f3e089)`); }
        let ib = `witness space ${classname} ${name} ${id}`;
        return ib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function isSpaceIb({
    ib
}: {
    ib: Ib
}): boolean {
    const lc = `[${isSpaceIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 53ad337f8148616a77caca5dff0f8722)`); }
        return ib.startsWith('witness space ') || ib.startsWith('outerspace sync ');
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * ## current schema FOR LOCAL (IONIC) SPACES:
 *
 * `witness space [classname] [spaceName] [spaceId]`
 *
 * ## current schema FOR SYNC (AWS) OUTERSPACES:
 *
 * `outerspace sync [spaceName]
 *
 * ## I need to fix this somehow...
 *
 * This is why I'm working on streamlining space management
 *
 * (To start with, I just had to get the ball rolling and tried my best.)
 *
 * ## NOTES
 *
 * * both schemas are space-delimited
 */
export function getInfoFromSpaceIb({
    spaceIb,
}: {
    spaceIb: Ib,
}): {
    /**
     * currently this can be SpaceId OR undefined.
     */
    spaceClassname: string,
    /**
     * non-unique spaceName of the given space (i.e. most likely space.data.name)
     */
    spaceName: string,
    /**
     * currently this returns EITHER SpaceId OR undefined.
     *
     * This is because of my using different schemas for local/outer spaces...
     *
     * (for better or worse)
     */
    spaceId: SpaceId,
    spaceType: 'outer' | 'local' | 'inner',
} {
    const lc = `[${getInfoFromSpaceIb.name}]`;
    try {
        if (!spaceIb) { throw new Error(`spaceIb required (E: fa5424cfb7e846e2851562f2f417944f)`); }

        if (spaceIb.startsWith('witness space ')) {
            // const name = space.data?.name || c.IBGIB_SPACE_NAME_DEFAULT;
            // const id = space.data?.uuid || undefined;
            // return `witness space ${classname} ${name} ${id}`;
            const pieces = spaceIb.split(' ');
            return {
                spaceClassname: pieces[2],
                spaceName: pieces[3],
                spaceId: pieces[4],
                spaceType: 'local',
            };
        } else if (spaceIb.startsWith('outerspace sync ')) {
            const pieces = spaceIb.split(' ');
            return {
                spaceClassname: undefined,
                spaceName: pieces[2],
                spaceId: undefined,
                spaceType: 'outer',
            };
        } else {
            throw new Error(`unknown spaceIb schema (spaceIb: ${spaceIb}) (E: a6d361be85d5f25d6a464a5896186322)`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}
/**
 * Helper function that generates a unique-ish id.
 *
 * atow this is just `return (await h.getUUID()).slice(0, c.DEFAULT_TX_ID_LENGTH);`
 *
 * ## notes
 *
 * The thinking is that it only has to be a couple characters in length
 * because this is supposed to only be a unique id within the scope of
 * a tx which has its own tjp (gib) used as the id for the entire communication
 * saga.
 *
 * @returns txId
 */
export async function getNewTxId({
    length,
}: {
    /**
     * length of txId
     *
     * @default c.DEFAULT_TX_ID_LENGTH
     */
    length?: number,
} = { length: c.DEFAULT_TX_ID_LENGTH }): Promise<TxId> {
    const lc = `[${getNewTxId.name}]`;
    try {
        length = length || c.DEFAULT_TX_ID_LENGTH;
        return <TxId>(await h.getUUID()).slice(0, length);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * wrapper for dealing with a space.
 *
 * convenience function for creating an arg ibgib to send to the given space
 * using Cmd/CmdModifiers for getting latest addrs.
 *
 * @returns space result ibgib from the given `space.witness` call.
 */
export async function getLatestAddrs({
    ibGibs,
    addrs,
    tjps,
    tjpAddrs,
    space,
}: {
    ibGibs?: IbGib_V1[],
    addrs?: IbGibAddr[],
    tjps?: IbGib_V1[],
    tjpAddrs?: IbGibAddr[],
    space: SpaceBase_V1<IbGib_V1>,
}): Promise<IbGibSpaceResultIbGib<IbGib_V1, IbGibSpaceResultData, IbGibSpaceResultRel8ns>> {
    let lc = `[${getLatestAddrs.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!space) { throw new Error(`space required. (E: 4d188d6c863246f28aa575753a052304)`); }

        // so we don't have to do a bunch of conditional checks all over
        ibGibs = ibGibs ?? []; addrs = addrs ?? [];
        tjps = tjps ?? []; tjpAddrs = tjpAddrs ?? [];

        if (
            addrs.length === 0 && ibGibs.length === 0 &&
            tjps.length === 0 && tjpAddrs.length === 0
        ) {
            throw new Error(`Either addrs, ibGibs, tjps, or tjpAddrs required. (E: 7c6ebfbab98d4d21a431b144457fd991)`);
        }

        /**
         * Addrs that we'll ultimately send to the space. They start off as
         * tjpAddrs (and derived from `tjps` if any), and then add the incoming
         * ibgibs/addrs if we don't already have their corresponding tjpAddrs
         * being queried.
         * */
        const addrsToQuery = new Set<IbGibAddr>(
            tjpAddrs.concat(tjps.map(ibGib => h.getIbGibAddr({ ibGib })))
        );

        // add ibgibs/addrs only if they do not already have their corresponding
        // tjpAddr in the query addrs. We can do this by checking if the tjpGib
        // is located in the ibGibAddr.gib, which has the form
        // [punctiliarHash].[tjpGib]
        const tjpGibs = Array.from(addrsToQuery).map(x => h.getIbAndGib({ ibGibAddr: x }).gib);
        ibGibs.map(ibGib => h.getIbGibAddr({ ibGib }))
            .concat(addrs)
            .forEach(ibGibAddr => {
                const { gib } = h.getIbAndGib({ ibGibAddr });
                const addrHasExistingTjpGib =
                    tjpGibs.some(tjpGib => gib.includes(tjpGib));
                if (!addrHasExistingTjpGib) { addrsToQuery.add(ibGibAddr); }
            });

        if (logalot) { console.log(`${lc}[testing] ${space.data?.name || space.ib} (${space.data?.uuid || '[space.data.uuid falsy]'}) addrsToQuery: ${Array.from(addrsToQuery)} (I: 8a2202912c364238b6d6eb09577bc246)`); }

        // construct the arg and execute
        const argGet = await space.argy({
            ibMetadata: getSpaceArgMetadata({ space }),
            argData: {
                cmd: 'get',
                cmdModifiers: ['latest', 'addrs'],
                ibGibAddrs: Array.from(addrsToQuery),
            },
        });
        return await space.witness(argGet);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * I'm making this because i want to archive on a special tags index ibgib.
 * But we can't allow archiving on any old special ibgib, like the 'latest' index.
 * so this checks to see if it's on the forbidden list (winging that atm), and if it
 * is then this throws.
 *
 * use this function inside of commands that act on ibgibs that are special.
 */
export function throwIfContextIsSpecial({
    ibGib_Context,
}: {
    ibGib_Context: IbGib_V1,
}): void {
    const lc = `[${throwIfContextIsSpecial.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 5f583fd94d27731a65d514e731b8aa22)`); }

        if (!isSpecial({ ibGib: ibGib_Context })) { return; /* <<<< returns early */; }

        const FORBIDDEN_MANUAL_SPECIAL_TYPES: SpecialIbGibType[] = [
            'latest', 'roots', 'autosyncs'
        ];
        if (FORBIDDEN_MANUAL_SPECIAL_TYPES.some(x => ibGib_Context.ib.includes(x))) {
            throw new Error(`cannot perform a modification of this type on this special ibgib (E: b8fb718a7323fc54454464b973412722)`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export async function trash({
    ibGib_Context,
    rel8nName_Context,
    addr,
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    ibGib_Context: IbGib_V1,
    rel8nName_Context: string,
    addr: IbGibAddr,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast?: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<void> {
    const lc = `[${trash.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 2dc486bb2d516e4534f437aaf5ec7f22)`); }
        if (!ibGib_Context) { throw new Error(`ibGib_Context required (E: 75f7bfa93145d6dffe85d488443ca722)`); }
        if (!rel8nName_Context) { throw new Error(`rel8nName_Context required (E: 12aaa43de9e34b68b25dc9a2a68ad6b9)`); }
        if (!addr) { throw new Error(`addr required (E: e27df3bdc5a2554697cc9597afc4e422)`); }
        if (!space) { throw new Error(`space required (E: 2e3562486ed2956a770ed9e8d77a3f22)`); }

        const contextIsSpecialIbGib = isSpecial({ ibGib: ibGib_Context });
        if (contextIsSpecialIbGib) { throwIfContextIsSpecial({ ibGib_Context }); }

        const resNewContext = await V1.rel8({
            src: ibGib_Context,
            rel8nsToAddByAddr: { [c.TRASH_REL8N_NAME]: [addr] },
            rel8nsToRemoveByAddr: { [rel8nName_Context]: [addr] },
            dna: true,
            nCounter: true,
        });

        await persistTransformResult({ resTransform: resNewContext, isMeta: contextIsSpecialIbGib, space });

        if (contextIsSpecialIbGib) {
            const newSpecialAddr = h.getIbGibAddr({ ibGib: resNewContext.newIbGib });
            const specialType = getSpecialTypeFromIb({ ib: ibGib_Context.ib });
            const configKey = getSpecialConfigKey({ type: specialType });
            await setConfigAddr({ key: configKey, addr: newSpecialAddr, space, zeroSpace, fnUpdateBootstrap });
        }

        if (fnBroadcast && fnUpdateBootstrap) {
            await registerNewIbGib({
                ibGib: resNewContext.newIbGib,
                fnBroadcast,
                fnUpdateBootstrap,
                zeroSpace,
                space,
            });
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}


export async function archive({
    ibGib_Context,
    rel8nName_Context,
    addr,
    space,
    zeroSpace,
    fnUpdateBootstrap,
    fnBroadcast,
}: {
    ibGib_Context: IbGib_V1,
    rel8nName_Context: string,
    addr: IbGibAddr,
    space: IbGibSpaceAny,
    zeroSpace: IbGibSpaceAny,
    fnUpdateBootstrap: (newSpace: IbGibSpaceAny) => Promise<void>,
    fnBroadcast?: (info: IbGibTimelineUpdateInfo) => void,
}): Promise<void> {
    const lc = `[${archive.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 38098552b830495187299bb24fcddff0)`); }
        if (!ibGib_Context) { throw new Error(`ibGib_Context required (E: d819e8c4db5b4c0bb721300ba434cd40)`); }
        if (!rel8nName_Context) { throw new Error(`rel8nName_Context required (E: de061adff8c04429a211aa09116a532d)`); }
        if (!addr) { throw new Error(`addr required (E: 7059ebb8ef6149ea94e22f961d6b5c81)`); }
        if (!space) { throw new Error(`space required (E: e19566f2d42347798621447edcae312e)`); }

        const contextIsSpecialIbGib = isSpecial({ ibGib: ibGib_Context });
        if (contextIsSpecialIbGib) { throwIfContextIsSpecial({ ibGib_Context }); }

        const resNewContext = await V1.rel8({
            src: ibGib_Context,
            rel8nsToAddByAddr: { [c.ARCHIVE_REL8N_NAME]: [addr] },
            rel8nsToRemoveByAddr: { [rel8nName_Context]: [addr] },
            dna: true,
            nCounter: true,
        });

        await persistTransformResult({ resTransform: resNewContext, isMeta: contextIsSpecialIbGib, space });

        if (contextIsSpecialIbGib) {
            const newSpecialAddr = h.getIbGibAddr({ ibGib: resNewContext.newIbGib });
            const specialType = getSpecialTypeFromIb({ ib: ibGib_Context.ib });
            const configKey = getSpecialConfigKey({ type: specialType });
            await setConfigAddr({ key: configKey, addr: newSpecialAddr, space, zeroSpace, fnUpdateBootstrap });
        }

        if (fnBroadcast && fnUpdateBootstrap) {
            await registerNewIbGib({
                ibGib: resNewContext.newIbGib,
                fnBroadcast,
                fnUpdateBootstrap,
                zeroSpace,
                space,
            });
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
