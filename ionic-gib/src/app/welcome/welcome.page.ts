import {
  AfterViewInit, ChangeDetectorRef, Component,
  ElementRef, Input, OnInit, ViewChild,
} from '@angular/core';
import SwiperCore, {
  // properties
  Autoplay, Keyboard, Pagination, Scrollbar, Zoom,
  Mousewheel,
  Parallax,
  // effects
  EffectFade,
  EffectCube,
} from 'swiper';
import { IonicSlides } from '@ionic/angular';
SwiperCore.use([
  Autoplay, Keyboard, Pagination, Scrollbar, Zoom,
  Mousewheel,
  Parallax,
  // EffectFade,
  EffectCube,
  IonicSlides,
]);
import { Observable, Subscription } from 'rxjs';
import { concatMap, } from 'rxjs/operators';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../common/constants';
import { CommonService } from '../services/common.service';


const logalot = c.GLOBAL_LOG_A_LOT || false || true;

@Component({
  selector: 'ib-welcome',
  templateUrl: './welcome.page.html',
  styleUrls: ['./welcome.page.scss'],
})
export class WelcomePage implements OnInit, AfterViewInit {

  protected lc: string = `[${WelcomePage.name}]`;

  @Input()
  goToAddr: IbGibAddr;

  @Input()
  get goText1(): string { return 'mm...'; }

  @Input()
  get goText2(): string { return 'mhmm...'; }

  @Input()
  get goText3(): string { return this.goToAddr ? 'go' : 'wait for it...'; }

  private _subInitialized: Subscription;

  /**
   * Reference to the swiper control.
   *
   * @link https://ionicframework.com/docs/angular/slides#methods
   */
  slides: any;

  @ViewChild('ann')
  annCanvas: any;

