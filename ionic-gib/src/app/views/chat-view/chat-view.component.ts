import {
  Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, Input
} from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';
import { IbGibItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { ListViewComponent } from '../list-view/list-view.component';
import { ChatApp_V1 } from 'src/app/common/witnesses/apps/chat-app-v1';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';

const logalot = c.GLOBAL_LOG_A_LOT || true;

export interface ChatItem extends IbGibItem {

}

@Component({
  selector: 'chat-view',
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss'],
})
export class ChatViewComponent extends IbgibListComponentBase<ChatItem> {

  protected lc: string = `[${ChatViewComponent.name}]`;

  @Input()
  activeApp: ChatApp_V1;

  @Input()
  disableSelection: boolean;

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
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   } finally {
  //     if (logalot) { console.log(`${lc} complete.`); }
  //   }
  // }

  async handleClick_ListItem(item: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_ListItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      this.ibGibItemClicked.emit(item);

      // await this.go({
      //   toAddr: item.addr,
      //   fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      // });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleLongClick_ListItem(item: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.handleLongClick_ListItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }


      this.ibGibItemLongClicked.emit(item);

      // await this.go({
      //   toAddr: item.addr,
      //   fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      // });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSwipeRight_ListItem([item, itemRef]: [IbGibItem, IbgibComponentBase]): Promise<void> {
    const lc = `${this.lc}[${this.handleSwipeRight_ListItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      this.ibGibItemSwipedRight.emit([item, itemRef]);

      // await this.go({
      //   toAddr: item.addr,
      //   fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      // });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSwipeLeft_ListItem([item, itemRef]: [IbGibItem, IbgibComponentBase]): Promise<void> {
    const lc = `${this.lc}[${this.handleSwipeLeft_ListItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      this.ibGibItemSwipedLeft.emit([item, itemRef]);

      // await this.go({
      //   toAddr: item.addr,
      //   fromAddr: h.getIbGibAddr({ ibGib: this.ibGib_Context }),
      // });
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
