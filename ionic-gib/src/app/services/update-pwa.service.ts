import { ApplicationRef, Injectable } from '@angular/core';
import { SwUpdate, UpdateAvailableEvent, VersionDetectedEvent, VersionEvent, VersionReadyEvent } from '@angular/service-worker';
import { concat, interval, Observable, ReplaySubject, Subscription } from 'rxjs';
import { first } from 'rxjs/operators';

import * as c from '../common/constants';


const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * For use in updating the PWA when there is a new version.
 *
 * https://angular.io/guide/service-worker-communications
 */
@Injectable({
  providedIn: 'root'
})
export class UpdatePwaService {

  protected lc: string = `[${UpdatePwaService.name}]`;

  private _subCheckForUpdates: Subscription;
  private _subVersionUpdates: Subscription;

  private _initializedSubj = new ReplaySubject<boolean>();
  public initialized$ = this._initializedSubj.asObservable();

  constructor(
    private appRef: ApplicationRef,
    private updates: SwUpdate
  ) {
    // this.initialize()
    //   .then(() => {
    //     this._initializedSubj.next(true);
    //     this._initializedSubj.complete();
    //   })
    //   .catch((e) => this._initializedSubj.error(e)); // spins off
  }

  async initialize(): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 61d0b1502fa3ba29566a03b5ea235322)`); }
      await this.init_VersionUpdates();
      await this.init_StartPollingForUpdates();
      this.updates.checkForUpdate();

      this._initializedSubj.next(true);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // this._initializedSubj.next(false);
      this._initializedSubj.error(error);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * https://angular.io/guide/service-worker-communications#checking-for-updates
   */
  async init_StartPollingForUpdates(): Promise<void> {
    const lc = `${this.lc}[${this.init_StartPollingForUpdates.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: a1140ccac30720999797176a5f734d22)`); }

      // Allow the app to stabilize first, before starting
      // polling for updates with `interval()`.
      const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));
      const everySixHours$ = interval(6 * 60 * 60 * 1000);
      const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

      this._subCheckForUpdates =
        everySixHoursOnceAppIsStable$.subscribe(() => this.updates.checkForUpdate());

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  /**
   * https://angular.io/guide/service-worker-communications#version-updates
   */
  async init_VersionUpdates(): Promise<void> {
    const lc = `${this.lc}[${this.init_VersionUpdates.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 757eda019a0d6336e540e124e0b1b122)`); }
      this._subVersionUpdates = this.updates.versionUpdates.subscribe(async (evt: VersionEvent) => {
        const lc_Update = `${lc}[versionUpdates]`;
        console.log(`${lc_Update} starting...`);
        try {
          switch (evt.type) {
            case 'VERSION_DETECTED':
              console.log(`${lc_Update} Downloading new app version: ${evt.version.hash}`);
              break;
            case 'VERSION_READY':
              await this.handleVersionReady(evt);
              break;
            case 'VERSION_INSTALLATION_FAILED':
              throw new Error(`Failed to install app version '${evt.version.hash}': ${evt.error} (E: c2fbe27e7e574283835100b73b683722)`);
          }
        } catch (error) {
          console.error(`${lc_Update} ${error.message}`);
          throw error;
        } finally {
          console.log(`${lc_Update} complete.`);
        }
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  private async handleVersionReady(evt: VersionReadyEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleVersionReady.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 22f9d99be1cf6985a598afaae5bc7622)`); }

      // always log this (not just logalot)
      console.log(`${lc} Current app version: ${evt.currentVersion.hash}`);
      console.log(`${lc} New app version ready for use: ${evt.latestVersion.hash}`);

      if (await this.promptUser()) {
        await this.updates.activateUpdate();
        document.location.reload();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  private async promptUser(): Promise<boolean> {
    const lc = `${this.lc}[${this.promptUser.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: ce45b22b345a50e0c25ca9f71ba38c22)`); }
      return true;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
