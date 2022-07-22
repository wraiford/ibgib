import {
  Component, ChangeDetectorRef, Output, EventEmitter, ViewChild
} from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';
import { IbGibItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { ListViewComponent } from '../list-view/list-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export interface ChatItem extends IbGibItem {

}

@Component({
  selector: 'chat-view',
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss'],
})
export class ChatViewComponent extends IbgibListComponentBase<ChatItem> {

  protected lc: string = `[${ChatViewComponent.name}]`;

  @Output()
  chatViewScrolled: EventEmitter<ScrollBaseCustomEvent> = new EventEmitter();

  @Output()
  chatViewItemsAdded = new EventEmitter<ChatItem[]>();

  @ViewChild('listView')
  listView: ListViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  // async updateIbGib_NewerTimelineFrame(info: IbGibTimelineUpdateInfo): Promise<void> {
  //   const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
  //   try {
  //     if (logalot) { console.log(`${lc} starting...`); }

  //     await super.updateIbGib_NewerTimelineFrame(info);
  //     if (logalot) { console.log(`${lc}[testing] this.items.length: ${this.items?.length ?? -1}`); }

  //   } catch (error) {
  //     debugger;
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
    this.chatViewScrolled.emit(event);
    if (logalot) { console.log(`${lc} scrolling (I: b62e75fad64d0d12147cd608e8323622)`); }
  }

  handleItemsAdded(items: ChatItem[]): void {
    this.chatViewItemsAdded.emit(items);
  }

}
