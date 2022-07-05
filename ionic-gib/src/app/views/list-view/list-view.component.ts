import { Component, OnInit, ChangeDetectorRef, Output, Input, ViewChild } from '@angular/core';
import { EventEmitter } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { IbGibItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { CommonService } from '../../services/common.service';
import { IonContent, IonInfiniteScroll } from '@ionic/angular';
import { IbgibScrollingListComponentBase } from 'src/app/common/bases/ibgib-scrolling-list-component-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
})
export class ListViewComponent extends IbgibScrollingListComponentBase {

  protected lc: string = `[${ListViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) {
    super.addr = value;
  }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1) { super.ibGib_Context = value; }

  @Output()
  clicked: EventEmitter<IbGibItem> = new EventEmitter();

  // @Output()
  // scrolled: EventEmitter<void> = new EventEmitter();

  @Output()
  itemsAdded: EventEmitter<number> = new EventEmitter();

  @ViewChild('listViewContent')
  listViewContent: IonContent;

  @ViewChild('infiniteScroll')
  infiniteScroll: IonInfiniteScroll;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} called (I: 42779b92438928ee1c1496289fca2322)`); }

    if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }

    setTimeout(() => { this.ref.detectChanges(); }, 5000); // no idea
  }

  async updateIbGib_NewerTimelineFrame(info: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      await super.updateIbGib_NewerTimelineFrame(info);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClicked(item: IbGibItem, itemRef: any): Promise<void> {
    const lc = `${this.lc}[${this.handleClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 159dff8460f9cf2349348dfce3ca3c22)`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      if (!this.stopClickPropagation) { this.clicked.emit(item); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
