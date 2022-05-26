import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';

import * as c from '../common/constants';
import { IbGibCacheInfo, IbGibCacheService } from '../common/types/ibgib';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * simple caching service for ibgibs...relatively self explanatory.
 */
@Injectable({
  providedIn: 'root'
})
export class InMemoryIbgibCacheService implements IbGibCacheService {

  private lc: string = `[${InMemoryIbgibCacheService.name}]`;

  private ibGibs: { [addr: string]: IbGibCacheInfo } = {};

  constructor() { }

  has({addr}: { addr: IbGibAddr }): Promise<boolean> { return Promise.resolve(!!this.ibGibs[addr]); }

  async put(info: IbGibCacheInfo): Promise<void> {
    const lc = `${this.lc}[${this.put.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!info) { throw new Error(`info required (E: 49511896a6dd0fbb8933cef3ad5b9722)`); }
      if (!info.addr) { throw new Error(`addr required (E: dc4118cb7b88464f9f2c30e624081207)`); }
      if (!info.ibGib) { throw new Error(`ibGib required (E: 6990e984856aa49306c645db9ac6a422)`); }

      const ibGibKeys = Object.keys(info.ibGib);
      if (ibGibKeys.length > 4 || ibGibKeys.some(key => !['ib', 'gib', 'data', 'rel8ns'].includes(key))) {
        if (logalot) { console.log(`${lc} complex ibGib beyond basic ib,gib,data,rel8ns. skipping cache (I: 6d0f2888177ba8ad83e287e6ba76d822)`); }
        return; /* <<<< returns early */
      }

      this.ibGibs[info.addr] = h.clone(info);
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  get({addr}: { addr: IbGibAddr }): Promise<IbGibCacheInfo | undefined> {
    const lc = `${this.lc}[${this.get.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!addr) { throw new Error(`addr required (E: ca72f30befa7db8c66bc4fe6ea7a5722)`); }

      let cached = this.ibGibs[addr];
      if (cached) { cached = h.clone(cached); }
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
