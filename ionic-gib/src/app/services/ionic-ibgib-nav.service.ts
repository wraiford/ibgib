import { Injectable } from '@angular/core';
import { IbgibNav, NavInfo } from './common.service';
import { NavController } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../common/constants';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { IBGIB_DELIMITER } from 'ts-gib/dist/V1';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

@Injectable({
  providedIn: 'root'
})
export class IonicIbgibNavService implements IbgibNav {

  protected lc: string = `[${IonicIbgibNavService.name}]`;

  stack: NavInfo[] = [];

  constructor(
    private nav: NavController,
  ) {
  }

  async go({
    toAddr,
    toAddr_TjpGib,
    fromAddr,
    fromAddr_TjpGib,
    queryParams,
    queryParamsHandling = 'preserve',
    isModal,
    force,
  }: NavInfo): Promise<void> {
    const lc: string = `${this.lc}[${this.go.name}]`;
    if (logalot) { console.log(`${lc} starting...(${toAddr || 'falsy'}) from (${fromAddr || 'falsy'})`); }
    let pushedToStack = false;
    try {
      if (!toAddr) { throw new Error(`toAddr required (E: f4d63bbc37ad4798826de4d2c9eab4a5)`); }

      if (fromAddr === IBGIB_DELIMITER) { fromAddr = undefined; }

      if (logalot) { console.log(`${lc} BEFORE stack: ${h.pretty(this.stack)}`); }

      if (this.stack.length > 0 && this.stack[this.stack.length-1].toAddr === toAddr) {
        console.warn(`${lc} duplicate toAddr requested. Nav aborted. (W: cccab7e6ccd840f3a3ea32d9818da233)`)
        return;
      } else {
        /** if we force with to/from addrs equal, then we're forcing a refresh */
        let forceRefresh = false;
        if (toAddr === fromAddr) {
          if (force) {
            // we're performing some kidn of refresh or update
            forceRefresh = true;
          } else {
            console.warn(`${lc} toAddr === fromAddr, so ignoring navigation request. (W: 28cf000a906a4c5caa957135bdfaa9dc)`);
            return; // returns
          }
        }
        /** We only want to push to the stack if we're not updating a timeline. */
        const pushToStack =
          // we're not refreshing and...
          !forceRefresh &&
          (
            // first navigation
            this.stack.length === 0 ||
            // always push modal
            isModal ||
            // navigating to non-timeline ibgib
            !toAddr_TjpGib ||
            // navigating to NEW timeline
            toAddr_TjpGib !== fromAddr_TjpGib ||
            // updating is paused, so we add even intra-timeline addresses to stack
            Object.entries(queryParams ?? {}).some(([k,v]) => k === c.QUERY_PARAM_PAUSED && v === true)
          );
        if (pushToStack) {
          this.stack.push({
            toAddr, toAddr_TjpGib,
            fromAddr, fromAddr_TjpGib,
            queryParams, queryParamsHandling,
            isModal,
          });
          pushedToStack = true;
        }
      }

      if (!toAddr_TjpGib) {
        const toInfo = getGibInfo({ibGibAddr: toAddr});
        toAddr_TjpGib = toInfo.tjpGib ?? undefined;
      }
      if (fromAddr && !fromAddr_TjpGib) {
        const fromInfo = getGibInfo({ibGibAddr: fromAddr});
        fromAddr_TjpGib = fromInfo.tjpGib ?? undefined;
      }

      // since we are handling our own stack information, we use `navigateRoot`
      // which clears the stack with ionic nav.
      await this.nav?.navigateRoot(['ibgib', toAddr], {
          queryParamsHandling,
          animated: true,
          animationDirection: 'forward',
          queryParams,
      }).then(resNav => {
        // debugger;
        if (!resNav) {
          // navResult is false? not sure what would cause this.
          if (pushedToStack && this.stack.length > 0) {
            console.warn(`${lc} navigation failed. popping errored nav from stack. (W: 3a8db90997be4d7da20554901c837218)`);
            this.stack.pop();
            pushedToStack = false;
          }
        }
      });

      if (logalot) { console.log(`${lc} AFTER stack: ${h.pretty(this.stack)}`); }

    } catch (error) {
      console.error(`${lc} aborting nav. error: ${error.message}`);
      if (pushedToStack && this.stack.length > 0) {
        if (logalot) { console.log(`${lc} popping errored nav from stack.`)}
        this.stack.pop();
        pushedToStack = false;
      }
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async back(): Promise<void> {
    const lc = `${this.lc}[${this.back.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {
      if (logalot) { console.log(`${lc} stack: ${h.pretty(this.stack)}`); }
      // debugger;
      // query params handling will require taking a snapshot of the query
      // params after going forward with the given merge strategy, i.e., it
      // would be best to get the actual url and go there. But we don't have
      // that information easily here, so for now, we're going to just merge the
      // current into the previous...best effort crunch.
      if (this.stack.length === 0) {
        if (logalot) { console.warn(`${lc} back stack is completely empty? (W: c62f8e5a00324b879abd7e4a2999d5da)`); }
        return;
      } else if (this.stack.length === 1) {
        // stack is 1, which is our first address and we don't pop.
        // and we don't nav.
        if (logalot) { console.log(`${lc} back stack is at start.`); }
      } else {
        this.stack.pop();
        const {toAddr, queryParams, queryParamsHandling, isModal } =
          this.stack[this.stack.length-1];

        if (!isModal) {
          // normal back button navigation
          await this.nav.navigateRoot(['ibgib', toAddr], {
              queryParamsHandling,
              animated: true,
              animationDirection: 'back',
              queryParams,
          });
        } else {
          // not sure how to handle this yet!
          console.warn(`${lc} back called with isModal === true. not sure how to handle this. (W: 071e08be57ca4c9c9c292922e56cf38d)`)
        }
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
