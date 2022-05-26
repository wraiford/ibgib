import { Injectable } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

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

      if (!info.addr) { throw new Error(`addr required (E: dc4118cb7b88464f9f2c30e624081207)`); }
      if (!info.ibGib) { throw new Error(`ibGib required (E: 6990e984856aa49306c645db9ac6a422)`); }

      this.ibGibs[info.addr] = info;
    } catch (error) {
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

      const cached = this.ibGibs[addr];
      return Promise.resolve(cached);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
