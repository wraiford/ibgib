// import { TextEncoder } from 'util';
var crypto = require('crypto');
// var crypto = crypto || require('crypto');
// declare var crypto: any;
// var c = crypto ? crypto : eval(`crypto = require('crypto');`);
// var crypto: any = typeof(crypto) !== "undefined" ? crypto : eval(`crypto = require('crypto');`);
// declare var TextEncoder: any;

import { IbGib_V1, IbGibData_V1, IbGibRel8ns_V1 } from "./types";
import { Ib } from "../types";

/**
 * Performs the gib hash like V1
 *
 * I have it all in one function for smallest, most independent version possible.
 *
 * #thanks https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
 *
 * @param ibGib ibGib for which to calculate the gib
 */
export function sha256v1(ibGib: IbGib_V1, salt: string = ""): Promise<string> {
    // console.log('func_gib_sha256v1 executed');
    if (!salt) { salt = ""; }
    let hashToHex = async (message: string) => {
        if (!message) { return ""; }
        try {
            if (crypto) {
                if (crypto.subtle) {
                    const msgUint8 = new TextEncoder().encode(message);
                    const buffer = await crypto.subtle.digest('SHA-256', msgUint8);
                    const asArray = Array.from(new Uint8Array(buffer));
                    return asArray.map(b => b.toString(16).padStart(2, '0')).join('');
                } else {
                    throw new Error('Cannot create hash, as unknown crypto library version.');
                }
            } else {
                throw new Error('Cannot create hash, crypto falsy.');
            }
        } catch (e) {
            console.error(e.message);
            throw e;
        }
    };
    let hashFields;
    if (salt) {
        hashFields = async (ib: Ib, data: IbGibData_V1 | undefined, rel8ns: IbGibRel8ns_V1 | undefined) => {
            const hasRel8ns =
                Object.keys(rel8ns || {}).length > 0 &&
                Object.keys(rel8ns || {}).some(k => rel8ns![k] && rel8ns![k]!.length > 0);
            const hasData = Object.keys((data) || {}).length > 0;
            const ibHash = (await hashToHex(salt + ib)).toUpperCase();
            // empty, null, undefined all treated the same at this level.
            const rel8nsHash: string = hasRel8ns ? (await hashToHex(salt + JSON.stringify(rel8ns))).toUpperCase(): "";
            // empty, null, undefined all treated the same at this level (though not farther down in data)
            const dataHash: string = hasData ? (await hashToHex(salt + JSON.stringify(data))).toUpperCase(): "";
            // if the ibgib has no rel8ns or data, the hash should be just of the ib itself.
            const allHash = hasRel8ns || hasData ?
                (await hashToHex(salt + ibHash + rel8nsHash + dataHash)).toUpperCase() :
                (await hashToHex(salt + ibHash)).toUpperCase();
            return allHash;
        };
    } else {
        hashFields = async (ib: Ib, data: IbGibData_V1 | undefined, rel8ns: IbGibRel8ns_V1 | undefined) => {
            const hasRel8ns =
                Object.keys(rel8ns || {}).length > 0 &&
                Object.keys(rel8ns || {}).some(k => rel8ns![k] && rel8ns![k]!.length > 0);
            const hasData = Object.keys((data) || {}).length > 0;
            const ibHash = (await hashToHex(ib)).toUpperCase();
            // empty, null, undefined all treated the same at this level.
            const rel8nsHash: string = hasRel8ns ? (await hashToHex(JSON.stringify(rel8ns))).toUpperCase(): "";
            // empty, null, undefined all treated the same at this level (though not farther down in data)
            const dataHash: string = hasData ? (await hashToHex(JSON.stringify(data))).toUpperCase(): "";
            // if the ibgib has no rel8ns or data, the hash should be just of the ib itself.
            const allHash = hasRel8ns || hasData ?
                (await hashToHex(ibHash + rel8nsHash + dataHash)).toUpperCase() :
                (await hashToHex(ibHash)).toUpperCase();
            return allHash;
        }
    }
    return hashFields(ibGib.ib, ibGib?.data, ibGib?.rel8ns);
}

/**
 * I have one large-ish sha256 function for gibbing purposes
 * (dream where metabootstrapping is better)
 * this is just testing a function that is internal to the sha256v1 func.
 * terrible as can be duplicated, but simple for now.
 */
export async function hashToHexCopy(
    message: string | undefined
): Promise<string> {
    if (!message) { return ""; }
    try {
        if (crypto) {
            if (crypto.subtle) {
                const msgUint8 = new TextEncoder().encode(message);
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
        throw e;
    }
};