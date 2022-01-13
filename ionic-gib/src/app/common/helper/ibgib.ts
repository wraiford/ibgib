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
        if (!parentPrimitiveIb) { throw new Error(`parentPrimitiveIb required. (ERROR: 88ddf188cc5a4340b597abefba1481e2)`); }
        if (validateIb({ib: parentPrimitiveIb}) !== null) { throw new Error(`Invalid parentPrimitiveIb: ${parentPrimitiveIb}. (ERROR:5aec0320956d492ebeeaca41eb1fe1c6)`); }

        // ib
        if (!ib) { throw new Error(`ib required. (ERROR: 7bbc88f4f2e842d6b00126e55b1783e4)`); }
        const regExp = ibRegExpPattern ? new RegExp(ibRegExpPattern) : c.IB_REGEXP_DEFAULT;
        if (!ib.match(regExp)) { throw new Error(`invalid ib. does not match regexp (${regExp})`); }

        // rel8ns
        const incomingRel8nNames = Object.keys(rel8ns ?? {});
        const forbiddenRel8nNames = [...cTsGib.FORBIDDEN_ADD_RENAME_REMOVE_REL8N_NAMES, 'tjp'];
        const rel8nsIsInvalid = incomingRel8nNames.some(x => {
            // we don't want constants trying to look like they have/are descendants/tjps/etc.
            return forbiddenRel8nNames.includes(x);
        });
        if (rel8nsIsInvalid) { throw new Error(`Invalid rel8ns. forbiddenRel8nNames: ${forbiddenRel8nNames}. rel8ns keys: ${Object.keys(rel8ns)}. (ERROR: 837a993c265c4362b6aa0b1a234ea5f8)`); }


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
export function getBinAddr({binHash, binExt}: {binHash: string, binExt: string}): IbGibAddr {
    return `bin.${binExt}${IBGIB_DELIMITER}${binHash}`;
}
export function getBinHashAndExt({addr}: {addr: IbGibAddr}): { binHash: string, binExt: string } {
    const lc = `[${getBinHashAndExt.name}]`;
    try {
        if (!isBinary({addr})) { throw new Error(`not a bin address`); }
        const {ib, gib: binHash} = h.getIbAndGib({ibGibAddr: addr});
        const binExt = ib.split('.')[1]; // assumes ib formatting checked in `isBin` function!
        return { binHash, binExt };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function isBinary({addr}: {addr: IbGibAddr}): boolean {
    const lc = `[${isBinary.name}]`;
    try {
        // probably overkill here, but...
        if (!addr) { throw new Error(`addr required`); }
        const {ib,gib} = h.getIbAndGib({ibGibAddr: addr});
        if (!ib) { return false; }
        if (!gib) { return false; }
        if (!ib.startsWith('bin.')) { return false; }
        if (gib.length !== 64) {
            console.warn(`${lc} gib length is not 64, so return false. But this may not be true if using another hash algorithm.`);
            return false;
        }
        const ibPieces = ib.split('.');
        if (ibPieces.length !== 2) { return false; }
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
