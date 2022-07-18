// #region imports & some init

import { Component, OnInit, ChangeDetectorRef, Input, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, } from '@angular/router';
import { MenuController, } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Capacitor, Plugins } from '@capacitor/core';
const { Storage } = Plugins;
import { Subscription } from 'rxjs';
import { concatMap, filter } from 'rxjs/operators';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, } from 'ts-gib';
import { IbGib_V1, ROOT } from 'ts-gib/dist/V1';

import * as c from './common/constants';
import { IbgibComponentBase } from './common/bases/ibgib-component-base';
import { CommonService } from './services/common.service';
import { IbGibSpaceAny } from './common/witnesses/spaces/space-base-v1';
import { createNewRobbot } from './common/helper/robbot';
import { RobbotIbGib_V1 } from './common/types/robbot';
import { RootData, SpecialIbGibType } from './common/types/ux';
import { SpaceId } from './common/types/space';
import {
  getFn_promptCreateSecretIbGib, getFn_promptCreateEncryptionIbGib,
  getFn_promptCreateOuterSpaceIbGib, getFn_promptUpdatePicIbGib,
  getFnAlert, getFn_promptRobbotIbGib
} from './common/helper/prompt-functions';
import { createNewTag } from './common/helper/tag';
import { validateIbGibIntrinsically, spaceNameIsValid } from './common/helper/validate';
import { environment } from '../environments/environment';
import { getInfoFromSpaceIb } from './common/helper/space';

// #endregion imports & some init

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Hamburger menu in top left.
 *
 * This includes both header items and child items.
 */
interface MenuItem {
  title: string;
  icon: string;
  url?: string;
  /**
   * some menu items need to be resolved via click handlers instead of urls
   *
   * todo: change other menu items to use click hancler because the link directly does not work with nav stack
   */
  clickHandler?: (item: MenuItem) => Promise<void>;
  addr?: IbGibAddr;
}

