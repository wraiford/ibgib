import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { IbGibAddr } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import * as c from '../constants';

const logALot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'app-ibgib-fullscreen-modal',
  templateUrl: './ibgib-fullscreen-modal.component.html',
  styleUrls: ['./ibgib-fullscreen-modal.component.scss'],
})
export class IbgibFullscreenModalComponent
  extends IbgibComponentBase
  implements OnInit, OnDestroy {

  protected lc: string = `[${IbgibFullscreenModalComponent.name}]`;

  protected debugBorderWidth: string = debugBorder ? "2px" : "0px"
  protected debugBorderColor: string = "#ae2b33";
  protected debugBorderStyle: string = "solid";

  @Input()
  get itemJson(): string {
    return this.item ? h.pretty(this.item) : "item falsy";
  }

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    super.ngOnInit();
    // setTimeout(async () => {
    //   console.log(` dismissing`)
    //   await this.modalController.dismiss({x: 1});
    // }, 2000);

    // this.ioniconItems = IONICONS.map(iconText => {
    //   if (logALot) { console.log(`${lc} ${iconText}`); }
    //   return {
    //     title: iconText,
    //     icon: iconText,
    //   };
    // });
    // this.ref.detectChanges();
    setTimeout(() => { this.ref.detectChanges(); }, 5000)
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logALot) { console.log(`${lc}`); }
  }

  // async handleItemClick(item: any): Promise<void> {
  //   const lc = `${this.lc}[${this.handleItemClick.name}]`;
  //   if (logALot) { console.log(`${lc} item: ${h.pretty(item)}`); }
  //   await this.modalController.dismiss(item);
  // }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logALot) { console.log(`${lc} updating...`); }
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logALot) { console.log(`${lc} updated.`); }
    }
  }

  async handleCancelClick(): Promise<void> {
    await this.common.modalController.dismiss();
  }
}
