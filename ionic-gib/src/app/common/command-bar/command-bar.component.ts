import {
  Component, OnInit, ChangeDetectorRef,
  Input, ViewChild, AfterViewInit, EventEmitter, Output, ElementRef,
} from '@angular/core';
import { IonInput, IonText, IonTextarea } from '@ionic/angular';
import { Capacitor, FilesystemDirectory, FilesystemEncoding, Plugins } from '@capacitor/core';
const { Modals, Clipboard, Storage, LocalNotifications } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult, V1 } from 'ts-gib';
import { IbGibRel8ns_V1, IbGib_V1, isDna, isPrimitive, Rel8n } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { ActionItem, ActionItemName, IbGibItem, IbGibTimelineUpdateInfo } from '../types/ux';
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


const logalot = c.GLOBAL_LOG_A_LOT || false || true;
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

  private debugInterval: any;

  /**
   * Number of tjp timelines that have updates in outer space(s).
   */
  @Input()
  tjpUpdatesAvailableCount_Local: number = 0;

  @Output()
  dismissMe = new EventEmitter<void>();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);

    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} addr: ${this.addr}`); }
    let previousHasContext: boolean;
    this.debugInterval = setInterval(() => {
      const hasContext = !!this.ibGib_Context;
      if (previousHasContext && !hasContext) { debugger; }
      console.log(`${lc} hasContext: ${hasContext}, previousHasContext: ${previousHasContext}`);
      previousHasContext = hasContext;
    }, 100);

  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 645b3e272dd6ed43c703ad8845cb5b22)`); }
      await super.ngOnInit();
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
      if (logalot) { console.log(`${lc} starting... (I: 5be3d9febce6afc68c26ab85f1cc2922)`); }
      if (this.debugInterval) {
        clearInterval(this.debugInterval);
        delete this.debugInterval;
      }
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
    try {
      let contextIbGib = this.ibGib_Context;
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.updateCommands();

      // reinstate the context ibgib...
      // major kluge here but I'm tired...
      if (this.updatingTimeline) {
        this.ibGib_Context = contextIbGib;
      }

    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (this.updatingTimeline) {
        delete this.updatingTimeline;
      }
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  private updatingTimeline = false;
  async updateIbGib_NewerTimelineFrame({
    latestAddr,
    latestIbGib,
    tjpAddr,
  }: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: f67a7a947bec4906b5a940d724a26891)`); }

      let hasContext = !!this.ibGib_Context;
      console.log(`${lc} hasContext before update newer timeline: ${hasContext}`);

      this.updatingTimeline = true;
      await super.updateIbGib_NewerTimelineFrame({
        latestAddr,
        latestIbGib,
        tjpAddr,
      });

      hasContext = !!this.ibGib_Context;
      console.log(`${lc} hasContext after update newer timeline: ${hasContext}`);

      // // cheap double-check assertion
      // if (latestAddr === this.addr) {
      //     console.warn(`${lc} (UNEXPECTED) this function is expected to fire only when latest is already checked to be different, but latestAddr (${latestAddr}) === this.addr (${this.addr}) (W: a23c8187caef4308b1d9f85b3aa8bedc)`);
      //     return; /* <<<< returns early */
      // }

      // let debug = false;
      // // if (this.ibGib_Context) { debug = true; debugger; }
      // const context = this.ibGib_Context;
      // this.addr = latestAddr; // triggers `updateIbGib` call
      // // if (debug) { debugger; }
      // this.ibGib_Context = context;

    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete. (I: f67a7a947bec4906b5a940d724a26891)`); }
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

  async handleClick_Refresh(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Refresh.name}]`;
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

  async handleClick_Share(): Promise<void> {
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

  async handleClick_Archive(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Archive.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 35ffcc6e1a4f4c6b9259a949f8029a39)`); }
      if (!this.addr) { throw new Error(`this.addr required (E: e6d2d74c20ff4080a89de98029b6ee3b)`); }
      if (!this.ibGib) { throw new Error(`this.ibGib required (E: 0ad4bdac05034ae8bca650d485332633)`); }
      if (!this.ibGib_Context) { throw new Error(`this.ibGib_Context required (E: 4b9abfa9c45b4dd0b3ef63f3e33f8ef0)`); }

      const resNewContext = await V1.rel8({
        src: this.ibGib_Context,
        rel8nsToAddByAddr: { [c.ARCHIVE_REL8N_NAME]: [this.addr] },
        rel8nsToRemoveByAddr: { [this.rel8nName_Context]: [this.addr] },
        dna: true,
        linkedRel8ns: [Rel8n.past],
        nCounter: true,
      });

      await this.common.ibgibs.persistTransformResult({ resTransform: resNewContext });
      await this.common.ibgibs.registerNewIbGib({ ibGib: resNewContext.newIbGib });

      this.dismissMe.emit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_Trash(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Trash.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 0cb8f4094bfba4640d463ea2f0b34e22)`); }
      if (!this.addr) { throw new Error(`this.addr required (E: c2de69bd99f7453880afe804989cb1e9)`); }
      if (!this.ibGib) { throw new Error(`this.ibGib required (E: 560031890368435c97c609c21ca44b0c)`); }
      if (!this.ibGib_Context) { throw new Error(`this.ibGib_Context required (E: 78908f20be7265f3987d408508dcad22)`); }

      const resNewContext = await V1.rel8({
        src: this.ibGib_Context,
        rel8nsToAddByAddr: { [c.TRASH_REL8N_NAME]: [this.addr] },
        rel8nsToRemoveByAddr: { [this.rel8nName_Context]: [this.addr] },
        dna: true,
        linkedRel8ns: [Rel8n.past],
        nCounter: true,
      });

      await this.common.ibgibs.persistTransformResult({ resTransform: resNewContext });
      await this.common.ibgibs.registerNewIbGib({ ibGib: resNewContext.newIbGib });

      this.dismissMe.emit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async loadItemPrimaryProperties(addr: IbGibAddr, item?: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.loadItemPrimaryProperties.name}]`;
    try {
      await super.loadItemPrimaryProperties(addr, item);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
