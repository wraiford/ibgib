import { IBGIB_DELIMITER } from 'ts-gib/dist/V1';
import { IbGibAddr, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

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