  @ViewChild('rect')
  annRect: any;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {

  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 31919fc7d99af1e29bb4f92907572722)`); }

      while (!this.common.ibgibs.initialized$) {
        console.warn(`${lc} (UNEXPECTED) hacky wait while initializing ibgibs service (I: 4b917090ffb64734a42c3d481e5088fb)`);
        await h.delay(100);
      }

      // spins off
      this._subInitialized = this.common.ibgibs.initialized$.pipe(
        // leaving this here in case we need it. no perf penalty, just was
        // fooling arond with combining a purposeful delay for aesthetics
        concatMap(
          async () => {
            this.initializeGoToAddr();
            await h.delay(2000); // hmmm
            this._subInitialized.unsubscribe();
            delete this._subInitialized;
          },
        )
      ).subscribe();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngAfterViewInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c5fdaccbe1820defd4879ade33cd6a22)`); }

      setInterval(() => {
        window.requestAnimationFrame(() => this.draw());
      }, 16);

      setTimeout(() => {
        // debugger;
        // this.annRect.nativeElement.fill = 'pink';
      }, 1000);

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  setSwiperInstance(swiper: any) {
    this.slides = swiper;
  }

  /**
   * Initializes app components properties, NOT the actual special ibgib
   * on the ibgibs service. That should already be done.
   */
  async initializeGoToAddr(): Promise<void> {
    const lc = `${this.lc}[${this.initializeGoToAddr.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {

      const tagsIbGib = await this.common.ibgibs.getSpecialIbGib({type: "tags"});
      if (!tagsIbGib) { throw new Error(`tagsIbGib falsy. (E: f6d840cddd3c4880943cb562e217cec7)`); }

      /** pointer to the special tags index ibgib */
      const tagsAddr = h.getIbGibAddr({ibGib: tagsIbGib});

      /**
       * we want to get to the home tag, or at least any tag.

       * @default tagsAddr as a last resort.
       */
      let toAddr: IbGibAddr = tagsAddr;

      /** list of individual tag addresses */
      const tagAddrs = tagsIbGib.rel8ns[c.TAG_REL8N_NAME] || [];

      if (tagAddrs.length > 0) {
        const homeAddrFilter = tagAddrs.filter(x => x.startsWith('tag home'));
        if (homeAddrFilter?.length > 0) {
          if (homeAddrFilter?.length > 1) { console.warn(`${lc} (UNEXPECTED) we expected only one tag to start with 'tag home', but got more than one. (W: adb7da934c6f4c0393527ca1fdbff557)`); }
          toAddr = homeAddrFilter[0];
        } else {
          toAddr = tagAddrs[0];
        }
      }

      this.goToAddr = toAddr;
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  drawCount: number = 0;
  @Input()
  colorYo: string = 'purple';

  draw() {
    const lc = `${this.lc}[${this.draw.name}]`;
    try {
      // if (logalot) { console.log(`${lc} starting... (I: 04c012e367b8186b243f1422793f5a22)`); }

      // debugger;
      const canvas = <HTMLCanvasElement>this.annCanvas.nativeElement;
      const ctx = canvas.getContext('2d');


      canvas.height = canvas.width;
      const {height, width} = canvas;
      const centerX = Math.floor(width/2);
      const centerY = Math.floor(height/2);

      const earthRadiusAbs = 3959; // miles
      const sunRadiusAbs = 432690  ; // miles
      const earthOrbitAbs = sunRadiusAbs + earthRadiusAbs + 94_434_000;

      const scale = 1000;

      const earthOrbit = Math.floor(width/2.5);
      const earthRadius = earthRadiusAbs / earthOrbitAbs * earthOrbit;
      const moonOrbit = Math.ceil(earthRadius / 100);
      const sunRadius = sunRadiusAbs / earthOrbitAbs * earthOrbit * scale;
      // const sunRadius = 100 * earthRadius;
      // const earthRadius = Math.floor(height/100)
      // const sunRadius = Math.floor(height/3);

      // initialize
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(146, 237, 128, 1)';
      ctx.save();

      // Earth
      ctx.translate(centerX, centerY);
      const time = new Date();
      ctx.rotate(((2 * Math.PI) / 60) * time.getSeconds() + ((2 * Math.PI) / 60000) * time.getMilliseconds());
      ctx.translate(earthOrbit, 0);
      ctx.beginPath();
      // ctx.strokeStyle = 'rgba(146, 237, 128, 0.6)';
      ctx.strokeStyle = 'blue';
      ctx.arc(0, 0, earthRadius * scale, 0, 2 * Math.PI, false);
      ctx.fillStyle = 'blue';
      ctx.fill();
      // ctx.lineWidth = 2;
      // ctx.strokeStyle = 'blue';
      // ctx.arc(0, 0, earthRadius, 0, 2 * Math.PI, false);
      // ctx.stroke();
      // ctx.fillRect(0, -12, 40, 24); // Shadow
      // ctx.drawImage(earth, -12, -12);

      // Moon
      // ctx.save();
      // ctx.rotate(((2 * Math.PI) / 6) * time.getSeconds() + ((2 * Math.PI) / 6000) * time.getMilliseconds());
      ctx.translate(0, moonOrbit);
      ctx.beginPath();
      ctx.strokeStyle = 'purple';
      ctx.fillStyle = 'purple';
      // ctx.drawImage(moon, -3.5, -3.5);
      ctx.arc(5, 5, 10, 0, 2 * Math.PI, false);
      ctx.font = '8px serif';
      // ctx.strokeText('Hello world', 10, 50);
      ctx.strokeText('moon', 2, 1);
      ctx.restore();

      ctx.restore();


      // earth orbit
      // ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 1;
      ctx.arc(centerX, centerY, earthOrbit, 0, Math.PI * 2, false);
      ctx.stroke();

      // ctx.drawImage(sun, 0, 0, width, height);
      // ctx.restore();
      // ctx.restore();
      // ctx.beginPath();
      // ctx.translate(centerX, centerY);
      // ctx.fillStyle = 'yellow';
      // ctx.fill();
      // ctx.strokeStyle = 'yellow';
      // ctx.arc(centerX, centerY, sunRadius, 0, Math.PI * 2, false);
      // ctx.stroke();
      // ctx.restore();

      // window.requestAnimationFrame(this.draw);
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    // } finally {
      // if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  draw_context({
    canvas, ctx,
    width, height,
  }: {
    canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D,
    width: number, height: number,
  }) {
    const lc = `${this.lc}[${this.draw_context.name}]`;
    try {

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
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
  // async handleGo2(): Promise<void> {
  //   const lc = `${this.lc}[${this.handleGo2.name}]`;
  //   try {
  //     if (logalot) { console.log(`${lc} starting... (I: 1561fab49c0a4938aa323779f6efe59a)`); }

  //     this.slides.slideNext();

  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   } finally {
  //     if (logalot) { console.log(`${lc} complete.`); }
  //   }
  // }

  async handleGo3(): Promise<void> {
    const lc = `${this.lc}[${this.handleGo3.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: edb23b7355c97d364a6e89d91a024322)`); }

      this.common.nav.go({
        toAddr: this.goToAddr,
        fromAddr: undefined,
        force: true,
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
