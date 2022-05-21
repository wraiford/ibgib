import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import { IconItem } from '../types/ux';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'choose-icon-modal',
  templateUrl: './choose-icon-modal.component.html',
  styleUrls: ['./choose-icon-modal.component.scss'],
})
export class ChooseIconModalComponent implements OnInit, OnDestroy {

  protected lc: string = `[${ChooseIconModalComponent.name}]`;

  @Input()
  items: IconItem[] = c.IONICONS.map(iconText => {
      // if (logalot) { console.log(`${this.lc} ${iconText}`); }
      return {
        title: iconText,
        icon: iconText,
      };
    });


  constructor(
    private modalController: ModalController,
    private ref: ChangeDetectorRef,
  ) { }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${this.lc}`); }
    setTimeout(() => { this.ref.detectChanges(); }, 5000)
    // await super.ngOnInit();
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  async handleItemClick(item: any): Promise<void> {
    const lc = `${this.lc}[${this.handleItemClick.name}]`;
    if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }
    await this.modalController.dismiss(item);
  }

  async handleCancelClick(): Promise<void> {
    await this.modalController.dismiss();
  }
}
