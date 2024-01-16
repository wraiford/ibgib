import { Component, OnInit, ChangeDetectorRef, } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';

import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import * as c from '../../common/constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'comment-view',
  templateUrl: './comment-view.component.html',
  styleUrls: ['./comment-view.component.scss'],
})
export class CommentViewComponent
  extends IbgibComponentBase
  implements OnInit {

  protected lc: string = `[${CommentViewComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "3px" : "0px"
  public debugBorderColor: string = "yellow";
  public debugBorderStyle: string = "solid";

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
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
          await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: true });
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

