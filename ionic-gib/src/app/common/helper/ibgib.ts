import {
    IbGib_V1, IbGibRel8ns_V1,
    IBGIB_DELIMITER, GIB, IB,
    Factory_V1 as factory,
    sha256v1,
    IbGibData_V1,
} from 'ts-gib/dist/V1';
import { Ib, IbGibAddr, HashAlgorithm } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import * as cTsGib from 'ts-gib/dist/V1/constants';

import { SpecialIbGibType } from '../types';
import * as c from '../constants';
import { validateIb } from './validate';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { groupBy } from './utils';

// const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * Utility function to generate hard-coded ibgibs to use at runtime "on-chain" but
 * written at compile-time in (for now) "off-chain" source code.
 *
 * Because this is supposed to create and re-create deterministically the equivalent
 * of a non-primitive ibgib "constant", this function creates a single ibgib with...
 * * one ancestor
 * * no past, dna, or tjp rel8ns
 * * no tjp timestamp or uuid
 * * no nCounter
 *
 * ## validation
 *
 * * validates the given `ib` against `ibRegExpPattern` or default regexp.
 * * validates that rel8ns doesn't include default forbidden rel8n names or
 *   atow `'tjp'`.
 *
 * ## intent
 *
 * I want to be able to create deterministic ibGibs that I can reference at
 * runtime, similar to an ibgib primitive (e.g. "root^gib"), but with the
 * integrity of the `gib` hash. This way, I can reference a deterministic ibgib
 * from code at compile time, and at runtime this will have a corresponding
 * ibgib datum with gib-hashed integrity.
 *
 * ## example
 *
 * I want to create a "hard-coded" schema ibgib that I rel8 to some protocol
 * ibgib. So I'll create the data here, which lives in source control in a text file,
 * and then I'll render that as an ibgib that verifies integrity. If I as a coder change
 * it at all, then the `gib` of course will be different.
 *
 * @param param0
 */
