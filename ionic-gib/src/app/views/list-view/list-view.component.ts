import { Component, OnInit, ChangeDetectorRef, Output, Input } from '@angular/core';
import { EventEmitter } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { IbgibItem } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { CommonService } from '../../services/common.service';

const logalot = c.GLOBAL_LOG_A_LOT || false;

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
  set addr(value: IbGibAddr) {
    super.addr = value;
  }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  /**
   * Rel8n names to show in the list by default.
   */
  @Input()
  rel8nNames: string[] = c.DEFAULT_LIST_REL8N_NAMES;

  @Output()
  clicked: EventEmitter<IbgibItem> = new EventEmitter();

  // @Output()
  // scrolled: EventEmitter<void> = new EventEmitter();

  @Output()
  itemsAdded: EventEmitter<number> = new EventEmitter();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} called (I: 42779b92438928ee1c1496289fca2322)`); }

    if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }

    setTimeout(() => { this.ref.detectChanges(); }, 5000); // no idea
  }

  ngOnInit() {
    super.ngOnInit();
  }

  async handleClicked(item: IbgibItem): Promise<void> {
    if (logalot) { console.log(`item: ${JSON.stringify(item, null, 2)}`); }
    this.clicked.emit(item);
  }
}
