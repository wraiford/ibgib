import {
  Component, OnInit, ChangeDetectorRef,
  Input, ViewChild, AfterViewInit, EventEmitter, Output, ElementRef,
} from '@angular/core';
import { IonInput, IonText, IonTextarea } from '@ionic/angular';
import { Capacitor, FilesystemDirectory, FilesystemEncoding, Plugins } from '@capacitor/core';
const { Modals, Clipboard, Storage, LocalNotifications } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult, V1 } from 'ts-gib';
import { IbGibRel8ns_V1, IbGib_V1, isDna, isPrimitive } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { ActionItem, ActionItemName } from '../types/ux';
import { createPicAndBinIbGibsFromInputFilePickedEvent } from '../helper/pic';
import { createCommentIbGib } from '../helper/comment';
import { createLinkIbGib } from '../helper/link';
import { getFnAlert, getFnPrompt } from '../helper/prompt-functions';
import { getFromSpace, getDependencyGraph, putInSpace } from '../helper/space';
import { validateIbGibAddr, validateIbGibIntrinsically } from '../helper/validate';
import { PicIbGib_V1 } from '../types/pic';
import { BinIbGib_V1 } from '../types/bin';
import { RawExportIbGib_V1 } from '../types/import-export';
import { getTimelinesGroupedByTjp, } from '../helper/ibgib';


const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-command-bar',
  templateUrl: './command-bar.component.html',
  styleUrls: ['./command-bar.component.scss'],
})
export class CommandBarComponent
  extends IbgibComponentBase
  implements OnInit {

  protected lc = `[${CommandBarComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "22px" : "0px"
  public debugBorderColor: string = "#FFAABB";
  public debugBorderStyle: string = "solid";

  /**
   * Number of tjp timelines that have updates in outer space(s).
   */
  @Input()
  tjpUpdatesAvailableCount_Local: number = 0;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async ngOnInit(): Promise<void> {
    if (logalot) { console.log(`${this.lc} addr: ${this.addr}`); }
    await super.ngOnInit();
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.updateCommands();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async updateCommands(): Promise<void> {
    const lc = `${this.lc}[${this.updateCommands.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 096e74b5bd7c267c029e6ce9a0db0622)`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
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
}
