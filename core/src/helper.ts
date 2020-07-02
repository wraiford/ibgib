import { Ib, Gib, IbGib, IbGibAddr, IbAndGib } from './types';
var crypto = require('crypto');

export function clone(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}
export function getTimestamp() {
    return (new Date()).toUTCString();
}
/**
 * Gets the ib^gib address from the given ib and gib or
 * from the ibGib object.
 *
 * Need to refactor to getIbGibAddr
 */
export function getIbGibAddr({
    ib, gib, ibGib, delimiter = '^'
}: {
    ib?: Ib,
    gib?: Gib,
    ibGib?: IbGib,
    delimiter?: string
}) {
    ib = ib || ibGib?.ib || '';
    gib = gib || ibGib?.gib || '';
    return ib + delimiter + gib;
}

/**
 * Get the ib and gib fields from an ibGib object or ibGibAddr
 * with the given `delimiter`.
 */
export function getIbAndGib({
    ibGib,
    ibGibAddr,
    delimiter = '^'
}: {
    ibGibAddr?: IbGibAddr,
    ibGib?: IbGib,
    delimiter?: string
}): IbAndGib {
    const lc = '[getIbAndGib]';
    if (!ibGibAddr) {
        if (ibGib) {
            ibGibAddr = getIbGibAddr({ibGib});
        } else {
            throw new Error(`${lc} We need either an address or an ibGib object`);
        }
    }
    if (!ibGibAddr) { throw new Error(`${lc} Couldn't get ibGibAddr. ibGib invalid?`); }

    if (!delimiter) { delimiter = '^'; }

    const pieces = ibGibAddr.split(delimiter);
    if (pieces.length === 2) {
        // normal v1 case, e.g. 'ib^gib' or 'tag home^ABC123'
        return { ib: pieces[0], gib: pieces[1] };
    } else if (pieces.length === 1 && ibGibAddr.endsWith(delimiter)) {
        // normal v1 primitive, e.g. '7^' or 'name^'
        return { ib: pieces[0], gib: '' };
    } else if (pieces.length === 1 && ibGibAddr.startsWith(delimiter)) {
        // only gib/hash is provided like maybe a binary file
        // e.g. ^ABC123 or ^XYZ456 or ^some_gib_that_isnt_a_hash
        return { ib: '', gib: pieces[0] };
    } else if (pieces.length === 2 && pieces[0] === '' && pieces[1] === '') {
        // edge case of address is only the delimiter.
        // So it's the primitive for that delimiter
        return { ib: delimiter, gib: '' };
    // } else if (pieces.length === 0 ) {
        // ibGibAddr is falsy, so would have thrown earlier in this function
        // I'm just noting this case for intent atow
    } else {
        console.warn(`${lc} multiple delimiters found in ibGibAddr. Considering last delimiter as the demarcation of gib hash`);
        // e.g. 'ib^ABC123^gib'
        // ib: 'ib^ABC123'
        // gib: 'gib'
        return {
            ib: pieces.slice(0, pieces.length-1).join(delimiter),
            gib: pieces.slice(pieces.length-1)[0],
        }
    }
}

/**
 * Simple hash function.
 *
 * NOTE:
 *   This is not used for ibGib.gib values (ATOW)
 *   but rather as a helper function for generating random UUIDs.
 *
 * @param s string to hash
 * @param algorithm to use, currently only 'SHA-256'
 */
export async function hash({
    s,
    algorithm = 'SHA-256',
}: {
    s: string,
    algorithm?: 'SHA-256'
}): Promise<string> {
    if (!s) { return ''; }
    if (algorithm !== 'SHA-256') { console.error(`Only SHA-256 implemented`); return ''; }
    try {
        if (crypto) {
            if (crypto.subtle) {
                // browser I think
                const msgUint8 = new TextEncoder().encode(s);
                const buffer = await crypto.subtle.digest('SHA-256', msgUint8);
                const asArray = Array.from(new Uint8Array(buffer));
                return asArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                throw new Error('Cannot create hash, as unknown crypto library version.');
            }
        }
        else {
            throw new Error('Cannot create hash, crypto falsy.');
        }
    } catch (e) {
        console.error(e.message);
        return '';
    }
}

/**
 * Simple func to generate UUID (sha-256 hash basically).
 *
 * @param seedSize size of seed for UUID generation
 */
export async function getUUID(seedSize = 64): Promise<string> {
    let uuid: string = '';
    if (seedSize < 32) { throw new Error(`Seed size must be at least 32`); }
    if (!crypto) { throw new Error(`Cannot create UUID, as unknown crypto library version.`); }

    if (crypto.getRandomValues) {
        // browser crypto!
        let values = new Uint32Array(seedSize);
        crypto.getRandomValues(values);
        uuid = await hash({s: values.join('')});
    } else {
        if (!crypto) { throw new Error(`Cannot create UUID, as crypto is not falsy but unknown crypto library version.`); }
    }

    if (!uuid) { throw new Error(`Did not create UUID...hmm...`); }

    return uuid;
}

/**
 * Syntactic sugar for JSON.stringify(obj, null, 2);
 *
 * @param obj to pretty stringify
 */
export function pretty(obj: any): string {
    return JSON.stringify(obj, null, 2);
}

/**
 * Just delays given number of ms.
 *
 * @param ms milliseconds to delay
 */
export async function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}
