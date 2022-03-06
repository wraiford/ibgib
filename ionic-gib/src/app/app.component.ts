import { Component, OnInit, ChangeDetectorRef, Input, OnDestroy } from '@angular/core';
import { NavigationEnd, Router, } from '@angular/router';
import { MenuController, Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Subscription } from 'rxjs';
import { concatMap, filter } from 'rxjs/operators';

import { IbGibAddr, TransformResult, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import { IbgibComponentBase } from './common/bases/ibgib-component-base';
import { CommonService } from './services/common.service';
import * as c from './common/constants';
import { EncryptionData_V1, OuterSpaceIbGib, RootData, SecretIbGib_V1, TagData, } from './common/types';
import { CreateSecretModalComponent } from './common/create-secret-modal/create-secret-modal.component';
import { CreateOuterspaceModalComponent } from './common/create-outerspace-modal/create-outerspace-modal.component';
import { CreateEncryptionModalComponent } from './common/create-encryption-modal/create-encryption-modal.component';
import { getFn_promptCreateEncryptionIbGib, getFn_promptCreateOuterSpaceIbGib, getFn_promptCreateSecretIbGib } from './common/helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;

interface MenuItem {
  title: string;
  url: string;
  icon: string;
  addr?: IbGibAddr;
}

@Component({
  selector: 'app-root',
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
  }

  @Input()
  spaceItems: MenuItem[] = [];

  _currentSpace: MenuItem;
  @Input()
  get currentSpace(): MenuItem {
    const lc = `${this.lc}[get currentSpace]`;
    if (logalot) { console.log(`${lc} this._currentSpace: ${h.pretty(this._currentSpace)}`); }
    return this._currentSpace;
  }
  set currentSpace(value: MenuItem) {
    const lc = `${this.lc}[set currentSpace]`;
    if (logalot) { console.log(`${lc} value: ${h.pretty(value)}`); }
    this._currentSpace = value;
  }

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

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
  private _subTagsUpdateTEST: Subscription;

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

  private _spacesAddr: IbGibAddr;
  @Input()
  get spacesAddr(): IbGibAddr { return this._spacesAddr; }
  set spacesAddr(value: IbGibAddr) {
    const lc = `${this.lc}[set spacesAddr]`;
    if (value !== this._spacesAddr) {
      if (logalot) { console.log(`${lc} updating spacesAddr: ${value}`); }
      this._spacesAddr = value;
      this.ref.detectChanges();
    }
  }

  private _paramMapSub_App: Subscription;

  /**
   * Used in binding to the routerLink anchor in the app menu
   */
  get tagsUrl(): string { return `/ibgib/${this.tagsAddr}`; }

  /**
   * Used in binding to the routerLink anchor in the app menu
   */
  get rootsUrl(): string { return `/ibgib/${this.rootsAddr}`; }

  /**
   * Used in binding to the routerLink anchor in the app menu
   */
  get spacesUrl(): string { return `/ibgib/${this.spacesAddr}`; }

  @Input()
  initializing: boolean;

  @Input()
  menuOpen: string = 'tags';

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private router: Router,
    public menu: MenuController,
  ) {
    super(common, ref);

    this.initializeApp();
  }

  async initializeApp(): Promise<void> {
    const lc = `${this.lc}[${this.initializeApp.name}]`;

    if (logalot) { console.log(`${lc} starting...`); }
    this.initializing = true;
    this.platform.ready().then(async () => {
      this.statusBar.styleDefault();

      let navToAddr: IbGibAddr; //= 'hmm something went wrong^gib';

      try {
        if (this.initializing) {
          if (logalot) { console.log(`${lc} this.initializing is truthy`); }
        } else {
          if (logalot) { console.log(`${lc} this.initializing is falsy`); }
        }
        // make sure the service is initialized FIRST before any
        // other ibgib happenings
        if (logalot) { console.log(`${lc} wakka calling IbgibsService.initialize...`); }
        await this.common.ibgibs.initialize({
          fnPromptSecret: getFn_promptCreateSecretIbGib(this.common),
          fnPromptEncryption: getFn_promptCreateEncryptionIbGib(this.common),
          fnPromptOuterSpace: getFn_promptCreateOuterSpaceIbGib(this.common),
        });

        if (logalot) { console.log(`${lc} doodle IbgibsService.initialize returned.`); }

        if (!this.item) { this.item = {} }
        this.item.isMeta = true;

        // these are AppComponent-specific initializations
        await this.initializeMyRoots();
        await this.initializeMyTags();

        let addr = await this.getCurrentIbgibAddrInURL();
        if (!addr || addr === 'ib^gib') {
          navToAddr = this.tagsAddr;
        } else {
          this.initializing = false;
          await this.updateIbGib(addr);
        }

        // navToAddr = this.tagsAddr;
        this.platform.backButton.subscribeWithPriority(10, async () => {
          if (this.common?.nav) { await this.common.nav.back(); }
        });

      } catch (error) {
        console.error(`${lc} ${error.message}`);
        console.error(`${lc} debug create here`);
        // await this.common.ibgibs.promptCreateOuterSpaceIbGib();
        // await this.promptCreateSecretIbGib();
      } finally {
        this.initializing = false;
        this.splashScreen.hide();
        if (navToAddr) {
          await this.go({
            toAddr: navToAddr,
            fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
          });
        }
      }
    });

    if (logalot) { console.log(`${lc} complete. waiting for platform.ready...`); }
  }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {
      this.subscribeParamMap();
      super.ngOnInit();
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

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    this.unsubscribeParamMap();
    if (logalot) { console.log(`${lc} doodle`); }
  }

  subscribeParamMap() {
    const lc = `${this.lc}[${this.subscribeParamMap.name}]`;

    if (logalot) { console.log(`${lc} subscribing...`) }

    let piper = this.router.events.pipe(filter(x => x instanceof NavigationEnd));
    this._paramMapSub_App = piper.subscribe(async (event: any) => {
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
    });

    // this.paramMapSub = this.router.events.subscribe(async (event: RouterEvent) => {

    //   const addr = this.router.url && this.router.url.startsWith('/ibgib/') ?
    //     decodeURI(this.router.url.split('/')[2]) :
    //     undefined;
    //   console.log(`${lc} addr: ${addr}`);
    //   console.log(`${lc} router.url: ${h.pretty(this.router.url)}`)
    //   if (event.id && event.url && addr && addr !== this.addr) {
    //     console.log(`${lc} event.id: ${event.id}`);
    //     console.log(`${lc} event.url: ${event.url}`);
    //     console.log(`${lc} addr is different`);
    //     await this.updateIbGib(addr);
    //     this.ref.detectChanges();
    //   }

    // });
  }

  unsubscribeParamMap() {
    if (this._paramMapSub_App) {
      this._paramMapSub_App.unsubscribe();
      delete this._paramMapSub_App;
    }
  }

  /**
   * Tags function in multiple roles, like bookmarks and indexes.
   *
   * We can load a single tags ibGib for our app, which acts as a way of
   * having a local index for the other meta ibGibs, which contain
   * information like settings/config.
   */
  async loadTagsAddrAndGetTagsIbGib(): Promise<IbGib_V1<TagData>> {
    const lc = `${this.lc}[${this.loadTagsAddrAndGetTagsIbGib.name}]`;
    if (logalot) { console.log(`${lc} getting tags addr`) }
    while (this.common.ibgibs.initializing) {
      if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 1a41f1e1a28748bc88f913780bd74b4f)`); }
      await h.delay(100);
    }
    const tagsIbGib = <IbGib_V1<TagData>>(
      await this.common.ibgibs.getSpecialIbgib({type: "tags"})
    );
    this.tagsAddr = h.getIbGibAddr({ibGib: tagsIbGib});
    return tagsIbGib;
  }

  /**
   * Initializes app components properties, NOT the actual special ibgib
   * on the ibgibs service. That should already be done.
   */
  async initializeMyRoots(): Promise<void> {
    const lc = `${this.lc}[${this.initializeMyRoots.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      // initializes with current ibgibs.localUserspace

      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: de1ca706872740b98dfce57a5a9da4d4)`); }
        await h.delay(100);
      }
      const rootsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "roots"});
      this.rootsAddr = h.getIbGibAddr({ibGib: rootsIbGib});
      const currentRootIbGib = await this.common.ibgibs.getCurrentRoot({});
      if (!currentRootIbGib) { throw new Error(`currentRoot not found(?)`); }
      if (!currentRootIbGib.data) { throw new Error(`currentRoot.data falsy (?)`); }
      let {icon, text, description} = currentRootIbGib.data;
      if (!icon) {
        console.warn(`${lc} root.icon not found. Using default.`);
        icon = c.DEFAULT_ROOT_ICON;
      }
      if (!text) {
        console.warn(`${lc} root.text not found. Using default.`);
        text = c.DEFAULT_ROOT_TEXT;
      }
      if (!description) {
        console.warn(`${lc} root.description not found. Using default.`);
        description = c.DEFAULT_ROOT_DESCRIPTION;
      }
      const addr = h.getIbGibAddr({ibGib: currentRootIbGib});

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
      // const tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags"});
      if (!tagsIbGib) { throw new Error(`tagsIbGib falsy. (E: 8e624b39bd34481a82be6efc521c24dc)`); }
      // this.tagsAddr = h.getIbGibAddr({ibGib: tagsIbGib});

      // subscribe to tags updates
      const tagsTjpIbGib =
        await this.common.ibgibs.getTjpIbGib({ibGib: tagsIbGib, naive: true});
      const tagsTjpAddr = h.getIbGibAddr({ibGib: tagsTjpIbGib});
      if (this._subTagsUpdate && !this._subTagsUpdate.closed) {
        this._subTagsUpdate.unsubscribe();
      }

      this._subTagsUpdateTEST = this.common.ibgibs.latestObs.subscribe(x => {
          if (logalot) { console.log(`${lc} TEST ibGib update heard. latestAddr: ${x.latestAddr}.`); }
      });
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
      await this.updateMenu_Tags();
      await this.updateMenu_Roots();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async updateMenu_Tags(): Promise<void> {
    const lc = `${this.lc}[${this.updateMenu_Tags.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const tagMenuItems: MenuItem[] = [];

      // load tags if needed
      if (!this.tagsAddr) {
        if (logalot) { console.log(`${lc} this.tagsAddr falsy`); }
        await this.loadTagsAddrAndGetTagsIbGib();
      }

      // get tags, but don't initialize
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 5fd759510e584cb69b232259b891cca1)`); }
        await h.delay(100);
      }
      let tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags"});
      let tagAddrs = tagsIbGib?.rel8ns?.tag || [];

      // if we have gotten the tags object and there are no associated individual
      // tags, try re-initializing with default tags.
      if (!tagAddrs || tagAddrs.length === 0) {
        if (logalot) { console.log(`${lc} couldn't get tagsIbGib?`); }
        tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags", initialize: true});
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
      const resGet = await this.common.ibgibs.get({addr});
      if (resGet.success && resGet.ibGibs?.length === 1) {
        const ibGib = resGet.ibGibs![0];
        if (ibGib?.ib && ibGib?.gib) {
          if (ibGib?.data?.icon && (ibGib?.data?.text || ibGib?.data?.tagText)) {
            const text = ibGib.data!.text || ibGib.data!.tagText;
            item = {
              title: text.substring(0, c.MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || c.DEFAULT_TAG_ICON,
              url: `/ibgib/${addr}`,
            }
            if (logalot) { console.log(`${lc} ${h.pretty(item)}`); }
          } else {
            console.warn(`${lc} loading non-standard tag`);
            item = {
              title: ibGib.ib.substring(0, c.MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || c.DEFAULT_TAG_ICON,
              url: `/ibgib/${addr}`,
            }
          }
        } else {
          throw new Error(`Invalid ibgib gotten`);
        }
      } else {
        throw new Error(resGet.errorMsg || `error getting ${addr}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
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
      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 8f261e9bc175463e88d173700b3797ed)`); }
        await h.delay(100);
      }
      let rootsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "roots"});
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
      rootMenuItems = [{title: 'hmm errored...', icon: 'bug-outline', url: '/ibgib/error^gib'}];
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
      const resGet = await this.common.ibgibs.get({addr});
      if (resGet.success && resGet.ibGibs?.length === 1) {
        const ibGib = resGet.ibGibs![0];
        if (ibGib?.ib && ibGib?.gib) {
          if (ibGib?.data?.icon && ibGib?.data?.text) {
            const text = ibGib.data!.text;
            item = {
              title: text.substring(0, c.MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || c.DEFAULT_ROOT_ICON,
              url: `/ibgib/${addr}`,
              addr,
            }
            if (logalot) { console.log(`${lc} ${h.pretty(item)}`); }
          } else {
            console.warn(`${lc} loading non-standard tag`);
            item = {
              title: ibGib.ib.substring(0, c.MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || c.DEFAULT_ROOT_ICON,
              url: `/ibgib/${addr}`,
              addr,
            }
          }
        } else {
          throw new Error(`Invalid ibgib gotten`);
        }
      } else {
        throw new Error(resGet.errorMsg || `error getting ${addr}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
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
      if (path.includes('?')) { path = path.slice(0,path.indexOf('?')); }

      let addr = path.startsWith('/ibgib/') ?
        decodeURI(path.split('/')[2]) :
        undefined;

      return addr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }

  compareRoots(a: MenuItem, b: MenuItem): boolean {
    const lc = `[${AppComponent.name}][compareRoots]`;
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
      if (logalot) { console.log(`${lc} triggered...`)};
      if (!e.detail.value) {
        throw new Error(`e.detail.value (root selected) falsy`)
        return;
      }
      let rootItem: MenuItem = e.detail.value;
      if (logalot) { console.log(`${lc} selected rootItem: ${h.pretty(rootItem)}`)};

      let resRootIbGib = await this.common.ibgibs.get({addr: rootItem.addr});
      if (resRootIbGib?.success && resRootIbGib.ibGibs?.length === 1) {
        let rootIbGib = <IbGib_V1<RootData>>resRootIbGib.ibGibs[0];
        let rootIbGibAddr = h.getIbGibAddr({ibGib: rootIbGib});
        let latestRootAddr = await this.common.ibgibs.getLatestAddr({ibGib: rootIbGib});
        if (latestRootAddr !== rootIbGibAddr) {
          if (logalot) { console.log(`${lc} latest exists. latestRootAddr: ${latestRootAddr}`); }
          resRootIbGib = await this.common.ibgibs.get({addr: latestRootAddr});
          if (!resRootIbGib.success || resRootIbGib.ibGibs?.length !== 1) { throw new Error(`latest rootIbgib addr could not be gotten: ${latestRootAddr}`); }
          rootIbGib = <IbGib_V1<RootData>>resRootIbGib.ibGibs[0];
          rootIbGibAddr = h.getIbGibAddr({ibGib: rootIbGib});
          rootItem = await this.getRootItem(rootIbGibAddr);
        }
        await this.common.ibgibs.setCurrentRoot({root: rootIbGib});
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

}
