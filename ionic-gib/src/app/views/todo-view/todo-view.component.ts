import {
  Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, Input, ElementRef
} from '@angular/core';
import { LoadingController, ScrollBaseCustomEvent } from '@ionic/angular';
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
import { getAppInfoIb, getInfoFromAppInfoIb } from 'src/app/common/helper/app';

const logalot = c.GLOBAL_LOG_A_LOT || false;

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

  @Input()
  updatingCheckboxes = false;

  private _activeApp: TodoApp_V1;
  @Input()
  get activeApp(): TodoApp_V1 { return this._activeApp; }
  set activeApp(value: TodoApp_V1) {
    if (this._activeApp && value && this._activeApp.data.uuid !== value.data.uuid) {
      // we're changing todo apps, so the current info is invalid.
      delete this.todoInfo;
    }
    if (!value && this.todoInfo) { delete this.todoInfo; }
    this._activeApp = value;

    this.loadingController.create()
      .then(loading => loading.present())
      .then(() => { return this.loadTodoInfo() })
      .then(() => this.updateCheckboxes())
      .then(() => h.delay(250))
      .finally(() => {
        this.loadingController.dismiss()
        setTimeout(() => { this.ref.detectChanges(); })
      });
  }

  /**
   * We bind to all of the rel8nNames instead of some filtered list.
   *
   * Or said another way, in the todo view, we want to see all of the rel8nNames.
   */
  @Input()
  get allRel8nNames(): string[] { return Object.keys(this.ibGib?.rel8ns ?? {}); }

  todoInfo: TodoInfoIbGib_V1;

  @Input()
  loadingApp: boolean = false;

  @Output()
  todoItemChecked = new EventEmitter<TodoItem>();

  @ViewChild('listView')
  listView: ListViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    protected loadingController: LoadingController,
  ) {
    super(common, ref);
  }

  async stripPausedQueryParamSilentlyIfNeeded(): Promise<boolean> {
    const lc = `${this.lc}[${this.stripPausedQueryParamSilentlyIfNeeded.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d33f41f2311f4f4e8a0d04264b580a22)`); }
      if (window.location.toString().includes('paused=true')) {
        let newURL = window.location.toString().replace('paused=true', '');
        if (newURL.endsWith('?')) {
          newURL = newURL.slice(0, newURL.length - 1);
        }
        window.location.replace(newURL)
        this.paused = false;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
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
      await this.stripPausedQueryParamSilentlyIfNeeded();
      // trigger an initial ping to check for newer ibgibs
      setTimeout(async () => {
        await this.smallDelayToLoadBalanceUI();
        await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: true });
      });
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
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
    if (logalot) { console.log(`${lc} scrolling (I: b62e75fad64d0d12147cd608e8323622)`); }
  }

  handleItemsAdded(items: TodoItem[]): void {
    // strictly speaking should only update checkboxes for items added, but not
    // a big penalty cost just to update all at this time. if in the future
    // there are 1000s of items and no paging, then maybe this will need to
    // change
    this.updateCheckboxes(); // SPINS OFF!
  }

  async loadTodoInfo(): Promise<void> {
    const lc = `${this.lc}[${this.loadTodoInfo.name}]`;
    try {
      this.loadingApp = true;
      if (logalot) { console.log(`${lc} starting... (I: 45fe32fcbb5b06dd33336b0803896d22)`); }
      if (!this.ibGib) {
        if (logalot) { console.log(`${lc} this.ibGib falsy. deleting this.todoInfo and returning early (I: f439af3d60315a3c2a05c3d1d85db422)`); }
        delete this.todoInfo;
        return; /* <<<< returns early */
      }
      if (!this.ibGib.rel8ns) { throw new Error(`this.ibGib.rel8ns falsy edge case. (E: aeb9cae890ad62b69a8b0d8c495f1422)`); }

      // get the app info corresponding to the current todo app
      // but we need to be sure that the activeApp is loaded and valid
      let delayMs = 100;
      let counter = 1;
      while (!this.activeApp && counter < 5) {
        await h.delay(delayMs * counter);
        counter++;
      }
      if (!this.activeApp) { throw new Error(`this.activeApp required (E: 530dac162bb4f4d15887a38f31484622)`); }
      if (!this.activeApp?.data?.uuid) { throw new Error(`this.activeApp.data.uuid required (E: f8055e16d0241f761f2e6b9197ade322)`); }
      // valid (enough for now) activeApp. get the app's info in this.ibGib.rel8ns
      const activeAppTjpGib = getGibInfo({ gib: this.activeApp.gib }).tjpGib;
      // const activeAppInfoIb = getAppInfoIb({ appData: this.activeApp.data, activeAppTjpGib });

      // filter our rel8d addrs looking for the (hopefully at most) one addr
      // that corresponds to the the activeApp info. atow this includes the
      // app.data.uuid and its tjpGib
      const rel8dInfoArray =
        (this.ibGib.rel8ns[TODO_INFO_REL8N_NAME] ?? [])
          .filter(rel8dAppInfoAddr => {
            const rel8dAppInfoIb = h.getIbAndGib({ ibGibAddr: rel8dAppInfoAddr }).ib;
            const parsedInfo = getInfoFromAppInfoIb({ appInfoIb: rel8dAppInfoIb });
            return parsedInfo.appId === this.activeApp.data.uuid && parsedInfo.appTjpGib === activeAppTjpGib;
          });

      if (rel8dInfoArray?.length > 0) {
        // corresponding todo info ibgib already exists, so load it
        if (rel8dInfoArray.length > 1) { console.warn(`${lc} multiple rel8d todo infos found, but only one is expected atow. Using the first. (W: 111145bd9a324484ab7e6f1d8a875798)`); }
        let todoInfoAddr = rel8dInfoArray[0];
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
        //   none exists, and we will create it upon first need (not just here
        //   during loading.)
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.loadingApp = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateCheckboxes(): Promise<void> {
    const lc = `${this.lc}[${this.updateCheckboxes.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 3e303946b86afd1765601cc5c1c2b622)`); }
      while (this.updatingCheckboxes) { await h.delay(500); }
      this.updatingCheckboxes = true;
      if (this.todoInfo?.data?.tjpGibsDone?.length > 0) {
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
      this.updatingCheckboxes = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async createTodoInfo(): Promise<void> {
    const lc = `${this.lc}[${this.createTodoInfo.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: dd00cdb6070fd3824ceeeaae35c70d22)`); }
      if (!this.activeApp) { throw new Error(`(UNEXPECTED) this.activeApp required (E: 31522a9b56013b763b8ca3fb8344d722)`); }

      let data: TodoInfoData_V1 = { tjpGibsDone: [] }
      let resFirstGen = await factory.firstGen({
        parentIbGib: factory.primitive({ ib: TODO_INFO_IB }),
        ib: getAppInfoIb({ appData: this.activeApp.data, appTjpGib: getGibInfo({ gib: this.activeApp.gib }).tjpGib }),
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

      /**
       * If we rel8 & save the new todo right away to the current this.ibGib,
       * then it's going to trigger a new update which will take an unknown
       * amount of time.  we can't continue this function until that completes
       * and it would be a pain to tie into it (I think). So we'll rel8 it at
       * the end here.
       */
      let createdNewTodo = false;
      let newTodoInfo: TodoInfoIbGib_V1;
      if (!this.todoInfo) {
        // this also sets this.todoInfo
        await this.createTodoInfo();
        newTodoInfo = this.todoInfo;
        createdNewTodo = true;
      }
      console.dir(item);
      const tjpGib = getGibInfo({ ibGibAddr: item.addr }).tjpGib ?? item.gib;
      if (!tjpGib) { throw new Error(`(UNEXPECTED) no tjpGib and item.gib is falsy ? (E: ad183e834481130aefb2194debae9722)`); }
      const { tjpGibsDone } = this.todoInfo.data;
      let dataToAddOrPatch: any;
      if (checked) {
        // check item by adding to list in todoInfo
        if (!tjpGibsDone.includes(tjpGib)) {
          dataToAddOrPatch = { tjpGibsDone: [...tjpGibsDone, tjpGib] };
        } else {
          console.warn(`${lc} todoInfo.data.tjpGibsDone already includes tjpGib? (W: 12e8c089ef404968bc5dd5c83e92c3d4)`);
        }
      } else {
        // uncheck item by removing from list in todoInfo
        if (tjpGibsDone.includes(tjpGib)) {
          dataToAddOrPatch = { tjpGibsDone: tjpGibsDone.filter(x => x !== tjpGib) };
        } else {
          console.warn(`${lc} todoInfo.data.tjpGibsDone already does NOT include tjpGib? (W: f922c87feb0d4f88ba2700042486aae1)`);
        }
      }

      // execute mut8 with newly patched data and do local space plumbing
      if (dataToAddOrPatch) {
        let resMut8 = await mut8({
          src: this.todoInfo,
          dataToAddOrPatch,
          linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
          dna: true,
          nCounter: true,
        });
        await this.common.ibgibs.persistTransformResult({ resTransform: resMut8 });
        await this.common.ibgibs.registerNewIbGib({ ibGib: resMut8.newIbGib });
        this.todoInfo = <TodoInfoIbGib_V1>resMut8.newIbGib;
      }

      if (createdNewTodo) {
        // rel8 this.ibgib to point to new todoinfo ibgib
        const resRel8 = await rel8({
          src: this.ibGib,
          rel8nsToAddByAddr: {
            [TODO_INFO_REL8N_NAME]: [h.getIbGibAddr({ ibGib: newTodoInfo })],
          },
          linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
          dna: true,
          nCounter: true,
        });
        await this.common.ibgibs.persistTransformResult({ resTransform: resRel8 });
        await this.common.ibgibs.registerNewIbGib({ ibGib: resRel8.newIbGib });
        // NOTE: Execution at this point atow will hereafter be with the newibGib
        // as the ibGib and the interface  will update automatically
        // SO DON'T DO ANYTHING ELSE AT THIS POINT IN THIS FN
      }

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
