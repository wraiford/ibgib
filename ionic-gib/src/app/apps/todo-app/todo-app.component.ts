import { Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, Input } from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../../common/constants';
import { CommonService } from 'src/app/services/common.service';
import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { TodoItem, TodoViewComponent } from '../../views/todo-view/todo-view.component';
import { TodoApp_V1 } from 'src/app/common/witnesses/apps/todo-app-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'ib-todo-app',
  templateUrl: './todo-app.component.html',
  styleUrls: ['./todo-app.component.scss'],
})
export class TodoAppComponent extends IbgibComponentBase {

  protected lc: string = `[${TodoAppComponent.name}]`;

  @Input()
  activeApp: TodoApp_V1;

  @Output()
  todoScrolled = new EventEmitter<ScrollBaseCustomEvent>();

  @Output()
  todoItemsAdded = new EventEmitter<TodoItem[]>()

  @ViewChild('todoView')
  todoView: TodoViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: )`); }
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
      await h.delay(250);
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
      // don't pingLatest in todo app
      // trigger an initial ping to check for newer ibgibs
      // if (!this.paused) {
      //   setTimeout(async () => {
      //     await this.smallDelayToLoadBalanceUI();
      //     await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: true });
      //   });
      // }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  handleTodoViewScroll(event: any): void {
    const lc = `${this.lc}[${this.handleTodoViewScroll.name}]`;
    if (logalot) { console.log(`${lc} (I: )`); }
    this.todoScrolled.emit(event);
  }

  handleTodoViewItemsAdded(items: TodoItem[]): void {
    const lc = `${this.lc}[${this.handleTodoViewItemsAdded.name}]`;
    if (logalot) { console.log(`${lc} (I: )`); }
    this.todoItemsAdded.emit(items);
  }
}
