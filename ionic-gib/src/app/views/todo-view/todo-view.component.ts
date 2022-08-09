import {
  Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, Input, ElementRef
} from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';
import { Plugins } from "@capacitor/core";
const { Clipboard, } = Plugins;

import * as h from 'ts-gib/dist/helper';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';
import { IbGibItem, } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { ListViewComponent } from '../list-view/list-view.component';
import { Gib } from 'ts-gib';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

export interface TodoItem extends IbGibItem {
  /**
   * If the item is done.
   */
  checked?: boolean;
}

@Component({
  selector: 'todo-view',
  templateUrl: './todo-view.component.html',
  styleUrls: ['./todo-view.component.scss'],
})
export class TodoViewComponent extends IbgibListComponentBase<TodoItem> {

  protected lc: string = `[${TodoViewComponent.name}]`;

  /**
   * We bind to all of the rel8nNames instead of some filtered list.
   *
   * Or said another way, in the todo view, we want to see all of the rel8nNames.
   */
  @Input()
  get allRel8nNames(): string[] {
    return Object.keys(this.ibGib?.rel8ns ?? {});
  }

  @Output()
  todoViewScrolled: EventEmitter<ScrollBaseCustomEvent> = new EventEmitter();

  @Output()
  todoViewItemsAdded = new EventEmitter<TodoItem[]>();

  @Output()
  todoItemChecked = new EventEmitter<TodoItem>();

  @ViewChild('listView')
  listView: ListViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    this.paused = true;
  }

  // async updateIbGib_NewerTimelineFrame(info: IbGibTimelineUpdateInfo): Promise<void> {
  //   const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
  //   try {
  //     if (logalot) { console.log(`${lc} starting...`); }

  //     await super.updateIbGib_NewerTimelineFrame(info);
  //     if (logalot) { console.log(`${lc}[testing] this.items.length: ${this.items?.length ?? -1}`); }

  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   } finally {
  //     if (logalot) { console.log(`${lc} complete.`); }
  //   }
  // }

  async itemClicked(item: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.itemClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }
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

  handleScroll(event: any): void {
    const lc = `${this.lc}[${this.handleScroll.name}]`;
    this.todoViewScrolled.emit(event);
    if (logalot) { console.log(`${lc} scrolling (I: b62e75fad64d0d12147cd608e8323622)`); }
  }

  handleItemsAdded(items: TodoItem[]): void {
    this.todoViewItemsAdded.emit(items);
  }

  async handleRel8dAddrClick(rel8dAddr): Promise<void> {
    const lc = `${this.lc}[${this.handleRel8dAddrClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 6c547a8a10996e148e126064e5b64e22)`); }
      await this.go({
        toAddr: rel8dAddr,
        fromAddr: this.addr,
        force: true,
        queryParams: { paused: true },
        queryParamsHandling: 'merge'
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_Copy(rel8dAddr: string, rel8dListItem: HTMLElement): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Copy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 3f0b6ea7ebedd68acc2737546fc54322)`); }

      // debugger;
      await Clipboard.write({ string: rel8dAddr });
      await Plugins.Toast.show({ text: 'copied!', duration: 'short' });

      if (rel8dListItem) {
        const el = rel8dListItem;
        const highlighted = 'ib-highlighted';
        if (!el.classList.contains(highlighted)) { el.classList.add(highlighted); }
        setTimeout(() => {
          if (el.classList.contains(highlighted)) { el.classList.remove(highlighted); }
        }, 2000);
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
