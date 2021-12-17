import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import { SyncSpaceInfo } from '../types';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'create-outerspace-modal',
  templateUrl: './create-outerspace-modal.component.html',
  styleUrls: ['./create-outerspace-modal.component.scss'],
})
export class CreateOuterspaceModalComponent implements OnInit, OnDestroy {

  protected lc: string = `[${CreateOuterspaceModalComponent.name}]`;

  @Input()
  item: SyncSpaceInfo;

  constructor(
    private modalController: ModalController,
  ) { }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  async handleCreateClick(item: any): Promise<void> {
    const lc = `${this.lc}[${this.handleCreateClick.name}]`;
    if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }
    debugger;
    await this.modalController.dismiss(item);
  }

  async handleCancelClick(): Promise<void> {
    await this.modalController.dismiss();
  }
}
