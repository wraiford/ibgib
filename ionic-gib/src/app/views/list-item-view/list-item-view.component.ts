import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbGibAddr } from 'ts-gib';
import { IbgibItem } from 'src/app/common/types';

@Component({
  selector: 'list-item',
  templateUrl: './list-item-view.component.html',
  styleUrls: ['./list-item-view.component.scss'],
})
export class ListItemViewComponent
  extends IbgibComponentBase
  implements OnInit {

  @Output()
  clicked: EventEmitter<IbgibItem> = new EventEmitter();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
   }

  ngOnInit() {}

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc} updating...`);
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadItem();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      console.log(`${lc} updated.`);
    }
  }

  async handleClicked(item: IbgibItem): Promise<void> {
    console.log(`item: ${JSON.stringify(item, null, 2)}`);
    this.clicked.emit(item);
  }

}