export async function constantIbGib<TData extends IbGibData_V1 = any , TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1>({
    parentPrimitiveIb,
    ib,
    ibRegExpPattern,
    data,
    rel8ns,
}: {
    parentPrimitiveIb: Ib,
    ib: Ib,
    ibRegExpPattern?: string,
    data?: TData,
    rel8ns?: TRel8ns,
}): Promise<IbGib_V1<TData, TRel8ns>> {
    const lc = `[${constantIbGib.name}]`;
    try {
        // validation
        // parentPrimitiveIb
        if (!parentPrimitiveIb) { throw new Error(`parentPrimitiveIb required. (E: 88ddf188cc5a4340b597abefba1481e2)`); }
        if (validateIb({ib: parentPrimitiveIb}) !== null) { throw new Error(`Invalid parentPrimitiveIb: ${parentPrimitiveIb}. (E:5aec0320956d492ebeeaca41eb1fe1c6)`); }

        // ib
        if (!ib) { throw new Error(`ib required. (E: 7bbc88f4f2e842d6b00126e55b1783e4)`); }
        const regExp = ibRegExpPattern ? new RegExp(ibRegExpPattern) : c.IB_REGEXP_DEFAULT;
        if (!ib.match(regExp)) { throw new Error(`invalid ib. does not match regexp (${regExp})`); }

        // rel8ns
        const incomingRel8nNames = Object.keys(rel8ns ?? {});
        const forbiddenRel8nNames = [...cTsGib.FORBIDDEN_ADD_RENAME_REMOVE_REL8N_NAMES, 'tjp'];
        const rel8nsIsInvalid = incomingRel8nNames.some(x => {
            // we don't want constants trying to look like they have/are descendants/tjps/etc.
            return forbiddenRel8nNames.includes(x);
        });
        if (rel8nsIsInvalid) { throw new Error(`Invalid rel8ns. forbiddenRel8nNames: ${forbiddenRel8nNames}. rel8ns keys: ${Object.keys(rel8ns)}. (E: 837a993c265c4362b6aa0b1a234ea5f8)`); }


        // create the constant
        const resFirstGen = await factory.firstGen({
            ib,
            parentIbGib: factory.primitive({ib: parentPrimitiveIb}),
            data,
            rel8ns,
            dna: false,
            noTimestamp: true,
            nCounter: false,
        });
        const constantIbGib: IbGib_V1<TData, TRel8ns> =
            <IbGib_V1<TData, TRel8ns>>resFirstGen.newIbGib;

        // remove any extraneous stuff
        if (constantIbGib?.rel8ns?.past) { delete constantIbGib.rel8ns.past; }
        if (constantIbGib?.rel8ns?.tjp) { delete constantIbGib.rel8ns.tjp; }
        if (constantIbGib?.rel8ns?.identity) { delete constantIbGib.rel8ns.identity; }

        // recalculate the gib hash
        constantIbGib.gib = await sha256v1({
            ib: constantIbGib.ib,
            data: constantIbGib.data,
            rel8ns: constantIbGib.rel8ns,
        });

        return constantIbGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Binaries require special handling, since they do not conform to the
 * "normal" IbGib_V1 data structure per se. This stems from wanting to
 * be able to have binaries (jpgs, gifs, etc. especially) able to
 * sit on a server and be served as regular files.
 *
 * @returns string in expected template for binaries in this app.
 */
export function getBinIb({binHash, binExt}: {binHash: string, binExt: string}): IbGibAddr {
    return `bin ${binHash} ${binExt}`;
}
export function getBinHashAndExt({addr}: {addr: IbGibAddr}): { binHash: string, binExt: string } {
    const lc = `[${getBinHashAndExt.name}]`;
    try {
        if (!isBinary({addr})) { throw new Error(`not a bin address (E: df0804d129bc4888bd6939cb76c5e0f6)`); }
        const { ib } = h.getIbAndGib({ibGibAddr: addr});
        const ibPieces = ib.split(' ');
        const binHash = ibPieces[1];
        const binExt = ibPieces[2];
        return { binHash, binExt };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function isBinary({
    ibGib,
    addr,
}: {
    ibGib?: IbGib_V1,
    addr?: IbGibAddr,
}): boolean {
    const lc = `[${isBinary.name}]`;
    try {
        // probably overkill here, but...
        if (!ibGib && !addr) { throw new Error(`either ibGib or addr required. (E: c935b51e773f41a2a547c556e9dc16c6)`); }
        addr = addr || h.getIbGibAddr({ibGib});
        const {ib,gib} = h.getIbAndGib({ibGibAddr: addr});
        if (!ib) { return false; }
        if (!gib) { return false; }
        if (!ib.startsWith('bin ')) { return false; }
        if (gib.length !== 64) {
            console.warn(`${lc} gib length is not 64, so return false. But this may not be true if using another hash algorithm.`);
            return false;
        }
        const ibPieces = ib.split(' ');
        if (ibPieces.length !== 3) { return false; }
        if (ibPieces[1] === "") { return false; }
        return true;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function hash16816({
    s,
    algorithm,
}: {
    s: string,
    algorithm: HashAlgorithm,
}): Promise<string> {
    const lc = `[${hash16816.name}]`;
    try {
        let hash: string;
        for (let i = 0; i < 168; i++) {
            hash = await h.hash({s, algorithm});
        }
        return hash.slice(0, 16);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function getSpecialIbgibIb({type}: {type: SpecialIbGibType}): Ib {
    return `meta special ${type}`;
}

export function getSpecialIbgibAddr({type}: {type: SpecialIbGibType}): string {
    const ib = getSpecialIbgibIb({type});
    return `${ib}^${GIB}`;
}

export function getSpecialConfigKey({type}: {type: SpecialIbGibType}): string {
    return `config_key ${getSpecialIbgibAddr({type})}`;
}

/**
 * returns ib for a given root. ATOW this is simply "root {text}"
 *
 * @returns ib for the given rootText
 */
export function getRootIb(rootText: string): string {
    const lc = `[${getRootIb.name}]`;
    if (!rootText) { throw new Error(`${lc} text required.`)}
    return `root ${rootText}`;
}

/**
 * Tags for this app have the form: tag [tagText]
 *
 * @param tagText e.g. "Favorites"
 *
 * @example
 * For the Favorites tag, the ib would be "tag Favorites"
 */
export function tagTextToIb(tagText: string): string {
    const lc = `[${tagTextToIb.name}]`;
    if (!tagText) { throw new Error(`${lc} tag required.`)}
    return `tag ${tagText}`;
}

export function getCommentIb(commentText: string): string {
    const lc = `[${getCommentIb.name}]`;
    try {
        if (!commentText) { throw new Error(`commentText required. (E: 22fdfd0aa0524a18b63a9405b312c99e)`); }
        let saferText = commentText.replace(/\W/g, '');
        let ibCommentText: string;
        if (saferText.length > c.DEFAULT_COMMENT_TEXT_IB_SUBSTRING_LENGTH) {
            ibCommentText =
                saferText.substring(0, c.DEFAULT_COMMENT_TEXT_IB_SUBSTRING_LENGTH);
        } else if (saferText.length > 0) {
            ibCommentText = saferText;
        } else {
            // comment text only has characters/nonalphanumerics.
            ibCommentText = c.COMMENT_ONLY_HAS_NON_ALPHANUMERICS;
        }

        return `comment ${ibCommentText}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Living: has tjp and dna.
 * Stones: does not have Dna, maybe has tjp.
 *
 * Splits the given `ibGibs` into two maps, one that includes the ibgibs that
 * have a tjp (temporal junction point) AND dna ("living") and those that do not
 * have both tjp AND dna ("stones").
 *
 * ## notes
 *
 * Having dna implies having a tjp, but the reverse is not necessarily true.
 * Sometimes you want an ibgib that has a tjp so you can, e.g., reference the
 * entire timeline easily.  But at the same time you don't want to keep track of
 * the transforms, perhaps this is because you don't want to be able to merge
 * timelines.
 */
export function splitPerTjpAndOrDna({
    ibGibs,
    filterPrimitives,
}: {
    ibGibs: IbGib_V1[],
    filterPrimitives?: boolean,
}): {
    /** ibgibs have both tjp and dna */
    mapWithTjp_YesDna: { [gib: string]: IbGib_V1 },
    /** ibgibs have tjp but NO dna */
    mapWithTjp_NoDna: { [gib: string]: IbGib_V1 },
    /** ibgibs that have no tjp (and implicitly no dna) */
    mapWithout: { [gib: string]: IbGib_V1 }
} {
    const lc = `[${splitPerTjpAndOrDna.name}]`;
    try {
        const mapWithTjp_YesDna: { [gib: string]: IbGib_V1 } = {};
        const mapWithTjp_NoDna: { [gib: string]: IbGib_V1 } = {};
        const mapWithout: { [gib: string]: IbGib_V1 } = {};
        // const mapLivingIbGibs: { [gib: string]: IbGib_V1 } = {};
        // const mapStoneIbGibs: { [gib: string]: IbGib_V1 } = {};
        const ibGibsTodo = filterPrimitives ?
            ibGibs.filter(ibGib => ibGib.gib ?? ibGib.gib !== GIB) :
            ibGibs;
        ibGibsTodo.forEach(ibGib => {
            if (hasTjp({ibGib}) ) {
                if ((ibGib.rel8ns?.dna ?? []).length > 0) {
                    mapWithTjp_YesDna[ibGib.gib] = ibGib;
                } else {
                    mapWithTjp_NoDna[ibGib.gib] = ibGib;
                }
            } else {
                mapWithout[ibGib.gib] = ibGib;
            }
        });
        return {mapWithTjp_YesDna, mapWithTjp_NoDna, mapWithout};
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Helper function that checks the given `ibGib` to see if it
 * either has a tjp or is a tjp itself.
 *
 * ## notes
 *
 * Only unique ibGibs are meant to have tjps, or rather, if an
 * ibGib timeline is expected to be unique over "time", then the
 * tjp is an extremely convenient mechanism that provides a
 * "name" for that timeline.
 *
 * Otherwise, if they are not unique, then successive "different"
 * timelines cannot be easily referenced by their first unique
 * frame in time, making it much harder to pub/sub updates among
 * other things. (If there are no unique frames, then they are
 * the same ibGib.)
 *
 * ## tjp = temporal junction point
 *
 * I've written elsewhere on this as well. Refer to B2tF2.
 *
 * @returns true if the ibGib has/is a tjp, else false
 */
export function hasTjp({ibGib}: {ibGib: IbGib_V1}): boolean {
    const lc = `[${hasTjp.name}]`;

    if (!ibGib) {
        console.warn(`${lc} ibGib falsy. (W: 884178562f5b4f15933ac4d98db74cc6)`);
        return false;
    }

    if (ibGib.data?.isTjp || ibGib.rel8ns?.tjp?.length > 0) {
        return true;
    }

    // dna transforms do not have tjp
    const dnaPrimitives = ['fork^gib', 'mut8^gib', 'rel8^gib'];
    if ((ibGib.rel8ns?.ancestor ?? []).some(x => dnaPrimitives.includes(x))) {
        return false;
    }

    if (!ibGib.gib) {
        console.warn(`${lc} ibGib.gib falsy. (W: 6400d780822b44d992846f1196509be3)`);
        return false;
    }
    if (ibGib.gib.includes(cTsGib.GIB_DELIMITER)) {
        return true;
    }

    if (ibGib.gib === cTsGib.GIB) {
        // primitive
        return false;
    }

    // use more expensive getGibInfo call.
    // could possibly just return false at this point, but since gib info
    // would change if we change our standards for gib, this is nicer.
    const gibInfo = getGibInfo({ibGibAddr: h.getIbGibAddr({ibGib})});
    return gibInfo.tjpGib ? true : false;
}

export function hasDna({ibGib}: {ibGib: IbGib_V1}): boolean {
    const lc = `[${hasDna.name}]`;

    if (!ibGib) {
        console.warn(`${lc} ibGib falsy. (W: 5fd19751f5c84da59d83dd33487ed859)`);
        return false;
    }

    return (ibGib.rel8ns?.dna ?? []).length > 0;
}

export function getTjpAddrs({
    ibGibs,
}: {
    ibGibs: IbGib_V1[],
}): IbGibAddr[] {
    const lc = `[${getTjpAddrs.name}]`;
    try {
        // get only the tjps for those with the same timeline.
        let tjpIbGibsByTjpGib =
            groupBy({
                items: ibGibs,
                keyFn: x => x.data!.isTjp ?  x.gib : getGibInfo({gib: x.gib}).tjpGib,
            });
        let tjpAddrs: IbGibAddr[] = [];
        Object.keys(tjpIbGibsByTjpGib).forEach(tjpGib => {
            let groupIbGibs = tjpIbGibsByTjpGib[tjpGib]; // guaranteed to be at least one member
            let x = groupIbGibs[0];
            let tjpAddr = x.data.isTjp ?
                h.getIbGibAddr({ibGib: x}) :
                x.rel8ns.tjp[x.rel8ns.tjp.length - 1];
            tjpAddrs.push(tjpAddr);
        });
        return tjpAddrs;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}


/**
 * Combines two maps/arrays into a single one with some very basic, naive merge rules:
 *
 * 1. If a key exists in only one map, then it will be included in the output map.
 * 2. If a key exists in both maps and the type is array or map, then these will be recursively merged.
 * 3. If a key exists in both maps but is not an array or map, the dominant map's value wins.
 *
 * @param dominant map, when two keys are not arrays or maps themselves, this one's value is chosen for output.
 * @param recessive map, when two keys are not arrays or maps themselves, this one's value is NOT chosen for output.
 *
 * ## future
 *
 * In the future, if we want to keep these kinds of things around and be more
 * specific about mergers, we can always rel8 a merge strategy ibgib to be
 * referred to when performing merger.
 */
export function mergeMapsOrArrays_Naive<T extends {}|any[]>({
    dominant,
    recessive,
}: {
    dominant: T,
    recessive: T,
}): T {
    const lc = `[${mergeMapsOrArrays_Naive.name}]`;
    try {
        debugger; // first run
        if (Array.isArray(dominant) && Array.isArray(recessive)) {
            // arrays
            let output: any[] = <any[]>h.clone(<any[]>dominant);
            let warned = false;
            (<[]>recessive).forEach((recessiveItem: any) => {
                if (typeof(recessiveItem) === 'string') {
                    if (!output.includes(recessiveItem)) { output.push(recessiveItem); }
                } else {
                    if (!warned) {
                        console.warn(`${lc} merging arrays of non-string elements. (W: d8ab113064834abc8eb5fe6c4cf87ba3)`);
                        warned = true;
                    }
                    // we'll check the stringified version of recessive item against
                    // the stringified dominant item.
                    const xString = JSON.stringify(recessiveItem);
                    if (!output.some(o => JSON.stringify(o) === xString)) {
                        output.push(recessiveItem);
                    }
                }
            });
            return <T>output;
        } else if (typeof(dominant) === 'object' && typeof(recessive) === 'object') {
            // maps
            let output: {} = {};
            let dominantKeys = Object.keys(dominant);
            let recessiveKeys = Object.keys(recessive);
            dominantKeys.forEach(key => {
                if (recessiveKeys.includes(key)) {

                    // naive merge for key that exists in both dominant & recessive
                    if (Array.isArray(dominant[key]) && Array.isArray(recessive[key])) {
                        // recursive call if both arrays
                        output[key] = mergeMapsOrArrays_Naive<any[]>({
                            dominant: dominant[key],
                            recessive: recessive[key],
                        });
                    } else if (
                        !!dominant[key] && !Array.isArray(dominant[key]) && typeof(dominant[key]) === 'object' &&
                        !!recessive[key] && !!Array.isArray(recessive[key]) && typeof(recessive[key]) === 'object'
                    ) {
                        // recursive call if both objects
                        output[key] = mergeMapsOrArrays_Naive<{}>({
                            dominant: dominant[key],
                            recessive: recessive[key],
                        });
                    } else {
                        output[key] = dominant[key];
                    }
                } else {
                    output[key] = dominant[key];
                }
            });

            return <T>{};
        } else {
            // ? unknown matching of dominant and recessive
            console.warn(`${lc} unknown values or value types do not match. Both should either be an array or map. Dominant one wins categorically without any merging. (W: 3690ea19b81a4b89b98c1940637df62c)`);
            return <T>dominant;
        }
    } catch (error) {
        debugger; // what up wit dit
        console.error(`${lc} ${error.message}`);
        throw error;
    }
};