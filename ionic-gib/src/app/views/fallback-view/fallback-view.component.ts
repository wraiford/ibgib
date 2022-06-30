import { Component, ChangeDetectorRef, Input, AfterViewInit } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'fallback-view',
  templateUrl: './fallback-view.component.html',
  styleUrls: ['./fallback-view.component.scss'],
})
export class FallbackViewComponent extends IbgibComponentBase
  implements AfterViewInit {

  protected lc: string = `[${FallbackViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  /**
   * many fallback component instantiations are just preloads for other actual
   * ibgibs like pics and comments. so delay so we don't waste time/ui on a load
   * that probably won't be used.
   */
  @Input()
  delayMs: number = 5000;

  /**
   * @see {@link delayMs}
   */
  @Input()
  isSkeleton: boolean = true;

  destroyed: boolean = false;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} called (I: 144a7879d86480b8482b982379f00f22)`); }
    if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.destroyed) {
        this.isSkeleton = false;
      }
    }, this.delayMs);
  }

  async ngOnDestroy(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.destroyed = true;

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
      await super.updateIbGib(addr);
      await h.delay(this.delayMs); // see delayMs
      await this.loadIbGib();
      await this.loadItem();
      // trigger an initial ping to check for newer ibgibs
      if (!this.paused) {
        setTimeout(async () => {
          if (!this.destroyed) {
            await this.smallDelayToLoadBalanceUI();
            await this.common.ibgibs.pingLatest_Local({ibGib: this.ibGib, tjpIbGib: this.tjp});
          }
        }, 2000);
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
