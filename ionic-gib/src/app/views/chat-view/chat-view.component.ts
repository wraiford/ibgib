import { Component, OnInit, Input, ChangeDetectorRef, Output, EventEmitter, ViewChild } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { CommonService } from 'src/app/services/common.service';
import { IbgibItem, TimelineUpdateInfo } from '../../common/types/ux';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { ScrollBaseCustomEvent } from '@ionic/angular';
import { ListViewComponent } from '../list-view/list-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

interface ChatItem extends IbgibItem {

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
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

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

  async updateIbGib_NewerTimelineFrame(info: TimelineUpdateInfo): Promise<void> {
    await super.updateIbGib_NewerTimelineFrame(info);
    // if (this.listView) {
    //   await this.listView.updateIbGib_NewerTimelineFrame(info);
    // }
  }

  async updateItems(): Promise<void> {
    const lc = `${this.lc}[${this.updateItems.name}]`;
    try {
      this.rel8nNames = [...c.DEFAULT_LIST_REL8N_NAMES];
      await super.updateItems();

      // hack for demo purposes
      let scrollDelayMs: number;
      const platform = Capacitor.getPlatform();
      switch (platform) {
        case 'android':
          scrollDelayMs = c.DEFAULT_SCROLL_DELAY_MS_ANDROID_HACK;
          break;
        case 'ios':
          scrollDelayMs = c.DEFAULT_SCROLL_DELAY_MS_IOS_HACK;
          break;
        default:
          scrollDelayMs = c.DEFAULT_SCROLL_DELAY_MS_WEB_HACK;
          break;
      }
      setTimeout(() => { this.scrollToBottom(); });
      setTimeout(() => { this.scrollToBottom(); }, Math.floor(scrollDelayMs/4));
      setTimeout(() => { this.scrollToBottom(); }, Math.floor(scrollDelayMs/3));
      setTimeout(() => { this.scrollToBottom(); }, Math.floor(scrollDelayMs/2));
      setTimeout(() => { this.scrollToBottom(); }, scrollDelayMs);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // throw error; // don't rethrow atm
    } finally {
      setTimeout(() => this.ref.detectChanges());
    }

  }

  async itemClicked(item: IbgibItem): Promise<void> {
    if (logalot) { console.log(`item: ${h.pretty(item)}`); }
    await this.go({
      toAddr: item.addr,
      fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
    });
  }

  handleScroll(event: any): void {
    this.scroll.emit(event);
  }

  handleItemsAdded(): void {
    this.chatItemsAdded.emit();
    // setTimeout(() => {
    //   this.scrollToBottom();
    //   this.ref.detectChanges();
    // }, 500);
  }
}
