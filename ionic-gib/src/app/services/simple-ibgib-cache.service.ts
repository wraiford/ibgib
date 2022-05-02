import { Injectable } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../common/constants';
import { IbGibCacheService } from '../common/types/ibgib';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * simple caching service for ibgibs...relatively self explanatory.
 */
@Injectable({
  providedIn: 'root'
})
export class SimpleIbgibCacheService implements IbGibCacheService {

  private lc: string = `[${SimpleIbgibCacheService.name}]`;

  private ibGibs: { [key: string]: IbGib_V1 } = {};

  constructor() { }

  has({addr}: { addr: IbGibAddr }): Promise<boolean> { return Promise.resolve(!!this.ibGibs[addr]); }

  async put({addr, ibGib}: { addr: IbGibAddr, ibGib: IbGib_V1 }): Promise<void> {
    const lc = `${this.lc}[${this.put.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!ibGib) { throw new Error(`ibGib required (E: 6990e984856aa49306c645db9ac6a422)`); }
      this.ibGibs[addr] = ibGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  get({addr}: { addr: IbGibAddr }): Promise<IbGib_V1> {
    const lc = `${this.lc}[${this.get.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      return Promise.resolve(this.ibGibs[addr]);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
