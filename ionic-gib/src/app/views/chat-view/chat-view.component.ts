import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { IbGibAddr } from 'ts-gib';
import { CommonService } from 'src/app/services/common.service';
import { IbgibItem } from 'src/app/common/types';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import * as c from '../../common/constants';

const logALot = c.GLOBAL_LOG_A_LOT || false;

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
    // hack for demo purposes
    setTimeout(() => {
      if (document) {
        const list = document.getElementById('theList');
        if (list) {
          list.scrollTop = list.scrollHeight;
        }
      }
    },700);
  }

  ngOnDestroy() {}

  async itemClicked(item: IbgibItem): Promise<void> {
    if (logALot) { console.log(`item: ${JSON.stringify(item, null, 2)}`); }
    await this.navTo({addr: item.addr});
    // this.clicked.emit(item);
  }
}
