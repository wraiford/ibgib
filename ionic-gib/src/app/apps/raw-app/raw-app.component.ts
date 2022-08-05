import { Component, ChangeDetectorRef, Output, EventEmitter, ViewChild } from '@angular/core';
import { ScrollBaseCustomEvent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../../common/constants';
import { CommonService } from 'src/app/services/common.service';
import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { RawItem, RawViewComponent } from '../../views/raw-view/raw-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'ib-raw-app',
  templateUrl: './raw-app.component.html',
  styleUrls: ['./raw-app.component.scss'],
})
export class RawAppComponent extends IbgibComponentBase {

  protected lc: string = `[${RawAppComponent.name}]`;

  @Output()
  rawScrolled = new EventEmitter<ScrollBaseCustomEvent>();

  @Output()
  rawItemsAdded = new EventEmitter<RawItem[]>()

  @ViewChild('rawView')
  rawView: RawViewComponent;

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
      // don't pingLatest in raw app
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

  handleRawViewScroll(event: any): void {
    const lc = `${this.lc}[${this.handleRawViewScroll.name}]`;
    if (logalot) { console.log(`${lc} (I: )`); }
    this.rawScrolled.emit(event);
  }

  handleRawViewItemsAdded(items: RawItem[]): void {
    const lc = `${this.lc}[${this.handleRawViewItemsAdded.name}]`;
    if (logalot) { console.log(`${lc} (I: )`); }
    this.rawItemsAdded.emit(items);
  }
}
