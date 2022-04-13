import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbgibItem } from '../../common/types/ux';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'tag-list',
  templateUrl: './tag-list-view.component.html',
  styleUrls: ['./tag-list-view.component.scss'],
})
export class TagListViewComponent
  extends IbgibListComponentBase
  implements OnInit {

  protected lc: string = `[${TagListViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  @Input()
  rel8nNames: string[] = ['target', 'tag', ...c.DEFAULT_LIST_REL8N_NAMES];

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`
    if (logalot) { console.log(`${lc} created`); }
  }

  ngOnInit() {
    super.ngOnInit();
  }

  updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc}`) }
    return super.updateIbGib(addr);
  }


  // async updateItems(): Promise<void> {
    // this.rel8nNames = ['target', 'tag', ...c.DEFAULT_LIST_REL8N_NAMES];
    // await super.updateItems();
    // setTimeout(() => {
    //   this.ref.detectChanges();
    // }, 1000);
  // }

  async tagClicked(item: IbgibItem): Promise<void> {
    if (logalot) { console.log(`item: ${JSON.stringify(item, null, 2)}`); }
    await this.go({
      toAddr: item.addr,
      fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
    });
    // this.clicked.emit(item);
  }
}
