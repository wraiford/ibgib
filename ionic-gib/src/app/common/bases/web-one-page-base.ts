import { ChangeDetectorRef, Injectable, Input, OnDestroy, OnInit } from "@angular/core";
import { Storage } from "@capacitor/storage";

import * as c from '../constants';
import { CommonService } from '../../services/common.service';


const logalot = c.GLOBAL_LOG_A_LOT || false;

@Injectable()
export abstract class WebOnePageBase implements OnInit, OnDestroy {

  protected lc: string = `[${WebOnePageBase.name}]`;

  @Input()
  accepted: boolean;

  /**
   * if true, the user has already initialized a local space and we don't
   * need to navigate to the welcome page after accepting.
   *
   * if false, then when the user accepts, we should navigate to the welcome
   * page. (also if false, the main menu should be hidden)
   *
   */
  @Input()
  alreadyHasLocalSpace: boolean;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {

  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 7d29c2c4ca444cc59828ef3b3f847620)`); }

      // check if the user has accepted
      let resGet = await Storage.get({ key: c.STORAGE_KEY_APP_USES_STUFF });
      this.accepted = resGet?.value === 'accepted';

      // check if user already has a local space
      this.common.ibgibs.initialized$.subscribe(() => {
        this.alreadyHasLocalSpace = true;
      });

      document.title = this.getDocumentTitle();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async ngOnDestroy(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 772dd39c3b8d3d37f21d812162d18322)`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  abstract getDocumentTitle(): string;
}
