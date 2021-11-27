import { Component, OnInit, ChangeDetectorRef, Input, OnDestroy } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Plugins} from '@capacitor/core';
const { Storage } = Plugins;

import { IbgibComponentBase } from './common/bases/ibgib-component-base';
import { getIbGibAddr, pretty } from 'ts-gib/dist/helper';
import { CommonService } from './services/common.service';
import { MENU_ITEM_IB_SUBSTRING_LENGTH, SPECIAL_URLS, DEFAULT_TAG_ICON, DEFAULT_ROOT_ICON, ROOT_REL8N_NAME } from './common/constants';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { ActivatedRoute, NavigationEnd, Router, RouterEvent } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';


interface MenuItem {
  title: string;
  url: string;
  icon: string;
  selected?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent extends IbgibComponentBase
  implements OnInit, OnDestroy {
  protected lc: string = `[${AppComponent.name}]`;

  tagItems: MenuItem[] = [];
  rootItems: MenuItem[] = [];

  _currentRoot: MenuItem;
  @Input()
  get currentRoot(): MenuItem { return this._currentRoot; }
  set currentRoot(value: MenuItem) { this._currentRoot = value; }

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
      console.log(`${lc} updating tagsAddr: ${value}`);
      this._tagsAddr = value;
      this.ref.detectChanges();
    }
  }

  private _rootsAddr: IbGibAddr;
  @Input()
  get rootsAddr(): IbGibAddr { return this._rootsAddr; }
  set rootsAddr(value: IbGibAddr) {
    const lc = `${this.lc}[set rootsAddr]`;
    if (value !== this._rootsAddr) {
      console.log(`${lc} updating rootsAddr: ${value}`);
      this._rootsAddr = value;
      this.ref.detectChanges();
    }
  }

  private paramMapSub_App: Subscription;

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) {
    super(common, ref);

    this.initializeApp();
  }

  initializeApp() {
    const lc = `${this.lc}[${this.initializeApp.name}]`;

    this.platform.ready().then(async () => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      let navToAddr: IbGibAddr = 'hmm something went wrong^gib';
      try {
        // make sure roots are initialized FIRST before any other ibgib happenings
        await this.common.ibgibs.initializeCurrentSpace();
        await this.initializeRoots();

        await this.initializeLatest();

        // tags
        const tagsKey = this.common.ibgibs.getSpecialStorageKey({type: "tags"});
        this.tagsAddr = (await Plugins.Storage.get({key: tagsKey})).value;
        if (!this.tagsAddr) {
          console.log(`${lc} First time run. Loading tags...`)
          await this.loadTags();
          this.ref.detectChanges();
        }
        await this.updateIbGib(this.tagsAddr);
        await this.loadIbGib();
        await this.loadTjp();
        await this.updateMenu();
        navToAddr = this.tagsAddr;
      } catch (error) {
        console.error(`${lc} ${error.message}`);
      } finally {
        await this.navTo({addr: navToAddr});
      }
    });
  }

  ngOnInit() {
    const lc = `${this.lc}[ngOnInit]`;
    this.subscribeParamMap();
    // const path = window.location.pathname.split('ibgib/')[1];
    // console.log(`path: ${path}`);
    // if (path !== undefined) {
    //   this.selectedIndex =
    //     this.menuItems.findIndex(page => page.title.toLowerCase() === path.toLowerCase());
    // }
  }

  ngOnDestroy() {
    this.unsubscribeParamMap();
  }

  /**
   * Tags function in multiple roles, like bookmarks and indexes.
   *
   * We can load a single tags ibGib for our app, which acts as a way of
   * having a local index for the other meta ibGibs, which contain
   * information like settings/config.
   */
  async loadTags(): Promise<void> {
    if (!this.item) { this.item = {} }
    this.item.isMeta = true;
    console.log(`getting tags addr`)
    const special = await this.common.ibgibs.getSpecialIbgib({type: "tags", initialize: true});
    this.tagsAddr = getIbGibAddr({ibGib: special});
  }

  get tagsUrl(): string {
    return `/ibgib/${this.tagsAddr}`;
  }

  get rootsUrl(): string {
    return `/ibgib/${this.rootsAddr}`;
  }


  async initializeRoots(): Promise<void> {
    const lc = `${this.lc}[${this.initializeRoots.name}]`;
    if (!this.item) { this.item = {} }
    this.item.isMeta = true;
    console.log(`${lc} getting...`);
    const special =
      await this.common.ibgibs.getSpecialIbgib({type: "roots", initialize: true});
    console.log(`${lc} gotten.`);
    this.rootsAddr = getIbGibAddr({ibGib: special});
    this.currentRoot = await this.getCurrentRoot();
  }

  async initializeLatest(): Promise<void> {
    const lc = `${this.lc}[${this.initializeLatest.name}]`;
    console.log(`${lc} getting...`);
    const special =
      await this.common.ibgibs.getSpecialIbgib({type: "latest", initialize: true});
    console.log(`${lc} gotten.`);
  }

  async getCurrentRoot(): Promise<MenuItem> {
    return null;
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
    const tagMenuItems: MenuItem[] = [];

    // load tags if needed
    if (!this.tagsAddr) { await this.loadTags(); }

    // get tags, but don't initialize
    let tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags"});
    let tagAddrs = tagsIbGib?.rel8ns?.tag || [];

    // if we have gotten the tags object and there are no associated individual
    // tags, try re-initializing with default tags.
    if (!tagAddrs || tagAddrs.length === 0) {
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
  }

  async getTagItem(addr: IbGibAddr): Promise<MenuItem> {
    const lc = `${this.lc}[${this.getTagItem.name}]`;
    let item: MenuItem;
    try {
      const resGet = await this.common.files.get({addr});
      if (resGet.success && resGet.ibGib) {
        const { ibGib } = resGet;
        if (ibGib?.ib && ibGib?.gib) {
          if (ibGib?.data?.icon && (ibGib?.data?.text || ibGib?.data?.tagText)) {
            const text = ibGib.data!.text || ibGib.data!.tagText;
            item = {
              title: text.substring(0, MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || DEFAULT_TAG_ICON,
              url: `/ibgib/${addr}`,
            }
            console.log(`${lc} ${pretty(item)}`);
          } else {
            console.warn(`${lc} loading non-standard tag`);
            item = {
              title: ibGib.ib.substring(0, MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || DEFAULT_TAG_ICON,
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

      // get tags, but don't initialize
      let rootsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "roots"});
      let rootAddrs = rootsIbGib?.rel8ns[ROOT_REL8N_NAME] || [];

      // we should have initialized with roots
      if (!rootAddrs || rootAddrs.length === 0) { throw new Error(`No associated rootAddrs to the roots ibGib. Should have been initialized with roots.`); }

      // load individual tag items
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
      const resGet = await this.common.files.get({addr});
      if (resGet.success && resGet.ibGib) {
        const { ibGib } = resGet;
        if (ibGib?.ib && ibGib?.gib) {
          if (ibGib?.data?.icon && (ibGib?.data?.text || ibGib?.data?.tagText)) {
            const text = ibGib.data!.text || ibGib.data!.tagText;
            item = {
              title: text.substring(0, MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || DEFAULT_ROOT_ICON,
              url: `/ibgib/${addr}`,
            }
            console.log(`${lc} ${pretty(item)}`);
          } else {
            console.warn(`${lc} loading non-standard tag`);
            item = {
              title: ibGib.ib.substring(0, MENU_ITEM_IB_SUBSTRING_LENGTH),
              icon: ibGib.data!.icon || DEFAULT_ROOT_ICON,
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
  subscribeParamMap() {
    let lc = `${this.lc}[${this.subscribeParamMap.name}]`;

    console.log(`${lc} subscribing...`)

    let piper = this.router.events.pipe(filter(x => x instanceof NavigationEnd));
    this.paramMapSub_App = piper.subscribe(async (event: any) => {
      // let e = <RouterEvent>evnt;
      // let addr = this.activatedRoute.root.firstChild.data['addr'];
      // console.log(`${lc} real address yo: ${addr}`);
      if (!this.router?.url) { return; }
      const addr = this.router.url && this.router.url.startsWith('/ibgib/') ?
        decodeURI(this.router.url.split('/')[2]) :
        undefined;
      console.log(`${lc} addr: ${addr}`);
      console.log(`${lc} router.url: ${pretty(this.router.url)}`)
      if (event.id && event.url && addr && addr !== this.addr) {
        console.log(`${lc} event.id: ${event.id}`);
        console.log(`${lc} event.url: ${event.url}`);
        console.log(`${lc} addr is different`);
        await this.updateIbGib(addr);
        this.ref.detectChanges();
      }
    });

    // this.paramMapSub = this.router.events.subscribe(async (event: RouterEvent) => {

    //   const addr = this.router.url && this.router.url.startsWith('/ibgib/') ?
    //     decodeURI(this.router.url.split('/')[2]) :
    //     undefined;
    //   console.log(`${lc} addr: ${addr}`);
    //   console.log(`${lc} router.url: ${pretty(this.router.url)}`)
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
    if (this.paramMapSub_App) {
      this.paramMapSub_App.unsubscribe();
      delete this.paramMapSub_App;
    }
  }
}
