import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { createNewApp } from '../helper/app';
import { IbGibAppAny } from '../witnesses/apps/app-base-v1';
import { AppIbGib_V1 } from '../types/app';
import { isError } from '../helper/error';
import { ErrorIbGib_V1 } from '../types/error';
import { IonSelect } from '@ionic/angular';

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

  @Input()
  selectedAppName: string;

  @Input()
  selectedApp: AppIbGib_V1;

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

  @Output()
  appSelected = new EventEmitter<AppIbGib_V1>();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,

  ) {
    super(common, ref);
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
  }: {
    appAddr: IbGibAddr,
  }): Promise<void> {
    const lc = `${this.lc}[${this.selectApp.name}]`;
    try {
      // delete this.selectedApp;
      if (logalot) { console.log(`${lc} starting... (I: b8a84271414d46b28008a1a7268b64be)`); }
      if ((this.apps ?? []).length === 0) { await this.updateApps(); }
      if ((this.apps ?? []).length === 0) { throw new Error(`app selected but this.apps is falsy/empty even after updating (E: 39dad954e37642568ab5f2ca08326612)`); }
      let appToSelect: AppIbGib_V1;
      for (let i = 0; i < this.apps.length; i++) {
        const app = this.apps[i];
        const appAddrs = [
          h.getIbGibAddr({ ibGib: app }),
          ...(app.rel8ns?.past ?? [])
        ];
        if (appAddrs.includes(appAddr)) {
          appToSelect = app;
          break;
        }
      }
      if (!appToSelect) { throw new Error(`appAddr (${appAddr}) not found among apps. (E: c7124fff5628412f907825a6d1fa997b)`); }
      this.selectedApp = appToSelect;
      this.selectedAppName = appToSelect?.data?.name;

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
        this.selectedAppName = this.apps[0].data.name;
      } else {
        this.appNames = [];
        delete this.selectedAppName;
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
          this.selectedApp = appIbGib;
          console.log(`new app selected. (I: eb3a8ca5a54a4fc8915931bd3ed19c8e)`);
          this.selectedAppName = appIbGib.data.name ?? appIbGib.ib;
          this.appSelected.emit(h.clone(appIbGib));
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