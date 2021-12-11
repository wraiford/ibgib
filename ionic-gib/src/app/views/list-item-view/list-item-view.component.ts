import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, Input } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { CommonService } from '../../services/common.service';
import { IbgibItem } from '../../common/types';
import * as c from '../../common/constants';

const logALot = c.GLOBAL_LOG_A_LOT || false;;
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
  clicked: EventEmitter<IbgibItem> = new EventEmitter();

  protected debugBorderWidth: string = debugBorder ? "2px" : "0px"
  protected debugBorderColor: string = "yellow";
  protected debugBorderStyle: string = "solid";

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
    const lc = `${this.lc}[ctor]`;
    if (logALot) { console.log(`${lc} created`); }
   }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logALot) { console.log(`${lc} updating...`); }
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
      if (logALot) { console.log(`${lc} updated.`); }
    }
  }

  async handleClicked(item: IbgibItem): Promise<void> {
    if (logALot) { console.log(`item: ${JSON.stringify(item, null, 2)}`); }
    this.clicked.emit(item);
  }

}

