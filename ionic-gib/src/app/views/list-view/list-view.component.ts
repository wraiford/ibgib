import { Component, OnInit, ChangeDetectorRef, Output } from '@angular/core';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { CommonService } from 'src/app/services/common.service';
import { EventEmitter } from '@angular/core';
import { IbgibItem } from 'src/app/common/types';

@Component({
  selector: 'list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
})
export class ListViewComponent extends IbgibListComponentBase
  implements OnInit {

  @Output()
  clicked: EventEmitter<IbgibItem> = new EventEmitter();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  ngOnInit() {}

  async handleClicked(item: IbgibItem): Promise<void> {
    console.log(`item: ${JSON.stringify(item, null, 2)}`);
    this.clicked.emit(item);
  }
}
