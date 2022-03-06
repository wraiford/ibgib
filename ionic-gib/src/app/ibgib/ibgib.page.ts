import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, ChangeDetectionStrategy, Input
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval, pipe } from 'rxjs';
import { Capacitor, Plugins } from '@capacitor/core';
const { Modals, Clipboard } = Plugins;

import * as h from 'ts-gib';
import { IbGibAddr, } from 'ts-gib';
import { getIbGibAddr, pretty } from 'ts-gib/dist/helper';
import { IbGib_V1, ROOT } from 'ts-gib/dist/V1';

import * as c from '../common/constants';
import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { CommonService } from '../services/common.service';
import { SPECIAL_URLS } from '../common/constants';
import { LatestEventInfo, } from '../common/types';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { getFnAlert, } from '../common/helper';
import { concatMap } from 'rxjs/operators';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ibgib-page',
  templateUrl: './ibgib.page.html',
  styleUrls: ['./ibgib.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IbGibPage extends IbgibComponentBase
  implements OnInit, OnDestroy {

  protected lc: string = `[${IbGibPage.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#abc123";
  public debugBorderStyle: string = "solid";

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  private paramMapSub: Subscription;

  /**
   * I do my own stack navigation, so have to show iOS back chevron
   * when we can go back.
   */
  @Input()
  get showBackChevronBtn(): boolean {
    // temporary hack
    const platform = Capacitor.getPlatform();
    if (logalot) { console.log(`${this.lc} platform: ${platform}`); }
    return platform === 'ios';
  }

  /**
   * Number of tjp timelines that have updates in outer space(s).
   */
  @Input()
  tjpUpdatesAvailableCount: number = 0;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
  ) {
    super(common, ref);
  }

  async ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc} called.`) }
    try {
      // this.folder = this.activatedRoute.snapshot.paramMap.get('addr');
      this.subscribeParamMap();
      super.ngOnInit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc} called.`) }
    this.stopPollingLatest_Local();
    this.unsubscribeParamMap();
    super.ngOnDestroy();
  }

  private _subPollLatest_Local: Subscription;
  private _pollingLatest_Local: boolean;

  startPollingLatest_Local(): void {
    const lc = `${this.lc}[${this.startPollingLatest_Local.name}]`;
    try {
      if (this._subPollLatest_Local && !this._subPollLatest_Local.closed) {
        // should we unsubscribe and resubscribe or not continue?...hmm...
        // return;
        this.stopPollingLatest_Local();
      }

      setTimeout(() => {
        // just a hack here for initial testing
        this._subPollLatest_Local =
          interval(c.DEFAULT_SPACE_POLLING_INTERVAL_MS).pipe(
            concatMap(async (_) => { await this.pollLatest_Local(); })
          ).subscribe();
      }, 1000*60*2);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // not critical
    }
  }

  private async pollLatest_Local(): Promise<void> {
    const lc = `${this.lc}[${this.pollLatest_Local.name}]`;
    if (this.syncing) {
      if (logalot) { console.log(`${lc} currently syncing, so skipping poll call.`); }
      return; // <<<< returns
    } else if (this.refreshing) {
      if (logalot) { console.log(`${lc} currently refreshing, so skipping poll call.`); }
      return; // <<<< returns
    } else if (this._pollingLatest_Local) {
      if (logalot) { console.log(`${lc} currently already polling, so skipping new poll call.`); }
      return; // <<<< returns
    } else {
      this._pollingLatest_Local = true;
    }
    try {
      if (!this.tjpAddr) { await this.loadTjp(); }
      if (this.tjpAddr) {
        if (logalot) { console.log(`${lc} this.tjpAddr: ${this.tjpAddr}`); }
        const latestAddr =
          await this.common.ibgibs.getLatestAddr({tjpAddr: this.tjpAddr});
        if (latestAddr !== this.addr) {
          if (logalot) { console.log(`${lc} there is a new latest addr: ${latestAddr}`); }
          const resLatestIbGib = await this.common.ibgibs.get({addr: latestAddr});
          if (resLatestIbGib.success && resLatestIbGib.ibGibs?.length > 0) {
            const latestIbGib = resLatestIbGib.ibGibs[0];
            const currentPastLength = this.ibGib.rel8ns?.past?.length ?? 0;
            const latestPastLength = latestIbGib.rel8ns?.past?.length ?? 0;
            const diff = latestPastLength - currentPastLength;
            if (diff > 0) {
              this.tjpUpdatesAvailableCount = diff;
            } else {
              console.warn(`${lc} latestIbGib registered is newer than current ibGib`);
            }
          }
        }
      } else {
        if (logalot) { console.log(`${lc} this ibgib has no tjp. stopping further polling.`); }
        this.stopPollingLatest_Local();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.stopPollingLatest_Local();
    } finally {
      this._pollingLatest_Local = false;
    }
  }

  stopPollingLatest_Local(): void {
    const lc = `${this.lc}[${this.stopPollingLatest_Local.name}]`;
    try {
      if (this._subPollLatest_Local && !this._subPollLatest_Local.closed) {
        this._subPollLatest_Local.unsubscribe();
      }
      delete this._subPollLatest_Local;
      this._pollingLatest_Local = false;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // not critical
    }
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      this.stopPollingLatest_Local();
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      if (logalot) { console.log(`${lc} ibGib: ${pretty(this.ibGib)}`); }
      await this.loadItem();
      if (this.tjp) { this.startPollingLatest_Local(); }
      this.updatePaused();
      if (!this.paused && !this.ib.startsWith('bin.')) {
        this.item.refreshing = true;
        setTimeout(async () => {
          await this.common.ibgibs.pingLatest_Local({ibGib: this.ibGib, tjp: this.tjp});
        });
      }
      document.title = this.item?.text ?? this.ibGib?.data?.text ?? this.gib;
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  updatePaused(): void {
    this.paused = (this.activatedRoute.snapshot.queryParams[c.QUERY_PARAM_PAUSED] || 'false') === 'true';
   }

  subscribeParamMap() {
    let lc = `${this.lc}[${this.subscribeParamMap.name}]`;

    this.paramMapSub = this.activatedRoute.paramMap.subscribe(async map => {
      let addr = map.get('addr');
      lc = `${lc}[${addr}]`;
      if (logalot) { console.log(`${lc} new addr`) }

      if (!SPECIAL_URLS.includes((addr || "").toLowerCase()) && encodeURI(addr).includes('%5E')) {
        // normal handling for a normal ibGib is to update the page's ibgib
        // and load everything.
        if (logalot) { console.log(`new paramMap. addr: ${addr}`); }
        if (addr !== this.addr) {
          this.updateIbGib(addr);
        } else {
          // do nothing, it's the same as the current addr
        }
      } else {
        // default special non-ibgib handler, go to the tags ibGib
        while (this.common.ibgibs.initializing) {
          if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 936911af9f942cbdde7de4bf65fef822)`); }
          await h.delay(100);
        }
        const tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags"});
        let tagsAddr = getIbGibAddr({ibGib: tagsIbGib});
        console.warn(`${lc} special url entered, so defaulting nav to tags ibGib (tagsAddr: ${tagsAddr}) (W: bcc8a669f4f44cbb837080615c3db51a)`);
        await this.go({ toAddr: tagsAddr, fromAddr: this.addr });
      }

    });

  }

  unsubscribeParamMap() {
    const lc = `${this.lc}[${this.unsubscribeParamMap.name}]`;
    if (logalot) { console.log(`${lc} unsubscribe called`); }
    if (this.paramMapSub) {
      if (logalot) { console.log(`${lc} unsubscribing`); }
      this.paramMapSub.unsubscribe();
      delete this.paramMapSub;
    }
  }

  async handleShareClick(): Promise<void> {
    const alert = getFnAlert();
    try {
      await Clipboard.write({ string: this.addr });

      await alert({title: 'ibgib address copied', msg:
        `Copied to clipboard!

        "${this.addr}"

        You can add this to another ibgib by going to that and clicking import (the little sparkly stars icon atm.)
        `
      });
    } catch (error) {
      await alert({title: 'ibgib address copied', msg: `clipboard failed...`});
    }

  }

  async handleSyncClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleSyncClick.name}]`;
    this.item.syncing = true;
    try {
      if (logalot) { console.log(`${lc}`); }
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }

      if (!this.tjpAddr) { console.warn(`${lc} tjpAddr is falsy. (W: 9336c52b8a8745f1b969cac6b4cdf4ca)`); }

      let syncConfirmed = false;
      if (this.tjpAddr && this.common.ibgibs.syncConfirmed.includes(this.tjpAddr)) {
        syncConfirmed = true;
      } else {
        const resConfirmSync = await Modals.confirm({
          title: 'Sync with outerspace?',
          message: `This will sync your current ibGib (${this.ib}) and ALL its rel8ns to your outerspace(s)? Proceed?`,
        });
        syncConfirmed = resConfirmSync.value;
      }

      if (syncConfirmed) {
        // get newer ones

        if (this.tjpAddr && !this.common.ibgibs.syncConfirmed.includes(this.tjpAddr)) {
          this.common.ibgibs.syncConfirmed.push(this.tjpAddr);
        }

        // publish this one
        const dependencyGraph =
          await this.common.ibgibs.getDependencyGraph({ibGib: this.ibGib});
        const sagaInfos = await this.common.ibgibs.syncIbGibs({
          dependencyGraphIbGibs: Object.values(dependencyGraph),
          watch: true,
        });
        if (sagaInfos) {
          await new Promise<void>((resolve, reject) => {
            let sagaCompleteOrErroredCount = 0;
            for (let i = 0; i < sagaInfos.length; i++) {
              const info = sagaInfos[i];
              info.syncStatus$.subscribe(status => {
                // do nothing atm
              },
              error => {
                const emsg = typeof error === 'string' ?
                  `${lc} Sync failed: ${error}` :
                  `${lc} Sync failed: ${error?.message ?? 'some error(?) (UNEXPECTED)'}`;
                console.error(emsg);
                reject(new Error(emsg));
              },
              () => {
                sagaCompleteOrErroredCount++;
                if (sagaCompleteOrErroredCount === sagaInfos.length) {
                  this.item.syncing = false;
                  setTimeout(() => { this.ref.detectChanges(); })
                  resolve();
                }
              });
            }
          });
        }
      } else {
        await Modals.alert({title: 'Sync cancelled.', message: 'Sync has been cancelled.'});
        this.item.syncing = false;
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.item.syncing = false;
    }
  }

  async handleRefreshClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleRefreshClick.name}]`;
    try {
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (!this.tjp) { await this.loadTjp(); }

      if (this.paused) {
        this.paused = false;
        await this.go({
          toAddr: this.addr,
          fromAddr: this.addr,
          queryParams: { [c.QUERY_PARAM_PAUSED]: null },
          queryParamsHandling: 'merge',
          force: true,
        });
      }
      if (this.item) { this.item.refreshing = true; }
      await this.common.ibgibs.pingLatest_Local({ibGib: this.ibGib, tjp: this.tjp});
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handlePauseClick(): Promise<void> {
    const lc = `${this.lc}[${this.handlePauseClick.name}]`;
    try {
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (!this.tjp) { await this.loadTjp(); }

      this.paused = true;
      await this.go({
        toAddr: this.addr,
        fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
        queryParams: { [c.QUERY_PARAM_PAUSED]: true },
        queryParamsHandling: 'merge'
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handleIbGib_NewLatest(info: LatestEventInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleIbGib_NewLatest.name}]`;
    try {
      if (!this.tjp) { await this.loadTjp(); }
      if (this.tjpAddr !== info.tjpAddr) { return; }
      if (logalot) { console.log(`${lc} triggered.\nthis.addr: ${this.addr}\ninfo: ${JSON.stringify(info, null, 2)}`); }

      if (!this.ibGib) { return; }
      if (!this.tjpAddr) { await this.loadTjp(); }
      if (info.tjpAddr !== this.tjpAddr) { return; }
      if (this.addr !== info.latestAddr) {
        await this.go({
          toAddr: info.latestAddr,
          fromAddr: this.addr,
        });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      // at this point, we're guaranteed to be the latest in this component's tjp/timeline
      if (this.item) {
        this.item.refreshing = false;
        setTimeout(() => { this.ref.detectChanges(); })
      }
    }
  }

  async handleTitleClick(): Promise<void> {
    if (this.item?.type === 'comment') {
      await Modals.alert({
        title: 'Context',
        message: this.item?.text,
      });
    }
  }

  async showFullscreenModal(): Promise<void> {
    const lc = `${this.lc}[${this.showFullscreenModal.name}]`;
    try {
      const addr = h.getIbGibAddr({ibGib: this.ibGib});
      const modal = await this.common.modalController.create({
        component: IbgibFullscreenModalComponent,
        componentProps: {
          addr,
        },
      });
      await modal.present();
      // await modal.componentOnReady();
      // await (<IbgibFullscreenModalComponent>modal.component).updateIbGib(this.addr);
      // let resModal = await modal.onWillDismiss();
      // const iconItem: IconItem = resModal.data;
      // if (!iconItem) {
      //   if (logalot) { console.log(`${lc} cancelled.`) }
      //   return;
      // }
      if (logalot) { console.log(`${lc} modal closed.`); }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
    }
  }

  async handleBackButtonClick(): Promise<void> {
    await this.common.nav.back();
  }

 }
