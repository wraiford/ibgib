import { Component, ChangeDetectorRef, Output, Input, ViewChild } from '@angular/core';
import { EventEmitter } from '@angular/core';

import * as h from 'ts-gib/dist/helper';

import * as c from '../../common/constants';
import { IbGibItem, IbGibListItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { CommonService } from '../../services/common.service';
import { IonCheckbox, IonContent, IonInfiniteScroll } from '@ionic/angular';
import { IbgibScrollingListComponentBase } from 'src/app/common/bases/ibgib-scrolling-list-component-base';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';

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

  @Input()
  disableSelection: boolean;

  /**
   * Can't just use 'click', 'ibclicked' etc because already taken.
   */
  @Output()
  ibListItemClicked = new EventEmitter<IbGibItem>();

  @Output()
  ibListItemSwipedRight = new EventEmitter<[IbGibItem, IbgibComponentBase]>();

  @Output()
  ibListItemSwipedLeft = new EventEmitter<[IbGibItem, IbgibComponentBase]>();

  /**
   * if checkboxes visible, this event is fired when checked/unchecked.
   */
  @Output()
  ibCheckChanged = new EventEmitter<[IbGibListItem, boolean]>();

  @ViewChild('listViewContent')
  listViewContent: IonContent;

  @ViewChild('infiniteScroll')
  infiniteScroll: IonInfiniteScroll;

  @ViewChild('primaryCheckbox')
  primaryCheckbox: IonCheckbox;

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

  async handleOmniIbItemClicked(item: IbGibItem, itemRef: any): Promise<void> {
    const lc = `${this.lc}[${this.handleOmniIbItemClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 159dff8460f9cf2349348dfce3ca3c22)`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      if (!this.stopClickPropagation) { this.ibListItemClicked.emit(item); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleOmniIbItemSwipeRight(item: IbGibItem, itemRef: any): Promise<void> {
    const lc = `${this.lc}[${this.handleOmniIbItemSwipeRight.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 20960b2388d64cebb8b7827df3763fe1)`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      if (!this.stopClickPropagation) { this.ibListItemSwipedRight.emit([item, itemRef]); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleOmniIbItemSwipeLeft(item: IbGibItem, itemRef: any): Promise<void> {
    const lc = `${this.lc}[${this.handleOmniIbItemSwipeLeft.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 99ac71b79b2441e1b586ae631d63c80e)`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      if (!this.stopClickPropagation) { this.ibListItemSwipedLeft.emit([item, itemRef]); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  async handleIbItemClicked(item: IbGibItem, itemRef: any): Promise<void> {
    const lc = `${this.lc}[${this.handleIbItemClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 159dff8460f9cf2349348dfce3ca3c22)`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      if (!this.stopClickPropagation) { this.ibListItemClicked.emit(item); }

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
      this.ibCheckChanged.emit([item, !!event?.detail?.checked]);
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

  handleCheckboxChange_Secondary(event: any, item: IbGibListItem, i: number): void {
    const lc = `${this.lc}[${this.handleCheckboxChange_Secondary.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 8c606eaac4cf46d01fb9075ae47b0a22)`); }
      let primaryCheckbox = document.getElementById('ib-primary-checkbox_' + i);
      (<any>primaryCheckbox).checked = event?.detail?.checked;
      console.dir(primaryCheckbox);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
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
