import { Injectable } from '@angular/core';
import { Plugins } from '@capacitor/core';
import { getIbGibAddr } from 'ts-gib/dist/helper';
import { IbGib_V1, Rel8n, GIB } from 'ts-gib/dist/V1';
import { IbGibAddr, V1, Ib } from 'ts-gib';
import { FilesService } from './files.service';
import { IbgibsService } from './ibgibs.service';
const { Modals } = Plugins;

const HACK_STORAGE_KEY_LATEST = 'latest_ibgib_storage_key';
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
  /**
   * If we have an addr for an ibGib that we can't find locally, we
   * will prompt the user if we want to replace the address.
   * We'll then ask if they always want to do so. This flag represents the answer
   * to that "always replace" prompt.
   */
  private alwaysReplaceLatestNotFound = false;

  constructor(
    private files: FilesService,
    private ibgibs: IbgibsService,
  ) { }


  // latest index is a special ibgib

  async registerNewIbGib({
    ibGib,
    isMeta,
  }: {
    ibGib: IbGib_V1,
    isMeta?: boolean,
  }): Promise<void> {
    const lc = `${this.lc}[${this.registerNewIbGib.name}]`;
    // link the tjp address to the ibGib, if it doesn't already have 
    // a "newer" ibGib...hmm, how am I going to do that if we're 
    // using linked rel8ns. Ah for another time.

    try {
      // this is the latest index ibGib. It's just the mapping of tjp -> latestAddr.
      // Other refs to "latest" in this function
      // will refer to the actual/attempted latest of the ibGib arg.
      let specialLatest = await this.ibgibs.getSpecialIbgib({type: "latest"});
      if (!specialLatest.rel8ns) { specialLatest.rel8ns = {}; }

      const ibGibAddr: IbGibAddr = getIbGibAddr({ibGib});

      // 
      let tjp = await this.ibgibs.getTjp({ibGib});
      if (!tjp) {
        console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself.`);
        tjp = ibGib;
      }
      // the tjpAddr is the rel8nName for the mapping.
      let tjpAddr = getIbGibAddr({ibGib: tjp});

      // either we're adding the given ibGib, replacing the existing with the ibGib,
      // or doing nothing. So we can do this with a closure at this point.
      const replaceLatest: () => Promise<void> = async () => {
        await this.ibgibs.rel8ToSpecialIbGib({
          type: "latest",
          rel8nName: tjpAddr,
          ibGibToRel8: ibGib,
          isMeta,
          linked: true, // this ensures only one latest ibGib mapped at a time
          deletePreviousSpecialIbGib: true, // the latest mapping is ephemeral
          severPast: true,
          skipRel8ToRoot: true, 
        });
      }

      let existingMapping = specialLatest.rel8ns[tjpAddr] || [];
      if (existingMapping.length > 0) {
        // mapping exists, so we need to check if the given ibGib is newer.
        let existingLatestAddr = existingMapping[0];
        let resExistingLatest = await this.files.get({addr: existingLatestAddr});
        if (!resExistingLatest.success || !resExistingLatest.ibGib) {
          if (
            this.alwaysReplaceLatestNotFound ||
            await this.promptReplaceLatest({existingLatestAddr, ibGibAddr})
          ) { 
            console.error(`Didn't find existing latest ibGib (${existingLatestAddr}). I haven't implemented more robust multi-node/distributed strategies for this scenario yet. User chose YES to replace.`);
            await replaceLatest(); 
            return; 
          } else {
            console.error(`Didn't find existing latest ibGib (${existingLatestAddr}). I haven't implemented more robust multi-node/distributed strategies for this scenario yet. User chose NO DON'T replace.`);
            return;
          }
        }

        let existingLatest = resExistingLatest.ibGib!;

        // if there is an nCounter, then we can go by that. Otherwise, we'll have to 
        // brute force it.
        const ibGibHasNCounter = 
          ibGib.data?.n && 
          typeof ibGib.data!.n! === 'number' && 
          ibGib.data!.n! >= 0;
        if (ibGibHasNCounter) {
          // #region ibGib.data.n counter method
          console.log(`found ibGib.data.n (version counter), using this to determine latest ibGib: ${ibGib.data!.n!}`);
          const n_ibGib = <number>ibGib.data!.n!;

          const existingLatestHasNCounter = 
            existingLatest.data?.n && 
            typeof existingLatest.data!.n! === 'number' && 
            existingLatest.data!.n! >= 0;

          if (existingLatestHasNCounter) {
            // both have counters, so compare by those.
            const n_existingLatest = <number>existingLatest.data!.n!;
            if (n_ibGib > n_existingLatest) {
              // is newer
              await replaceLatest();
            } else {
              // is not newer, so we don't need to do anything else.
              return;
            }
          } else {
            // only the new one has the counter, so that wins by default
            await replaceLatest();
          }
          // #endregion

        } else {
          // #region brute force latest
          let latestAddr = await this.getLatestAddr_Brute({
            ibGib, ibGibAddr,
            existingLatest, existingLatestAddr,
            tjpAddr
          }); 
          if (latestAddr === ibGibAddr) { await replaceLatest(); } else { return; }
          // #endregion
        }
      } else {
        // no existing mapping, so go ahead and add.
        console.log(`${lc} adding new latest entry: ${tjpAddr} -> ${ibGibAddr}`);
        await replaceLatest();
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }


  private async promptReplaceLatest({
    existingLatestAddr,
    ibGibAddr,
  }: {
    existingLatestAddr: IbGibAddr,
    ibGibAddr: IbGibAddr,
  }): Promise<boolean> {
    const lc = `${this.lc}[${this.promptReplaceLatest.name}]`;
    try {
      let resReplace = await Modals.confirm({
        title: `Can't find ibGib data...`,
        message: 
          `
            Can't find the ibGib locally for latest address: ${existingLatestAddr}. 
            Do you want to replace it and point to the new address?

            Existing "latest" address for which we don't have the corresponding record (locally): ${existingLatestAddr}

            "New" Address that we do have: ${ibGibAddr}

            Yes, replace: 
              Will replace the local reference on this device to point to the "new" address. 

            No, keep old: 
              Will NOT replace but I don't know how it will work going forward. 
              The ibGib may be frozen in time until we load that record and things may get out of sync.
          `,
          okButtonTitle: 'Yes, replace',
          cancelButtonTitle: 'No, keep old',
      });
      if (resReplace.value) {
        // 
        let resAlwaysReplace = await Modals.confirm({
          title: `Always replace?`,
          message: `Do want to always replace address not found locally? This applies only to this session.`,
          okButtonTitle: 'Yes, always replace',
          cancelButtonTitle: 'No, ask me every time',
        });
        if (resAlwaysReplace.value) { 
          console.warn(`${lc} user chose YES, always replace latest not found for this session.`);
          this.alwaysReplaceLatestNotFound = true; 
        }
        return true;
      } else {
        // don't do nuffin'
        return false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return false;
    }
  }

  // async isLatest({ibGib}: {ibGib: IbGib_V1}): Promise<boolean> {
  //   const lc = `${this.lc}[${this.isLatest.name}]`;
  //   try {
      
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   }
  // }

  /**
   * We are NOT searching through all of our data looking for a needle in a haystack.
   * What we ARE doing is we are looking through the past of the existing latest and 
   * the prospective latest (the given ibGib param) and comparing between the two.
   * 
   * Since `past` rel8n is usually a linked rel8n now, we may have to traverse it all 
   * the way to its beginning for each possibility.
   * 
   * @returns either {@param ibGibAddr} or {@param existingLatestAddr}
   */
  private async getLatestAddr_Brute({
    ibGib, ibGibAddr,
    existingLatest, existingLatestAddr,
    tjpAddr,
  }: {
    ibGib: IbGib_V1<any>, ibGibAddr: string,
    existingLatest: IbGib_V1<any>, existingLatestAddr: string,
    tjpAddr: string,
  }): Promise<string> {
    const lc = `${this.lc}[${this.getLatestAddr_Brute.name}]`;
    try {
      // no nCounter, so we need to brute force. 
      // The easiest way is to check each's past, as the most common 
      // scenario would be registering a newer one, or less likely, a timing issue
      // with registering a previous ibGib frame.

      let ibGibPast = ibGib.rel8ns?.past || [];
      let existingLatestPast = existingLatest.rel8ns?.past || [];

      // going to check a bunch of specific, easy cases to narrow things down.

      if (ibGibPast.length === 1 && existingLatestPast.length === 0) {
        // prospective has a past, so it "must" be newer. (won't quote "must" anymore)
        return ibGibAddr;
      } else if (existingLatestPast.length === 1 && ibGibPast.length === 0) {
        // existing has a past, so it must be newer.
        return existingLatestAddr;
      } else if (existingLatestPast.length === 0 && ibGibPast.length === 0) {
        console.warn(`${lc} neither existing latest nor prospective new ibGib has a past, so keeping existing.`);
        return existingLatestAddr;
      } else if (existingLatestPast.includes(ibGibAddr)) {
        // existing by definition is newer
        return existingLatestAddr;
      } else if (ibGibPast.includes(existingLatestAddr)) {
        // ibGib by definintion is newer
        return ibGibAddr;
      } else if (existingLatestAddr === ibGibAddr) {
        // they're the same!
        return existingLatestAddr;
      } else if (existingLatestAddr === tjpAddr && existingLatest.rel8ns?.tjp?.length === 1) {
        // ibGib must be newer because the existingLatestAddr is the tjp, 
        // which is by definition first in unique past.
        return ibGibAddr;
      } else if (ibGibAddr === tjpAddr && ibGib.rel8ns?.tjp?.length === 1) {
        // existing must be newer because the ibGibAddr is the tjp, 
        // which is by definition first in unique past.
        return existingLatestAddr;
      }

      // well, neither one really gives us any indicator alone
      // so load each one in the past
      let newerAddr: string | undefined;
      let firstIterationCount = -1; // klugy hack, but is an ugly method anyway (brute after all!)

      let getPastCount: (x: IbGib_V1<any>, n: number, otherAddr: string) => Promise<number> = 
        async (x, n, otherAddr) => {
          let xPast = x.rel8ns?.past || [];
          if (xPast.includes(otherAddr)) {
            // no need to proceed further, since the other is found in the past of x, so x is newer
            newerAddr = getIbGibAddr({ibGib: x});
            return -1;
          }
          if (xPast.length === 0) { return n; } // no more past to increment
          let newCount = n + xPast.length;
          if (firstIterationCount !== -1 && newCount > firstIterationCount) {
            // we've determined that the second iteration has a longer past,
            // so we don't need to look further
            newerAddr = getIbGibAddr({ibGib: x});
            return -1;
          }
          // load up the earliest one and call recursively
          let resNextX = await this.files.get({addr: xPast[0]});
          if (!resNextX.success || !resNextX.ibGib) {
            throw new Error(`Couldn't load past addr (xPast[0]): ${xPast[0]}`);
          }
          return getPastCount(resNextX.ibGib, n + xPast.length, otherAddr);
        }

      let ibGibPastCount = await getPastCount(ibGib, 0, existingLatestAddr);
      if (newerAddr) { return newerAddr; }

      // we didn't hit upon it, so set the firstIterationCount so we don't spend unnecessary cycles
      firstIterationCount = ibGibPastCount;
      let existingPastCount = await getPastCount(existingLatest, 0, ibGibAddr);
      if (newerAddr) { return newerAddr; }

      // we didn't yet determine it, so whichever has the longer past is newer
      newerAddr = ibGibPastCount > existingPastCount ?  ibGibAddr : existingLatestAddr;
      return newerAddr;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

}
