import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, Input, ElementRef } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { CommonService } from '../../services/common.service';
import { IbGibItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import * as c from '../../common/constants';
import { AnimationController } from '@ionic/angular';

const logalot = c.GLOBAL_LOG_A_LOT || false;;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'list-item',
  templateUrl: './list-item-view.component.html',
  styleUrls: ['./list-item-view.component.scss'],
})
export class ListItemViewComponent extends IbgibComponentBase {

  protected lc: string = `[${ListItemViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  @Output()
  clicked: EventEmitter<IbGibItem> = new EventEmitter();

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#92ed80";
  public debugBorderStyle: string = "solid";

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private elementRef: ElementRef,
    private animation: AnimationController,
  ) {
    super(common, ref)
    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} created`); }
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

  updateIbGib_NewerTimelineFrame({ latestAddr, latestIbGib, tjpAddr, }: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 2c15f733144ced6f19bbbdb378adae22)`); }
      return super.updateIbGib_NewerTimelineFrame({latestAddr, latestIbGib, tjpAddr });
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClicked(item: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.handleClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${JSON.stringify(item, null, 2)}`); }
      this.clicked.emit(item);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  initializeAnimation(): void {
    const lc = `${this.lc}[${this.initializeAnimation.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 23a07bccfede43ac41fbcd65ae905e22)`); }
      // this.animation.create().
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}

