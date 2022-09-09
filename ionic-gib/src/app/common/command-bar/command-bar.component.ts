import {
  Component, OnInit, ChangeDetectorRef,
  Input, EventEmitter, Output,
} from '@angular/core';
import { Plugins } from '@capacitor/core';
const { Clipboard } = Plugins;

import { IbGibAddr, V1 } from 'ts-gib';
import { isPrimitive, } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { IbGibTimelineUpdateInfo } from '../types/ux';
import { getFnAlert } from '../helper/prompt-functions';


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

  @Output()
  dismissMe = new EventEmitter<void>();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);

    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} addr: ${this.addr}`); }
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
      let contextRel8nName = this.rel8nName_Context;
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.updateCommands();

      // reinstate the context ibgib...
      // major kluge here but I'm tired...
      this.ibGib_Context = contextIbGib;
      this.rel8nName_Context = contextRel8nName;

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

    } catch (error) {
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

      // need to get the address actually associated with the context, which may
      // be in the past. this is not perfect but what can ya do.
      const addr = this.getAddrActuallyRel8edToContext();

      const resNewContext = await V1.rel8({
        src: this.ibGib_Context,
        rel8nsToAddByAddr: { [c.ARCHIVE_REL8N_NAME]: [addr] },
        rel8nsToRemoveByAddr: { [this.rel8nName_Context]: [addr] },
        dna: true,
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

      // need to get the address actually associated with the context, which may
      // be in the past. this is not perfect but what can ya do.
      const addr = this.getAddrActuallyRel8edToContext();

      await this.common.ibgibs.trash({
        ibGib_Context: this.ibGib_Context,
        rel8nName_Context: this.rel8nName_Context,
        addr
      });

      this.dismissMe.emit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_OpenInNewTab(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_OpenInNewTab.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 7f3b684be561491066932db5363efb22)`); }
      const { origin } = document.location;
      const newUrl = `${origin}/ibgib/${this.addr}`;
      window.open(newUrl, "_blank");
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
