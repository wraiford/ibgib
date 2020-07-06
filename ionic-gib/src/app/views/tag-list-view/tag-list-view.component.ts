import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbgibItem } from 'src/app/common/types';
import { Plugins } from '@capacitor/core';

@Component({
  selector: 'tag-list-view',
  templateUrl: './tag-list-view.component.html',
  styleUrls: ['./tag-list-view.component.scss'],
})
export class TagListViewComponent extends IbgibListComponentBase
  implements OnInit {

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
   }

  ngOnInit() {}

  async tagClicked(item: IbgibItem): Promise<void> {
    console.log(`item: ${JSON.stringify(item, null, 2)}`);
    await this.navTo({addr: item.addr});
    // this.clicked.emit(item);
  }
}
