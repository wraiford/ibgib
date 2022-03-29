import {
    IbGib_V1,
    IBGIB_DELIMITER, GIB, IB,
} from 'ts-gib/dist/V1';
import { Ib, IbGibAddr, } from 'ts-gib';
import { isPrimitive, } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';
import * as cTsGib from 'ts-gib/dist/V1/constants';
import { getGib, getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../constants';

import {hasTjp} from './ibgib';
import { BootstrapData, BootstrapRel8ns } from '../types';

// const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * validates the ibGib's address (`ib` and `gib` properties) and recalculates
 * the `gib` against the `ibGib.gib`.
 *
 * this validates not only that the punctiliar gib hash for this ibgib record
 * hashes to the same value, but it also checks the internal tjp address and
 * ensures that it is the same tjp gib in the gib field.
 *
 * ## notes
 *
 * * By checking the tjp gib is the same in the address as in the tjp rel8n, we
 *   are providing (extremely?) good corroboration that the tjp listed in the
 *   address is accurate. However, it may still be theoretically possible to
 *   forge an ibgib that both hashes to the punctiliar hash and matches up this
 *   tjpAddr.gib. This would be AFAICT quite challenging.
 */
export async function validateIbGibIntrinsically({
    ibGib
}: {
    ibGib: IbGib_V1
}): Promise<string[] | null> {
    const lc = `[${validateIbGibIntrinsically.name}]`;
    try {
        let errors: string[] = [];
        if (ibGib) {
            errors = validateIbGibAddr({addr: h.getIbGibAddr({ibGib})}) ?? [];

            if (errors.length > 0) {
                debugger;
                return errors;
            } // returns

            // rest of the function assumes correctly formatted ib and gib

            // if it's a primitive, the caller knows (or should know!) there are no
            // metadata guarantees.
            if (isPrimitive({gib: ibGib.gib})) { return null; }

            // this validates not only that the punctiliar gib hash for this ibgib record
            // hashes to the same value, but it also checks the internal tjp address and
            // ensures that it is the same tjp gib.
            const gottenGib = await getGib({ibGib, hasTjp: hasTjp({ibGib})});
            if (gottenGib !== ibGib.gib) {
                debugger;
                errors.push(`Ibgib invalid intrinsically - gottenGib (${gottenGib}) does not equal ibGib.gib (${ibGib.gib}). (E: 7416db016878430ca3c5b20697f164ed)`);
            }

            return errors.length > 0 ? errors : null;
        } else {
            debugger;
            errors.push(`ibGib is itself falsy. (E: 4fb98caf6ed24ef7b35a19cef56e2d7e)`);
            return errors;
        }

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Naive synchronous validation for ibgib addresses.
 *
 * @returns error string array if validation errors found, else null
 */
export function validateIbGibAddr({
    addr,
    delimiter,
    version,
}: {
    addr: IbGibAddr,
    delimiter?: string,
    version?: string,
}): string[] | null {
    const lc = `[${validateIbGibAddr.name}]`;
    try {
        let errors: string[] = [];
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (W: 2d19db16ec0c4766b5d35248787671f3)`); }

        // validate as a whole
        if (!addr) {
            errors.push(`addr required. (E: e9a54041aa0b41c1bb2324d9d2d42c7f)`);
            return errors;
        }
        delimiter = delimiter || IBGIB_DELIMITER;
        if (!addr.includes(delimiter)) { errors.push(`No delimiter (${delimiter}) found. (E: 05e28dcb70ff44019edc53ed508bd1e8)`); }
        if (addr.startsWith(delimiter)) { errors.push(`addr starts with delim. (E: d29f808c5a47452f9bb3ea684694c6eb)`); }

        // validate pieces...
        const { ib, gib } = h.getIbAndGib({ibGibAddr: addr, delimiter});

        // ...ib
        const resValidateIb = validateIb({ib, ibGibAddrDelimiter: delimiter, version});
        if (resValidateIb) { errors = errors.concat(resValidateIb); }

        // ...gib
        const resValidateGib = validateGib({gib, ibGibAddrDelimiter: delimiter, version});
        if (resValidateGib) { errors = errors.concat(resValidateGib); }

        // we're done
        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Naive validation of ib.
 *
 * @returns errors array if found, else null
 */
export function validateIb({
    ib,
    ibGibAddrDelimiter,
    version,
}: {
    ib: Ib,
    ibGibAddrDelimiter?: string,
    version?: string,
}): string[] | null {
    const lc = `[${validateIb.name}]`;
    try {
        const errors: string[] = [];
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (W: 71228ba4ed994aaa8149910e295ab087)`); }

        if (!ib) {
            errors.push(`ib required. (E: a76d06c7b9c24db3a731a91dbe46acd5)`);
            return errors;
        }

        if (ib === IB) { return null; }

        ibGibAddrDelimiter = ibGibAddrDelimiter || IBGIB_DELIMITER;
        if (ib.includes(ibGibAddrDelimiter)) { errors.push(`ib contains ibGibAddrDelimiter (${ibGibAddrDelimiter}) (E: 09e61b46c3e84874bc02b6918f1f2c39)`); }

        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * validates a `gib` of some ibGib/ibGibAddr.
 *
 * @returns array of validation error strings (if any) or null
 */
export function validateGib({
    gib,
    gibDelimiter,
    ibGibAddrDelimiter,
    version,
}: {
    /**
     * gib to validate.
     *
     * ## notes
     *
     * If the gib has a tjp embedded in it (i.e. the associated ibgib has a
     * tjp), then this will call validation on that tjpGib recursively.
     */
    gib: Ib,
    /**
     * This is a delimiter used with tjpGibs.
     *
     * atow this is a dot (`'.'`).
     *
     * ## notes
     *
     * THIS IS NOT THE SAME THING AS THE `ibGibAddrDelimiter`!
     */
    gibDelimiter?: string,
    /**
     * This is a delimiter used with the entire ibGibAddr.
     *
     * atow this is a caret (`'^'`).
     *
     * ## notes
     *
     * THIS IS NOT THE SAME THING AS THE `gibDelimiter`!
     */
    ibGibAddrDelimiter?: string,
    /**
     * Ignored atow, but in the future, probably will be used.
     * May end up being an IbGibAddr but who knows.
     */
    version?: string,
}): string[] | null {
    const lc = `[${validateGib.name}]`;
    try {
        const errors: string[] = [];
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (E: 90ced1db69774702b92acb261bdaee23)`); }

        if (!gib) {
            errors.push(`gib required. (E: e217de4035b04086827199f4bace189c)`);
            return errors;
        }

        ibGibAddrDelimiter = ibGibAddrDelimiter || IBGIB_DELIMITER;
        /** Need to move this to ts-gib */
        const INVALID_GIB_CHARS = [ibGibAddrDelimiter];
        const invalidCharsFound: string[] = [];
        INVALID_GIB_CHARS.forEach(invalidChar => {
            if (gib.includes(invalidChar)) { invalidCharsFound.push(invalidChar); }
        });
        if (invalidCharsFound.length > 0) {
            errors.push(`gib (${gib}}) contains invalid characters: (${JSON.stringify(invalidCharsFound.join(','))}) (E: 1e584258d9e049ba9ce7e516f3ab97f1)`);
        }

        // punctiliar = point, i.e., a single point in the universe, either a
        // single point in time in a tjp ibgib's timeline, or a single point in
        // space that lives outside of time (has no tjp thus no timeline).
        //
        // So if we've gotten here in code, then our gib is truthy and doesn't
        // contain invalid characters.

        const {punctiliarHash, tjpGib, isPrimitive} =
            getGibInfo({gib, gibDelimiter: gibDelimiter || cTsGib.GIB_DELIMITER});

        // automatically valid if it's a primitive, as the caller should expect
        // no cryptographical guarantees
        if (isPrimitive) { return null; }

        // All gibs have at least the punctiliar hash.
        const punctiliarHashIs_32 = punctiliarHash.match(c.HEXADECIMAL_HASH_STRING_REGEXP_32);
        const punctiliarHashIs_64 = punctiliarHash.match(c.HEXADECIMAL_HASH_STRING_REGEXP_64);
        if (!punctiliarHashIs_32 && !punctiliarHashIs_64) {
            errors.push('gib punctiliar hash is neither a 32- or 64-char hash string. (E: d47ff6d6e14b4c02a62107090c8dad39)');
        }

        if (tjpGib) {
            // if it is an ibgib in a timeline, that timeline has a tjp and this
            // gib has a tjpGib component. So we must recursively validate the
            // tjpGib
            const tjpGibValidationErrors = validateGib({gib: tjpGib});
            if ((tjpGibValidationErrors ?? []).length > 0) {
                errors.push(`tjpGib has errors (E: d6b79228d4a64c0b967cdb0efcea4d0d). tjpGibValidationErrors: ${tjpGibValidationErrors.join('. ')}`);
            }
        }

        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function spaceNameIsValid(name: string): boolean {
    const lc = `[${spaceNameIsValid.name}]`;
    try {
        // non-falsy
        if (!name) {
            console.error(`${lc} name is falsy`)
            return false;
        }

        // valid characters are alphanumerics, numbers, underscores, hyphens
        const regexOnlyIncluded = /[\w-]+/;
        const matchOnlyIncluded = name.match(regexOnlyIncluded);
        if (matchOnlyIncluded?.length !== 1 || matchOnlyIncluded[0].length !== name.length) {
            console.error(`${lc} name can only contain letters, numbers, underscores, hyphens`);
            return false;
        }

        // start with alphanumeric
        const regexStart = /[a-zA-Z\d]/;
        const matchStart = name[0].match(regexStart);
        if (!matchStart) {
            console.error(`${lc} name must start with a letter or number`);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return false;
    }
}

export async function validateBootstrapIbGib(bootstrapSpace: IbGib_V1): Promise<boolean> {
    const lc = `[${validateBootstrapIbGib.name}]`;
    const errors: string[] = [];
    try {
        const addr = h.getIbGibAddr({ibGib: bootstrapSpace});
        if (addr !== c.BOOTSTRAP_IBGIB_ADDR) {
            errors.push(`invalid bootstrapSpace addr. Should equal "${c.BOOTSTRAP_IBGIB_ADDR}" (E: ecfdbed719284db7a1aa3f867f706fe9)`);
        }
        let intrinsicErrors = await validateIbGibIntrinsically({ibGib: bootstrapSpace});
        if (intrinsicErrors?.length > 0) { intrinsicErrors.forEach(e => errors.push(e)); }

        const data = <BootstrapData>bootstrapSpace.data;
        const rel8ns = <BootstrapRel8ns>bootstrapSpace.rel8ns;

        if (Object.keys(data || {}).length === 0) {
            errors.push(`invalid bootstrapSpace data. data required (E: 5a9bd15dd0644f9b93cafbbba660cfdf)`);
        }
        if ((data.spaceIds ?? []).length === 0) {
            errors.push(`invalid bootstrapSpace, data.spaceIds required. (E: 6b91ddc12cfd41e59ded7d7502c1909f)`);
        }
        if (Object.keys(bootstrapSpace.rel8ns || {}).length === 0) {
            errors.push(`invalid bootstrapSpace rel8ns (empty). Should have at least one rel8n, with rel8nName corresponding to the spaceId (E: b188ce4ae25e49f794f35e141bc2ecde)`);
        }
        data.spaceIds.forEach(spaceId => {
            if ((rel8ns[spaceId] ?? []).length === 0) {
                errors.push(`invalid bootstrap. Each spaceId listed in data should have a corresponding address in rel8ns. spaceId (${spaceId}) missing. (E: 62dd0d76e29a415a98b4b27deb8db17e)`);
            }
        });
        if (!data.zeroSpaceId) {
            errors.push(`invalid bootstrap. data.zeroSpaceId required. (E: f763af2e275f445cbf1db5801bacafad)`);
        } else if ((rel8ns[data.zeroSpaceId] ?? []).length === 0) {
            errors.push(`invalid bootstrap. data.zeroSpaceId (${data.zeroSpaceId}) not found in rel8ns. (E: 44d0799d232f4a51a0b0019ebebe019f)`);
        }
        if (errors.length === 0) {
            return true;
        } else {
            console.error(`${lc} errors: ${errors.join('|')}`);
            return false;
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return false;
    }
}
