import {
  Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, Input, ElementRef
} from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';
import { Plugins } from "@capacitor/core";
const { Clipboard, } = Plugins;

import * as h from 'ts-gib/dist/helper';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';
import { IbGibItem, IbGibListItem, IbGibTimelineUpdateInfo, } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { ListViewComponent } from '../list-view/list-view.component';
import { Gib, IbGibAddr } from 'ts-gib';
import { Factory_V1 as factory, mut8, rel8, Rel8n } from 'ts-gib/dist/V1';
import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { TodoApp_V1 } from '../../common/witnesses/apps/todo-app-v1';
import { TodoInfoData_V1, TodoInfoIbGib_V1, TODO_INFO_IB, TODO_INFO_REL8N_NAME } from 'src/app/common/types/todo-app';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

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
export class TodoViewComponent extends IbgibComponentBase<TodoItem> {

  protected lc: string = `[${TodoViewComponent.name}]`;

  /**
   * We bind to all of the rel8nNames instead of some filtered list.
   *
   * Or said another way, in the todo view, we want to see all of the rel8nNames.
   */
  @Input()
  get allRel8nNames(): string[] { return Object.keys(this.ibGib?.rel8ns ?? {}); }

  todoInfo: TodoInfoIbGib_V1;

  @Output()
  todoItemChecked = new EventEmitter<TodoItem>();