@Component({
  selector: 'ib-app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent extends IbgibComponentBase
  implements OnInit, OnDestroy {

  protected lc: string = `[${AppComponent.name}]`;

  @Input()
  tagItems: MenuItem[] = [];

  @Input()
  rootItems: MenuItem[] = [];

  @Input()
  localSpaceItems: MenuItem[] = [];

  @Input()
  outerSpaceItems: MenuItem[] = [];

  @Input()
  robbotItems: MenuItem[] = [];

  _currentRoot: MenuItem;
  @Input()
  get currentRoot(): MenuItem {
    const lc = `${this.lc}[get currentRoot]`;
    if (logalot) { console.log(`${lc} this._currentRoot: ${h.pretty(this._currentRoot)}`); }
    return this._currentRoot;
  }
  set currentRoot(value: MenuItem) {
    const lc = `${this.lc}[set currentRoot]`;
    if (logalot) { console.log(`${lc} value: ${h.pretty(value)}`); }
    this._currentRoot = value;
    setTimeout(() => this.ref.detectChanges());
  }

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1) { super.ibGib_Context = value; }

  private _tagsAddr: IbGibAddr;
  @Input()
  get tagsAddr(): IbGibAddr { return this._tagsAddr; }
  set tagsAddr(value: IbGibAddr) {
    const lc = `${this.lc}[set tagsAddr]`;
    if (value !== this._tagsAddr) {
      if (logalot) { console.log(`${lc} updating tagsAddr: ${value}`); }
      this._tagsAddr = value;
      setTimeout(() => { this.ref.detectChanges(); });
    }
  }
  private _subTagsUpdate: Subscription;

  private _robbotsAddr: IbGibAddr;
  @Input()
  get robbotsAddr(): IbGibAddr { return this._robbotsAddr; }
  set robbotsAddr(value: IbGibAddr) {
    const lc = `${this.lc}[set robbotsAddr]`;
    if (value !== this._robbotsAddr) {
      if (logalot) { console.log(`${lc} updating robbotsAddr: ${value}`); }
      this._robbotsAddr = value;
      setTimeout(() => { this.ref.detectChanges(); });
    }
  }
  private _subRobbotsUpdate: Subscription;
  // private _subTagsUpdateTEST: Subscription;

  private _rootsAddr: IbGibAddr;
  @Input()
  get rootsAddr(): IbGibAddr { return this._rootsAddr; }
  set rootsAddr(value: IbGibAddr) {
    const lc = `${this.lc}[set rootsAddr]`;
    if (value !== this._rootsAddr) {
      if (logalot) { console.log(`${lc} updating rootsAddr: ${value}`); }
      this._rootsAddr = value;
      this.ref.detectChanges();
    }
  }

  @Input()
  localSpaceName: string;

  @Input()
  outerspaces: IbGibSpaceAny[];

  @Input()
  localSpaceId: SpaceId;

  private _paramMapSub_App: Subscription;

  /**
   * Used in binding to the routerLink anchor in the app menu
   */
  get tagsUrl(): string { return `/ibgib/${this.tagsAddr}`; }

  /**
   * Used in binding to the routerLink anchor in the app menu
   */
  get rootsUrl(): string { return `/ibgib/${this.rootsAddr}`; }

  @Input()
  initializing: boolean;
  // @Input()
  // get svcInitializing(): boolean { return this.common.ibgibs.initializing; }

  @Input()
  menuOpen: string = 'tags';

  @Input()
  addingRobbot: boolean;

  @Input()
  addingTag: boolean;

  constructor(
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private router: Router,
    public menu: MenuController,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;

    console.log(`${lc} appVersion: ${environment.appVersion}`);

    console.time(c.GLOBAL_TIMER_NAME);
    // interstitial calls throughout code as desired
    setTimeout(() => { console.timeEnd(c.GLOBAL_TIMER_NAME); }, 10000);

    this.initializeApp();

    if (logalot) { console.log(`${lc}[end]${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
  }

  async initializeApp(): Promise<void> {
    const lc = `${this.lc}[${this.initializeApp.name}]`;

    if (logalot) { console.log(`${lc} starting...`); }
    this.initializing = true;
    this.common.platform.ready().then(async () => {
      this.statusBar.styleDefault();

      let navToAddr: IbGibAddr;

      try {
        if (this.initializing) {
          if (logalot) { console.log(`${lc} this.initializing is truthy`); }
        } else {
          if (logalot) { console.log(`${lc} this.initializing is falsy`); }
        }

        let timerName: string; let infoGuid: string;
        try {
          if (logalot) {
            timerName = lc + '[timer 90f1a9]';
            infoGuid = 'fa0662edd9a725abc9f2ecca9ab57422';
            console.log(`${lc} starting timer ${timerName} (I: ${infoGuid})`);
            console.time(timerName);
          }
          // can intersperse with calls to console.timeLog(timerName); for intermediate times
          // console.timeLog(timerName);

          // make sure the service is initialized FIRST before any
          // other ibgib happenings
          if (logalot) { console.log(`${lc} wakka calling IbgibsService.initialize...`); }
          await this.common.ibgibs.initialize({
            fnPromptSecret: getFn_promptCreateSecretIbGib(this.common),
            fnPromptEncryption: getFn_promptCreateEncryptionIbGib(this.common),
            fnPromptOuterSpace: getFn_promptCreateOuterSpaceIbGib(this.common),
            fnPromptUpdatePic: getFn_promptUpdatePicIbGib(this.common),
            fnPromptRobbot: getFn_promptRobbotIbGib(this.common),
          });

        } finally {
          if (logalot) {
            console.timeEnd(timerName);
            console.log(`${lc} timer ${timerName} complete. (I: ${infoGuid})`);
          }
        }

        if (logalot) { console.log(`${lc} doodle IbgibsService.initialize returned.`); }

        if (!this.item) { this.item = {} }
        this.item.isMeta = true;

        while (this.common.ibgibs.initializing) {
          if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: de1ca706872740b98dfce57a5a9da4d4)`); }
          await h.delay(100);
        }

        // these are AppComponent-specific initializations
        await this.initializeMyRoots();
        await this.initializeMyTags();
        await this.initializeMySpaces();
        await this.initializeMyRobbots();

        let addr = await this.getCurrentIbgibAddrInURL();
        if (!addr || addr === 'ib^gib') {
          navToAddr = this.tagsAddr;
        } else {
          this.initializing = false;
          setTimeout(() => this.ref.detectChanges());
          await this.updateIbGib(addr);
        }

        // setTimeout(() => {
        //   this.handleAddRobbot();
        //   console.warn('DEFAULTING TO ADD ROBBOT FOR TESTING PURPOSES');
        //   console.warn('DEFAULTING TO ADD ROBBOT FOR TESTING PURPOSES');
        //   console.warn('DEFAULTING TO ADD ROBBOT FOR TESTING PURPOSES');
        //   console.warn('DEFAULTING TO ADD ROBBOT FOR TESTING PURPOSES');
        // }, 3000);

        // navToAddr = this.tagsAddr;
        this.common.platform.backButton.subscribeWithPriority(10, async () => {
          if (this.common?.nav) { await this.common.nav.back(); }
        });

      } catch (error) {
        console.error(`${lc} ${error.message}`);
      } finally {
        this.initializing = false;
        setTimeout(() => this.ref.detectChanges());
        this.splashScreen.hide();

        // this is what navigates if not using the welcome page
        // if (navToAddr) {
        // await this.go({
        //   toAddr: navToAddr,
        //   fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
        // });
        // }
      }
    });

    if (logalot) { console.log(`${lc} complete. waiting for platform.ready...`); }
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {
      this.subscribeParamMap();
      await super.ngOnInit();
      // const path = window.location.pathname.split('ibgib/')[1];
      // console.log(`path: ${path}`);
      // if (path !== undefined) {
      //   this.selectedIndex =
      //     this.menuItems.findIndex(page => page.title.toLowerCase() === path.toLowerCase());
      // }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async ngOnDestroy(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.unsubscribeParamMap();

      await super.ngOnDestroy();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  subscribeParamMap() {
    const lc = `${this.lc}[${this.subscribeParamMap.name}]`;

    if (logalot) { console.log(`${lc} subscribing...`); }

    this._paramMapSub_App =
      this.router.events.pipe(filter(x => x instanceof NavigationEnd))
        .subscribe(async (event: any) => {
          const lc2 = `${lc}[NavigationEndEvent]`;
          if (logalot) { console.log(`${lc2} starting... (I: f379e341482d5837d456b72b4bc1c922)`); }
          try {
            const addr = await this.getCurrentIbgibAddrInURL();
            if (logalot) { console.log(`${lc} addr: ${addr}`); }
            if (logalot) { console.log(`${lc} router.url: ${h.pretty(this.router.url)}`) }
            if (event.id && event.url && addr && addr !== this.addr) {
              if (logalot) { console.log(`${lc} event.id: ${event.id}`); }
              if (logalot) { console.log(`${lc} event.url: ${event.url}`); }
              if (logalot) { console.log(`${lc} addr is different`); }
              await this.updateIbGib(addr);
              this.ref.detectChanges();
            }
          } catch (error) {
            console.error(`${lc2} ${error.message}`);
            throw error;
          } finally {
            if (logalot) { console.log(`${lc2} complete. (I: 8fc2215676968802bb983ac8f3eb5622)`); }
          }
        });
  }

  unsubscribeParamMap() {
    const lc = `${this.lc}[${this.unsubscribeParamMap.name}]`;
    if (logalot) { console.log(`${lc} starting... (I: ebe0e74ea9b2cc58541d14f5a84dba22)`); }
    if (this._paramMapSub_App) {
      if (logalot) { console.log(`${lc} unsubscribing (I: 098fa9c9a049d2ae681efd5599e9d722)`); }
      this._paramMapSub_App.unsubscribe();
      delete this._paramMapSub_App;
    } else {
      if (logalot) { console.log(`${lc} nothing to unsubscribe (I: 66b4774bdcc4aa48de9c2cfcfa071d22)`); }
    }
    if (logalot) { console.log(`${lc} complete. (I: 4514b9aed3fe52cd713d8d7590242d22)`); }
  }

  /**
   * Tags function in multiple roles, like bookmarks and indexes.
   *
   * We can load a single tags ibGib for our app, which acts as a way of
   * having a local index for the other meta ibGibs, which contain
   * information like settings/config.
   */
  async loadTagsAddrAndGetTagsIbGib(): Promise<IbGib_V1> {
    const lc = `${this.lc}[${this.loadTagsAddrAndGetTagsIbGib.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 1a41f1e1a28748bc88f913780bd74b4f)`); }
        await h.delay(100);
      }
      const tagsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "tags" });
      this.tagsAddr = h.getIbGibAddr({ ibGib: tagsIbGib });
      return tagsIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Initializes app components properties, NOT the actual special ibgib
   * on the ibgibs service. That should already be done.
   */
  async initializeMyRoots(): Promise<void> {
    const lc = `${this.lc}[${this.initializeMyRoots.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: de1ca706872740b98dfce57a5a9da4d4)`); }
        await h.delay(100);
      }
      const rootsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "roots" });
      this.rootsAddr = h.getIbGibAddr({ ibGib: rootsIbGib });
      const currentRootIbGib = await this.common.ibgibs.getCurrentRoot({});
      if (!currentRootIbGib) { throw new Error(`currentRoot not found(?)`); }
      if (!currentRootIbGib.data) { throw new Error(`currentRoot.data falsy (?)`); }
      // let {icon, text, description} = currentRootIbGib.data;
      // if (!icon) {
      //   console.warn(`${lc} root.icon not found. Using default.`);
      //   icon = c.DEFAULT_ROOT_ICON;
      // }
      // if (!text) {
      //   console.warn(`${lc} root.text not found. Using default.`);
      //   text = c.DEFAULT_ROOT_TEXT;
      // }
      // if (!description) {
      //   console.warn(`${lc} root.description not found. Using default.`);
      //   description = c.DEFAULT_ROOT_DESCRIPTION;
      // }
      const addr = h.getIbGibAddr({ ibGib: currentRootIbGib });

      this.currentRoot = await this.getRootItem(addr);

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Initializes app components properties, NOT the actual special ibgib
   * on the ibgibs service. That should already be done.
   */
  async initializeMyTags(): Promise<void> {
    const lc = `${this.lc}[${this.initializeMyTags.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {
      const tagsIbGib = await this.loadTagsAddrAndGetTagsIbGib();
      if (!tagsIbGib) { throw new Error(`tagsIbGib falsy. (E: 8e624b39bd34481a82be6efc521c24dc)`); }

      // subscribe to tags updates
      const tagsTjpIbGib =
        await this.common.ibgibs.getTjpIbGib({ ibGib: tagsIbGib, naive: true });
      const tagsTjpAddr = h.getIbGibAddr({ ibGib: tagsTjpIbGib });
      if (this._subTagsUpdate && !this._subTagsUpdate.closed) {
        this._subTagsUpdate.unsubscribe();
      }

      this._subTagsUpdate = this.common.ibgibs.latestObs.pipe(
        concatMap(async (latestEvent) => {
          if (logalot) { console.log(`${lc} ibGib update heard. latestAddr: ${latestEvent.latestAddr}.`); }
          if (
            latestEvent?.tjpAddr === tagsTjpAddr &&
            latestEvent.latestAddr !== this.tagsAddr
          ) {
            // we have a new tags ibgib. easiest way to handle with
            // existing code is just to clear out the exising tagsAddr
            // and run updateMenu_Tags
            if (logalot) { console.log(`${lc} triggering tags menu update...`); }
            this._tagsAddr = null;
            await this.updateMenu_Tags();
            setTimeout(() => { this.ref.detectChanges(); })
          } else {
            if (logalot) { console.log(`${lc} nope. latestEvent?.tjpAddr: ${latestEvent?.tjpAddr}`); }
            if (logalot) { console.log(`${lc} nope. tagsTjpAddr: ${tagsTjpAddr}`); }
            if (logalot) { console.log(`${lc} nope. latestEvent.latestAddr: ${latestEvent.latestAddr}`); }
            if (logalot) { console.log(`${lc} nope. this.tagsAddr: ${this.tagsAddr}`); }
          }
        })
      ).subscribe();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Initializes app components properties, NOT the actual special ibgib
   * on the ibgibs service. That should already be done.
   */
  async initializeMySpaces(): Promise<void> {
    const lc = `${this.lc}[${this.initializeMySpaces.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      // initializes with current ibgibs.localUserspace


      // we always need to be carefully aware that the local user space can
      // change in the background and we always want to do things with it while
      // locking...
      const localUserSpace = await this.common.ibgibs.getLocalUserSpace({ lock: true });
      if (!localUserSpace) { throw new Error(`(UNEXPECTED) localUserSpace falsy (E: 01e6292fa8514b9d903a7d396e23d173)`); }
      if (!localUserSpace.data) { throw new Error(`(UNEXPECTED) localUserSpace.data falsy (E: 01e6292fa8514b9d903a7d396e23d173)`); }

      this.localSpaceId = localUserSpace.data.uuid;
      this.localSpaceName = localUserSpace.data.name;

      // get our outerspaces (only sync spaces atow)
      const appSyncSpaces = await this.common.ibgibs.getAppSyncSpaces({
        unwrapEncrypted: true,
        createIfNone: false,
      });
      this.outerspaces = appSyncSpaces.concat();
      const syncSpaceNames = appSyncSpaces.map(syncSpace => syncSpace?.data?.name);
      if (logalot) { console.log(`${lc} syncSpaceNames: ${syncSpaceNames} (I: 832c8d29220e49449237c56fc7ac1eb5)`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Initializes app components properties, NOT the actual special ibgib
   * on the ibgibs service. That should already be done.
   */
  async initializeMyRobbots(): Promise<void> {
    const lc = `${this.lc}[${this.initializeMyRobbots.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      let robbotsIbGib = <RobbotIbGib_V1>(await this.common.ibgibs.getSpecialIbGib({ type: 'robbots' }));
      const robbotsTjpIbGib =
        await this.common.ibgibs.getTjpIbGib({ ibGib: robbotsIbGib, naive: true });
      const robbotsTjpAddr = h.getIbGibAddr({ ibGib: robbotsTjpIbGib });
      if (!robbotsIbGib) { throw new Error(`(UNEXPECTED) robbotsIbGib falsy (E: 098f213f34cf44629e2d0cca8345d4f7)`); }
      if (!robbotsIbGib.data) { throw new Error(`(UNEXPECTED) localUserSpace.data falsy (E: e24f2a249ad445da97109f8ecc581f77)`); }

      if (this._subRobbotsUpdate) { this._subRobbotsUpdate.unsubscribe(); }

      this._subRobbotsUpdate = this.common.ibgibs.latestObs.pipe(
        concatMap(async (latestEvent) => {
          if (logalot) { console.log(`${lc} ibGib update heard. latestAddr: ${latestEvent.latestAddr}.`); }
          if (
            latestEvent?.tjpAddr === robbotsTjpAddr &&
            latestEvent.latestAddr !== this.robbotsAddr
          ) {
            // we have a new robbots ibgib. easiest way to handle with
            // existing code is just to clear out the exising robbotsAddr
            // and run updateMenu_Robbots
            if (logalot) { console.log(`${lc} triggering robbots menu update... (I: 4ba9f51fddae41408d7c03ad6eab81b2)`); }
            this.robbotsAddr = null;

            await this.updateMenu_Robbots();
            setTimeout(() => { this.ref.detectChanges(); })
          } else {
            if (logalot) { console.log(`${lc} nope. latestEvent?.tjpAddr: ${latestEvent?.tjpAddr}`); }
            if (logalot) { console.log(`${lc} nope. robbotsTjpAddr: ${robbotsTjpAddr}`); }
            if (logalot) { console.log(`${lc} nope. latestEvent.latestAddr: ${latestEvent.latestAddr}`); }
            if (logalot) { console.log(`${lc} nope. this.robbotsAddr: ${this.robbotsAddr}`); }
          }
        })
      ).subscribe();
      await this.updateMenu_Robbots();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * RobbotsIbGib is the special ibgib that tracks robbots in the local space.
   */
  async loadRobbotsAddrAndGetRobbotsIbGib(): Promise<IbGib_V1> {
    const lc = `${this.lc}[${this.loadRobbotsAddrAndGetRobbotsIbGib.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 1a41f1e1a28748bc88f913780bd74b4f)`); }
        await h.delay(100);
      }
      const robbotsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "robbots" });
      this.robbotsAddr = h.getIbGibAddr({ ibGib: robbotsIbGib });
      return robbotsIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Primary update function for the current ibGib associated with
   * this component.
   *
   * @param addr address for new ibGib. May be new, the same, or falsy.
   */
  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      if (this.initializing) {
        if (logalot) { console.log(`${lc} initializing in progress...not continuing at this time.`); }
        return;
      }

      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();

      // do I need these two lines??
      if (!this.item) { this.item = {} }
      this.item.isMeta = true;

      await this.updateMenu();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  /**
   * For some reason, the app component refuses to be allow custom ibgib
   * components inside the menu and bind them. For example, I can get
   * a tag-list to show in the menu, but it does not load the component
   * or do any bindings on that tag-list. So I'm manually creating menu items
   * in this.
   */
  async updateMenu(): Promise<void> {
    const lc = `${this.lc}[${this.updateMenu.name}]`;
    try {
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 5fd759510e584cb69b232259b891cca1)`); }
        await h.delay(100);
      }

      await this.updateMenu_Tags();
      await this.updateMenu_Roots();
      await this.updateMenu_LocalSpaces();
      await this.updateMenu_OuterSpaces();
      await this.updateMenu_Robbots();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async updateMenu_Tags(): Promise<void> {
    const lc = `${this.lc}[${this.updateMenu_Tags.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const tagMenuItems: MenuItem[] = [];

      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 5fd759510e584cb69b232259b891cca1)`); }
        await h.delay(100);
      }

      // load tags if needed
      if (!this.tagsAddr) {
        if (logalot) { console.log(`${lc} this.tagsAddr falsy`); }
        await this.loadTagsAddrAndGetTagsIbGib();
      }

      // get tags, but don't initialize
      let tagsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "tags" });
      let tagAddrs = tagsIbGib?.rel8ns?.tag || [];

      // if we have gotten the tags object and there are no associated individual
      // tags, try re-initializing with default tags.
      if (!tagAddrs || tagAddrs.length === 0) {
        if (logalot) { console.log(`${lc} couldn't get tagsIbGib?`); }
        tagsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "tags", initialize: true });
        tagAddrs = tagsIbGib?.rel8ns?.tag || [];
      }

      // give up if we still don't have any tags.
      if (!tagAddrs || tagAddrs.length === 0) { console.error(`${lc} no tags found?`); return; }

      // load individual tag items
      for (let tagAddr of tagAddrs) {
        const tagItem = await this.getTagItem(tagAddr);
        if (tagItem) { tagMenuItems.push(tagItem); }
      }

      // "load" them into the bound property and detect the changes
      this.tagItems = tagMenuItems;
      this.ref.detectChanges();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.tagItems = [];
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }

  }

  async getTagItem(addr: IbGibAddr): Promise<MenuItem> {
    const lc = `${this.lc}[${this.getTagItem.name}]`;
    let item: MenuItem;
    try {
      const resGet = await this.common.ibgibs.get({ addr });
      if (resGet.success && resGet.ibGibs?.length === 1) {
        const ibGib = resGet.ibGibs![0];
        if (ibGib?.ib && ibGib.gib && ibGib.data) {
          const text = ibGib.data!.text || ibGib.data!.tagText || ibGib.ib;
          const icon = ibGib.data!.icon || c.DEFAULT_TAG_ICON;
          item = this.getMenuItem({ text, icon, addr });
        } else {
          throw new Error(`Invalid ibgib gotten`);
        }
      } else {
        throw new Error(resGet.errorMsg || `error getting ${addr}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      item = this.getErroredMenuItem();
    }
    return item;
  }

  async updateMenu_Roots(): Promise<void> {
    const lc = `${this.lc}[${this.updateMenu_Roots.name}]`;
    let rootMenuItems: MenuItem[] = [];

    try {

      // roots should already be initialized
      if (!this.rootsAddr) { throw new Error(`rootsAddr is falsy, i.e. hasn't been initialized?`); };

      // get roots, but don't initialize
      let rootsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "roots" });
      let rootAddrs = rootsIbGib?.rel8ns[c.ROOT_REL8N_NAME] || [];

      // we should have initialized with roots
      if (!rootAddrs || rootAddrs.length === 0) { throw new Error(`No associated rootAddrs to the roots ibGib. Should have been initialized with roots.`); }

      // load individual items
      for (let rootAddr of rootAddrs) {
        const rootItem = await this.getRootItem(rootAddr);
        if (rootItem) { rootMenuItems.push(rootItem); }
      }

      // "load" them into the bound property and detect the changes
    } catch (error) {
      rootMenuItems = [{ title: 'hmm errored...', icon: 'bug-outline', url: '/ibgib/error^gib' }];
      console.error(`${lc} ${error.message}`);
    } finally {
      this.rootItems = rootMenuItems;
      this.ref.detectChanges();
    }

  }

  async getRootItem(addr: IbGibAddr): Promise<MenuItem> {
    const lc = `${this.lc}[${this.getRootItem.name}]`;
    let item: MenuItem;
    try {
      const resGet = await this.common.ibgibs.get({ addr });
      if (resGet.success && resGet.ibGibs?.length === 1) {
        const ibGib = resGet.ibGibs![0];
        if (ibGib?.ib && ibGib.gib && ibGib.data) {
          const text = ibGib.data.text || ibGib.ib;
          const icon = ibGib.data.icon || c.DEFAULT_ROOT_ICON;
          item = this.getMenuItem({ text, icon, addr });
        } else {
          throw new Error(`Invalid ibgib gotten (E: 7e3f5b84014d4a4d98b732f2c53fc331)`);
        }
      } else {
        throw new Error(resGet.errorMsg || `error getting ${addr} (E: 5e0a0407d13b4f428d7a8b0a68be3ad3)`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }

    return item;
  }

  async handleTagsClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleTagsClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      // getFnAlert()({title: 'testing', msg: 'handleTagsClick triggered'});
      this.menu.close();
      await this.go({
        toAddr: this.tagsAddr,
        fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSpaceClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleSpaceClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.menu.close();
      const localUserSpace = await this.common.ibgibs.getLocalUserSpace({ lock: true });
      await this.go({
        toAddr: h.getIbGibAddr({ ibGib: localUserSpace.toIbGibDto() }),
        fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleRootsClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleRootsClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      // getFnAlert()({title: 'testing', msg: 'handleTagsClick triggered'});
      this.menu.close();
      await this.go({
        toAddr: this.rootsAddr,
        fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * ATOW the label is the local user space, while the individual children are
   * the sync spaces.
   */
  async updateMenu_OuterSpaces(): Promise<void> {
    const lc = `${this.lc}[${this.updateMenu_OuterSpaces.name}]`;
    let spaceMenuItems: MenuItem[] = [];

    try {
      // spaces should already be initialized
      if (!this.localSpaceId) { throw new Error(`localSpaceId is falsy, i.e. hasn't been initialized? (E: a5a51fad4a44470a8dc5698a4288eebc)`); };

      // get spaces, but don't initialize
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 1e84725b134f4992a765c55acd254579)`); }
        await h.delay(100);
      }

      const localUserSpace = await this.common.ibgibs.getLocalUserSpace({});

      let encryptedSyncSpaces = await this.common.ibgibs.getAppSyncSpaces({
        unwrapEncrypted: false,
        createIfNone: false,
        space: localUserSpace,
      });

      // load individual items (only executes if any syncspaces exist)
      for (let i = 0; i < encryptedSyncSpaces.length; i++) {
        const syncSpace = encryptedSyncSpaces[i];
        const spaceItem = await this.getSpaceItem(syncSpace);
        if (spaceItem) { spaceMenuItems.push(spaceItem); }
      }
    } catch (error) {
      spaceMenuItems = [{ title: 'hmm errored...', icon: 'bug-outline', clickHandler: async (item: MenuItem) => { /*donothing*/ } }];
      console.error(`${lc} ${error.message}`);
    } finally {
      // "load" them into the bound property and detect the changes
      this.outerSpaceItems = spaceMenuItems;
      setTimeout(() => this.ref.detectChanges());
    }

  }

  /**
   * ATOW the label is the local user space, while the individual children are
   * the sync spaces.
   */
  async updateMenu_LocalSpaces(): Promise<void> {
    const lc = `${this.lc}[${this.updateMenu_LocalSpaces.name}]`;
    let spaceMenuItems: MenuItem[] = [];

    try {
      // spaces should already be initialized
      if (!this.localSpaceId) { throw new Error(`localSpaceId is falsy, i.e. hasn't been initialized? (E: a5a51fad4a44470a8dc5698a4288eebc)`); };

      // get spaces, but don't initialize
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 1e84725b134f4992a765c55acd254579)`); }
        await h.delay(100);
      }

      const localUserSpace = await this.common.ibgibs.getLocalUserSpace({});
      const { spaceId } = getInfoFromSpaceIb({ spaceIb: localUserSpace.ib });
      const spaceItem = await this.getSpaceItem(localUserSpace);
      // override the click handler to always navigate to the latest space.
      spaceItem.clickHandler = async (x: MenuItem) => {
        await this.menu.close();
        const latestSpace = await this.common.ibgibs.getLocalUserSpace({
          localSpaceId: spaceId
        });
        await this.go({
          toAddr: h.getIbGibAddr({ ibGib: latestSpace }),
          fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context ?? ROOT }),
        });
      };
      if (!spaceItem) { throw new Error(`(unexpected) couldn't get space item for localUserSpace? (E: b426e5524486a9789831cc6762e83d22)`); }
      spaceMenuItems.push(spaceItem);

    } catch (error) {
      spaceMenuItems = [{ title: 'hmm errored...', icon: 'bug-outline', clickHandler: async (item: MenuItem) => { /*donothing*/ } }];
      console.error(`${lc} ${error.message}`);
    } finally {
      // "load" them into the bound property and detect the changes
      this.localSpaceItems = spaceMenuItems;
      setTimeout(() => this.ref.detectChanges());
    }

  }
  // async getSpaceItem_localSpace(space: IbGibSpaceAny): Promise<MenuItem> {
  //   const lc = `${this.lc}[${this.getSpaceItem_localSpace.name}]`;
  //   let item: MenuItem;
  //   try {
  //     const ibGib = space.toIbGibDto ? space.toIbGibDto() : space;
  //     if (logalot) { console.log(`${lc} ibGib: ${h.pretty(ibGib)} (I: c24a7fc94df7b5403bc221e98083ee22)`); }
  //     let validateIbGibErrors = await validateIbGibIntrinsically({ ibGib });
  //     if (validateIbGibErrors?.length > 0) { throw new Error(`invalid ibGib intrinsically. errors: ${validateIbGibErrors} (E: d482f5e1ff2db1bb91312128797be922)`); }
  //     const addr = h.getIbGibAddr({ ibGib });
  //     if (!spaceNameIsValid(ibGib.data.name)) { throw new Error(`invalid spacename: ${space.data.name} (E: ee437d70aa5e8bdf44e692bfa4832f22)`); }
  //     const text = ibGib.data.name || ibGib.ib;
  //     const icon = (<any>space.data).icon || c.DEFAULT_SPACE_ICON;
  //     item = this.getMenuItem({ text, icon, addr });
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     item = this.getErroredMenuItem();
  //   }
  //   return item;
  // }

  async getSpaceItem(space: IbGibSpaceAny): Promise<MenuItem> {
    const lc = `${this.lc}[${this.getSpaceItem.name}]`;
    let item: MenuItem;
    try {
      const ibGib = space.toIbGibDto ? space.toIbGibDto() : space;
      if (logalot) { console.log(`${lc} ibGib: ${h.pretty(ibGib)} (I: c24a7fc94df7b5403bc221e98083ee22)`); }
      let validateIbGibErrors = await validateIbGibIntrinsically({ ibGib });
      if (validateIbGibErrors?.length > 0) { throw new Error(`invalid ibGib intrinsically. errors: ${validateIbGibErrors} (E: d482f5e1ff2db1bb91312128797be922)`); }
      const addr = h.getIbGibAddr({ ibGib });
      if (!spaceNameIsValid(ibGib.data.name)) { throw new Error(`invalid spacename: ${space.data.name} (E: ee437d70aa5e8bdf44e692bfa4832f22)`); }
      const text = ibGib.data.name || ibGib.ib;
      const icon = (<any>space.data).icon || c.DEFAULT_SPACE_ICON;
      item = this.getMenuItem({ text, icon, addr });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      item = this.getErroredMenuItem();
    }
    return item;
  }

  async getCurrentIbgibAddrInURL(): Promise<IbGibAddr | undefined> {
    const lc = `${this.lc}[${this.getCurrentIbgibAddrInURL.name}]`
    try {
      let path = this.router?.url === "/" ?
        window?.location?.pathname?.slice() || "" :
        this.router?.url?.slice() || "";

      // remove query params
      if (path.includes('?')) { path = path.slice(0, path.indexOf('?')); }

      let addr = path.startsWith('/ibgib/') ?
        decodeURI(path.split('/')[2]) :
        undefined;

      return addr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }

  compareMenuItems(a: MenuItem, b: MenuItem): boolean {
    // const lc = `${this.lc}[compareMenuItems]`; // this is not defined when compareRoots is used
    const lc = `[AppComponent][compareMenuItems]`;
    if (logalot) { console.log(`${lc}`); }
    return a && b ? a.title === b.title : a === b;
  }

  /**
   * Fires when the user chooses a different root to activate
   * from the dropdown ion-select in the Roots menu.
   *
   * @param e
   * @returns
   */
  async handleRootChange(e: any): Promise<void> {
    const lc = `${this.lc}[${this.handleRootChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} triggered...`) };
      if (!e.detail.value) {
        throw new Error(`e.detail.value (root selected) falsy`)
        return;
      }
      let rootItem: MenuItem = e.detail.value;
      if (logalot) { console.log(`${lc} selected rootItem: ${h.pretty(rootItem)}`) };

      let resRootIbGib = await this.common.ibgibs.get({ addr: rootItem.addr });
      if (resRootIbGib?.success && resRootIbGib.ibGibs?.length === 1) {
        let rootIbGib = <IbGib_V1<RootData>>resRootIbGib.ibGibs[0];
        let rootIbGibAddr = h.getIbGibAddr({ ibGib: rootIbGib });
        let latestRootAddr = await this.common.ibgibs.getLatestAddr({ ibGib: rootIbGib });
        if (latestRootAddr !== rootIbGibAddr) {
          if (logalot) { console.log(`${lc} latest exists. latestRootAddr: ${latestRootAddr}`); }
          resRootIbGib = await this.common.ibgibs.get({ addr: latestRootAddr });
          if (!resRootIbGib.success || resRootIbGib.ibGibs?.length !== 1) { throw new Error(`latest rootIbgib addr could not be gotten: ${latestRootAddr}`); }
          rootIbGib = <IbGib_V1<RootData>>resRootIbGib.ibGibs[0];
          rootIbGibAddr = h.getIbGibAddr({ ibGib: rootIbGib });
          rootItem = await this.getRootItem(rootIbGibAddr);
        }
        await this.common.ibgibs.setCurrentRoot({ root: rootIbGib });
        this.currentRoot = rootItem;
        // // debug
        // let graph = await this.common.ibgibs.getDependencyGraph({ibGib: rootIbGib});
        // console.log(`${lc} graph.keys.length: ${Object.keys(graph).length}`);
      } else {
        throw new Error(`Could not get currentRoot ibGib (?). rootItem selected: ${h.pretty(rootItem)}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  /**
   * Bring this ibgib to the attention of an Abot.
   */
  async handleRobbotsClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleRobbotsClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.menu.close();
      const ibGib =
        await this.common.ibgibs.getSpecialIbGib({ type: 'robbots' });
      await this.go({
        toAddr: h.getIbGibAddr({ ibGib }),
        fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      });
      //
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateMenu_Robbots(): Promise<void> {
    const lc = `${this.lc}[${this.updateMenu_Robbots.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const robbotMenuItems: MenuItem[] = [];

      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 5fd759510e584cb69b232259b891cca1)`); }
        await h.delay(100);
      }

      // load robbots if needed
      if (!this.robbotsAddr) {
        if (logalot) { console.log(`${lc} this.robbotsAddr falsy`); }
        await this.loadRobbotsAddrAndGetRobbotsIbGib();
      }

      // get robbots, but don't initialize
      let robbotsIbGib = await this.common.ibgibs.getSpecialIbGib({ type: "robbots" });
      let robbotAddrs = robbotsIbGib?.rel8ns ?
        robbotsIbGib.rel8ns[c.ROBBOT_REL8N_NAME] ?? [] :
        [];

      // return if we don't have any robbots.
      if (!robbotAddrs || robbotAddrs.length === 0) {
        if (logalot) { console.log(`${lc} no robbots found. (I: e0dc2d290a9a9a5b812c1a88b01d2e22)`); }
        return; /* <<<< returns early */
      }

      // load individual robbot items
      for (let robbotAddr of robbotAddrs) {
        const robbotItem = await this.getRobbotItem(robbotAddr);
        if (robbotItem) { robbotMenuItems.push(robbotItem); }
      }

      // "load" them into the bound property and detect the changes
      this.robbotItems = robbotMenuItems;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.robbotItems = [];
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      setTimeout(() => this.ref.detectChanges());
    }

  }

  getErroredMenuItem(): MenuItem {
    return <MenuItem>{
      icon: 'alert-outline',
      title: '[errored...]',
      clickHandler: async (_) => {
        await getFnAlert()({ title: 'whoops', msg: 'there was a problem getting this menu item...' });
      },
    };
  }

  getMenuItem({
    text,
    icon,
    ibGib,
    addr,
  }: {
    text: string,
    icon: string,
    ibGib?: IbGib_V1,
    addr?: IbGibAddr,
  }): MenuItem {
    const lc = `${this.lc}[${this.getMenuItem.name}]`;
    let item = this.getErroredMenuItem();
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!text) { throw new Error(`text required (E: 099fdb238e11e3191d9e9b72d981fe22)`); }
      if (!icon) { throw new Error(`icon required (E: d34a25bab2adf837eed2c274e7fc2322)`); }
      if (!ibGib && !addr) { throw new Error(`either ibGib or addr required (E: 522c94e9a3bf2c847aa0851e9cdd9122)`); }
      addr = addr || h.getIbGibAddr({ ibGib });
      item = {
        title: text.substring(0, c.MENU_ITEM_IB_SUBSTRING_LENGTH),
        icon,
        clickHandler: async (item: MenuItem) => {
          this.menu.close();
          await this.go({
            toAddr: item.addr,
            fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
          });
        },
        addr,
      }
      if (logalot) { console.log(`${lc} ${h.pretty(item)}`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
    return item;
  }

  async getRobbotItem(addr: IbGibAddr): Promise<MenuItem> {
    const lc = `${this.lc}[${this.getRobbotItem.name}]`;
    let item: MenuItem;
    try {
      const resGet = await this.common.ibgibs.get({ addr });
      if (resGet.success && resGet.ibGibs?.length === 1) {
        const ibGib = resGet.ibGibs![0];
        if (ibGib?.ib && ibGib.gib && ibGib.data) {
          const icon = ibGib.data.icon || c.DEFAULT_ROBBOT_ICON;
          const text = ibGib.data.name || ibGib.data.text || ibGib.ib;
          item = this.getMenuItem({ text, icon, addr });
        } else {
          throw new Error(`Invalid ibgib gotten (E: 91c4521f1f734a00a5c94bb26ec8c56f)`);
        }
      } else {
        throw new Error(resGet.errorMsg || `error getting ${addr} (E: 81eea23337e045f0a4887b7e049f36d9)`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      item = this.getErroredMenuItem();
    }

    return item;
  }

  getSpaceTooltip(spaceType: string, spaceItem: MenuItem): string {
    return `${spaceType} ${spaceItem.title}`;
  }


  async handleGotoSpecial(type: SpecialIbGibType | 'bootstrap'): Promise<void> {
    const lc = `${this.lc}[${this.handleGotoSpecial.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      let specialAddr: IbGibAddr;
      if (type === 'bootstrap') {
        specialAddr = c.BOOTSTRAP_IBGIB_ADDR;
      } else {
        // other special ibgib
        const specialIbGib = await this.common.ibgibs.getSpecialIbGib({ type });
        specialAddr = h.getIbGibAddr({ ibGib: specialIbGib });
      }
      if (specialAddr !== this.addr) {
        await this.menu.close();
        await this.go({
          toAddr: specialAddr,
          fromAddr: this.addr,
        });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAddTag(): Promise<void> {
    const lc = `${this.lc}[${this.handleAddTag.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.addingTag) { throw new Error(`(UNEXPECTED) already adding tag...shouldn't get here (E: 7e3f197b1e8b67af8304242641585e22)`); }
      this.addingTag = true;
      await createNewTag(this.common);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.addingTag = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAddRobbot(): Promise<void> {
    const lc = `${this.lc}[${this.handleAddRobbot.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      await this.menu.close();
      if (this.addingRobbot) { throw new Error(`(UNEXPECTED) already adding tag...shouldn't get here (E: 16304ec9c66947768db2298827240e95)`); }
      this.addingRobbot = true;

      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });

      await createNewRobbot({ common: this.common, space });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.addingRobbot = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_Welcome(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Welcome.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 609d93f81c2caeae934c488e6bd86622)`); }

      await this.menu.close();

      // we've gone through the entire welcome screen (not tl;dr skipping)
      await Storage.remove({ key: 'welcomeShown' });

      // const
      let url = new URL(window.location.toString());
      let currentRawLocation = url.pathname.split('/');
      if (currentRawLocation.length > 0) {
        // if the first bit is an empty string, drop it.
        if (currentRawLocation[0] === '') { currentRawLocation = currentRawLocation.slice(1); }
      } else {
        currentRawLocation = ['welcome'];
      }
      this.common.nav.go({
        toRawLocation: ['welcome'],
        fromRawLocation: currentRawLocation,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
