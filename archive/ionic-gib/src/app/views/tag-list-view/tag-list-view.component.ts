import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { IbgibListComponentBase } from 'src/app/common/bases/ibgib-list-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbGibItem } from '../../common/types/ux';

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

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`
    if (logalot) { console.log(`${lc} created`); }
    this.rel8nNames = ['target', 'tag', ...c.DEFAULT_LIST_REL8N_NAMES];
  }

  async ngOnInit(): Promise<void> {
    await super.ngOnInit();
  }

  updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc}`) }
    return super.updateIbGib(addr);
  }

  async tagClicked(item: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.tagClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`item: ${JSON.stringify(item, null, 2)}`); }
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

}
