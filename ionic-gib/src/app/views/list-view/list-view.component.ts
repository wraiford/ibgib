import { Component, OnInit, ChangeDetectorRef, Output, Input } from '@angular/core';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { CommonService } from 'src/app/services/common.service';
import { EventEmitter } from '@angular/core';
import { IbgibItem } from 'src/app/common/types';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

@Component({
  selector: 'list-view',
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
})
export class ListViewComponent 
  extends IbgibListComponentBase
  implements OnInit {

  protected lc: string = `[${ListViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  @Input()
  testprop = 'initialized';

  @Output()
  clicked: EventEmitter<IbgibItem> = new EventEmitter();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    setTimeout(() => {
      this.testprop = 'changed after timeout';
      this.ref.detectChanges();
    }, 5000);
  }

  ngOnInit() {}

  updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc}`)
    return super.updateIbGib(addr);
  }
  // async updateIbGib(addr: IbGibAddr): Promise<void> {
  //   const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
  //   console.log(`${lc} updating...`);
  //   try {
  //     await super.updateIbGib(addr);
  //     await this.loadIbGib();
  //     await this.updateItems();
  //   } catch (error) {
  //     console.error(`${lc} error: ${error.message}`);
  //     this.clearItem();
  //   } finally {
  //     this.ref.detectChanges();
  //     console.log(`${lc} updated.`);
  //   }
  // }

  async handleClicked(item: IbgibItem): Promise<void> {
    console.log(`item: ${JSON.stringify(item, null, 2)}`);
    this.clicked.emit(item);
  }
}