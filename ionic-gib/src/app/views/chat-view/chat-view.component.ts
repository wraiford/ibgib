import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { FilesService } from 'src/app/services/files.service';
import { IbGibAddr } from 'ts-gib';
import { CommonService } from 'src/app/services/common.service';
import { IbgibItem } from 'src/app/common/types';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';

interface ChatItem extends IbgibItem {

}

@Component({
  selector: 'chat-view',
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss'],
})
export class ChatViewComponent extends IbgibListComponentBase<ChatItem>
  implements OnInit, OnDestroy {

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
        list.scrollTop = list.scrollHeight;
      }
    },700);
  }

  ngOnDestroy() {}

  async itemClicked(item: IbgibItem): Promise<void> {
    console.log(`item: ${JSON.stringify(item, null, 2)}`);
    await this.navTo({addr: item.addr});
    // this.clicked.emit(item);
  }
}
