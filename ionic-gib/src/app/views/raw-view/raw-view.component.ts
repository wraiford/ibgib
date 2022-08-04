import {
  Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, Input
} from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';
import { IbGibItem, } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { ListViewComponent } from '../list-view/list-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export interface RawItem extends IbGibItem {

}

@Component({
  selector: 'raw-view',
  templateUrl: './raw-view.component.html',
  styleUrls: ['./raw-view.component.scss'],
})
export class RawViewComponent extends IbgibListComponentBase<RawItem> {

  protected lc: string = `[${RawViewComponent.name}]`;

  /**
   * We bind to all of the rel8nNames instead of some filtered list.
   *
   * Or said another way, in the raw view, we want to see all of the rel8nNames.
   */
  @Input()
  get allRel8nNames(): string[] {
    return Object.keys(this.ibGib?.rel8ns ?? {});
  }

  @Output()
  rawViewScrolled: EventEmitter<ScrollBaseCustomEvent> = new EventEmitter();

  @Output()
  rawViewItemsAdded = new EventEmitter<RawItem[]>();

  @ViewChild('listView')
  listView: ListViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    this.paused = true;
  }

  // async updateIbGib_NewerTimelineFrame(info: IbGibTimelineUpdateInfo): Promise<void> {
  //   const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
  //   try {
  //     if (logalot) { console.log(`${lc} starting...`); }

  //     await super.updateIbGib_NewerTimelineFrame(info);
  //     if (logalot) { console.log(`${lc}[testing] this.items.length: ${this.items?.length ?? -1}`); }

  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   } finally {
  //     if (logalot) { console.log(`${lc} complete.`); }
  //   }
  // }

  async itemClicked(item: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.itemClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }
      await this.go({
        toAddr: item.addr,
        fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  handleScroll(event: any): void {
    const lc = `${this.lc}[${this.handleScroll.name}]`;
    this.rawViewScrolled.emit(event);
    if (logalot) { console.log(`${lc} scrolling (I: b62e75fad64d0d12147cd608e8323622)`); }
  }

  handleItemsAdded(items: RawItem[]): void {
    this.rawViewItemsAdded.emit(items);
  }

  async handleRel8dAddrClick(rel8dAddr): Promise<void> {
    const lc = `${this.lc}[${this.handleRel8dAddrClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 6c547a8a10996e148e126064e5b64e22)`); }
      await this.go({
        toAddr: rel8dAddr,
        fromAddr: this.addr,
        force: true,
        queryParams: { paused: true },
        queryParamsHandling: 'merge'
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
