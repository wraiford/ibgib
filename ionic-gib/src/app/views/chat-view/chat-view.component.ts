import { Component, Input, ChangeDetectorRef, Output, EventEmitter, ViewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { CommonService } from 'src/app/services/common.service';
import { IbGibItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { ScrollBaseCustomEvent } from '@ionic/angular';
import { ListViewComponent } from '../list-view/list-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

interface ChatItem extends IbGibItem {

}

@Component({
  selector: 'chat-view',
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss'],
})
export class ChatViewComponent extends IbgibListComponentBase<ChatItem> {

  protected lc: string = `[${ChatViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1) { super.ibGib_Context = value; }

  // set rel8nNames(value: string[]) {
  //   const lc = `${this.lc}[set rel8nNames]`;
  //   if (logalot) { console.log(`${lc} value: ${value} (I: bfd0a0312c2c414d99414d2163b227a7)`); }
  //   this._rel8nNames = value;
  // }
  // /**
  //  * should determine which rel8ns are showed by the list component.
  //  */
  // @Input()
  // get rel8nNames(): string[] { return this._rel8nNames; }

  @Output()
  scroll: EventEmitter<ScrollBaseCustomEvent> = new EventEmitter();

  @Output()
  chatItemsAdded: EventEmitter<number> = new EventEmitter();

  @ViewChild('listView')
  listView: ListViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async updateIbGib_NewerTimelineFrame(info: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      await super.updateIbGib_NewerTimelineFrame(info);
      if (logalot) { console.log(`${lc}[testing] this.items.length: ${this.items?.length ?? -1}`); }

      // temporary hack...no idea why it's still not updating correctly on the device
      // if (this.listView) {
      //   await this.listView.updateIbGib_NewerTimelineFrame(info);
      // }

    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

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
    this.scroll.emit(event);
    if (logalot) { console.log(`${lc} scrolling (I: b62e75fad64d0d12147cd608e8323622)`); }
  }

  handleItemsAdded(): void {
    this.chatItemsAdded.emit();
    // setTimeout(() => {
    //   this.scrollToBottom();
    //   this.ref.detectChanges();
    // }, 500);
  }
}
