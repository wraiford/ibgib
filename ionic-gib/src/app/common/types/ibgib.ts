import { IbGibAddr } from "ts-gib";
import { IbGib_V1, IB } from "ts-gib/dist/V1";

/**
 * Indicates that this is intended to be a tjp (temporal junction point)
 * address.
 *
 * ## notes
 *
 * * Need to put this in the base ts-gib library.
 */
export declare type TjpIbGibAddr = IbGibAddr;

export interface IbGibCacheService {
  has({addr}: { addr: IbGibAddr }): Promise<boolean>;
  put({addr, ibGib}: { addr: IbGibAddr, ibGib: IbGib_V1 }): Promise<void>;
  get({addr}: { addr: IbGibAddr }): Promise<IbGib_V1 | undefined>;
}