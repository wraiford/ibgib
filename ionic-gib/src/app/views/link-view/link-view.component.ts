import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import * as c from '../../common/constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'link-view',
  templateUrl: './link-view.component.html',
  styleUrls: ['./link-view.component.scss'],
})
export class LinkViewComponent
  extends IbgibComponentBase
  implements OnInit {

  protected lc: string = `[${LinkViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  public debugBorderWidth: string = debugBorder ? "5px" : "0px"
  public debugBorderColor: string = "yellow";
  public debugBorderStyle: string = "solid";

  /**
   * redeclared for view
   */
  @Input()
  stopClickPropagation: boolean;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
    this.stopClickPropagation = true;
  }

  async ngOnInit(): Promise<void> {
    if (logalot) { console.log(`${this.lc} addr: ${this.addr}`); }
    await super.ngOnInit();
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await h.delay(250);
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
      // trigger an initial ping to check for newer ibgibs
      if (!this.paused) {
        setTimeout(async () => {
          await this.smallDelayToLoadBalanceUI();
          await this.common.ibgibs.pingLatest_Local({ibGib: this.ibGib, tjpIbGib: this.tjp});
        });
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

}

