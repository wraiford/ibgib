import { Directive, Injectable } from '@angular/core';
import { IbgibNav, NavInfo } from './common.service';
import { NavController } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../common/constants';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { IBGIB_DELIMITER } from 'ts-gib/dist/V1';
import { getTimestampInTicks } from '../common/helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false;

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

  async go(info: NavInfo): Promise<void> {
    const lc: string = `${this.lc}[${this.go.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    let pushedToStack = false;
    try {
      if (!info) { throw new Error(`info required (E: e5b47e6437f9ae6557fa9d6b070c3a22)`); }
      if (info.toAddr) {
        await this.go_ToAddr(info);
      } else if (info.toRawLocation) {
        await this.go_RawLocation(info);
      } else {
        throw new Error(`either toAddr or toRawLocation required (E: 6ce11c6fa201a971998ad22f55522c22)`);
      }
    } catch (error) {
      console.error(`${lc} aborting nav. error: ${error.message}`);
      if (pushedToStack && this.stack.length > 0) {
        if (logalot) { console.log(`${lc} popping errored nav from stack.`) }
        this.stack.pop();
        pushedToStack = false;
      }
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async go_RawLocation({
    toRawLocation,
    fromRawLocation,
    queryParams,
    queryParamsHandling = 'preserve',
    isModal,
    force,
    skipStack,
  }: NavInfo): Promise<void> {
    const lc: string = `${this.lc}[${this.go.name}]`;
    if (logalot) { console.log(`${lc} starting...(${toRawLocation || 'falsy'}) from (${fromRawLocation || 'falsy'})`); }
    let pushedToStack = false;
    try {
      if (!toRawLocation || toRawLocation.length === 0 || toRawLocation[0] === '') { throw new Error(`toRawLocation required (E: 4fd99c95bc3a43c096e182d1a43066e8)`); }

      let defaultFromURL = new URL(window.location.toString());
      let defaultFromRawLocation = defaultFromURL.pathname.split('/');
      if (defaultFromRawLocation.length > 0) {
        if (defaultFromRawLocation[0] === '') { defaultFromRawLocation = defaultFromRawLocation.slice(1); }
      } else {
        defaultFromRawLocation = ['welcome'];
      }

      fromRawLocation = fromRawLocation || defaultFromRawLocation;
      if (!fromRawLocation || fromRawLocation.length === 0 || fromRawLocation[0] === '') {
        throw new Error(`(UNEXPECTED) invalid fromRawLocation...couldn't set fromRawLocation? (E: 4eafe2e069c4ffb168871f4e94294a22)`);
      }

      if (logalot) { console.log(`${lc} BEFORE stack: ${h.pretty(this.stack)} (I: 38ecc759ecc64d5ea79d7ac95d2c4951)`); }

      if (this.stack.length > 0 && this.stack[this.stack.length - 1].toRawLocation === toRawLocation) {
        // currently there is a bug with pressing the back button
        // based on a mismatch being registered with pics...
        const keyLastBackTimestamp = 'ibgib_last_back_press_timestamp_hack';
        const lastTimestamp = localStorage.getItem(keyLastBackTimestamp);
        const now = getTimestampInTicks();
        if (Number.parseInt(lastTimestamp)) {
          const delta = Number.parseInt(now) - Number.parseInt(lastTimestamp);
          if (delta < 1000) {
            // hack: user has double-clicked the back button, so probably messed up...
            console.warn(`${lc} duplicate toRawLocation requested but user "double-clicked" go (probably back), so calling this.back(). (W: c81662d641274da9b56f0f7f5c84a8b6)`);
            localStorage.removeItem(keyLastBackTimestamp);
            await this.back();
          } else {
            console.warn(`${lc} duplicate toRawLocation requested but not "double-click" go (probably back), so aborting nav but setting timestamp. (W: a4f6b244e3704ab7a3df534ab9048c2b)`)
            localStorage.setItem(keyLastBackTimestamp, now);
            return;
          }
        } else {
          console.warn(`${lc} duplicate toRawLocation requested but not "double-click" go (probably back), so aborting nav and clearing timestamp. (W: fd68726e05734d71abb0135259793d00)`)
          localStorage.setItem(keyLastBackTimestamp, now);
          return;
        }
      } else {
        /** We only want to push to the stack if we're not updating a timeline. */
        const pushToStack = true;
        if (pushToStack && !skipStack) {
          this.stack.push({
            toRawLocation, fromRawLocation,
            queryParams, queryParamsHandling,
            isModal,
          });
          pushedToStack = true;
        }
      }

      // since we are handling our own stack information, we use `navigateRoot`
      // which clears the stack with ionic nav. atow, see app.routing to see
      // that this instantiates an ibgib page component, which from testing
      // creates a new ibgib page component each nav.
      // let to = new URL(toRawLocation);
      await this.nav?.navigateRoot(toRawLocation, {
        queryParamsHandling,
        animated: false,
        animationDirection: 'forward',
        queryParams,
      }).then(resNav => {
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
        if (logalot) { console.log(`${lc} popping errored nav from stack.`) }
        this.stack.pop();
        pushedToStack = false;
      }
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async go_ToAddr({
    toAddr,
    toAddr_TjpGib,
    fromAddr,
    fromAddr_TjpGib,
    queryParams,
    queryParamsHandling = 'preserve',
    isModal,
    force,
    skipStack,
  }: NavInfo): Promise<void> {
    const lc: string = `${this.lc}[${this.go.name}]`;
    if (logalot) { console.log(`${lc} starting...(${toAddr || 'falsy'}) from (${fromAddr || 'falsy'})`); }
    let pushedToStack = false;
    try {
      if (!toAddr) { throw new Error(`toAddr required (E: f4d63bbc37ad4798826de4d2c9eab4a5)`); }

      if (fromAddr === IBGIB_DELIMITER) { fromAddr = undefined; }

      if (logalot) { console.log(`${lc} BEFORE stack: ${h.pretty(this.stack)}`); }

      let appId: string, appClassname: string;
      // if (window.location.pathname.startsWith('/app')) { // if we use the route of app/appclass/appid/ibgib/addr ...but i'm trying other shapes now

      if (window.location.pathname.match(/^\/ibgib\/.+\/app\/.+\/\w+$/)) { // path: 'ibgib/:addr/app/:appClassname/:appId',
        // set appId/Classname
        let pieces = window.location.pathname.split('/');
        // appClassname = pieces[2]; // if app is at start of route path
        // appId = pieces[3];
        appClassname = pieces[4];
        appId = pieces[5];
      }

      if (this.stack.length > 0 && this.stack[this.stack.length - 1].toAddr === toAddr) {
        // currently there is a bug with pressing the back button
        // based on a mismatch being registered with pics...
        const keyLastBackTimestamp = 'ibgib_last_back_press_timestamp_hack';
        const lastTimestamp = localStorage.getItem(keyLastBackTimestamp);
        const now = getTimestampInTicks();
        if (Number.parseInt(lastTimestamp)) {
          const delta = Number.parseInt(now) - Number.parseInt(lastTimestamp);
          if (delta < 1000 || force) {
            // hack: user has double-clicked the back button, so probably messed up...
            if (delta < 1000) {
              console.warn(`${lc} duplicate toAddr requested but user "double-clicked" go (probably back), so calling this.back(). (W: ae6962ad44ba4baf909bc6333c865022)`);
            } else {
              console.warn(`${lc} duplicate toAddr requested but force === true, so calling this.back(). (W: ee212b89af5140a195a13ad9c1f3be03)`);
            }
            localStorage.removeItem(keyLastBackTimestamp);
            await this.back();
          } else {
            console.warn(`${lc} duplicate toAddr requested but not "double-click" go (probably back), so aborting nav but setting timestamp. (W: aa6cc9fd4744470db552cdcc4d9ed6be)`)
            localStorage.setItem(keyLastBackTimestamp, now);
            return;
          }
        } else {
          console.warn(`${lc} duplicate toAddr requested but not "double-click" go (probably back), so aborting nav and clearing timestamp. (W: cccab7e6ccd840f3a3ea32d9818da233)`)
          localStorage.setItem(keyLastBackTimestamp, now);
          return;
        }
      } else {
        /** if we force with to/from addrs equal, then we're forcing a refresh */
        let forceRefresh = false;
        if (toAddr === fromAddr) {
          if (force) {
            // we're performing some kidn of refresh or update
            forceRefresh = true;
          } else {
            console.warn(`${lc} toAddr === fromAddr, so ignoring navigation request. (W: 28cf000a906a4c5caa957135bdfaa9dc)`);
            return; /* <<<< returns early */
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
            Object.entries(queryParams ?? {}).some(([k, v]) => k === c.QUERY_PARAM_PAUSED && v === true)
          );
        if (pushToStack && !skipStack) {
          this.stack.push({
            toAddr, toAddr_TjpGib,
            fromAddr, fromAddr_TjpGib,
            queryParams, queryParamsHandling,
            isModal, appId, appClassname,
          });
          pushedToStack = true;
        }
      }

      if (!toAddr_TjpGib) {
        const toInfo = getGibInfo({ ibGibAddr: toAddr });
        toAddr_TjpGib = toInfo.tjpGib ?? undefined;
      }
      if (fromAddr && !fromAddr_TjpGib) {
        const fromInfo = getGibInfo({ ibGibAddr: fromAddr });
        fromAddr_TjpGib = fromInfo.tjpGib ?? undefined;
      }

      // there are two distinct strategies for choosing app:
      // 1. use current app always
      // 2. use app that is on the stack

      // since we are handling our own stack information, we use `navigateRoot`
      // which clears the stack with ionic nav. atow, see app.routing to see
      // that this instantiates an ibgib page component, which from testing
      // creates a new ibgib page component each nav.

      /** bootstrap^gib goes to its own special page...maybe others in the future... */
      const noAppAddrsHack = ['bootstrap^gib'];
      const urlPieces = appId && appClassname && !noAppAddrsHack.includes(toAddr) ?
        ['ibgib', toAddr, 'app', appClassname, appId] :
        ['ibgib', toAddr];
      await this.nav?.navigateRoot(urlPieces, {
        queryParamsHandling,
        animated: false,
        animationDirection: 'forward',
        queryParams,
      }).then(resNav => {
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
        if (logalot) { console.log(`${lc} popping errored nav from stack.`) }
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
      // query params handling will require taking a snapshot of the query
      // params after going forward with the given merge strategy, i.e., it
      // would be best to get the actual url and go there. But we don't have
      // that information easily here, so for now, we're going to just merge the
      // current into the previous...best effort crunch.
      if (this.stack.length === 0) {
        if (logalot) { console.warn(`${lc} back stack is completely empty? (W: c62f8e5a00324b879abd7e4a2999d5da)`); }
        return;
      } else if (this.stack.length === 1) {
        const existing = this.stack[this.stack.length - 1];
        if (existing.fromAddr) {
          let { fromAddr, queryParamsHandling, queryParams, appId, appClassname } = this.stack.pop();
          // routing path: 'app/:appClassname/:appId/ibgib/:addr',
          const urlPieces = appId && appClassname ?
            // ['app', appClassname, appId, 'ibgib', toAddr] :
            ['ibgib', fromAddr, 'app', appClassname, appId,] :
            ['ibgib', fromAddr];
          await this.nav.navigateRoot(urlPieces, {
            queryParamsHandling,
            animated: false,
            animationDirection: 'back',
            queryParams,
          });
          this.stack.push({
            toAddr: fromAddr,
            fromAddr: '',
            queryParams,
            queryParamsHandling,
            appId,
            appClassname,
          });
        } else if (existing.fromRawLocation?.length > 0) {
          const { fromRawLocation } = this.stack.pop();
          await this.nav.navigateRoot(fromRawLocation, {
            animated: false,
            animationDirection: 'back',
          });
          this.stack.push({
            toRawLocation: fromRawLocation,
            fromRawLocation: fromRawLocation,
          });
        } else {
          if (logalot) { console.log(`${lc} back stack is at start. (I: 1ee93f63bd2a410aaa1535c9954c7379)`); }
        }
      } else {
        this.stack.pop();
        const { toAddr, queryParams, queryParamsHandling, isModal, toRawLocation } =
          this.stack[this.stack.length - 1];

        if (!isModal) {
          // normal back button navigation
          if (toAddr) {
            await this.nav.navigateRoot(['ibgib', toAddr], {
              queryParamsHandling,
              animated: false,
              animationDirection: 'back',
              queryParams,
            });
          } else if (toRawLocation) {
            await this.nav.navigateRoot(toRawLocation, {
              animated: false,
              animationDirection: 'back',
            });
          } else {
            throw new Error(`(UNEXPECTED) nav is hrmm...both toAddr and toRawLocation falsy? (E: 42e946bc45b524d08bfb51c77f63fe22)`);
          }
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
