import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { CommonService } from 'src/app/services/common.service';
import { IbgibItem } from 'src/app/common/types';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

interface ChatItem extends IbgibItem {

}

@Component({
  selector: 'chat-view',
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss'],
})
export class ChatViewComponent extends IbgibListComponentBase<ChatItem>
  implements OnInit, OnDestroy {

  protected lc: string = `[${ChatViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  ngOnInit() {
  }

  async updateItems(): Promise<void> {
    const lc = `${this.lc}[${this.updateItems.name}]`;
    try {
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
      setTimeout(() => {
        if (document) {
          const list = document.getElementById('theList');
          if (list) {
            if (logalot) { console.log(`${lc} scrolling`); }
            list.scrollTop = list.scrollHeight;
          }
        }
      }, scrollDelayMs);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // throw error; // don't rethrow atm
    }

  }

  ngOnDestroy() {}

  async itemClicked(item: IbgibItem): Promise<void> {
    if (logalot) { console.log(`item: ${h.pretty(item)}`); }
    await this.go({
      toAddr: item.addr,
      fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
    });
  }
}
