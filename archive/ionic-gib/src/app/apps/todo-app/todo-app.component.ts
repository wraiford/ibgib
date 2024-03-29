import { Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, Input } from '@angular/core';
import { IonModal, ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { TodoItem, TodoViewComponent } from '../../views/todo-view/todo-view.component';
import { TodoApp_V1 } from '../../common/witnesses/apps/todo-app-v1';
import { clearDoCancelModalOnBackButton, registerCancelModalOnBackButton } from '../../common/helper/utils';

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

  @ViewChild('fullscreenIonModal')
  fullscreenIonModal: IonModal;

  @Input()
  // get showModal_FullscreenIbGib(): boolean { return !!this.fullscreenIbGibAddr; }
  showModal_FullscreenIbGib: boolean;

  _fullscreenIbGibAddr: IbGibAddr;
  @Input()
  get fullscreenIbGibAddr(): IbGibAddr { return this._fullscreenIbGibAddr; }
  set fullscreenIbGibAddr(value: IbGibAddr) {
    if (value) {
      this._fullscreenIbGibAddr = value;
    } else {
      delete this._fullscreenIbGibAddr;
    }
    this.showModal_FullscreenIbGib = !!value;
  }

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

  async ngOnDestroy(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc}[testing] caching items (I: d61f38fbed6042f98518e47a4edd6f67)`); }
      if (this.fullscreenIbGibAddr) { this.fullscreenIbGibAddr = null; }
      if (this.fullscreenIonModal) { this.fullscreenIonModal.dismiss(); }
      await super.ngOnDestroy();
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

  async handleClick_IbGibItem(item: TodoItem): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_IbGibItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: f439facc2d28403a9bfa25f6143ca8f1)`); }
      await this.go({ toAddr: item.addr, fromAddr: this.addr, });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleLongClick_IbGibItem(item: TodoItem): Promise<void> {
    const lc = `${this.lc}[${this.handleLongClick_IbGibItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 032b8a6a57634d15ba8afbbe3f5b194a)`); }
      await this.showModal(item);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSwipeRight_IbGibItem([item, itemRef]: [TodoItem, IbgibComponentBase]): Promise<void> {
    const lc = `${this.lc}[${this.handleSwipeRight_IbGibItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: cf826fb8bb1f4313a69d3ba4b7b1391e)`); }
      // await this.showModal(item);

      // need to get the address actually associated with the context, which may
      // be in the past. this is not perfect but what can ya do.
      // very ugly right now, not solved. state of ibgib/context binding with
      // list/items eesh.
      const ibGib_Context = this.ibGib;
      const { rel8nName_Context } = item;
      const addr = itemRef.getAddrActuallyRel8edToContext(ibGib_Context, rel8nName_Context);

      await this.common.ibgibs.trash({
        ibGib_Context: this.ibGib,
        rel8nName_Context: item.rel8nName_Context,
        addr
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  async handleSwipeLeft_IbGibItem([item, itemRef]: [TodoItem, IbgibComponentBase]): Promise<void> {
    const lc = `${this.lc}[${this.handleSwipeLeft_IbGibItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c1b73d260a904d0f988dd0a7e763c6c2)`); }
      // need to get the address actually associated with the context, which may
      // be in the past. this is not perfect but what can ya do.
      // very ugly right now, not solved. state of ibgib/context binding with
      // list/items eesh.
      const ibGib_Context = this.ibGib;
      const { rel8nName_Context } = item;
      const addr = itemRef.getAddrActuallyRel8edToContext(ibGib_Context, rel8nName_Context);

      await this.common.ibgibs.archive({
        ibGib_Context: this.ibGib,
        rel8nName_Context: item.rel8nName_Context,
        addr
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  handleClick_CloseModal(): void {
    const lc = `${this.lc}[${this.handleClick_CloseModal.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: aa14deb245994637a41915d9e0e7f0a7)`); }
      this.closeModal();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  handleClick_GoToAddr(): void {
    const lc = `${this.lc}[${this.handleClick_GoToAddr.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 9c813f4df01c4d36854befb1acd24153)`); }
      const toAddr = this.fullscreenIbGibAddr;
      this.fullscreenIbGibAddr = null;
      clearDoCancelModalOnBackButton();
      // spin off navigate after the above js event loop exits
      if (toAddr !== this.addr) {
        setTimeout(() => { this.go({ toAddr, fromAddr: this.addr, force: true }); });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
