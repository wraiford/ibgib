import {
    IbGib_V1,
    IBGIB_DELIMITER, GIB, IB,
} from 'ts-gib/dist/V1';
import { Ib, IbGibAddr } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';

// const logalot = c.GLOBAL_LOG_A_LOT || false || true;

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
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (WARNING: 2d19db16ec0c4766b5d35248787671f3)`); }

        // validate as a whole
        if (!addr) {
            errors.push(`addr required. (ERROR: e9a54041aa0b41c1bb2324d9d2d42c7f)`);
            return errors;
        }
        delimiter = delimiter || IBGIB_DELIMITER;
        if (!addr.includes(delimiter)) { errors.push(`No delimiter (${delimiter}) found. (ERROR: 05e28dcb70ff44019edc53ed508bd1e8)`); }
        if (addr.startsWith(delimiter)) { errors.push(`addr starts with delim. (ERROR: d29f808c5a47452f9bb3ea684694c6eb)`); }

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
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (WARNING: 71228ba4ed994aaa8149910e295ab087)`); }

        if (!ib) {
            errors.push(`ib required. (ERROR: a76d06c7b9c24db3a731a91dbe46acd5)`);
            return errors;
        }

        if (ib === IB) { return null; }

        ibGibAddrDelimiter = ibGibAddrDelimiter || IBGIB_DELIMITER;
        if (ib.includes(ibGibAddrDelimiter)) { errors.push(`ib contains ibGibAddrDelimiter (${ibGibAddrDelimiter}) (ERROR: 09e61b46c3e84874bc02b6918f1f2c39)`); }

        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function validateGib({
    gib,
    ibGibAddrDelimiter,
    version,
}: {
    gib: Ib,
    ibGibAddrDelimiter?: string,
    version?: string,
}): string[] | null {
    const lc = `[${validateGib.name}]`;
    try {
        const errors: string[] = [];
        if (version) { console.warn(`${lc} version not implemented yet. Ignoring. (ERROR: 90ced1db69774702b92acb261bdaee23)`); }

        if (!gib) {
            errors.push(`gib required. (ERROR: e217de4035b04086827199f4bace189c)`);
            return errors;
        }

        // automatically valid if it's a primitive
        if (gib === GIB) { return null; }

        ibGibAddrDelimiter = ibGibAddrDelimiter || IBGIB_DELIMITER;
        if (gib.includes(ibGibAddrDelimiter)) { errors.push(`gib contains ibGibAddrDelimiter (${ibGibAddrDelimiter}). (ERROR: 1e584258d9e049ba9ce7e516f3ab97f1)`); }

        if (!gib.match(c.HEXADECIMAL_HASH_STRING_REGEXP_32) && !gib.match(c.HEXADECIMAL_HASH_STRING_REGEXP_64)) {
            errors.push('gib is neither a 32- or 64-char hash string. (ERROR: d47ff6d6e14b4c02a62107090c8dad39)');
        }

        return errors.length > 0 ? errors : null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function validateUserSpaceName(name: string): boolean {
    const lc = `[${validateUserSpaceName.name}]`;
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

export async function validateBootstrapGib(bootstrapSpace: IbGib_V1): Promise<boolean> {
    const lc = `[${validateBootstrapGib.name}]`;
    const errors: string[] = [];
    try {
        let addr = h.getIbGibAddr({ibGib: bootstrapSpace});
        if (addr !== c.BOOTSTRAP_SPACE_ADDR) {
            errors.push(`invalid bootstrapSpace addr. Should equal "${c.BOOTSTRAP_SPACE_ADDR}"`);
        }
        if (Object.keys(bootstrapSpace.data || {}).length > 0) {
            errors.push(`invalid bootstrapSpace data. Data should be falsy/empty`);
        }
        if (Object.keys(bootstrapSpace.rel8ns || {}).length === 0) {
            errors.push(`invalid bootstrapSpace rel8ns (empty). Should have one rel8n, with rel8nName ${c.SPACE_REL8N_NAME_BOOTSTRAP_SPACE}`);
        }
        if (Object.keys(bootstrapSpace.rel8ns || {}).length > 1) {
            errors.push(`invalid bootstrapSpace rel8ns (more than 1). Should have only one rel8n, with rel8nName ${c.SPACE_REL8N_NAME_BOOTSTRAP_SPACE}`);
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
