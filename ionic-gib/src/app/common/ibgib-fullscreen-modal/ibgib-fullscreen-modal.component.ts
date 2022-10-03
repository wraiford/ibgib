import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import SwiperCore, {
  Zoom,
  Swiper,
} from 'swiper';
import { IonicSlides } from '@ionic/angular';
SwiperCore.use([
  Zoom,
  IonicSlides,
]);

import { IbGibAddr } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';


const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-ibgib-fullscreen-modal',
  templateUrl: './ibgib-fullscreen-modal.component.html',
  styleUrls: ['./ibgib-fullscreen-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class IbgibFullscreenModalComponent
  extends IbgibComponentBase
  implements OnInit, OnDestroy {

  protected lc: string = `[${IbgibFullscreenModalComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#ae2b33";
  public debugBorderStyle: string = "solid";

  @Input()
  get itemJson(): string {
    return this.item ? h.pretty(this.item) : "item falsy";
  }

  /**
   * Reference to the primary horizontal swiper control.
   *
   * @link https://ionicframework.com/docs/angular/slides#methods
   */
  mainSwiper: Swiper;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    await super.ngOnInit();
    setTimeout(() => { this.ref.detectChanges(); }, 1000) // why am I doing this?
  }

  async ngOnDestroy(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
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

  async handleCancelClick(): Promise<void> {
    await this.common.modalController.dismiss();
  }

}
