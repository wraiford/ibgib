import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, ChangeDetectionStrategy, Input
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, interval, pipe } from 'rxjs';
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
import { LatestEventInfo, } from '../common/types';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { getFnAlert, } from '../common/helper';
import { concatMap } from 'rxjs/operators';
import { ChooseIconModalComponent, IconItem } from '../common/choose-icon-modal/choose-icon-modal.component';

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
  tjpUpdatesAvailableCount_Local: number = 0;

  @Input()
  tagging: boolean;

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
      if (logalot) { console.log(`${lc} starting... (I: 682afa3d6093319848ee801f9a14cc22)`); }
      if (this._subPollLatest_Local && !this._subPollLatest_Local.closed) {
        // should we unsubscribe and resubscribe or not continue?...hmm...
        // return;
        this.stopPollingLatest_Local();
      }

      // this.tjpUpdatesAvailableCount_Local = 0;

      setTimeout(() => {
        // just a hack here for initial testing
        if (logalot) { console.log(`${lc} subscribing to polling... (I: a81a3f43ace6500126d3d29f4bb1ec22)`); }
        this._subPollLatest_Local =
          interval(c.DEFAULT_SPACE_POLLING_INTERVAL_MS).pipe(
            concatMap(async (_) => { await this.pollLatest_Local(); })
          ).subscribe();
      }, 1000);
      // }, 1000*60*2);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // not critical
    } finally {
      if (logalot) { console.log(`${lc} complete. (I: 793116f74278cb3f4b181322ff639b22)`); }
    }
  }

  private async pollLatest_Local(): Promise<void> {
    const lc = `${this.lc}[${this.pollLatest_Local.name}]`;
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
        this.stopPollingLatest_Local();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.stopPollingLatest_Local();
    } finally {
      if (logalot) { console.log(`${lc} poll call complete. (I: cc0d9a254cc83350e151de2e9df3cd22)`); }
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
      this.tjpUpdatesAvailableCount_Local = 0;
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
      const tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags"});
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

 }

interface TagInfo {
  title: string;
  addr: string;
}