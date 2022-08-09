import { Component, OnInit, ChangeDetectorRef, Output, Input, ViewChild } from '@angular/core';
import { EventEmitter } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { IbGibItem, IbGibListItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { CommonService } from '../../services/common.service';
import { IonContent, IonInfiniteScroll } from '@ionic/angular';
import { IbgibScrollingListComponentBase } from 'src/app/common/bases/ibgib-scrolling-list-component-base';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { ListItemViewComponent } from '../list-item-view/list-item-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
})
export class ListViewComponent extends IbgibScrollingListComponentBase {

  protected lc: string = `[${ListViewComponent.name}]`;

  @Input()
  checkboxesVisible: boolean;

  @Output()
  clicked = new EventEmitter<IbGibItem>();

  /**
   * if checkboxes visible, this event is fired when checked/unchecked.
   */
  @Output()
  ibCheckChanged = new EventEmitter<[IbGibListItem, boolean]>();

  // @Output()
  // ibListCheckChanged = new EventEmitter<[IbGibItem, boolean]>();

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

  handleCheckboxChange(event: any, item: IbGibListItem): void {
    const lc = `${this.lc}[${this.handleCheckboxChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 84afcd3f55e22fd0024d6297305a3b22)`); }
      item.checked = event?.detail?.checked;
      // itemRef.checked = item.checked;
      // setTimeout(() => (<any>itemRef).ref.detectChanges());
      // }, 2000);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      // setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateCheckedIbGibs(): Promise<void> {
    const lc = `${this.lc}[${this.updateCheckedIbGibs.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 20b584b284172e8f98339b86d51c9522)`); }
      // load checked statuses from this.ibGib's info.
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
