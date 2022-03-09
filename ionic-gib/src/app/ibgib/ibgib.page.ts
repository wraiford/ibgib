import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, ChangeDetectionStrategy, Input
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { ActionSheetOptionStyle, Capacitor, Plugins } from '@capacitor/core';
const { Modals, Clipboard } = Plugins;

import * as h from 'ts-gib';
import { IbGibAddr, V1 } from 'ts-gib';
import { getIbGibAddr, pretty } from 'ts-gib/dist/helper';
import { IbGib_V1, ROOT } from 'ts-gib/dist/V1';

import * as c from '../common/constants';
import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { CommonService } from '../services/common.service';
import { SPECIAL_URLS } from '../common/constants';
import { LatestEventInfo, TjpIbGibAddr, } from '../common/types';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { getFnAlert, } from '../common/helper';
import { concatMap } from 'rxjs/operators';
import { ChooseIconModalComponent, IconItem } from '../common/choose-icon-modal/choose-icon-modal.component';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { IbGibSpaceAny } from '../common/witnesses/spaces/space-base-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;
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

  private paramMapSub: Subscription;

  private _subPollLatest_Local: Subscription;
  private _pollingLatest_Local: boolean;

  private _subPollLatest_Store: Subscription;
  private _pollingLatest_Store: boolean;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  /**
   * For the ibgib page, our context is just our ibgib itself.
   */
  @Input()
  get ibGib_Context(): IbGib_V1 { return this.ibGib; }
  set ibGib_Context(value: IbGib_V1 ) { console.warn(`${this.lc}[set ibGib_Context] not implemented for IbGibPage, as its ibGib is the context for other views/components.`); }

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
  tjpUpdatesAvailableCount_Local: number = 0;

  /**
   * Number of tjp timelines that have updates in outer space(s).
   */
  @Input()
  tjpUpdatesAvailableCount_Store: number = 0;

  @Input()
  tagging: boolean;

  /**
   * If true, the current ibgib will automatically sync with user-selected sync
   * spaces.
   *
   * This is tracked by the special ibgib 'autosyncs' `SpecialIbGibType`.
   */
  @Input()
  autosync: boolean = false;

  @Input()
  get autoRefresh(): boolean { return !this.paused; }
  set autoRefresh(value: boolean) { this.paused = value; }

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
    this.stopPollLatest_Local();
    this.stopPollLatest_Store();
    this.unsubscribeParamMap();
    super.ngOnDestroy();
  }

  /**
   * If we have a new address that we're loading, then it may be an update to
   * the existing tjp timeline. If so, then we want to keep the same autosync
   * setting.
   *
   * If it's a different timeline, or doesn't have timeline at all, then we want
   * to disable autosync.
   *
   * The sync polling loop checks for this value before starting each loop,
   * so setting it to false will prevent any more loops from executing.
   */
  updateIbGib_Autosync({
    oldTjpAddr: currTjpAddr,
    oldAddr: currAddr,
    newAddr,
  }: {
    oldTjpAddr: TjpIbGibAddr,
    oldAddr: IbGibAddr,
    newAddr: IbGibAddr,
  }): void {
    const lc = `${this.lc}[${this.updateIbGib_Autosync.name}]`;
    try {
      // we want to do things if we are updating the ibgib with the same tjpAddr
      if (newAddr && currAddr && newAddr !== currAddr && currTjpAddr) {
        const currAddrTjpGib = h.getIbAndGib({ibGibAddr: this.tjpAddr}).gib;
        const newAddrTjpGib = getGibInfo({ibGibAddr: newAddr}).tjpGib;
        if (!newAddrTjpGib) {
          this.autosync = false;
        } else if (newAddrTjpGib && newAddrTjpGib !== currAddrTjpGib) {
          // we have a new tjp, see if it's turned on in ibgibs service.
          this.autosync =
            this.common.ibgibs.tjpGibsWithAutosyncTurnedOn.has(newAddrTjpGib);
        } else if (newAddrTjpGib === currAddrTjpGib) {
          if (logalot) { console.log(`${lc} newAddrTjpGib === currAddrTjpGib (${newAddrTjpGib}), so no change to autosync (I: 3b8a1774ec563c882a54efe41fdcc922)`); }
        }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      const oldAddr = this.addr;
      const oldTjpAddr = this.tjpAddr;
      this.stopPollLatest_Local();
      this.stopPollLatest_Store();
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      if (logalot) { console.log(`${lc} ibGib: ${pretty(this.ibGib)}`); }
      await this.loadItem();
      if (this.tjp) { this.startPollLatest_Local(); }
      this.updateIbGib_Autosync({oldTjpAddr, oldAddr, newAddr: addr});
      if (this.autosync) { this.startPollLatest_Store(); }
      this.updateIbGib_Paused();
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

  /**
   * Updates this.paused per current query params 'paused' value, if exists.
   */
  updateIbGib_Paused(): void {
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
        const tagsIbGib = await this.common.ibgibs.getSpecialIbGib({type: "tags"});
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
    if (this.autosync) {
      await this.handleSyncClick_TurnOffSyncing();
    } else {
      await this.handleSyncClick_TurnOnSyncing();
    }
  }

  async handleSyncClick_TurnOffSyncing(): Promise<void> {
    const lc = `${this.lc}[${this.handleSyncClick_TurnOffSyncing.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.autosync = false;
      if (this.tjpAddr && this.common.ibgibs.tjpGibsWithAutosyncTurnedOn.has(this.tjpAddr)) {
        this.common.ibgibs.tjpGibsWithAutosyncTurnedOn.delete(this.tjpAddr);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async foo(): Promise<void> {
    const lc = `${this.lc}[${this.foo.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSyncClick_TurnOnSyncing(): Promise<void> {
    const lc = `${this.lc}[${this.handleSyncClick_TurnOnSyncing.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.item.syncing = true;

      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (!this.tjpAddr) { console.warn(`${lc} tjpAddr is falsy. (W: 9336c52b8a8745f1b969cac6b4cdf4ca)`); }

      // the user has not previously turned on autosync for this tjpAddr this session.
      const body =
        `This will TURN ON syncing for the current ibGib (${this.ib}) and ALL its related ibGibs to your outerspace(s).`;
      const note = `(note: to turn off auto syncing, press the sync button again)`;
      const resConfirmSync = await Modals.confirm({
        title: 'Sync with outerspace?',
        message: `${body}\n\nProceed?\n\n${note}`,
      });


      if (!resConfirmSync.value) {
        await Modals.alert({title: 'Sync cancelled.', message: 'Sync has been cancelled.'});
        this.item.syncing = false;
        // this.autosync = false; // unnecessary?
        return; // <<<< returns
      }

      // get newer ones

      if (this.tjpAddr && !this.common.ibgibs.tjpGibsWithAutosyncTurnedOn.has(this.tjpAddr)) {
        this.common.ibgibs.tjpGibsWithAutosyncTurnedOn.add(this.tjpAddr);
      }

      // get the latest
      const latestAddr =
        await this.common.ibgibs.getLatestAddr({
          ibGib: this.ibGib,
          tjpAddr: this.tjpAddr
        });
      if (latestAddr !== this.addr) {
        await Modals.alert({
          title: 'Recent local changes available',
          message:
            `We are not currently at the latest local ibgib...do you have
            another tab open? Please hit the refresh button (until we get this
            automatic in the near future!).`.replace(/\n/g, ' ').replace(/  /g, '')
        });
        return; // <<<< returns
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
              // do nothing atm as this is handled in ibgibs.service
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

      // won't turn on autosync until the sync succeeds
      this.autosync = true;
      this.startPollLatest_Store();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.item.syncing = false;
    } finally {
      if (logalot) { console.log(`${lc} complete. (I: 2334b5444103f24178e4d2d2116de322)`); }
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

  // #region tagging

  async handleTagClick(_: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleTagClick.name}]`;
    try {
      this.tagging = true;
      if (!this.ibGib) { throw new Error(`There isn't a current ibGib loaded...?`); }
      if (!this.addr) { throw new Error(`There isn't a current ibGib addr loaded...?`); }
      // const contextAddr = getIbGibAddr({ibGib: this.ibGib});
      // console.log(`${lc} contextAddr: ${contextAddr}`);

      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 67e795e53b9c4732ab53837bcaa22c1f)`); }
        await h.delay(109);
      }
      const tagsIbGib = await this.common.ibgibs.getSpecialIbGib({type: "tags"});
      const tagAddrs = tagsIbGib.rel8ns.tag;
      const tagInfos: TagInfo[] = tagAddrs.map(addr => {
        const { ib } = h.getIbAndGib({ibGibAddr: addr});
        const tag = ib.substring('tag '.length);
        const tagInfo: TagInfo = { title: tag, addr };
        return tagInfo;
      });

      const resPrompt = await Modals.showActions({
        title: 'Select tag',
        message: 'Select a tag to add this ibGib to',
        options: [
          {
            // index 0
            title: 'Cancel',
            style: ActionSheetOptionStyle.Cancel
          },
          {
            // index 1
            title: 'New Tag...',
            style: ActionSheetOptionStyle.Default
          },

          // index = i-2
          ...tagInfos,
        ]
      });

      let tagIbGib: IbGib_V1;
      if (resPrompt.index === 0) {

        if (logalot) { console.log(`${lc} cancelled`); }
        await Plugins.Modals.alert({ title: 'nope', message: 'cancelled' });
        this.tagging = false;
        this.ref.detectChanges();
        return;

      } else if (resPrompt.index === 1) {

        if (logalot) { console.log(`${lc} create new tag`); }
        tagIbGib = await this.createNewTag();
        if (!tagIbGib) {
          if (logalot) { console.log(`${lc} aborting creating new tag.`); }
          this.tagging = false;
          this.ref.detectChanges();
          return;
        }

      } else {

        if (logalot) { console.log(`${lc} tag with existing tag, but may not be latest addr`); }
        const tagInfo: TagInfo = tagInfos[resPrompt.index - 2];
        const resTagIbGib = await this.common.ibgibs.get({addr: tagInfo.addr});
        if (resTagIbGib.success && resTagIbGib.ibGibs?.length === 1) {
          const rel8dTagIbGibAddr = getIbGibAddr({ibGib: resTagIbGib.ibGibs[0]});
          if (logalot) { console.log(`${lc} the rel8d tag may not be the latest: ${rel8dTagIbGibAddr}`); }
          const latestTagAddr = await this.common.ibgibs.getLatestAddr({ibGib: resTagIbGib.ibGibs[0]});
          if (logalot) { console.log(`${lc} latestTagAddr: ${latestTagAddr}`); }
          if (rel8dTagIbGibAddr === latestTagAddr) {
            console.error(`${lc} tag is already the latest`);
            tagIbGib = resTagIbGib.ibGibs[0]!;
          } else {
            console.error(`${lc} tag is NOT the latest`);
            const resTagIbGibLatest = await this.common.ibgibs.get({addr: latestTagAddr});
            if (resTagIbGibLatest.success && resTagIbGibLatest.ibGibs?.length === 1) {
              console.error(`${lc} tag is NOT the latest and we got a new ibgib`);
              tagIbGib = resTagIbGibLatest.ibGibs![0];
            } else {
              console.error(`${lc} couldn't find latest tag addr (${latestTagAddr}). using previous tag (${rel8dTagIbGibAddr})`);
              tagIbGib = resTagIbGib.ibGibs![0];
            }
          }
        } else {
          throw new Error(`${resTagIbGib.errorMsg || 'there was a problem getting the tag ibGib.'}`);
        }

      }

      // relate context to tag
      const rel8nsToAddByAddr = { target: [this.addr] };
      const resRel8ToTag =
        await V1.rel8({src: tagIbGib, rel8nsToAddByAddr, dna: true, nCounter: true});
      await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToTag});
      const { newIbGib: newTag } = resRel8ToTag;
      await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newTag, linked: true});
      await this.common.ibgibs.registerNewIbGib({ibGib: newTag});

      if (logalot) { console.log(`${lc} tag successful.`); }
      await Modals.alert({title: 'yess', message: `Tagged.`});
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      await Modals.alert({title: 'something went awry...', message: error.message});
    } finally {
      this.tagging = false;
      this.ref.detectChanges();
    }

  }

  async createNewTag(): Promise<IbGib_V1 | undefined> {
    const lc = `${this.lc}[${this.createNewTag.name}]`;

    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const text = await this.chooseTagText();
      if (!text) { return; }
      const icon = await this.chooseTagIcon();
      if (!icon) { return; }
      const description = await this.chooseTagDescription(text);
      if (!description) { return; }

      const resNewTag = await this.common.ibgibs.createTagIbGib({text, icon, description});

      return resNewTag.newTagIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Returns the text/title of the tag.
   * @returns
   */
  async chooseTagText(): Promise<string | undefined> {
    const lc = `${this.lc}[${this.chooseTagText.name}]`;
    let tagText: string;
    try {
      for (let i = 0; i < 10; i++) {
        let resTagText = await Plugins.Modals.prompt({
          title: 'Tag Text?',
          message: `What's the tag called?`,
          cancelButtonTitle: 'Cancel',
          okButtonTitle: 'Next...',
        });

        if (resTagText.cancelled || !resTagText.value) {
          if (logalot) { console.log(`${lc} cancelled? no value?`) }
          return;
        }

        if (c.ILLEGAL_TAG_TEXT_CHARS.some(x => resTagText.value.includes(x))) {
          await Plugins.Modals.alert({
            title: 'Nope...',
            message: `Tag Text can't contain spaces or ${c.ILLEGAL_TAG_TEXT_CHARS}`,
          });
        } else {
          tagText = resTagText.value;
          if (logalot) { console.log(`${lc} tagText: ${tagText}`); }
          break;
        }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      tagText = undefined;
    }

    return tagText;
  }

  async chooseTagIcon(): Promise<string | undefined> {
    const lc = `${this.lc}[${this.chooseTagIcon.name}]`;
    try {
      const modal = await this.common.modalController.create({
        component: ChooseIconModalComponent,
      });
      await modal.present();
      let resModal = await modal.onWillDismiss();
      const iconItem: IconItem = resModal.data;
      if (!iconItem) {
        if (logalot) { console.log(`${lc} cancelled.`) }
        return;
      }
      if (logalot) { console.log(`${lc} icon: ${iconItem.icon}`); }
      return iconItem!.icon;
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Returns the description of the tag.
   * @returns
   */
  async chooseTagDescription(tagText: string): Promise<string | undefined> {
    const lc = `${this.lc}[${this.chooseTagDescription.name}]`;
    let tagDesc: string;
    try {
      for (let i = 0; i < 10; i++) {
        let resTagDesc = await Plugins.Modals.prompt({
          title: 'Tag Description?',
          message: `What's the tag description?`,
          inputPlaceholder: tagText,
          cancelButtonTitle: 'Cancel',
          okButtonTitle: 'Create Tag',
        });

        if (resTagDesc.cancelled) {
          if (logalot) { console.log(`${lc} cancelled? no value?`) }
          return;
        }

        if (c.ILLEGAL_TAG_DESC_CHARS.some(x => resTagDesc.value.includes(x))) {
          await Plugins.Modals.alert({
            title: 'Nope...',
            message: `Description can't contain ${c.ILLEGAL_TAG_DESC_CHARS}`,
          });
        } else {
          tagDesc = resTagDesc.value || `${tagText} is cool tag.`;
          if (logalot) { console.log(`${lc} tagText: ${tagDesc}`); }
          break;
        }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      tagDesc = undefined;
    }

    return tagDesc;
  }

  // #endregion tagging

  async handleInfoClick(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleInfoClick.name}]`;
    try {
      // let info = JSON.stringify(this.ibGib_Context, null, 2);
      // let addr = getIbGibAddr({ibGib: this.ibGib_Context});
      let info = JSON.stringify(this.ibGib, null, 2);
      let addr = getIbGibAddr({ibGib: this.ibGib});
      await Modals.alert({title: addr, message: info});
      console.log(info);
    } catch (error) {
      console.error(`${lc} ${error.message}`)
    }
  }

  // #region Polling

  private startPollLatest_Local(): void {
    const lc = `${this.lc}[${this.startPollLatest_Local.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 682afa3d6093319848ee801f9a14cc22)`); }
      if (this._subPollLatest_Local && !this._subPollLatest_Local.closed) {
        this.stopPollLatest_Local();
      }

      // initial delay for first run
      setTimeout(() => {
        if (logalot) { console.log(`${lc} subscribing to polling... (I: a81a3f43ace6500126d3d29f4bb1ec22)`); }
        this._subPollLatest_Local =
          interval(c.DEFAULT_LOCAL_SPACE_POLLING_INTERVAL_MS).pipe(
            concatMap(async (_) => { await this.execPollLatest_Local(); })
          ).subscribe();
      }, c.DEFAULT_LOCAL_SPACE_POLLING_DELAY_FIRST_RUN_MS);
      // }, 5_000); // for debugging only!!!! DO NOT PUT IN PRODUCTION
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // not critical
    } finally {
      if (logalot) { console.log(`${lc} complete. (I: 793116f74278cb3f4b181322ff639b22)`); }
    }
  }

  private async execPollLatest_Local(): Promise<void> {
    const lc = `${this.lc}[${this.execPollLatest_Local.name}]`;
    // return early if busy with some other job...
    if (this.syncing) {
      if (logalot) { console.log(`${lc} currently syncing, so skipping poll call.`); }
      return; // <<<< returns
    } else if (this.refreshing) {
      if (logalot) { console.log(`${lc} currently refreshing, so skipping poll call.`); }
      return; // <<<< returns
    } else if (this._pollingLatest_Local) {
      if (logalot) { console.log(`${lc} currently already polling, so skipping new poll call.`); }
      return; // <<<< returns
    }

    if (logalot) { console.log(`${lc} poll call starting... (I: 3b58bc80651d831e3d421e5647cbcd22)`); }
    this._pollingLatest_Local = true;
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
              if (logalot) { console.log(`${lc} diff === ${diff} (I: 8ed2a7eea4c95933acb0d337f7b23722)`); }
              this.tjpUpdatesAvailableCount_Local = diff;
              setTimeout(() => this.ref.detectChanges(), 100);
            } else {
              console.warn(`${lc} latestIbGib registered is newer than current ibGib`);
            }
          }
        }
      } else {
        if (logalot) { console.log(`${lc} this ibgib has no tjp. stopping further polling.`); }
        this.stopPollLatest_Local();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.stopPollLatest_Local();
    } finally {
      if (logalot) { console.log(`${lc} poll call complete. (I: cc0d9a254cc83350e151de2e9df3cd22)`); }
      this._pollingLatest_Local = false;
    }
  }

  private stopPollLatest_Local(): void {
    const lc = `${this.lc}[${this.stopPollLatest_Local.name}]`;
    try {
      if (this._subPollLatest_Local && !this._subPollLatest_Local.closed) {
        this._subPollLatest_Local.unsubscribe();
      }
      delete this._subPollLatest_Local;
      this._pollingLatest_Local = false;
      this.tjpUpdatesAvailableCount_Local = 0;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // not critical
    }
  }

  private startPollLatest_Store(): void {
    const lc = `${this.lc}[${this.startPollLatest_Store.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: f4ce620a632f4177936d5e0fa61c92ad)`); }
      if (this._subPollLatest_Store && !this._subPollLatest_Store.closed) {
        this.stopPollLatest_Store();
      }

      setTimeout(() => {
        // just a hack here for initial testing
        if (logalot) { console.log(`${lc} subscribing to polling... (I: ec9ddb3d270d4cc3a9a94dd3bf4bf952)`); }
        this._subPollLatest_Store =
          // interval(c.DEFAULT_OUTER_SPACE_POLLING_INTERVAL_MS).pipe(
          interval(15_000).pipe( // for debugging only!!!! DO NOT PUT IN PRODUCTION
            concatMap(async (_) => { await this.execPollLatest_Store(); })
          ).subscribe();
      // }, 5_000); // for debugging only!!!! DO NOT PUT IN PRODUCTION
      }, c.DEFAULT_OUTER_SPACE_POLLING_DELAY_FIRST_RUN_MS);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // not critical
    } finally {
      if (logalot) { console.log(`${lc} complete. (I: 33f3b03cb3cd496895b30cb146938e02)`); }
    }
  }

  private async execPollLatest_Store(): Promise<void> {
    const lc = `${this.lc}[${this.execPollLatest_Store.name}]`;
    // return early if busy with some other job...
    if (this.syncing) {
      if (logalot) { console.log(`${lc} currently syncing, so skipping poll call.`); }
      return; // <<<< returns
    } else if (this.refreshing) {
      if (logalot) { console.log(`${lc} currently refreshing, so skipping poll call.`); }
      return; // <<<< returns
    } else if (this._pollingLatest_Store) {
      if (logalot) { console.log(`${lc} currently already polling, so skipping new poll call.`); }
      return; // <<<< returns
    } else if (!this.autosync) {
      if (logalot) { console.log(`${lc} this.autosync is false, so stopping polling. (I: b7c151e1b1afa40a4160e31f88824522)`); }
      setTimeout(() => this.stopPollLatest_Store());
      return; // <<<< returns
    } else if (this.tjpUpdatesAvailableCount_Store > 0) {
      if (logalot) { console.log(`${lc} updates already available, so skipping poll call. (I: dcc433c400134ee45773c81c9af4fb22)`); }
      return; // <<<< returns
    }

    if (logalot) { console.log(`${lc} poll call starting... (I: b12f7fd857a4483989057bb62f0ab204)`); }
    this._pollingLatest_Store = true;
    try {
      if (!this.tjpAddr) { await this.loadTjp(); }
      if (this.tjpAddr) {
        if (logalot) { console.log(`${lc} this.tjpAddr: ${this.tjpAddr}`); }
        // get our sync spaces
        const appSyncSpaces = await this.common.ibgibs.getAppSyncSpaces({
          unwrapEncrypted: true,
          createIfNone: true,
        });
        const syncSpaceIds = appSyncSpaces.map(space => space?.data?.uuid);
        if (logalot) { console.log(`${lc} syncSpaceIds: ${syncSpaceIds} (I: 141f050b682f1a1a23ebb06c69b2c422)`); }

        // look in each space (in parallel) for a newer latest address for a tjp
        const spacesAndGetLatestAddrPromises = appSyncSpaces.map(space => {
          // note this does NOT await, so we can await all in parallel
          return <[IbGibSpaceAny, Promise<string>]>[
            // the space
            space,
            // the promise
            this.common.ibgibs.getLatestAddr({tjpAddr: this.tjpAddr, space}),
          ];
        });
        /** This will track the updates across all spaces. */
        let runningDiffCountAcrossAllSpaces = 0;
        await Promise.all(spacesAndGetLatestAddrPromises.map(([_, p]) => p));
        for (let i = 0; i < spacesAndGetLatestAddrPromises.length; i++) {
          const lc2 = `${lc}[getLatestAddr]`;
          try {
            const [space, getLatestAddrPromise] = spacesAndGetLatestAddrPromises[i];
            const spaceIb = space.ib;
            if (!spaceIb) { throw new Error(`invalid space. ib required (E: 7194b47156afd9e492f7c4d8ea386d22)`); }
            if (logalot) { console.log(`${lc} doing spaceIb: ${spaceIb} (I: 5facc3c362540642ea78196778b05622)`); }
            const latestAddr = await getLatestAddrPromise;
            if (latestAddr !== this.addr) {
              if (logalot) { console.log(`${lc} there is a new latest addr in the sync space. latestAddr: ${latestAddr} (I: 72cbfbb603b349f3a85b3265c679a9bf)`); }
              // get the latest but don't save it, we're just going to see how many
              // iterations we're behind.
              const resLatestIbGib =
                await this.common.ibgibs.get({addr: latestAddr, space});
              if (resLatestIbGib.success && resLatestIbGib.ibGibs?.length > 0) {
                const latestIbGib = resLatestIbGib.ibGibs[0];
                const currentPastLength = this.ibGib.rel8ns?.past?.length ?? 0;
                const latestPastLength = latestIbGib.rel8ns?.past?.length ?? 0;
                const diff = latestPastLength - currentPastLength;
                if (diff > 0) {
                  if (logalot) { console.log(`${lc} diff === ${diff} in spaceIb: ${spaceIb} (I: 7ca33c3361d54fb5918dea5ff1a5b1b5)`); }
                  runningDiffCountAcrossAllSpaces += diff;
                } else {
                  console.warn(`${lc} latestIbGib registered is newer than current ibGib`);
                }
              }
            }
          } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
          }
        }
        if (runningDiffCountAcrossAllSpaces > 0) {
          this.tjpUpdatesAvailableCount_Store = runningDiffCountAcrossAllSpaces;
        }
      } else {
        if (logalot) { console.log(`${lc} this ibgib has no tjp. stopping further polling. (I: 5e79aba1ffb6490eb89994fa2415e4d4)`); }
        this.stopPollLatest_Store();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.stopPollLatest_Store();
    } finally {
      if (logalot) { console.log(`${lc} poll call complete. (I: 76ec7ace62064277a258ebd223fc727b)`); }
      this._pollingLatest_Store = false;
    }
  }

  private stopPollLatest_Store(): void {
    const lc = `${this.lc}[${this.stopPollLatest_Store.name}]`;
    try {
      this.autosync = false;
      if (this._subPollLatest_Store && !this._subPollLatest_Store.closed) {
        this._subPollLatest_Store.unsubscribe();
      }
      delete this._subPollLatest_Store;
      this._pollingLatest_Store = false;
      this.tjpUpdatesAvailableCount_Store = 0;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // not critical
    }
  }

  // #endregion Polling

}

interface TagInfo {
  title: string;
  addr: string;
}
