import { Injectable } from '@angular/core';
import { Plugins } from '@capacitor/core';
const { Storage } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';

import * as c from '../common/constants';
import { IbGibCacheInfo, IbGibCacheService } from '../common/types/ibgib';
import { getTjpAddr } from '../common/helper/ibgib';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * simple caching service for getting the latest ibgib for a given address.
 *
 * ## driving intent
 *
 * as would be expected with caches, this is not guaranteed to be correct
 * and I'm only making this to try to get it to speed up just a bit.
 */
@Injectable({
  providedIn: 'root'
})
export class IonicStorageLatestIbgibCacheService implements IbGibCacheService {

  private lc: string = `[${IonicStorageLatestIbgibCacheService.name}]`;

  /**
   * Infos are stored via their {@link IbGibCacheInfo.addr} +
   * {@link IbGibCacheInfo.addrScope} (if provided), else just the `addr`.
   */
  private infos: { [addrAndMaybeScope: string]: IbGibCacheInfo } = {};

  constructor() { }

  async has({ addr, addrScope }: { addr: IbGibAddr, addrScope?: string }): Promise<boolean> {
    const lc = `${this.lc}[${this.has.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 36dc566e78b04fa2afc03b98e45e048e)`); }
      // return Promise.resolve(!!this.infos[addr]);
      const key = this.getKey({ addr, addrScope });

      if (this.infos[key]) { return true; /* <<<< returns early */ }

      const result = await Storage.get({ key });
      return result ? true : false;
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      return false;
      // throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  private getKey({
    addr,
    addrScope,
  }: {
    addr: IbGibAddr,
    addrScope?: string,
  }): string {
    let tjpGibOrAddr = getGibInfo({ ibGibAddr: addr }).tjpGib ?? addr;

    return addrScope ? `${this.lc}__${tjpGibOrAddr}^${addrScope}` : `${this.lc}__${tjpGibOrAddr}`;
  }

  async put({
    addr,
    addrScope,
    ibGib,
    other,
    tjpAddr,
    tjpIbGib,
  }: IbGibCacheInfo): Promise<void> {
    const lc = `${this.lc}[${this.put.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!addr) { throw new Error(`addr required (E: bf4b2f34ec984ab3b76c87c3d1ebac87)`); }
      if (!ibGib) { throw new Error(`ibGib required (E: 1e05d46831ce4d93b351b572d8b04633)`); }

      if (!tjpAddr) {
        tjpAddr = getTjpAddr({ ibGib });
        if (!tjpAddr) {
          if (logalot) { console.warn(`${lc} putting ibgib in getlatest with no tjp addr? (W: 233224682577331c5c45440e9ca4c222)`); }
          tjpAddr = h.getIbGibAddr({ ibGib });
        }
      }

      const info: IbGibCacheInfo = {
        addr,
        addrScope,
        ibGib,
        other,
      };

      const ibGibKeys = Object.keys(ibGib);
      if (ibGibKeys.length > 4 || ibGibKeys.some(key => !['ib', 'gib', 'data', 'rel8ns'].includes(key))) {
        if (logalot) { console.log(`${lc} complex ibGib beyond basic ib,gib,data,rel8ns. skipping cache (I: b5682eef82a34f23b43cf9f8c782902e)`); }
        return; /* <<<< returns early */
      }

      const key = this.getKey({ addr, addrScope });
      const jsonString = JSON.stringify(info);

      await Storage.set({ key, value: jsonString });
      this.infos[key] = h.clone(info);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async get({ addr, addrScope }: { addr: IbGibAddr, addrScope?: string }): Promise<IbGibCacheInfo | undefined> {
    const lc = `${this.lc}[${this.get.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!addr) { throw new Error(`addr required (E: f7ec60c717d8461cb759e599d5038dca)`); }

      const key = this.getKey({ addr, addrScope });
      console.warn(`${lc} not using the cache atm darnit (W: 4dad875a39e5441490f77fe96a4d69df)`);
      return Promise.resolve(undefined);

      let cached = this.infos[key];
      if (!cached) {
        let resGet = await Storage.get({ key });
        if (resGet?.value) { cached = <IbGibCacheInfo>JSON.parse(resGet.value); }
      }

      if (cached) {
        cached = h.clone(cached);
        if (logalot) { console.log(`${lc} YES found in cache (I: 538491831e514e359fa7089d9472c791)`); }
      } else {
        if (logalot) { console.log(`${lc} NOT found in cache (I: a4bc9f30ebf6432a8c02c91a50d180cf)`); }
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
