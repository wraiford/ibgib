import { Injectable } from '@angular/core';
import { Storage } from '@capacitor/core';
import { getIbGibAddr } from 'ts-gib/dist/helper';
import { IbGib_V1, Rel8n, GIB } from 'ts-gib/dist/V1';
import { IbGibAddr, V1, Ib } from 'ts-gib';
import { LatestData } from '../common/types';
import { FilesService } from './files.service';
import { IbgibsService } from './ibgibs.service';

/**
 * The latest ibGib is a special ibgib that maintains an index, to the
 * best of its knowledge, that relates a tjp with an ib^gib pointer
 * that is the most recent in the `past` `rel8n`.
 * 
 * So ideally, when an ibgib, A, has a tjp A1, and it is updated to A2, A3, An 
 * via `mut8` and/or `rel8` transforms, that ibgib creates a timeline.
 * The Latest ibGib tracks the relationship between the tjp and its most 
 * recent frame in that timeline, i.e., A1 -> An. 
 * 
 * It does this via the ib^gib content address pointer, so this becomes 
 * a mapping from A^TJP123 to A^N12345.
 * 
 * It keeps this mapping via the special 'latest' ibGib, which is registered
 * with the {@link IbgibsService}.
 */
@Injectable({
  providedIn: 'root'
})
export class LatestIbgibService {
  private lc = `[${LatestIbgibService.name}]`;

  constructor(
    private files: FilesService,
    private ibgibs: IbgibsService,
  ) { }


  // latest index is a special ibgib

  async registerNewIbGib({ibGib}: {ibGib: IbGib_V1}): Promise<void> {
    // link the tjp address to the ibGib, if it doesn't already have 
    // a "newer" ibGib...hmm, how am I going to do that if we're 
    // using linked rel8ns. Ah for another time.

  }

  async isLatest({ibGib}: {ibGib: IbGib_V1}): Promise<boolean> {
    throw new Error('not implemented');
  }



}
