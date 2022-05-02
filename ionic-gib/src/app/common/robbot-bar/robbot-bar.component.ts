import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { IbGibAddr } from 'ts-gib/dist/types';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-robbot-bar',
  templateUrl: './robbot-bar.component.html',
  styleUrls: ['./robbot-bar.component.scss'],
})
export class RobbotBarComponent extends IbgibComponentBase implements OnInit {
  protected lc: string = `[${super.lc}][${RobbotBarComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#AFC590";
  public debugBorderStyle: string = "solid";

  @Input()
  robbotNames: string[] = [];

  @Input()
  defaultRobbotName: string;

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
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async updateRobbots(): Promise<void> {
    const lc = `${this.lc}[${this.updateRobbots.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const robbots = await this.common.ibgibs.getAppRobbots({createIfNone: true});
      if (robbots.length > 0) {
        this.robbotNames = robbots.map(r => r.data.name);
        this.defaultRobbotName = robbots[0].data.name;
        // this.robbotBarIsVisible = !this.robbotBarIsVisible;
        setTimeout(() => this.ref.detectChanges());
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
