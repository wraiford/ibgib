import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { IonSelect } from '@ionic/angular';
import { Storage } from '@capacitor/storage';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../../constants';
import { CommonService } from '../../../services/common.service';
import { IbgibComponentBase } from '../../bases/ibgib-component-base';
import { createNewApp } from '../../helper/app';
import { IbGibAppAny } from '../../witnesses/apps/app-base-v1';
import { AppIbGib_V1 } from '../../types/app';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-app-bar',
  templateUrl: './app-bar.component.html',
  styleUrls: ['./app-bar.component.scss'],
})
export class AppBarComponent extends IbgibComponentBase implements OnInit {
  protected lc: string = `[${AppBarComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#AFC590";
  public debugBorderStyle: string = "solid";

  @Input()
  appNames: string[] = [];

  _selectedApp: AppIbGib_V1;
  @Input()
  get selectedApp(): AppIbGib_V1 { return this._selectedApp; }
  set selectedApp(value: AppIbGib_V1) {
    // this.appSelected.emit(h.clone(appIbGib));
    if (!value && !this._selectedApp) { return; /* <<<< returns early */ }
    if (value) {
      if (this._selectedApp) {
        if (this._selectedApp.data.uuid === value.data.uuid) {
          // it's the same app, so just update the value but don't emit
          // appSelected event
          this._selectedApp = value;
        } else {
          // it's a different app, so emit
          this._selectedApp = value;
          this.appSelected.emit(h.clone(value));
        }
      } else {
        this._selectedApp = value;
        this.appSelected.emit(h.clone(value));
      }
    } else {
      this.appSelected.emit(null);
    }
  }

  @Input()
  addingApp: boolean;

  apps: AppIbGib_V1[];

  private _selectedAppAddr: IbGibAddr;
  @Input()
  get selectedAppAddr(): IbGibAddr { return this._selectedAppAddr; }
  set selectedAppAddr(value: IbGibAddr) {
    if (value !== this._selectedAppAddr) {
      this._selectedAppAddr = value;
      this.selectApp({ appAddr: value }); // spins off
    }
  }

  @Input()
  // get appUniqueId(): string { return this.common.ibgibs.instanceId; }
  appUniqueId: string;

  get lastAppStorageKey(): string {
    const lc = `${this.lc}[lastAppStorageKey]`;
    if (!this.appUniqueId) {
      console.warn(`${lc} appUniqueId not set... (W: 795736a7baf64e09a23ae157d62cd7fb)`);
    }
    return c.SIMPLE_CONFIG_KEY_APP_SELECTED + this.appUniqueId;
  }

  @ViewChild('appName')
  appNameIonSelect: IonSelect;

  @Output()
  appSelected = new EventEmitter<AppIbGib_V1>();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,

  ) {
    super(common, ref);
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: e8ea3c75930815e1a463c04d8f4ffc22)`); }
      this.appUniqueId = await h.getUUID();
      await super.ngOnInit();
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
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
      await this.updateApps();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async selectApp({
    appAddr,
    appId,
    appClassname,
  }: {
    appAddr?: IbGibAddr,
    appId?: string,
    /**
     * If given, will select the first app found of this classname if the given `appId` is not found.
     *
     * ## notes
     *
     * this is useful for when the link comes from one person who has one
     * reified app and they share the link with another space (maybe their own
     * space, maybe another person/entity's space). If it didn't have this
     * fallback, then we wouldn't be able to specify the particular app instance.
     */
    appClassname?: string,
  } = {}): Promise<void> {
    const lc = `${this.lc}[${this.selectApp.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: b8a84271414d46b28008a1a7268b64be)`); }
      if ((this.apps ?? []).length === 0) { await this.updateApps(); }
      if ((this.apps ?? []).length === 0) { throw new Error(`app selected but this.apps is falsy/empty even after updating (E: 39dad954e37642568ab5f2ca08326612)`); }

      /** this is the app that we're going to select */
      let appToSelect: AppIbGib_V1;

      // if (!appAddr && !appId) { throw new Error(`either appAddr or appId required (E: b76cd780668836e6abac4b16e35d4522)`); }
      if (!appAddr && !appId && !appClassname) {
        if (logalot) { console.log(`${lc} addr, id nor classname provided. selecting any (first) app. (I: d63c23cc9372f43a5316b70362248f22)`); }
        appToSelect = this.apps[0];
      }

      /** * we will adjust this predicate depending on situation */
      let fnPredicate: (app: AppIbGib_V1) => boolean;

      // first check by either id or address as these are most specific
      if (!appToSelect && (appAddr || appId)) {

        fnPredicate = appAddr ?
          // match by app address
          (app: AppIbGib_V1) =>
            [h.getIbGibAddr({ ibGib: app }), ...(app.rel8ns?.past ?? [])].includes(appAddr) :
          // match by app id
          (app: AppIbGib_V1) => app.data?.uuid === appId;

        for (let i = 0; i < this.apps.length; i++) {
          const app = this.apps[i];
          if (fnPredicate(app)) { appToSelect = app; break; }
        }
      }

      // if we didn't find a matching app, try by classname if given
      if (!appToSelect && appClassname) {
        fnPredicate =
          (app: AppIbGib_V1) => app.data?.classname === appClassname;
        for (let i = 0; i < this.apps.length; i++) {
          const app = this.apps[i];
          if (fnPredicate(app)) { appToSelect = app; break; }
        }
      }

      // if we still didn't find an app, just select the first one.
      if (!appToSelect) {
        if (logalot) { console.log(`${lc} no corresponding app found. Selecting any app (first one) (I: 009ab833faac9e791dfb431c32213c22)`); }
        appToSelect = this.apps[0];
      }

      this.selectedApp = appToSelect;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateApps(): Promise<void> {
    const lc = `${this.lc}[${this.updateApps.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.apps = await this.common.ibgibs.getAppAppIbGibs({ createIfNone: false }) ?? [];
      if (this.apps?.length > 0) {
        this.appNames = this.apps.map(r => r.data.name);
        // if (!this.selectedApp && loadLastSelected) {
        //   let lastSelectedAppId = (await Storage.get({ key: this.lastAppStorageKey }))?.value;
        //   if (lastSelectedAppId && this.apps.some(x => x.data?.uuid === lastSelectedAppId)) {
        //     this.selectedApp = this.apps.filter(x => x.data?.uuid === lastSelectedAppId)[0];
        //   } else {
        //     this.selectedApp = this.apps[0];
        //   }
        // }
      } else {
        this.appNames = [];
      }

      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAppSelectChange(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleAppSelectChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: a6a021ab0fe7477083fd576a5f4f8ba8)`); }
      const appIbGib = event?.detail?.value;

      if (appIbGib) {
        if (logalot) { console.log(`${lc} appIbGib: ${h.pretty(appIbGib)} (I: 0d51d40ed20a400390bc67f61a5646db)`); }
        if (!appIbGib.data.uuid) { throw new Error(`invalid app data. uuid required (E: 395428787001407d90ccea81ac900e9e)`); }

        if (this.selectedApp?.data.uuid !== appIbGib.data.uuid) {
          console.log(`new app selected. (I: eb3a8ca5a54a4fc8915931bd3ed19c8e)`);
          await Storage.set({ key: this.lastAppStorageKey, value: appIbGib.data.uuid });
          this.selectedApp = appIbGib; // emits appSelected event
        } else {
          if (logalot) { console.log(`${lc} same app selected (I: 18e45c4819dc4a4c8cc20c1b138b59e3)`); }
        }
      } else {
        // none selected
        if (logalot) { console.log(`${lc} none selected? (I: 112a4968f4484191a60ed2154670ac6f)`); }
        if (this.selectedApp) {
          delete this.selectedApp;
          this.appSelected.emit(null)
        }
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAddApp(): Promise<void> {
    const lc = `${this.lc}[${this.handleAddApp.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.addingApp) { throw new Error(`(UNEXPECTED) already adding tag...shouldn't get here (E: a0d25009e2e046f99b61efec9a33088c)`); }
      this.addingApp = true;

      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });

      await createNewApp({ common: this.common, space });
      await this.updateApps();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.addingApp = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  async getSelectedApp_IbGibOnly(): Promise<AppIbGib_V1> {
    const lc = `${this.lc}[${this.getSelectedApp_IbGibOnly.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.ibGib) { throw new Error(`this.ibGib required (E: 49b59d21dea049f09a2a32242835a8bf)`); }
      if (!this.selectedApp) { throw new Error(`(UNEXPECTED) selectedApp should be truthy if this function is accessible. (E: 76ef98c278514f85997faa562c2a5db9)`); }
      if ((this.apps ?? []).length === 0) { throw new Error(`(UNEXPECTED) this.apps should be truthy if this function is accessible. (E: 42592fe8faf9488facfc2e7387205b7d)`); }

      return this.selectedApp;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async getSelectedApp_FullWitness(): Promise<IbGibAppAny> {
    const lc = `${this.lc}[${this.getSelectedApp_FullWitness.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const appIbGib = await this.getSelectedApp_IbGibOnly();

      if (logalot) { console.log(`${lc} calling app.witness (uuid: ${appIbGib.data.uuid}) on this.ibGib (${this.addr})  (I: 67dac526385343bfb9faca916366db6d)`); }
      const name: string = appIbGib.data.classname;
      const factory = this.common.factories.getFactory({ name });
      const appWitness = <IbGibAppAny>(await factory.newUp({})).newIbGib;
      await appWitness.loadIbGibDto(appIbGib);

      return appWitness;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAppGoto(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleAppGoto.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      event.stopImmediatePropagation();
      event.stopPropagation();

      const ibGib = await this.getSelectedApp_IbGibOnly();
      const addr = h.getIbGibAddr({ ibGib });
      await this.go({
        toAddr: addr,
        fromAddr: this.addr,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
