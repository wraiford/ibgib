import {
  Component, OnInit, ChangeDetectorRef, Input
} from '@angular/core';
import SwiperCore, {
  // properties
  Autoplay, Keyboard, Pagination, Scrollbar, Zoom,
  Navigation,
  Mousewheel,
  Parallax,
  // effects
  EffectFade,
  EffectCube,
} from 'swiper';
import { IonicSlides } from '@ionic/angular';
SwiperCore.use([
  Autoplay, Keyboard, Pagination, Scrollbar, Zoom,
  Navigation,
  Mousewheel,
  Parallax,
  // EffectFade,
  EffectCube,
  IonicSlides,
]);

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';

import * as c from '../../common/constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Component({
  selector: 'pic-view',
  templateUrl: './pic-view.component.html',
  styleUrls: ['./pic-view.component.scss'],
})
export class PicViewComponent
  extends IbgibComponentBase
  implements OnInit {

  protected lc: string = `[${PicViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  /**
   * Reference to the swiper control.
   *
   * @link https://ionicframework.com/docs/angular/slides#methods
   */
  slides: any;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
   }

  async ngOnInit(): Promise<void> {
    if (logalot) { console.log(`${this.lc} addr: ${this.addr}`); }
    await super.ngOnInit();
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await this.smallDelayToLoadBalanceUI();
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
      if (!this.paused) {
        this.item.refreshing = true;
        setTimeout(async () => {
          await this.common.ibgibs.pingLatest_Local({ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: true});
        });
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated (I: 85b00398f851cc57dc5aeda673ba5222)`); }
    }
  }

  setSwiperInstance(swiper: any) {
    this.slides = swiper;
  }

  async handleNextSlide(): Promise<void> {
    const lc = `${this.lc}[${this.handleNextSlide.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 92cfc3686e7b42d5b4c09842b16125b5)`); }

      this.slides.slideNext();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}

