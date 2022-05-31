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

export interface IbGibCacheInfo {
  /**
   * The "primary key" of the cache info. If {@link addrScope} is not provided,
   * then atow this will be the only location information for the ibGib.
   */
  addr: IbGibAddr;
  /**
   * If provided, this will be used to identify the cache info in combination
   * with the addr. Else, just the addr will be used.
   *
   * So, e.g., you may store an ibGib item by
   * @example { addr: comment abc^123, addrScope: 'item', ibGib, other: item }
   */
  addrScope?: string;
  /**
   * ibGib reference.
   */
  ibGib: IbGib_V1;
  /**
   * Place to store additional associated cached data with the ibGib.
   *
   * ## driving use case
   *
   * I want to cache the entire IbGibItem for many IbGibComponentBase classes to
   * speed up the entire loading (not just the loading of the ibGib property
   * itself from storage).
   *
   * atow I'm storing a separate entry with addr + this.lc for using this other
   * property.
   */
  other?: any;
}

/**
 * Using this for a quick implementation for caching.
 *
 * ## future
 *
 * change this to an ibgib (in memory) innerspace. then we can pass in
 * the innerspace ibgib instead of just setting a property. this will make
 * it more extensible in the future (i think...)
 */
export interface IbGibCacheService {
  has({addr, addrScope}: { addr: IbGibAddr, addrScope?: string }): Promise<boolean>;
  put(info: IbGibCacheInfo): Promise<void>;
  get({addr, addrScope}: { addr: IbGibAddr, addrScope?: string }): Promise<IbGibCacheInfo | undefined>;
}
