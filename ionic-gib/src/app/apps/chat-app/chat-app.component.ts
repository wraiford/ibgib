import { Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, OnInit, OnDestroy, Input } from '@angular/core';
import { IonModal, ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../../common/constants';
import { CommonService } from 'src/app/services/common.service';
import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { ChatItem, ChatViewComponent } from '../../views/chat-view/chat-view.component';
import { ChatApp_V1 } from 'src/app/common/witnesses/apps/chat-app-v1';
import { registerCancelModalOnBackButton, clearDoCancelModalOnBackButton } from 'src/app/common/helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'ib-chat-app',
  templateUrl: './chat-app.component.html',
  styleUrls: ['./chat-app.component.scss'],
})
export class ChatAppComponent extends IbgibComponentBase implements OnInit, OnDestroy {

  protected lc: string = `[${ChatAppComponent.name}]`;

  @Input()
  activeApp: ChatApp_V1;

  @Output()
  chatScrolled = new EventEmitter<ScrollBaseCustomEvent>();

  @Output()
  chatItemsAdded = new EventEmitter<ChatItem[]>()

  @ViewChild('chatView')
  chatView: ChatViewComponent;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 6aefded68cbf4a5fa22dd55cab481fd1)`); }
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
      // if (logalot) { console.log(`${lc}[testing] caching items (I: d61f38fbed6042f98518e47a4edd6f67)`); }
      // if (this.fullscreenIbGibAddr) {
      //   this.fullscreenIbGibAddr = null;
      //   delete this.fullscreenIbGibRel8nName;
      // }
      // if (this.fullscreenIonModal) { this.fullscreenIonModal.dismiss(); }
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

  handleChatViewScroll(event: any): void {
    const lc = `${this.lc}[${this.handleChatViewScroll.name}]`;
    if (logalot) { console.log(`${lc} (I: eb0c7e19dfd44efba276df9cb9ae7ee1)`); }
    this.chatScrolled.emit(event);
  }

  handleChatViewItemsAdded(items: ChatItem[]): void {
    const lc = `${this.lc}[${this.handleChatViewItemsAdded.name}]`;
    if (logalot) { console.log(`${lc} (I: a321a669769a4e2d9b8080c09065f3d2)`); }

    // I'm doing this here because the trackby in angular goes by address. but
    // if we come over from the todo app and some are checked, then this property will
    // be set. this maybe should be placed elsewhere, but it works for now
    items.forEach(x => { delete x.checked; });

    this.chatItemsAdded.emit(items);
  }

  async handleClick_IbGibItem(item: ChatItem): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_IbGibItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: bdb22ba5a75aa9ed93659595913cc822)`); }
      console.log(lc);
      // await this.showModal(item);
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
      if (logalot) { console.log(`${lc} starting... (I: 4575a41e85144d06b472fe87f9d5ab22)`); }
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
      if (logalot) { console.log(`${lc} starting... (I: 65ccd3431238b114e1ea6d155bbb3722)`); }
      const toAddr = this.fullscreenIbGibAddr;
      delete this.fullscreenIbGibRel8nName;
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
