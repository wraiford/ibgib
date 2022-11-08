/**
 * @module IbGibPage is the main page that shows an ibgib.
 *
 * This has all the plumbing for receiving a route and showing
 * an ibgib component that has a binding with an ibgib address.
 *
 * ATOW it uses polling to check for updates both in the current local
 * space, as well as in outer (sync) space(s) if autosync is turned on for
 * the timeline.
 */

import { Subscription, interval, Observable, Subject, } from 'rxjs';
import { concatMap, debounceTime } from 'rxjs/operators';
import {
  Component, OnInit, OnDestroy,
  ChangeDetectorRef, ChangeDetectionStrategy, Input, ViewChild
} from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { Capacitor, } from '@capacitor/core';
import { Dialog } from '@capacitor/dialog';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Clipboard } from '@capacitor/clipboard';
import { Storage } from '@capacitor/storage';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Toast } from '@capacitor/toast';

import * as h from 'ts-gib';
import { IbGibAddr, TransformResult, V1 } from 'ts-gib';
import { IbGibData_V1, IbGib_V1, isPrimitive } from 'ts-gib/dist/V1';

import * as c from '../common/constants';
import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { CommonService } from '../services/common.service';
import { SPECIAL_URLS } from '../common/constants';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { IbGibSpaceAny } from '../common/witnesses/spaces/space-base-v1';
import { PicData_V1, PicIbGib_V1 } from '../common/types/pic';
import { IbGibTimelineUpdateInfo } from '../common/types/ux';
import { ensureDirPath, pathExists, writeFile } from '../common/helper/ionic';
import { getFnAlert, getFnPrompt, getFnConfirm, getFn_promptCreateSecretIbGib, getFn_promptCreateEncryptionIbGib, getFn_promptCreateOuterSpaceIbGib, getFn_promptUpdatePicIbGib, getFn_promptRobbotIbGib, getFn_promptAppIbGib } from '../common/helper/prompt-functions';
import { createNewTag } from '../common/helper/tag';
import { ActionBarComponent } from '../common/bars/action-bar/action-bar.component';
import { ChatViewComponent } from '../views/chat-view/chat-view.component';
import { TagIbGib_V1 } from '../common/types/tag';
import { RobbotIbGib_V1 } from '../common/types/robbot';
import { RobbotBarComponent } from '../common/bars/robbot-bar/robbot-bar.component';
import { AppIbGib_V1 } from '../common/types/app';
import { AppBarComponent } from '../common/bars/app-bar/app-bar.component';
import { RawExportData_V1, RawExportIbGib_V1 } from '../common/types/import-export';
import { clearDoCancelModalOnBackButton, executeDoCancelModalIfNeeded, getSaferSubstring, registerCancelModalOnBackButton } from '../common/helper/utils';
import { getGib } from 'ts-gib/dist/V1/transforms/transform-helper';
import { CommentIbGib_V1 } from '../common/types/comment';
import { DisplayIbGib_V1 } from '../common/types/display';
import { AppBase_V1 } from '../common/witnesses/apps/app-base-v1';
import { LinkIbGib_V1 } from '../common/types/link';


const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;


