import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../../common/constants';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbgibItem } from 'src/app/common/types';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'root-list',
  templateUrl: './root-list-view.component.html',
  styleUrls: ['./root-list-view.component.scss'],
})
export class RootListViewComponent
  extends IbgibListComponentBase
  implements OnInit {

  protected lc: string = `[${RootListViewComponent.name}]`;

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
    const lc = `${this.lc}[ctor]`
    console.log(`${lc} created`);
  }

  ngOnInit() {
    super.ngOnInit();
  }

  updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc}`)
    return super.updateIbGib(addr);
  }


  async updateItems(): Promise<void> {
    this.rel8nNames = [c.ROOT_REL8N_NAME, ...c.DEFAULT_LIST_REL8N_NAMES];
    await super.updateItems();
    // setTimeout(() => {
    //   this.ref.detectChanges();
    // }, 1000);
  }

  async rootClicked(item: IbgibItem): Promise<void> {
    if (logalot) { console.log(`item: ${JSON.stringify(item, null, 2)}`); }
    await this.go({
      toAddr: item.addr,
      fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
    });
  }
}
