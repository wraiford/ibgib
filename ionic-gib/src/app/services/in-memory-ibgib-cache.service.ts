import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';

import * as c from '../common/constants';
import { IbGibCacheInfo, IbGibCacheService } from '../common/types/ibgib';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * simple caching service for ibgibs...relatively self explanatory.
 */
@Injectable({
  providedIn: 'root'
})
export class InMemoryIbgibCacheService implements IbGibCacheService {

  private lc: string = `[${InMemoryIbgibCacheService.name}]`;

  /**
   * Infos are stored via their {@link IbGibCacheInfo.addr} +
   * {@link IbGibCacheInfo.addrScope} (if provided), else just the `addr`.
   */
  private infos: { [addrAndMaybeScope: string]: IbGibCacheInfo } = {};

  constructor() { }

  has({addr}: { addr: IbGibAddr }): Promise<boolean> { return Promise.resolve(!!this.infos[addr]); }

  private getKey({
    addr,
    addrScope,
  }: {
    addr: IbGibAddr,
    addrScope?: string,
  }): string {
    return addrScope ?  `${addr}^${addrScope}` : addr;
  }

  async put({
    addr,
    addrScope,
    ibGib,
    other,
  }: IbGibCacheInfo): Promise<void> {
    const lc = `${this.lc}[${this.put.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!addr) { throw new Error(`addr required (E: dc4118cb7b88464f9f2c30e624081207)`); }
      if (!ibGib) { throw new Error(`ibGib required (E: 6990e984856aa49306c645db9ac6a422)`); }

      const info: IbGibCacheInfo = {
        addr,
        addrScope,
        ibGib,
        other,
      };

      const ibGibKeys = Object.keys(ibGib);
      if (ibGibKeys.length > 4 || ibGibKeys.some(key => !['ib', 'gib', 'data', 'rel8ns'].includes(key))) {
        if (logalot) { console.log(`${lc} complex ibGib beyond basic ib,gib,data,rel8ns. skipping cache (I: 6d0f2888177ba8ad83e287e6ba76d822)`); }
        return; /* <<<< returns early */
      }

      const key = this.getKey({addr, addrScope});
      this.infos[key] = h.clone(info);
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  get({addr, addrScope}: { addr: IbGibAddr, addrScope?: string }): Promise<IbGibCacheInfo | undefined> {
    const lc = `${this.lc}[${this.get.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!addr) { throw new Error(`addr required (E: ca72f30befa7db8c66bc4fe6ea7a5722)`); }

      const key = this.getKey({addr, addrScope});

      let cached = this.infos[key];
      if (cached) {
        cached = h.clone(cached);
        if (logalot) { console.log(`${lc} YES found in cache (I: 446c9c6920f763d8576aecf612444e22)`); }
      } else {
        if (logalot) { console.log(`${lc} NOT found in cache (I: 49b2f9548b9a19a41a60b6bfceceb522)`); }
      }
      return Promise.resolve(cached);
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