  @ViewChild('listView')
  listView: ListViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
      await this.loadTodoInfo();
      await this.updateCheckboxes();
      // trigger an initial ping to check for newer ibgibs
      if (!this.paused && !window.location.toString().includes('paused=true')) {
        setTimeout(async () => {
          await this.smallDelayToLoadBalanceUI();
          await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: true });
        });
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async updateIbGib_NewerTimelineFrame(info: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      await super.updateIbGib_NewerTimelineFrame(info);
      // await this.loadTodoInfo();
      // await this.updateCheckboxes();
      // if (logalot) { console.log(`${lc}[testing] this.items.length: ${this.items?.length ?? -1}`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

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
    // this.todoViewScrolled.emit(event);
    if (logalot) { console.log(`${lc} scrolling (I: b62e75fad64d0d12147cd608e8323622)`); }
  }

  handleItemsAdded(items: TodoItem[]): void {
    // this.todoViewItemsAdded.emit(items);
  }

  async loadTodoInfo(): Promise<void> {
    const lc = `${this.lc}[${this.loadTodoInfo.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 45fe32fcbb5b06dd33336b0803896d22)`); }
      if (!this.ibGib) { throw new Error(`this.ibGib required (E: 97448c381d7bc54b0a50b54d9ac45d22)`); }
      if (!this.ibGib.rel8ns) { throw new Error(`this.ibGib.rel8ns falsy edge case. (E: aeb9cae890ad62b69a8b0d8c495f1422)`); }

      const todoRel8d = this.ibGib.rel8ns[TODO_INFO_REL8N_NAME];
      // get rel8d from this.ibGib (if exists)
      if (todoRel8d?.length > 0) {
        // existing info, so load it
        if (todoRel8d.length > 1) { console.warn(`${lc} multiple rel8d todo infos found, but only one is expected atow. Using the first. (W: 111145bd9a324484ab7e6f1d8a875798)`); }
        let todoInfoAddr = todoRel8d[0];
        let resGetTodoInfoIbGib = await this.common.ibgibs.get({ addr: todoInfoAddr });
        let todoInfoIbGib: TodoInfoIbGib_V1;
        if (resGetTodoInfoIbGib.success && resGetTodoInfoIbGib.ibGibs?.length === 1) {
          todoInfoIbGib = <TodoInfoIbGib_V1>resGetTodoInfoIbGib.ibGibs[0];
        } else {
          console.error(`${lc} resGetTodoInfoIbGib... (E: 5b1b674ad72d47a8ae1474f36b4699c4)`);
          console.dir(resGetTodoInfoIbGib);
          throw new Error(`get todoInfo failed: ${resGetTodoInfoIbGib.errorMsg} (E: 07528b1e65ae19daa71693856ee46d22)`);
        }
        let latestAddr = await this.common.ibgibs.getLatestAddr({ ibGib: todoInfoIbGib });
        if (latestAddr && latestAddr !== todoInfoAddr) {
          resGetTodoInfoIbGib = await this.common.ibgibs.get({ addr: latestAddr });
          if (resGetTodoInfoIbGib.success && resGetTodoInfoIbGib.ibGibs?.length === 1) {
            todoInfoIbGib = <TodoInfoIbGib_V1>resGetTodoInfoIbGib.ibGibs[0];
          } else {
            console.error(`${lc} resGetTodoInfoIbGib (latestAddr)... (E: aef24bf09cac4252ab893031cc06b9b8)`);
            console.dir(resGetTodoInfoIbGib);
            throw new Error(`get todoInfo failed: ${resGetTodoInfoIbGib.errorMsg} (E: 615a4a8fb70e4dc984c9dd660c9cc4d1)`);
          }
        }
        this.todoInfo = todoInfoIbGib;

        // } else {
        // none exists, and we will create it upon first need (not just loading.)
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateCheckboxes(): Promise<void> {
    const lc = `${this.lc}[${this.updateCheckboxes.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 3e303946b86afd1765601cc5c1c2b622)`); }
      if (this.todoInfo?.data?.tjpGibsDone?.length > 0) {
        // this.todoInfo.data.tjpGibsDone.forEach
        this.listView.items.forEach(item => {
          if (!item.addr) {
            debugger;
            throw new Error(`(unexpected) item.addr falsy (E: 60f8e4cafe298e44db78735c11109322)`);
          }
          let itemGibInfo = getGibInfo({ ibGibAddr: item.addr });
          if (itemGibInfo.tjpGib) {
            item.checked = this.todoInfo.data.tjpGibsDone.includes(itemGibInfo.tjpGib);
          } else {
            // no tjpGib so we'll use just the gib (?)
            item.checked = this.todoInfo.data.tjpGibsDone.includes(item.gib);
          }
        });

      } else {
        // nothing should be checked
        this.listView.items.forEach(x => { x.checked = false; });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async createTodoInfo(): Promise<void> {
    const lc = `${this.lc}[${this.createTodoInfo.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: dd00cdb6070fd3824ceeeaae35c70d22)`); }
      let data: TodoInfoData_V1 = { tjpGibsDone: [] }
      let resFirstGen = await factory.firstGen({
        parentIbGib: factory.primitive({ ib: TODO_INFO_IB }),
        ib: TODO_INFO_IB,
        data,
        dna: true,
        nCounter: true,
        linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
        tjp: { timestamp: true, uuid: true },
      });
      await this.common.ibgibs.persistTransformResult({ resTransform: resFirstGen });
      await this.common.ibgibs.registerNewIbGib({ ibGib: resFirstGen.newIbGib });
      this.todoInfo = <TodoInfoIbGib_V1>resFirstGen.newIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleCheckChanged([item, checked]: [IbGibListItem, boolean]): Promise<void> {
    const lc = `${this.lc}[${this.handleCheckChanged.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 39b1c39e172a64b057f818575694de22)`); }

      if (!this.todoInfo) { await this.createTodoInfo(); }
      console.dir(item);
      if (checked) {
        // check item by adding to list in todoInfo
        let { tjpGib } = getGibInfo({ ibGibAddr: item.addr });
        tjpGib = tjpGib ?? item.gib;
        if (!tjpGib) { throw new Error(`(UNEXPECTED) no tjpGib and item.gib is falsy ? (E: ad183e834481130aefb2194debae9722)`); }

        const { tjpGibsDone } = this.todoInfo.data;
        if (!tjpGibsDone.includes(tjpGib)) {
          let resMut8 = await mut8({
            src: this.todoInfo,
            dataToAddOrPatch: { tjpGibsDone: [...tjpGibsDone, tjpGib] },
            linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
            dna: true,
            nCounter: true,
          });
          await this.common.ibgibs.persistTransformResult({ resTransform: resMut8 });
          await this.common.ibgibs.registerNewIbGib({ ibGib: resMut8.newIbGib });
          this.todoInfo = <TodoInfoIbGib_V1>resMut8.newIbGib;
        } else {
          console.warn(`${lc} todoInfo.data.tjpGibsDone already includes tjpGib? (W: 12e8c089ef404968bc5dd5c83e92c3d4)`)
        }
      } else {
        // uncheck item by removing from list in todoInfo
        throw new Error(`not implemented yet need to do this next... (E: b4363a363079b86976d0f08e7a3d5422)`);
      }

      // rel8 this.ibgib to point to new todoinfo

      const resRel8 = await rel8({
        src: this.ibGib,
        rel8nsToAddByAddr: {
          [TODO_INFO_REL8N_NAME]: [h.getIbGibAddr({ ibGib: this.todoInfo })],
        },
        linkedRel8ns: [Rel8n.ancestor, Rel8n.past, TODO_INFO_REL8N_NAME],
        dna: true,
        nCounter: true,
      });
      await this.common.ibgibs.persistTransformResult({ resTransform: resRel8 });
      await this.common.ibgibs.registerNewIbGib({ ibGib: resRel8.newIbGib });
      // NOTE: Execution at this point atow will hereafter be with the newibGib
      // as the ibGib and the interface  will update automatically
      // SO DON'T DO ANYTHING ELSE AT THIS POINT IN THIS FN

      if (logalot) { console.log(`${lc} checked: ${checked} (I: d188bcace219f116459637bf11fd7d22)`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
