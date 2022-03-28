import { Injectable } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../common/constants';
import { SpaceId } from '../common/types';
import { InnerSpace_V1 } from '../common/witnesses/spaces/inner-space-v1';


const logalot = c.GLOBAL_LOG_A_LOT || false;


/**
 * Singleton service that can be a local storage for inner spaces, which are
 * in-memory containers for ibgibs (or just addresses).
 *
 * These are spaces that store ibgibs that just live in-memory.
 *
 * Each calling space has a space id. Each inner space acts as a cache with its
 * own name. So a calling space passes in its own id and says "get me an inner
 * (cache) space for 'stored'".
 *
 * The inner spaces can be thought of similarly to arrays, lists, sets, etc.
 *
 * ## driving use case
 *
 * In the `AWSDynamoSpace_V1` sync space, I need a way of caching ibgibs that we
 * know are successfully stored in the store. But the spaces are encrypted
 * and always created as needed so they're not sitting unencrypted in memory.
 * This is not because of the data they store, but because there is
 * private data (aws api key/secret, etc.) used in the space itself when
 * speaking with aws.
 *
 * So this caching service is just to try to have some more persistent local
 * memory of what it has sent, received, etc.
 */
@Injectable({
  providedIn: 'root'
})
export class InnerSpacesCacheService {

  private lc: string = `[${InnerSpacesCacheService.name}]`;

  private spaces: { [key: string]: InnerSpace_V1 }

  constructor() { }

  getKey({
    callingSpaceId,
    innerSpaceName,
  }: {
    callingSpaceId: SpaceId,
    innerSpaceName: string,
  }): string {
    return `${callingSpaceId} ${innerSpaceName}`
  }

  getInnerSpaces({
    callingSpaceId,
    innerSpaceNames,
    createIfNotFound,
  }: {
    callingSpaceId: SpaceId,
    innerSpaceNames: string[],
    createIfNotFound?: boolean,
  }): {[innerSpaceName: string]: InnerSpace_V1} {
    const lc = `${this.lc}[${this.getInnerSpaces.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      throw new Error('not implemented (E: 7f4a438d7cc148dc9f239e613101d59c)');
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
