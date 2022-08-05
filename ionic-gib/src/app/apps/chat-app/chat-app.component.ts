import { Component, ChangeDetectorRef, Output, EventEmitter, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../../common/constants';
import { CommonService } from 'src/app/services/common.service';
import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { ChatItem, ChatViewComponent } from '../../views/chat-view/chat-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'ib-chat-app',
  templateUrl: './chat-app.component.html',
  styleUrls: ['./chat-app.component.scss'],
})
export class ChatAppComponent extends IbgibComponentBase implements OnInit, OnDestroy {

  protected lc: string = `[${ChatAppComponent.name}]`;

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
    this.chatItemsAdded.emit(items);
  }
}
