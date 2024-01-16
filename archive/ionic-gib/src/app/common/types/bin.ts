import { IbGib_V1 } from "ts-gib/dist/V1";

/**
 * For pic binaries, this is a base 64 encoded string of the pic's image data.

 * @see {@link BinIbGib_V1}
 */
export type BinData_V1 = any;

/**
 * IbGib for a binary, which right now atow just means a pic.
 *
 * Also for now, BinIbGib has no rel8ns, only data.
 *
 * @see {@link BinData_V1}
 */
export interface BinIbGib_V1 extends IbGib_V1<any> { };