@Component({
  selector: 'ibgib-page',
  templateUrl: './ibgib.page.html',
  styleUrls: ['./ibgib.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IbGibPage extends IbgibComponentBase implements OnInit, OnDestroy {

  protected lc: string = `[${IbGibPage.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#abc123";
  public debugBorderStyle: string = "solid";

  private paramMapSub: Subscription;

  private _subPollLatest_Local: Subscription;
  private _pollingLatest_Local: boolean;

  private _subPollLatest_Store: Subscription;
  private _pollingLatest_Store: boolean;

  // @Input()
  // get addr(): IbGibAddr { return super.addr; }
  // set addr(value: IbGibAddr) { super.addr = value; }

  // /**
  //  * For the ibgib page, our context is just our ibgib itself.
  //  */
  // @Input()
  // get ibGib_Context(): IbGib_V1 { return this.ibGib; }
  // set ibGib_Context(value: IbGib_V1 ) { console.warn(`${this.lc}[set ibGib_Context] not implemented for IbGibPage, as its ibGib is the context for other views/components.`); }

  /**
   * I do my own stack navigation, so have to show iOS back chevron
   * when we can go back.
   */
  @Input()
  get showBackChevronBtn(): boolean {
    const lc = `${this.lc}[get showBackChevronBtn]`;
    const platform = Capacitor.getPlatform();
    if (logalot) { console.log(`${lc} platform: ${platform}`); }

    // temporary hack is to always show the chevron if it's ios
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
  downloadingPic: boolean = false;

  @Input()
  updatingPic: boolean = false;
  @Input()
  updatingComment: boolean = false;

  @Input()
  get autoRefresh(): boolean { return !this.paused; }
  set autoRefresh(value: boolean) { this.paused = value; }

  @Input()
  display: DisplayIbGib_V1;

  @ViewChild('appBar')
  appBar: AppBarComponent

  _appBarIsVisible: boolean = true;
  @Input()
  get appBarIsVisible(): boolean {
    return this._appBarIsVisible && !!this.ibGib && !this.refreshing;
  }
  set appBarIsVisible(value: boolean) {
    this._appBarIsVisible = value;
  }

  _robbotBarIsVisible: boolean = true;
  @Input()
  get robbotBarIsVisible(): boolean {
    return this._robbotBarIsVisible && !!this.ibGib && !this.refreshing;
  }
  set robbotBarIsVisible(value: boolean) {
    this._robbotBarIsVisible = value;
  }

  @Input()
  selectedRobbotAddr: IbGibAddr;

  @ViewChild('robbotBar')
  robbotBar: RobbotBarComponent

  _displayBarIsVisible: boolean;
  @Input()
  get displayBarIsVisible(): boolean {
    return this._displayBarIsVisible && !!this.ibGib && !this.refreshing;
  }
  set displayBarIsVisible(value: boolean) {
    this._displayBarIsVisible = value;
  }

  hidePerScroll: boolean = true;

  // @Input()
  // actionBarHeightPerPlatform: string = '55px !important';

  @ViewChild('actionBar')
  actionBar: ActionBarComponent;

  @ViewChild('chatView')
  chatView: ChatViewComponent;

  @ViewChild('chatViewHeart')
  chatViewHeart: ChatViewComponent;

  /**
   * atow, this contains the robbot bar. So there are two containers
   * that must be scrolled to scroll to the bottom: this
   * and the chatView (or whatever the child list view is).
   */
  @ViewChild('ibgibPageContent')
  ibgibPageContent: IonContent;

  @ViewChild('inputExport')
  inputExport: HTMLInputElement;

  @Input()
  syncErrored: boolean = false;

  @Input()
  syncSucceeded: boolean = false;

  @Input()
  syncStatusUpdates: number = 0;

  @Input()
  syncPresyncMsg: string = '';
  @Input()
  get syncDecrypting(): boolean { return this.syncPresyncMsg.includes('aa2e8f32ab26457bad703218aa7fb47d') };
  @Input()
  syncBuildingGraph: boolean;

  @Input()
  showModal_PromptForTag: boolean;

  @Input()
  chatViewRel8nNamesNoPics = c.DEFAULT_LIST_REL8N_NAMES.filter(x => x !== 'pic');

  @Input()
  activeApp: AppIbGib_V1;

  /**
   * Casted so compiler doesn't complain when binding to specific apps that know
   * what type to expect.
   *
   * For example, a chat app component only shows when activeApp is a chat ibgib.
   */
  @Input()
  get activeAppAny(): any { return this.activeApp; }

  /**
   * When this page opens up a new ibgib, it may have autosync turned on.
   * So this triggers the polling of outerspaces which will prompt the user
   * for the password. If they cancel then we don't want to pester them.
   */
  private userHasCanceledAutoSyncPasswordWhenPrompted: boolean;

  /**
   * atow set via the param map for the current route.
   */
  @Input()
  appId: string;
  /**
   * atow set via the param map for the current route.
   */
  @Input()
  appClassname: string;

  /**
   * These are NOT ibGib Addrs, but rather linkIbGib.data.text array.
   *
   * These driving open in all tabs button.
   *
   * @see {@link updateLinkURLs}
   */
  @Input()
  linkURLs: string[];

  /**
   * Uses default list rel8n names
   *
   * @see {@link c.DEFAULT_LIST_REL8N_NAMES}
   */
  @Input()
  get childAddrs(): IbGibAddr[] {
    const lc = `${this.lc}[get childAddrs]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: be582a4a69920d29f16d1b51e1c60922)`); }

      if (!this.ibGib?.rel8ns) { return []; }
      const childAddrs = Object.keys(this.ibGib.rel8ns)
        .filter(x => c.DEFAULT_LIST_REL8N_NAMES.includes(x))
        .filter(x => this.ibGib.rel8ns[x]?.length > 0)
        .flatMap(x => this.ibGib.rel8ns[x])
      if (logalot) { console.log(`${lc} childAddrs:\n${childAddrs.join('\n')} (I: cb28bb83b726b110ad9b346cc23dbf22)`); }
      return childAddrs;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


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
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: a44efa21a33b41f4b27732d38a65530f)`); }
        await h.delay(100);
      }

      if (['welcome', '/welcome', '/welcome/'].includes(document.location.pathname)) {
        this.common.menuCtrl.enable(false);
      } else {
        this.common.menuCtrl.enable(true);
      }

      this.initScroll();
      this.initLastViewConfiguration();
      this.subscribeParamMap();

      this.hackScrollButtonsListBecauseOfChromeBug();

      super.ngOnInit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async ngOnDestroy(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.stopPollLatest_Local();
      this.stopPollLatest_Store();
      this.unsubscribeParamMap();
      this.destroyScroll();
      await super.ngOnDestroy();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    let statusId: string;
    try {
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 936911af9f942cbdde7de4bf65fef822)`); }
        await h.delay(100);
      }

      // kluge to deal with modals being orphaned when back button is hit
      const canceledModal_SoAbortQuoteNavEndQuote = executeDoCancelModalIfNeeded();
      if (canceledModal_SoAbortQuoteNavEndQuote) {
        window.history.forward();
        return; /* <<<< returns early */
      }

      // initialize/cleanup
      statusId = this.addStatusText({ text: 'updating ibgib...' })
      this.stopPollLatest_Local();
      this.stopPollLatest_Store();


      // loads the default properties for this.item
      await super.updateIbGib(addr);

      // additional loading because we're the main page
      await this.loadIbGib();
      await this.loadTjp();
      if (logalot) { console.log(`${lc} ibGib: ${h.pretty(this.ibGib)}`); }

      // additional item loading if we're a pic/comment
      await this.loadItem();

      // use the correct app. (atow this means loading only from the app bar)
      this.updateActiveApp(); // spin off

      // kind of a niche kluge to update flag if any children are links
      await this.updateLinkURLs();

      // poll if there is a timeline/tjp involved
      if (this.tjp) {
        this.startPollLatest_Local();
        this.autosync = this.common.ibgibs.autosyncIsEnabled({ tjp: this.tjp });
      } else {
        this.autosync = false;
      }
      if (this.autosync) { this.startPollLatest_Store(); }

      // update paused before checking it
      this.updateIbGib_Paused();

      // trigger an initial ping to check for newer ibgibs
      if (!this.paused && !this.ib.startsWith('bin.') && !isPrimitive({ gib: this.gib })) {
        this.item.refreshing = true;
        setTimeout(async () => {
          await this.smallDelayToLoadBalanceUI();
          await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: true });
        });
      }

      // cosmetic UI
      document.title = this.item?.text ?? this.ibGib?.data?.text ?? this.gib;
      if (this.platform === 'web' && this.ibGib && this.gib !== 'gib') {
        this.actionBar.focusDetail();
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.removeStatusText({ statusId });
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  /**
   * loads the correct app depending on the current ibgib.
   */
  async updateActiveApp(): Promise<void> {
    const lc = `${this.lc}[${this.updateActiveApp.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: e3064a93ac6fb9b22767dadd48646622)`); }

      let count = 0;
      while (!this.appBar && count < 1000) {
        await h.delay(100);
        count++
      }
      if (!this.appBar) {
        console.warn(`${lc} (UNEXPECTED) this.appBar is falsy? (W: 6c9f578dc2774b8da5ae1b3660b9b922)`);
        return; /* <<<< returns early */
      }

      if (this.appId) {
        if (logalot) { console.log(`${lc} selecting app by id (I: 9d4d9e4e8bec75be29c43453ba950a22)`); }
        await this.appBar.selectApp({ appId: this.appId, appClassname: this.appClassname });
      } else if (this.appClassname) {
        if (logalot) { console.log(`${lc} selecting app by classname (I: 9d4d9e4e8bec75be29c43453ba950a22)`); }
        await this.appBar.selectApp({ appId: this.appId, appClassname: this.appClassname });
      } else {
        if (logalot) { console.log(`${lc} this.appId and this.appClassname falsy. doing default (I: e91b2cfe08b5f36555fdbf17e7235b22)`); }
        await this.appBar.selectApp();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
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

    this.paramMapSub = this.activatedRoute.paramMap.subscribe(async paramMap => {
      // do the app part first
      let { appId, appClassname } = this.getAppInfoFromParamMap(paramMap);
      // let appId = paramMap.get('appId');
      if (appId) {
        this.appId = appId;
        this.appClassname = appClassname;
        // this.updateActiveApp();
      } else {
        // no app specified
        delete this.appId;
        delete this.appClassname;
        // show the app bar to let the user know they can change/add apps
        // (though of course atow this is a completely new paradigm for apps)
        setTimeout(async () => {
          while (!this.appBarIsVisible) {
            if (logalot) { console.log('appBarIsVisible false still') }
            this.appBarIsVisible = true;
            await h.delay(100);
          }
          this.ref.detectChanges()
        });
      }

      // do the address after setting the app
      let addr = paramMap.get('addr');
      lc = `${lc}[paramMapSub]`;
      if (logalot) { console.log(`${lc} new addr: ${addr}`); }

      if (!SPECIAL_URLS.includes((addr || "").toLowerCase()) && encodeURI(addr).includes('%5E')) {
        // normal handling for a normal ibGib is to update the page's ibgib
        // and load everything.
        if (logalot) { console.log(`${lc} new paramMap. addr: ${addr}`); }
        if (addr !== this.addr) {
          if (logalot) { console.log(`${lc} addr is different than this.addr, so calling updateIbGib (I: 5733e91178ab46198593a7a5542c8d3a)`); }
          await this.updateIbGib(addr);
        } else {
          // do nothing, it's the same as the current addr
        }
      } else {
        // default special non-ibgib handler, go to the tags ibGib
        Toast.show({ text: `Redirecting to your tags because I don't understand the address.` }); // spins off
        while (this.common.ibgibs.initializing) {
          if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 936911af9f942cbdde7de4bf65fef822)`); }
          await h.delay(50);
        }
        const tagsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "tags" });
        let tagsAddr = h.getIbGibAddr({ ibGib: tagsIbGib });
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

  /**
   * On my Samsung phone in Chrome for Mobile (not Firefox), the horizontal
   * scrollbar shows up and stays visible. If you jiggle it right and left, it
   * goes away.  So I'm just going to do that here in code and hopefully the
   * thing will not stay visible.
   */
  async hackScrollButtonsListBecauseOfChromeBug(): Promise<void> {
    const lc = `${this.lc}[${this.hackScrollButtonsListBecauseOfChromeBug.name}]`;
    try {
      const buttonsList = document.getElementById('context-btns');
      if (window?.navigator?.userAgent?.toLowerCase().includes('chrom')) {
        // chrome based, check to see if desktop
        if (window.innerWidth < 800) {
          buttonsList.style.overflowX = 'hidden !important';
          buttonsList.addEventListener('touchstart', () => {
            buttonsList.style.overflowX = 'auto';
          });
          buttonsList.addEventListener('mouseenter', () => {
            buttonsList.style.overflowX = 'auto';
          });
        }
      } else {
        buttonsList.style.overflowX = 'auto';
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
    }
  }

  async handleClick_DownloadPic(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_DownloadPic.name}]`;
    const alert = getFnAlert();
    const prompt = getFnPrompt();
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const alert = getFnAlert();
      const confirm = getFnConfirm();
      const resConfirm = await confirm({
        title: 'Not implemented well on Android',
        msg: `On Android, this will download the file as base64-encoded data. This does not display correctly on some (all?) Android device galleries.\n\nDo you want to proceed?`
      });

      if (!resConfirm) {
        await alert({ title: 'K', msg: 'Cancelled' });
        return; /* <<<< returns early */
      }

      this.downloadingPic = true;
      const picIbGib = <IbGib_V1<PicData_V1>>this.ibGib;
      const { data } = picIbGib;
      if (!this.item?.picSrc) { throw new Error(`this.item?.picSrc is falsy...pic not loaded or not a pic? (E: e6c361e80cbd0f6221c51cd3f4b4fb22)`); }
      if (!data.binHash) { throw new Error(`invalid pic data. binHash is falsy. (E: f2ac49f8451c2054833069aac44b8222)`); }

      const filename =
        data.filename ||
        await prompt({
          title: `file name?`,
          msg: `What's the filename? ${data.filename ? `Leave blank to default to ${data.filename}` : ''}`,
        }) ||
        data.binHash;

      const ext =
        data.ext ||
        await prompt({
          title: `file extension?`,
          msg: `What's the file extension? Leave blank to default to ${c.DEFAULT_PIC_FILE_EXTENSION}`,
        }) ||
        c.DEFAULT_PIC_FILE_EXTENSION;

      const filenameWithExt = `${filename}.${ext}`;

      let directory: Directory;
      if (Capacitor.getPlatform() === 'ios') {
        directory = Directory.External;
      } else {
        directory = Directory.Documents;
      }

      // check to see if file already exists existing file
      let path: string;
      let dirPath: string = `${c.IBGIB_BASE_SUBPATH}/${c.IBGIB_DOWNLOADED_PICS_SUBPATH}`;
      await ensureDirPath({ dirPath, directory });
      let suffixNum: number = 0;
      let pathAlreadyExists: boolean;
      let attempts = 0;
      do {
        suffixNum++;
        path = suffixNum === 1 ?
          `${dirPath}/${filenameWithExt}` :
          `${dirPath}/${filename}(${suffixNum}).${ext}`;
        pathAlreadyExists = await pathExists({
          path,
          directory,
          encoding: Encoding.UTF8,
        });
        attempts++;
      } while (pathAlreadyExists && attempts < 10); // just hard-coding this here, very edgy edge case.

      if (pathAlreadyExists) { throw new Error(`Tried 10 times and path ${filenameWithExt} (1-10) already exists. Last path tried: ${path}. (E: 09881b77a62747fbb0c2dd5057ae970a)`); }

      // path does not exist, so write it with our picture data.
      const dataToWrite = this.item.picSrc.replace(/^data\:image\/(jpeg|jpg|png)\;base64\,/i, '');
      // THIS DOES NOT "WORK". It successfully downloads the base64 encoded
      // string, but on my android testing this does not show the picture. I've
      // wasted enough time on this for now.

      await writeFile({ path, data: dataToWrite, directory: Directory.Documents });

      await h.delay(100); // so user can see visually that write happened
      await getFnAlert()({ title: 'file downloaded', msg: `Successfully downloaded to ${path} in ${directory}.` });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      await alert({ title: 'download pic...', msg: `hmm, something went wrong. error: ${error.message}` });
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      this.downloadingPic = false;
      setTimeout(() => this.ref.detectChanges());
    }
  }

  async handleClick_OpenChildIbGibs(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_OpenChildIbGibs.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: af20b7c811051b38a43dc1e729db3d22)`); }

      if (!this.ibGib) {
        console.warn(`${lc} expected this.ibGib to be truthy? (W: 77277438e5204601b96672c2c29cfb88)`);
        return; /* <<<< returns early */
      }

      // we're going to parse the URL pathname and find the location for the current ibgib
      // addr. we'll replace this with the child ibgib addr and put it back together.
      // this way, we reuse the current app being used and any query params

      /** re-use this origin in child URL */
      const { origin } = document.location;
      /** pieces of the current URL pathname */
      const pieces = document.location.pathname.split('/');
      /** index in the pieces array of the addr */
      const addrIndex = pieces.indexOf('ibgib') + 1;

      // iterate the child addrs backwards because window.open puts the tab
      // right next to the current tab. Otherwise, it will have the last opened
      // next to the tab, which is counterintuitive
      for (let i = this.childAddrs.length - 1; i >= 0; i--) {
        const childAddr = this.childAddrs[i];

        // if there's an app in the URL, we want to re-use that same app section
        pieces[addrIndex] = childAddr;

        const childPathname = pieces.join('/');
        const newUrl = `${origin}${childPathname}`;
        window.open(newUrl, "_blank");
        if (i + 1 < this.childAddrs.length) {
          await h.delay(100);
        }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Kind of a niche kluge to enable open all links in new tabs functionality.
   */
  async updateLinkURLs(): Promise<void> {
    const lc = `${this.lc}[${this.updateLinkURLs.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 09714baa996a2281cc1209cf448f5322)`); }
      if (!this.ibGib) {
        console.warn(`${lc} expected this.ibGib to be truthy? (W: f611e0d79ec64dbea7b637d5e905ef16)`);
        // doesn't throw because this isn't core functionality
        delete this.linkURLs;
        return; /* <<<< returns early */
      }

      const linkAddrs = this.ibGib.rel8ns?.link ?? [];
      if (linkAddrs.length === 0) { return; /* <<<< returns early */ }

      let resGetLinks = await this.common.ibgibs.get({ addrs: linkAddrs });
      if (!resGetLinks.success || resGetLinks.ibGibs?.length !== linkAddrs.length) {
        console.error(`${lc} failed in getting all link addrs? (E: fa40b7caddef40bbae46344a1b8ed874)`);
        delete this.linkURLs;
        return; /* <<<< returns early */
      }

      this.linkURLs = resGetLinks.ibGibs.map(x => (<LinkIbGib_V1>x).data?.text);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      delete this.linkURLs;
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_OpenLinks(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_OpenLinks.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: e68819e91077c673eec7d17b4acfe622)`); }

      let resAnchors = document.getElementsByClassName('link-url');
      for (let i = 0; i < resAnchors.length; i++) {
        const anchor = <HTMLAnchorElement>resAnchors[i];
        anchor.click();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleUpdateCommentClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleUpdatePicClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.updatingComment) {
        console.error(`${lc} (UNEXPECTED) already updating pic. this handler should be disabled yes? returning early. (E: 8c9b536c463a4b339a339cdb348c6f45)`);
        return; /* <<<< returns early */
      }
      this.updatingComment = true;

      await this.common.ibgibs.updateComment({
        commentIbGib: <CommentIbGib_V1>this.ibGib,
        space: undefined, // local user space
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      this.updatingComment = false;
      setTimeout(() => this.ref.detectChanges());
    }
  }
  async handleUpdatePicClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleUpdatePicClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.updatingPic) {
        console.error(`${lc} (UNEXPECTED) already updating pic. this handler should be disabled yes? returning early. (E: 9cbb5388290a4f33bf8f2919aab9fdaa)`);
        return; /* <<<< returns early */
      }
      this.updatingPic = true;

      await this.common.ibgibs.updatePic({
        picIbGib: <PicIbGib_V1>this.ibGib,
        space: undefined, // local user space
      });

      this.updatingPic = false;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.updatingPic = false;
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      setTimeout(() => this.ref.detectChanges());
    }
  }

  async handleShareClick(): Promise<void> {
    const alert = getFnAlert();
    try {
      await Clipboard.write({ string: this.addr });

      await alert({
        title: 'ibgib address copied', msg:
          `Copied to clipboard!

        "${this.addr}"

        You can add this to another ibgib by going to that and clicking import (the little sparkly stars icon atm.)
        `
      });
    } catch (error) {
      await alert({ title: 'ibgib address copied', msg: `clipboard failed...` });
    }
  }

  /**
   * Show/hide the app bar.
   */
  async handleAppClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleAppClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.appBarIsVisible = !this.appBarIsVisible;
      await Storage.set({ key: c.SIMPLE_CONFIG_KEY_APP_VISIBLE, value: this.appBarIsVisible ? 'true' : 'false' });
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  getAppInfoFromParamMap(paramMap?: ParamMap): { appId: string, appClassname: string } {
    const lc = `${this.lc}[${this.getAppInfoFromParamMap.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 93ca6ba7f62610bf5ec83ff3f896d222)`); }
      paramMap = paramMap ?? this.activatedRoute.snapshot.paramMap;
      const appId = paramMap.get('appId');
      const appClassname = paramMap.get('appClassname');
      return { appId, appClassname };
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAppSelected(app: AppIbGib_V1): Promise<void> {
    const lc = `${this.lc}[${this.handleAppSelected.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 1df5978e051c48a9ad1bb2b773502e44)`); }
      console.log(`${lc} app: ${h.pretty(app)}`);

      if (!app) { return; /* <<<< returns early */ }
      if (!app.data?.uuid) { throw new Error(`invalid app (app.data.uuid is falsy) (E: d422ed43707b0eeb1ea45c9e9e4aad22)`); }
      if (!app.data.classname) { throw new Error(`invalid app (app.data.classname falsy) (E: 232a6fdcb5ecfd463ac2c52ca8978d22)`); }

      // navigate to the new app
      const { appId: urlAppId, } = this.getAppInfoFromParamMap();
      const selectedAppId = app.data?.uuid;
      const selectedAppClassname = app.data?.classname;
      const selectedAppName = app.data.name;
      const activeAppId = this.activeApp?.data.uuid;

      if (selectedAppId !== urlAppId || urlAppId !== activeAppId) {
        // let newUrl = `app/${selectedAppClassname}/${selectedAppId}/ibgib/${this.addr}`;
        const newUrl = `ibgib/${this.addr}/app/${selectedAppClassname}/${selectedAppId}`;
        window.history.replaceState(/*nextState*/ {}, /*nextTitle often unused*/ this.title, /*nextURL*/ newUrl);
        document.title = `${this.title} (${selectedAppName})`;
      }

      if (selectedAppId !== activeAppId) {
        this.activeApp = app;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Show/hide the robbot bar.
   */
  async handleRobbotClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleRobbotClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.robbotBarIsVisible = !this.robbotBarIsVisible;
      await Storage.set({ key: c.SIMPLE_CONFIG_KEY_ROBBOT_VISIBLE, value: this.robbotBarIsVisible ? 'true' : 'false' });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleRobbotSelected(robbot: RobbotIbGib_V1): Promise<void> {
    const lc = `${this.lc}[${this.handleRobbotSelected.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 52aa29ec3ad4d236f7466d9a39761822)`); }
      console.log(`${lc} robbot: ${h.pretty(robbot)}`);

      if (robbot) {
        await Storage.set({
          key: c.SIMPLE_CONFIG_KEY_ROBBOT_SELECTED_ADDR,
          value: h.getIbGibAddr({ ibGib: robbot }),
        })
      } else {
        await Storage.remove({ key: c.SIMPLE_CONFIG_KEY_ROBBOT_SELECTED_ADDR });
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleDisplayClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleDisplayClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.displayBarIsVisible = !this.displayBarIsVisible;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleDisplayChanged(resDisplayIbGib: TransformResult<DisplayIbGib_V1>): Promise<void> {
    const lc = `${this.lc}[${this.handleDisplayChanged.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: b0b02263a29e4ec663218b61acd14122)`); }

      // hmm i think when saving the display will regenerate entire transform
      // result?  currently not saving the display or its generating transform
      // dependencies.
      this.display = resDisplayIbGib.newIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSpaceClick(): Promise<void> {
    if (!this.autosync) {
      // autosync is not set yet, so prompt to turn it on and sync
      await this.execSync({ turnOnAutosyncing: true });
    } else {
      // no updates and autosync is already on, so prompt to disable autosyncing
      await this.handleSyncClick_DisableAutoSyncing();
    }
  }
  async handleSyncClick(): Promise<void> {
    await this.execSync({ turnOnAutosyncing: false });
  }

  async handleSyncClick_DisableAutoSyncing(): Promise<void> {
    const lc = `${this.lc}[${this.handleSyncClick_DisableAutoSyncing.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.autosync = false;

      if (!this.tjp) {
        await this.loadTjp();
        if (!this.tjp) {
          await Dialog.alert({ title: `No timeline`, message: `Hmm, we can't turn off syncing because this ibgib does not have a timeline to sync. We shouldn't have even asked you to stop syncing! Sorry about that.` });
          throw new Error(`tried to turn off syncing for non-tjp ibgib (E: 50f8354976e3ae3867126e7d02b34d22)`);
        }
      }
      const resConfirmDisableAutosync = await Dialog.confirm({
        title: `Disable autosync for this ibgib's timeline?`,
        message: `Disable autosync for this ibgib's timeline until you re-enable it in the future?`,
      });

      if (resConfirmDisableAutosync.value) {
        // sync requires the entire dependency graph of the current ibgib
        const dependencyGraph = await this.common.ibgibs.getDependencyGraph({
          ibGib: this.ibGib,
          live: true,
          space: null
        });

        // pull out the tjp ibgibs, for which we will turn on autosync
        const tjpIbGibs =
          Object.values(dependencyGraph).filter(x => x.data.isTjp);

        await this.common.ibgibs.disableAutosync({ tjpIbGibs });
      } else {
        if (logalot) { console.log(`${lc} disable autosync cancelled. continuing to sync. (I: 61b9de6368cc45ef6825d831f6628722)`); }
        await Dialog.alert({ title: `Cancelled`, message: `Turn OFF autosync CANCELLED.` });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async execSync({
    turnOnAutosyncing,
  }: {
    turnOnAutosyncing: boolean,
  }): Promise<void> {
    const lc = `${this.lc}[${this.execSync.name}]`;
    let cancelled = false;
    const clearSyncProgressBadges = () => {
      this.syncErrored = false;
      this.syncSucceeded = false;
      this.syncStatusUpdates = 0;
      this.syncPresyncMsg = '';
      this.syncBuildingGraph = false;
    }
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.syncing) {
        if (logalot) { console.log(`${lc} sync called, but already syncing. (I: e3d3b51b431ded802fc02a11478f7c22)`); }
        return; /* <<<< returns early */
      }
      this.item.syncing = true;


      clearSyncProgressBadges();


      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (!this.tjpAddr) { console.warn(`${lc} tjpAddr is falsy. (W: 9336c52b8a8745f1b969cac6b4cdf4ca)`); }

      // check for if we're doing the latest, stop if it's not the latest.
      const latestAddr =
        await this.common.ibgibs.getLatestAddr({
          ibGib: this.ibGib,
          tjpAddr: this.tjpAddr
        });
      if (latestAddr !== this.addr) {
        await Dialog.alert({
          title: 'Recent local changes available',
          message:
            `We are not currently at the latest local ibgib...do you have
            another tab open? Please hit the refresh button (until we get this
            automatic in the near future!).`.replace(/\n/g, ' ').replace(/  /g, '')
        });
        cancelled = true;
        clearSyncProgressBadges();
        return; /* <<<< returns early */
      }

      // sync requires the entire dependency graph of the current ibgib
      this.syncBuildingGraph = true;
      setTimeout(() => this.ref.detectChanges());
      const dependencyGraph =
        await this.common.ibgibs.getDependencyGraph({ ibGib: this.ibGib, live: true, space: null });
      this.syncBuildingGraph = false;

      // pull out the tjp ibgibs, for which we will turn on autosync
      const tjpIbGibs =
        Object.values(dependencyGraph).filter(x => x.data.isTjp);

      // turn on autosyncing if that's asked for by caller
      if (turnOnAutosyncing) {
        // prompt the user to turn on autosync. if not, then return early
        const body =
          `This will TURN ON auto syncing for the current ibGib (${this.ib}) and ALL its related ibGibs to your outerspace(s).`;
        const note = `(note: to turn off auto syncing, press the sync button again)`;
        const listTjpIbs = `List of ${tjpIbGibs.length} ibGib(s) that will autosync:\n${tjpIbGibs.map(x => x.ib).join('\n')}`;
        const resConfirmSync = await Dialog.confirm({
          title: 'Sync with outerspace?',
          message: `${body}\n\nProceed?\n\n${note}\n\n${listTjpIbs}`,
        });
        if (!resConfirmSync.value) {
          await Dialog.alert({ title: 'Sync cancelled.', message: 'Sync has been cancelled.' });
          this.item.syncing = false;
          setTimeout(() => this.ref.detectChanges());
          setTimeout(() => this.ref.detectChanges());
          setTimeout(() => this.ref.detectChanges(), 1000);
          // this.autosync = false; // unnecessary?
          cancelled = true;
          clearSyncProgressBadges();
          return; /* <<<< returns early */
        }

        // enable autosync for regardless of first-run success, but do not start
        // polling or turn on this.autosync until success
        await this.common.ibgibs.enableAutosync({ tjpIbGibs });
      }

      // initiate syncing
      const sagaInfos = await this.common.ibgibs.syncIbGibs({
        dependencyGraphIbGibs: Object.values(dependencyGraph),
        watch: true,
        fnPreSyncProgress: async (msg: string) => {
          this.syncPresyncMsg = msg;
          setTimeout(() => this.ref.detectChanges());
        }
      });
      if (sagaInfos) {
        await new Promise<void>((resolve, reject) => {
          let sagaCompleteOrErroredCount = 0;
          for (let i = 0; i < sagaInfos.length; i++) {
            const info = sagaInfos[i];
            info.syncStatus$.subscribe(status => {
              // do nothing atm as this is handled in ibgibs.service
              if (logalot) { console.log(`${lc} status update, code: ${status?.data?.statusCode} (I: 1d26927edd789353bf9350f436d29922)`); }
              this.syncStatusUpdates += 1;
              setTimeout(() => { this.ref.detectChanges(); })
            },
              error => {
                const emsg = typeof error === 'string' ?
                  `${lc} Sync failed: ${error}` :
                  `${lc} Sync failed: ${error?.message ?? 'some error(?) (UNEXPECTED)'}`;
                console.error(emsg);
                reject(new Error(emsg));
              },
              () => {
                if (logalot) { console.log(`${lc} syncStatus$ complete handler (I: 7a99f3f44476e0b46892e53cc39d8322)`); }
                sagaCompleteOrErroredCount++;
                if (sagaCompleteOrErroredCount === sagaInfos.length) {
                  if (!this.syncErrored) { this.syncSucceeded = true; }
                  this.syncStatusUpdates = 0;
                  this.item.syncing = false;
                  setTimeout(() => { this.ref.detectChanges(); })
                  resolve();
                }
              });
          }
        }).catch(e => {
          // wth do I have to rethrow it this way when I'm already inside a
          // try..catch? seems a language problem
          throw e;
        });
      } else {
        if (logalot) { console.log(`${lc} user cancelled sync. returning... (I: 7e0cd20a9796ff5b0a8afd2d14ff6a22)`); }
        cancelled = true;
        this.item.syncing = false;
        clearSyncProgressBadges();
        setTimeout(() => this.ref.detectChanges(), 200);
        return; /* <<<< returns early */
      }

      if (turnOnAutosyncing) {
        // won't turn on autosync until the sync succeeds
        this.autosync = true;
        this.startPollLatest_Store();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      clearSyncProgressBadges();
      this.item.syncing = false;
      if (!cancelled) { this.syncErrored = true; }
    } finally {
      this.item.syncing = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete. (I: 2334b5444103f24178e4d2d2116de322)`); }
    }
  }

  async handleRefreshClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleRefreshClick.name}]`;
    try {
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (isPrimitive({ ibGib: this.ibGib })) {
        if (logalot) { console.log(`${lc} refresh clicked for primitive. returning early. (I: af3e72b0a6288fd815a30f251f943f22)`); }
        return; /* <<<< returns early */
      }
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
        return; /* <<<< returns early */
      }
      this.tjpUpdatesAvailableCount_Local = 0;
      if (this.item) { this.item.refreshing = true; }
      await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: false });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  // async handlePauseClick(): Promise<void> {
  //   const lc = `${this.lc}[${this.handlePauseClick.name}]`;
  //   try {
  //     if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
  //     if (!this.tjp) { await this.loadTjp(); }

  //     this.paused = true;
  //     await this.go({
  //       toAddr: this.addr,
  //       // fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
  //       fromAddr: this.addr,
  //       queryParams: { [c.QUERY_PARAM_PAUSED]: true },
  //       queryParamsHandling: 'merge'
  //     });
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //   }
  // }

  async handleIbGib_NewLatest(info: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleIbGib_NewLatest.name}]`;
    try {
      await super.handleIbGib_NewLatest(info);
      await this.hackScrollButtonsListBecauseOfChromeBug();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      // at this point, we're guaranteed to be the latest in this component's tjp/timeline
      if (this.item?.refreshing) {
        this.item.refreshing = false;
        setTimeout(() => { this.ref.detectChanges(); })
      }
    }
  }

  async updateIbGib_NewerTimelineFrame({
    latestAddr,
    latestIbGib,
    tjpAddr,
  }: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (latestAddr === this.addr) {
        console.warn(`${lc} (UNEXPECTED) this function is expected to fire only when latest is already checked to be different, but latestAddr (${latestAddr}) === this.addr (${this.addr}) (W: 3ed850e6ec784b4187cbe4a7bf6a2a80)`);
        return; /* <<<< returns early */
      }

      if (!this.ibGib) {
        console.warn(`${lc} (UNEXPECTED) this.ibGib is assumed truthy, but is falsy. (W: 8c25259e67a244419f0787a60cd4fa55)`);
        return; /* <<<< returns early */
      }

      await this.smallDelayToLoadBalanceUI();

      // loads the default properties for this.item
      await this.loadItemPrimaryProperties(latestAddr, this.item);

      // additional loading because we're the main page
      await this.loadIbGib();

      await this.updateLinkURLs();

      // additional item loading if we're a pic/comment
      if (this.item?.type === 'pic') { await this.loadPic(this.item); }
      if (this.item?.type === 'comment') { await this.loadComment(this.item); }

      // cosmetic UI
      document.title = this.item?.text ?? this.ibGib?.data?.text ?? this.gib;
      await this.actionBar.reset();
    } catch (error) {
      this.errorMsg = `${lc} ${error.message}`;
      console.error(this.errorMsg);
      this.errored = true;
      this.clearItem();
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleTitleClick(): Promise<void> {
    if (this.item?.type === 'comment') {
      await Dialog.alert({
        title: 'Context',
        message: this.item?.text,
      });
    }
  }

  // #region scrolling

  prevScrollTop: number = 0;

  scrollSubject: Subject<any> = new Subject<any>();
  scroll$: Observable<any> = this.scrollSubject.asObservable();
  private _subScroll: Subscription;

  handleScroll(event: MouseEvent): void {
    const lc = `${this.lc}[${this.handleScroll.name}]`;
    // hide the action detail when scrolling, but only if it was a genuine
    // scroll. We want to ignore hiding on tiny little movements, which
    // especially happen on touch screens.
    let targetScrolltop = <number>((<any>event?.target)?.scrollTop ?? -1);
    if (logalot) { console.log(`${lc} targetScrolltop: ${targetScrolltop} (I: 70dfd9882bb2493da37222869c429415)`); }
    this.prevScrollTop = targetScrolltop;
  }

  private initScroll(): void {
    this._subScroll = this.scroll$.pipe(
      debounceTime(20),
    ).subscribe((event) => {
      this.handleScroll(event);
    });
  }

  private destroyScroll(): void {
    if (this._subScroll) {
      this._subScroll.unsubscribe();
      delete this._subScroll;
    }
  }

  private async initLastViewConfiguration(): Promise<void> {
    const lc = `${this.lc}[${this.initLastViewConfiguration.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 2adbf456b36360f661d72f18de3eed22)`); }

      // robbot bar visibility
      this.robbotBarIsVisible =
        (await Storage.get({ key: c.SIMPLE_CONFIG_KEY_ROBBOT_VISIBLE }))?.value === 'true' ?? false;

      // app bar visibility
      this.appBarIsVisible =
        (await Storage.get({ key: c.SIMPLE_CONFIG_KEY_APP_VISIBLE }))?.value === 'true' ?? false;

      // which robbot was selected last
      const selectedAddrSetting =
        await Storage.get({ key: c.SIMPLE_CONFIG_KEY_ROBBOT_SELECTED_ADDR });
      if (selectedAddrSetting.value) {
        this.selectedRobbotAddr = selectedAddrSetting.value;
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  // #endregion scrolling

  async showFullscreenModal(): Promise<void> {
    const lc = `${this.lc}[${this.showFullscreenModal.name}]`;
    try {
      const addr = h.getIbGibAddr({ ibGib: this.ibGib });
      const modal = await this.common.modalController.create({
        component: IbgibFullscreenModalComponent,
        componentProps: {
          addr,
        },
        cssClass: ['fullscreen-modal'],
      });
      // have to register/clear modal for cancelling in case the user
      // presses the back button while the modal is still visible
      registerCancelModalOnBackButton(modal);
      await modal.present();
      let resModal = await modal.onWillDismiss();
      // clear the cancel since it dismissed naturally
      clearDoCancelModalOnBackButton();
      if (logalot) { console.log(`${lc} modal closed.`); }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
    }
  }

  async handleBackButtonClick(): Promise<void> {
    await this.common.nav.back();
  }

  async handleInfoClick(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleInfoClick.name}]`;
    try {
      let info = JSON.stringify(this.ibGib, null, 2);
      let addr = h.getIbGibAddr({ ibGib: this.ibGib });
      await Dialog.alert({ title: addr, message: info });
      console.log(info);
    } catch (error) {
      console.error(`${lc} ${error.message}`)
    }
  }

  @Input()
  preparingExport: boolean;

  async handleExportClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleExportClick.name}]`;
    try {
      if (!this.ibGib) { throw new Error(`(UNEXPECTED) this.ibGib falsy? (E: d2898eea744360865f0da5fb91baae22)`); }
      if (this.preparingExport) {
        console.warn(`${lc} already preparing export. (W: cb31b23a313247f0ad128dd984645db4)`);
        return; /* <<<< returns early */
      }

      this.preparingExport = true;

      // build an ibgib that contains the entire dependency graph of this.ibGib and save it

      // ib
      let today = (new Date()).toDateString();
      while (today.includes(' ')) { today = today.replace(' ', '_'); } // lazy
      let safeSubtextOfThisIb = getSaferSubstring({
        text: this.ib.replace(' ', '___'),
        length: 20, // wth
      });
      let exportIb = `ibgib_export ${today} ${safeSubtextOfThisIb} ${this.gib}`;

      // data
      let resGraph = await this.common.ibgibs.getDependencyGraph({
        ibGib: this.ibGib,
        live: true,
        space: null, // defaults to localUserSpace
      });
      if (!this.tjpAddr) { await this.loadTjp(); }
      // the graph will be the data section of an export ibgib
      let exportData: RawExportData_V1 = {
        contextIbGibAddr: this.addr,
        tjpAddr: this.tjpAddr,
        dependencyGraphAsString: JSON.stringify(resGraph),
      }

      // [no rel8ns because this is a self-contained export ibgib]

      // gib
      let exportIbGib: RawExportIbGib_V1 = { ib: exportIb, data: exportData, };
      let exportGib = await getGib({ ibGib: exportIbGib, hasTjp: false });
      exportIbGib.gib = exportGib;

      if (logalot || true) { console.log(`${lc} JSON.stringify(exportIbGib).length: ${JSON.stringify(exportIbGib).length} (I: db3a8d913a91d8fc5d6e45981e034822)`); }

      // at this point, we have a possibly quite large ibGib whose data includes
      // every single ibgib that this.ibGib relates to (its dependency graph).
      // so now we can save this file and later import from it.

      // thank you SO, OP and volzotan at https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
      // set the anchor's href to a data stream
      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportIbGib));

      // get the filename for the anchor to suggest for the "download"
      let exportAddr = h.getIbGibAddr({ ibGib: exportIbGib });
      const filename = `${exportAddr}.json`;

      if (this.web) {
        // trigger the click
        const dlAnchorElem = document.getElementById('export-ibgib-anchor');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", filename);
        dlAnchorElem.click();
      } else {
        // let res = await Filesystem.requestPermissions();
        await Filesystem.writeFile({
          data: dataStr,
          directory: Directory.ExternalStorage,
          path: `/Download/${filename}`,
          encoding: Encoding.UTF8,
          recursive: true,
        });
      }
      await Dialog.alert({ title: 'export succeeded', message: 'way to go, the export succeeded' });
    } catch (error) {
      debugger;
      await Dialog.alert({ title: 'export failed', message: `sorry, the export failed. error: ${error.message}` });
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.preparingExport = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
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
    if (this.syncing || this.common.ibgibs.syncing) {
      if (logalot) { console.log(`${lc} currently syncing, so skipping poll call.`); }
      return; /* <<<< returns early */
    } else if (this.refreshing) {
      if (logalot) { console.log(`${lc} currently refreshing, so skipping poll call.`); }
      return; /* <<<< returns early */
    } else if (this._pollingLatest_Local) {
      if (logalot) { console.log(`${lc} currently already polling, so skipping new poll call.`); }
      return; /* <<<< returns early */
    }

    if (logalot) { console.log(`${lc} poll call starting... (I: 3b58bc80651d831e3d421e5647cbcd22)`); }
    this._pollingLatest_Local = true;
    try {
      if (!this.tjpAddr) { await this.loadTjp(); }
      if (this.tjpAddr) {
        if (logalot) { console.log(`${lc} this.tjpAddr: ${this.tjpAddr}`); }
        const latestAddr =
          await this.common.ibgibs.getLatestAddr({ tjpAddr: this.tjpAddr });
        if (latestAddr !== this.addr) {
          if (logalot) { console.log(`${lc} there is a new latest addr: ${latestAddr}`); }
          const resLatestIbGib = await this.common.ibgibs.get({ addr: latestAddr });
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
              console.warn(`${lc} latestIbGib registered is newer than current ibGib (W: 5250115b6f5d44968ae7a9e49c745d87)`);
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
      if (this._subPollLatest_Local) { this._subPollLatest_Local.unsubscribe(); }
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
          interval(c.DEFAULT_OUTER_SPACE_POLLING_INTERVAL_MS).pipe(
            // interval(15_000).pipe( // for debugging only!!!! DO NOT PUT IN PRODUCTION
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
      return; /* <<<< returns early */
    } else if (this.refreshing) {
      if (logalot) { console.log(`${lc} currently refreshing, so skipping poll call.`); }
      return; /* <<<< returns early */
    } else if (this._pollingLatest_Store) {
      if (logalot) { console.log(`${lc} currently already polling, so skipping new poll call.`); }
      return; /* <<<< returns early */
    } else if (!this.autosync) {
      if (logalot) { console.log(`${lc} this.autosync is false, so stopping polling. (I: b7c151e1b1afa40a4160e31f88824522)`); }
      setTimeout(() => this.stopPollLatest_Store());
      return; /* <<<< returns early */
    } else if (this.tjpUpdatesAvailableCount_Store > 0) {
      if (logalot) { console.log(`${lc} updates already available, so skipping poll call. (I: dcc433c400134ee45773c81c9af4fb22)`); }
      setTimeout(() => this.ref.detectChanges(), 100);
      setTimeout(() => this.ref.detectChanges(), 100);
      return; /* <<<< returns early */
    }

    if (logalot) { console.log(`${lc} poll call starting... (I: b12f7fd857a4483989057bb62f0ab204)`); }
    this._pollingLatest_Store = true;
    try {
      if (!this.tjpAddr) { await this.loadTjp(); }
      if (!this.tjpAddr) {
        if (logalot) { console.log(`${lc} this ibgib has no tjp. stopping further polling. (I: 5e79aba1ffb6490eb89994fa2415e4d4)`); }
        this.stopPollLatest_Store();
        return; /* <<<< returns early */
      }
      if (logalot) { console.log(`${lc} this.tjpAddr: ${this.tjpAddr}`); }

      // get our sync spaces
      const appSyncSpaces = await this.common.ibgibs.getAppSyncSpaces({
        unwrapEncrypted: true,
        createIfNone: true,
        dontPrompt: this.userHasCanceledAutoSyncPasswordWhenPrompted,
      });
      if ((appSyncSpaces ?? []).length === 0) {
        // the user has canceled or edge case of auto sync is on but no sync spaces created.
        this.userHasCanceledAutoSyncPasswordWhenPrompted = true;
      }
      const syncSpaceIds = appSyncSpaces.map(syncSpace => syncSpace?.data?.uuid);
      if (logalot) { console.log(`${lc} syncSpaceIds: ${syncSpaceIds} (I: 141f050b682f1a1a23ebb06c69b2c422)`); }

      // look in each space (in parallel) for a newer latest address for a tjp
      const spacesAndGetLatestAddrPromises = appSyncSpaces.map(syncSpace => {
        // note this does NOT await, so we can await all in parallel
        return <[IbGibSpaceAny, Promise<string>]>[
          // the space
          syncSpace,
          // the promise
          this.common.ibgibs.getLatestAddr({ tjpAddr: this.tjpAddr, space: syncSpace }),
        ];
      });
      /** This will track the updates across all sync spaces. */
      let runningDiffCountAcrossAllSpaces = 0;
      await Promise.all(spacesAndGetLatestAddrPromises.map(([_, p]) => p));
      for (let i = 0; i < spacesAndGetLatestAddrPromises.length; i++) {
        const lc2 = `${lc}[getLatestAddr]`;
        try {
          const [syncSpace, getLatestAddrPromise] = spacesAndGetLatestAddrPromises[i];
          const spaceIb = syncSpace.ib;
          if (!spaceIb) { throw new Error(`invalid space. ib required (E: 7194b47156afd9e492f7c4d8ea386d22)`); }
          if (logalot) { console.log(`${lc} doing spaceIb: ${spaceIb} (I: 5facc3c362540642ea78196778b05622)`); }
          const latestAddr = await getLatestAddrPromise;
          if (logalot) { console.log(`${lc} latestAddr: ${latestAddr} (I: ebc8fac522767b94785ba4377f142f22)`); }
          if (latestAddr !== this.addr) {
            if (logalot) { console.log(`${lc} there is a new latest addr in the sync space. latestAddr: ${latestAddr} (I: 72cbfbb603b349f3a85b3265c679a9bf)`); }
            // get the latest but don't save it, we're just going to see how many
            // iterations we're behind.
            const resLatestIbGib =
              await this.common.ibgibs.get({ addr: latestAddr, space: syncSpace });
            if (resLatestIbGib.success && resLatestIbGib.ibGibs?.length > 0) {
              const latestIbGib = resLatestIbGib.ibGibs[0];
              const currentPastLength = this.ibGib.rel8ns?.past?.length ?? 0;
              const latestPastLength_Store = latestIbGib.rel8ns?.past?.length ?? 0;
              const diff = latestPastLength_Store - currentPastLength;
              if (diff > 0) {
                if (logalot) { console.log(`${lc} newer ibgib in store. diff === ${diff} in spaceIb: ${spaceIb} (I: 7ca33c3361d54fb5918dea5ff1a5b1b5)`); }
                runningDiffCountAcrossAllSpaces += diff;
              } else if (diff < 0) {
                if (this.autosync) {
                  if (!this.syncing) {
                    if (logalot) { console.log(`${lc} starting execSync automatically because local is newer than store latest ibgib... (I: d92f5c7a9bec749c4b4bd1b61a4a3e22)`); }
                    await this.execSync({ turnOnAutosyncing: false });
                    if (logalot) { console.log(`${lc} executed sync, so aborting this poll call. (I: 9aa1a4dcba06bb6eee7db686a31ce822)`); }
                  } else {
                    if (logalot) { console.log(`${lc} local latestIbGib is newer than store, but already syncing in progress... (I: 029f69c149d614fb26412696efbcd122)`); }
                  }
                } else {
                  console.warn(`${lc} local latestIbGib registered is newer than latest ibGib in store but autosync is off. (W: 6941969946b04f539ba4f15c6b68ea22)`);
                  runningDiffCountAcrossAllSpaces += Math.abs(diff);
                }
              } else {
                // equal
                if (logalot) { console.log(`${lc} diff === 0 (I: 9072dfeb65d140e196544cc9c1239222)`); }
              }
            }
          } else {
            if (logalot) { console.log(`${lc} latestAddr === this.addr (I: 36a3b311076ae894ded4219e90807922)`); }
          }
        } catch (error) {
          console.error(`${lc} ${error.message}`);
          throw error;
        }
      }
      if (runningDiffCountAcrossAllSpaces > 0) {
        if (this.autosync) {
          await this.execSync({ turnOnAutosyncing: false });
        } else {
          this.tjpUpdatesAvailableCount_Store = runningDiffCountAcrossAllSpaces;
          if (this.tjpUpdatesAvailableCount_Store > 0) {
            const _notifs = await LocalNotifications.schedule({
              notifications: [
                {
                  title: 'IbGib',
                  body: `There are ${this.tjpUpdatesAvailableCount_Store} updates available.`,
                  id: 1,
                  schedule: { at: new Date(Date.now() + 200) },
                  sound: null,
                  attachments: null,
                  actionTypeId: '',
                  extra: null,
                },
              ],
            });
          }
          setTimeout(() => this.ref.detectChanges());
        }
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

  async handleChatItemsAdded(): Promise<void> {
    const lc = `${this.lc}[${this.handleChatItemsAdded.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.ibgibPageContent) {
        setTimeout(() => this.ibgibPageContent.scrollToBottom());
      } else {
        if (logalot) { console.log(`${lc} this.ibgibPageContent is falsy (I: 9e27785a017741afafefb72ce4629842)`); }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      setTimeout(() => this.ref.detectChanges());
    }
  }

  // #region tag modal related

  @Input()
  tagIbGibs: TagIbGib_V1[] = [];

  async handleTagClick(_: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleTagClick.name}]`;
    try {
      this.tagging = true;
      setTimeout(() => this.ref.detectChanges());

      if (!this.ibGib) { throw new Error(`There isn't a current ibGib loaded...?`); }
      if (!this.addr) { throw new Error(`There isn't a current ibGib addr loaded...?`); }

      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 67e795e53b9c4732ab53837bcaa22c1f)`); }
        await h.delay(109);
      }
      this.tagIbGibs = await this.common.ibgibs.getSpecialRel8dIbGibs<TagIbGib_V1>({
        type: "tags",
        rel8nName: c.TAG_REL8N_NAME,
      });

      this.showModal_PromptForTag = !this.showModal_PromptForTag;

      return; /* <<<< returns early */
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      await Dialog.alert({ title: 'something went awry...', message: error.message });
    } finally {
      this.ref.detectChanges();
    }
  }

  async rel8ToTag({
    tagIbGib,
  }: {
    tagIbGib: TagIbGib_V1,
  }): Promise<void> {
    const lc = `${this.lc}[${this.rel8ToTag.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const rel8nsToAddByAddr = { [c.TAGGED_REL8N_NAME]: [this.addr] };
      const resRel8ToTag =
        await V1.rel8({ src: tagIbGib, rel8nsToAddByAddr, dna: true, nCounter: true });
      await this.common.ibgibs.persistTransformResult({ resTransform: resRel8ToTag });
      const { newIbGib: newTag } = resRel8ToTag;
      await this.common.ibgibs.rel8ToCurrentRoot({ ibGib: newTag, linked: true });
      await this.common.ibgibs.registerNewIbGib({ ibGib: newTag });

      if (logalot) { console.log(`${lc} tag successful.`); }
      await Dialog.alert({ title: 'yess', message: `Tagged.` });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSelectTag_ExistingTag(tagIbGib: TagIbGib_V1): Promise<void> {
    const lc = `${this.lc}[${this.handleSelectTag_ExistingTag.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.showModal_PromptForTag = false;
      setTimeout(() => this.ref.detectChanges());

      if (logalot) { console.log(`${lc} tag with existing tag, but may not be latest addr`); }
      const rel8dTagIbGibAddr = h.getIbGibAddr({ ibGib: tagIbGib });
      if (logalot) { console.log(`${lc} the rel8d tag may not be the latest: ${rel8dTagIbGibAddr}`); }
      const latestTagAddr = await this.common.ibgibs.getLatestAddr({ ibGib: tagIbGib });
      if (logalot) { console.log(`${lc} latestTagAddr: ${latestTagAddr}`); }
      if (rel8dTagIbGibAddr === latestTagAddr) {
        if (logalot) { console.log(`${lc} tag is already the latest (I: b98f190c9d6bc2f5575606ad0b7ff122)`); }
      } else {
        if (logalot) { console.log(`${lc} tag is NOT the latest (I: 1a8d0849cdb5b0fc652529146d81db22)`); }
        const resTagIbGibLatest = await this.common.ibgibs.get({ addr: latestTagAddr });
        if (resTagIbGibLatest.success && resTagIbGibLatest.ibGibs?.length === 1) {
          if (logalot) { console.log(`${lc} tag is NOT the latest and we got a new ibgib (I: 9391166b53577630697da4ff810b1b22)`); }
          tagIbGib = <TagIbGib_V1>resTagIbGibLatest.ibGibs![0];
        } else {
          console.warn(`${lc} couldn't find latest tag addr (${latestTagAddr}). using previous tag (${rel8dTagIbGibAddr})`);
        }
      }

      await this.rel8ToTag({ tagIbGib });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.tagging = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSelectTag_New(): Promise<void> {
    const lc = `${this.lc}[${this.handleSelectTag_New.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.showModal_PromptForTag = false;
      setTimeout(() => this.ref.detectChanges());

      if (logalot) { console.log(`${lc} create new tag`); }
      let tagIbGib = await createNewTag(this.common);
      if (!tagIbGib) {
        if (logalot) { console.log(`${lc} aborting creating new tag.`); }
        this.tagging = false;
        this.ref.detectChanges();
        return;
      }

      await this.rel8ToTag({ tagIbGib });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.tagging = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSelectTag_Cancel(): Promise<void> {
    const lc = `${this.lc}[${this.handleSelectTag_Cancel.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.showModal_PromptForTag = false;
      setTimeout(() => this.ref.detectChanges());

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.tagging = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  // #endregion tag modal related

}
