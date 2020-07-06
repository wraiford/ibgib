import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Plugins} from '@capacitor/core';
const { Storage } = Plugins;

import { IbgibComponentBase } from './common/bases/ibgib-component-base';
import { FilesService } from './services/files.service';
import { IbGib_V1, GIB, Rel8n, ROOT, IB, ROOT_ADDR } from 'ts-gib/dist/V1';
import { getIbGibAddr, pretty, hash } from 'ts-gib/dist/helper';
import { Factory_V1 as factory } from 'ts-gib/dist/V1/factory';
import { TagData } from './common/types';
import { CommonService } from './services/common.service';
import { IbGibAddr } from 'ts-gib';
import { TAGS_IBGIB_ADDR_KEY } from './common/constants';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent extends IbgibComponentBase
  implements OnInit {
  public selectedIndex = 0;
  public appPages = [
    {
      title: 'Home',
      url: '/ibgib/Home',
      icon: 'home'
    },
    {
      title: 'Favorites',
      url: '/ibgib/Favorites',
      icon: 'heart'
    },
  ];
  public tags = ['liked', 'todo', 'garden', 'plant', 'bot-dry'];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);

    this.initializeApp();
  }

  initializeApp() {
    const lc = `${this.lc}[${this.initializeApp.name}]`;

    this.platform.ready().then(async () => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();

      const tagsAddr = (await Plugins.Storage.get({key: TAGS_IBGIB_ADDR_KEY})).value;
      if (!tagsAddr) {
        console.log(`${lc} First time run. Loading tags...`)
        await this.loadTags();
      }
    });
  }

  ngOnInit() {
    const path = window.location.pathname.split('ibgib/')[1];
    console.log(`path: ${path}`);
    if (path !== undefined) {
      this.selectedIndex =
        this.appPages.findIndex(page => page.title.toLowerCase() === path.toLowerCase());
    }
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
    const tags = await this.common.ibgibs.getTagsIbgib({initialize: true});
    const tagsAddr = getIbGibAddr({ibGib: tags});
    await this.updateIbGib(tagsAddr);
    await this.loadIbGib();

    await this.navTo({addr: tagsAddr});
  }
}
