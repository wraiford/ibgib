import {
  AfterViewInit, ChangeDetectorRef, Component,
  ElementRef, Input, OnInit, ViewChild,
} from '@angular/core';
import SwiperCore, {
  // properties
  Autoplay, Keyboard, Pagination, Scrollbar, Zoom,
  Mousewheel, FreeMode,
  Parallax,
  // effects
  EffectFade,
  EffectCube,
  Swiper,
  Navigation,
} from 'swiper';
import { IonicSlides } from '@ionic/angular';
SwiperCore.use([
  Autoplay, Keyboard, Pagination, Scrollbar, Zoom,
  Navigation,
  Mousewheel,
  Parallax,
  FreeMode,
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
import { ibCircle, ibGroup, ibLine, ibSvg, SVG_NAMESPACE } from '../common/helper/svg';


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
  get goText3(): string {
    const tldrLabel = 'tl;dr';
    const goLabel = this.goToAddr ? 'go' : 'wait for it...';
    // return 'go';
    return this.mainSwiper?.realIndex < this.mainSwiper?.slides?.length - 1 ?
      tldrLabel :
      goLabel;
  }

  swipers: {[name: string]: Swiper} = {};

  @Input()
  verticalSwiperTidbits: { [name: string]: VerticalSwiperTidbit[] } = {
    intro: IBGIB_APP_INTRO,
    protocol: IBGIB_PROTOCOL_FEATURES,
    app: IBGIB_APP_FEATURES,
    rethinks: IBGIB_RETHINKS,
  };

  private _subInitialized: Subscription;

  /**
   * Reference to the primary horizontal swiper control.
   *
   * @link https://ionicframework.com/docs/angular/slides#methods
   */
  mainSwiper: Swiper;

  @ViewChild('ann')
  annCanvas: any;

  @ViewChild('rect')
  annRect: any;

  @ViewChild('svg1')
  svg1: ElementRef;

  @ViewChild('svgContainer')
  svgContainer: ElementRef;

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

      // hack because the animation doesn't seem to draw first time on my
      // android phone.
      let hackyDelayMs = 100;
      const longerWait: any = ['android', 'ios'];
      for (let i = 0; i < longerWait.length; i++) {
        const x = longerWait[i];
        if (this.common.platform.is(x)) {
          hackyDelayMs = 500;
          break;
        }
      }
      setTimeout(async () => { await this.drawAnimation(); }, hackyDelayMs);

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Unlike SVG positioning, the origin here is in the center.
   */
  async drawIbGibDiagram({
    svg,
    g,
    info,
  }: {
    svg?: SVGElement,
    g?: SVGGElement,
    info: IbGibDiagramInfo
  }): Promise<void> {
    const lc = `${this.lc}[${this.drawIbGibDiagram.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 063458857311a30ff84d511b32aab722)`); }

      if (!svg && !g) {throw new Error(`either svg or g required. (E: c350ceba1d542d642fc61e47d7f76422)`); }

      if (svg && g) { console.warn(`${lc} (UNEXPECTED) only svg or g is expected. Using g. (W: 523e10f56b7645b981ed91d59aec50d9)`) }

      // from = from || {x:0, y:0}; from.x = from.x ?? 0; from.y = from.y ?? 0;
      // to = to || {x:0, y:0}; to.x = to.x ?? 0; to.y = to.y ?? 0;

      const fill = info.fill ?? 'green'; // arbitrary
      const stroke = info.stroke ?? 'black'; // arbitrary
      const strokeWidth = info.strokeWidth ?? '1px';
      const opacity = info.opacity ?? 1.0;
      const radius = info.radius ?? 10; // arbitrary

      if (info.mode === 'intrinsic') {
        // const diam = radius * 2;
        const width = svg.clientWidth;
        const height = svg.clientHeight;
        const centerX = Math.floor(width/2);
        const centerY = Math.floor(height/2);
        let [xStart, yStart] = info.startPos;
        let [cx, cy] = info.pos;
        let circle: SVGCircleElement;
        if (g) {
          circle = ibCircle({ parent: g, cx, cy, r: radius, fill, stroke, strokeWidth, opacity });
        } else {
          // translate to center-based coordinates
          circle = ibCircle({ parent: svg, cx: centerX + cx, cy: centerY + cy, r: radius, fill, stroke, strokeWidth, opacity });
        }

        // <!-- <animateMotion
        //    path="M 250,80 H 50 Q 30,80 30,50 Q 30,20 50,20 H 250 Q 280,20,280,50 Q 280,80,250,80Z"
        //    dur="3s" repeatCount="indefinite" rotate="auto" /> -->
        if (xStart !== cx || yStart !== cy) {
          let animation = document.createElementNS(SVG_NAMESPACE, 'animateMotion');
          // let path = `M0,0 L${cx},${cy} L${centerX},${centerY} L${fromX},${fromY}`;
          let path = `M${xStart-cx},${yStart-cy} L0,0`;
          animation.setAttribute('path', path);
          animation.setAttribute('dur', '2s');
          // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/additive
          animation.setAttribute('additive', 'replace');
          // animation.setAttribute('repeatCount', 'indefinite');
          // animation.setAttribute('rotate', 'auto');
          circle.appendChild(animation);
        }

        if (info.infos?.length > 0) {
          let group: SVGGElement;
          if (g) {
            group = ibGroup({
              parent: g ?? svg,
              x: cx, y: cy,
              width: 2*radius, height: 2*radius,
              fill, opacity,
            });
          } else {
            group = ibGroup({
              parent: g ?? svg,
              x: cx + centerX, y: cy + centerY,
              width: 2*radius, height: 2*radius,
              fill, opacity,
            });
          }
          await Promise.all(
            info.infos.map(info => this.drawIbGibDiagram({svg: group, info})),
          );
        }


        // this.addWobble(circle);
      } else if (info.mode = 'extrinsic') {
        // const diam = radius * 2;
        const width = svg.clientWidth;
        const height = svg.clientHeight;
        const centerX = Math.floor(width/2);
        const centerY = Math.floor(height/2);
        let [x1, y1] = info.startPos;
        let [x2, y2] = info.pos;
        let line: SVGLineElement;
        if (g) {
          line = ibLine({ parent: g, x1y1: [x1, y1], x2y2: [x2, y2], stroke, strokeWidth, opacity });
        } else {
          // translate to center-based coordinates
          line = ibLine({ parent: svg, x1y1: [centerX + x1, centerY + y1], x2y2: [centerX + x2, centerY + y2], stroke, strokeWidth, opacity });
        }

        // <!-- <animateMotion
        //    path="M 250,80 H 50 Q 30,80 30,50 Q 30,20 50,20 H 250 Q 280,20,280,50 Q 280,80,250,80Z"
        //    dur="3s" repeatCount="indefinite" rotate="auto" /> -->
        if (x1 !== x2 || y1 !== y2) {
          let animation = document.createElementNS(SVG_NAMESPACE, 'animateMotion');
          // let path = `M0,0 L${x2},${y2} L${centerX},${centerY} L${fromX},${fromY}`;
          let path = `M${x1-x2},${y1-y2} L0,0`;
          animation.setAttribute('path', path);
          animation.setAttribute('dur', '2s');
          // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/additive
          animation.setAttribute('additive', 'replace');
          // animation.setAttribute('repeatCount', 'indefinite');
          // animation.setAttribute('rotate', 'auto');
          line.appendChild(animation);
        }

        if (info.infos?.length > 0) {
          // doesn't throw
          console.error(`${lc} (UNEXPECTED) children infos ignored for extrinsic rel8ns atm (E: db61f073cf884a0ca69509f1640f5790)`);
        }

        // this.addWobble(line);
      } else {
        throw new Error(`(UNEXPECTED) unknown info.mode: ${info.mode} (E: 1a203a5a173258a309fcac813ff6c422)`);
      }

      // <animateTransform attributeName="transform"
      //                     attributeType="XML"
      //                     type="rotate"
      //                     from="0 60 70"
      //                     to="360 60 70"
      //                     dur="10s"
      //                     repeatCount="indefinite"/>


    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // doesn't rethrow
      // throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  addWobble(svgElement: any): void {
    const lc = `${this.lc}[${this.addWobble.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 6c2264ba2a7161a90c0bc7f55de71f22)`); }

      const durIncrementMs = 200;
      const delayMs = 0;

      let wobbleSkew = document.createElementNS(SVG_NAMESPACE, 'animateTransform');
      wobbleSkew.setAttribute('attributeName', "transform");
      wobbleSkew.setAttribute('attributeType', "XML");
      wobbleSkew.setAttribute('type', 'skewX');
      wobbleSkew.setAttribute('from', '0');
      wobbleSkew.setAttribute('to', '-10');
      wobbleSkew.setAttribute('dur', `${durIncrementMs}ms`);
      wobbleSkew.setAttribute('begin', `${delayMs}ms`);

      let wobbleScale = document.createElementNS(SVG_NAMESPACE, 'animateTransform');
      wobbleScale.setAttribute('attributeName', "transform");
      wobbleScale.setAttribute('attributeType', "XML");
      wobbleScale.setAttribute('type', 'scale');
      wobbleScale.setAttribute('from', '1');
      wobbleScale.setAttribute('to', '1.03');
      wobbleScale.setAttribute('dur', `${durIncrementMs}ms`);
      wobbleScale.setAttribute('begin', `${delayMs}ms`);
      // wobble.setAttribute('additive', 'replace');
      // wobble.setAttribute('repeatCount', 'indefinite');

      // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/additive
      // wobble.setAttribute('repeatCount', 'indefinite');
      // wobble.setAttribute('rotate', 'auto');

      let wobbleRotate = document.createElementNS(SVG_NAMESPACE, 'animateTransform');
      wobbleRotate.setAttribute('attributeName', "transform");
      wobbleRotate.setAttribute('attributeType', "XML");
      wobbleRotate.setAttribute('type', 'rotate');
      wobbleRotate.setAttribute('from', '0');
      wobbleRotate.setAttribute('to', '360');
      wobbleRotate.setAttribute('dur', `${durIncrementMs}ms`);
      wobbleRotate.setAttribute('begin', `${delayMs}ms`);

      svgElement.appendChild(wobbleSkew);
      svgElement.appendChild(wobbleScale);
      svgElement.appendChild(wobbleRotate);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  setMainSwiperInstance(swiper: any) { this.mainSwiper = swiper; }

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
  async handleSVGClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleSVGClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: acf063419a78888b3fb2a8ef178d7f22)`); }
      await this.drawAnimation();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async drawAnimation(): Promise<void> {
    const lc = `${this.lc}[${this.drawAnimation.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: b697fe4240b79a7115f8948861b09122)`); }
      if (!this.svgContainer) {
        return;
      }
      // first diagram, one scope
      const div: HTMLDivElement = this.svgContainer.nativeElement;

      // if already has svg, remove it
      let hadChildren = false;
      if (div.childNodes?.length === 1) {
        div.removeChild(div.lastChild);
        hadChildren = true;
      }

      let svg = ibSvg({width: 300, height: 300});
      svg.addEventListener('click', (() => {
        this.drawAnimation();
      }))
      div.appendChild(svg);

      window.requestAnimationFrame(async () => {
        let centerX = Math.floor(svg.clientWidth/2);
        let centerY = Math.floor(svg.clientHeight/2);
        let mainPositionX = 80;
        let noise = Math.random() * 0.0001; // force reanimation?
        let g_radius = Math.floor(centerX * 0.99);

        const greenish = '#47a135';
        const purplish = '#53118e';

        const primaryColor_left = greenish;
        const secondaryColor_left = purplish;
        const tertiaryColor_left = 'white';
        const primaryColor_right = secondaryColor_left;
        const secondaryColor_right = primaryColor_left;
        const tertiaryColor_right = 'black';

        /**
         * If I draw the background in the same group, then its
         * opacity will carry over and I want separate opacities.
         */
        const gTranslucent: IbGibDiagramInfo = {
          // background/context
          startPos: [0,0],
          pos: [0,0],
          fill: primaryColor_left,
          stroke: '#53118e',
          mode: 'intrinsic',
          opacity: 0.16,
          radius: g_radius,
        };
        /**
         * this g contains the other ibgib infos and has full opacity.
         */
        const gTransparent: IbGibDiagramInfo = h.clone(gTranslucent);
        gTransparent.fill = 'transparent';
        delete gTransparent.opacity;


        const ib_distanceX = Math.floor(g_radius * 0.37);
        const ib_distanceY = -Math.floor(g_radius * 0.37);
        const ib_radius = Math.floor(g_radius * 0.42);
        const i_distanceX = (Math.floor(ib_radius * 0.37));
        const i_distanceY = Math.floor(ib_radius * 0.3);
        const i_radius = Math.floor(ib_radius * 0.2);
        // const b_distanceX = -(Math.floor(i_distanceX * 0.99));
        const b_distanceX = -Math.floor(i_radius* 1.2);
        const b_distanceY = -Math.floor(i_distanceY * 0.99);
        const b_radius = Math.floor(ib_radius * 0.4);

        // left
        const i_left: IbGibDiagramInfo = {
          startPos: [0,0],
          pos: [-i_distanceX,-i_distanceY],
          mode: 'intrinsic',
          fill: primaryColor_left,
          stroke: tertiaryColor_left,
          radius: i_radius,
        };
        const b_left: IbGibDiagramInfo = {
          startPos: [0,0],
          pos: [-b_distanceX,-b_distanceY],
          mode: 'intrinsic',
          fill: primaryColor_left,
          stroke: tertiaryColor_left,
          radius: b_radius,
        };
        const i_line_left: IbGibDiagramInfo = {
          startPos: [i_left.pos[0], i_left.pos[1]+i_radius],
          pos: [i_left.pos[0],b_left.pos[1]],
          mode: 'extrinsic',
          stroke: tertiaryColor_left,
        };
        const b_line_left: IbGibDiagramInfo = {
          startPos: [b_left.pos[0]-b_radius, b_left.pos[1]],
          pos: [b_left.pos[0]-b_radius,i_left.pos[1]],
          mode: 'extrinsic',
          stroke: tertiaryColor_left,
        };
        const ib_left: IbGibDiagramInfo = {
          startPos: [0,0],
          pos: [-ib_distanceX,-ib_distanceY],
          mode: 'intrinsic',
          stroke: primaryColor_left,
          // fill: 'transparent',
          fill: secondaryColor_left,
          radius: ib_radius,
          infos: [ i_left, b_left, i_line_left, b_line_left ],
        }

        // right
        const i_right: IbGibDiagramInfo = {
          startPos: [0,0],
          pos: [-i_distanceX,-i_distanceY],
          mode: 'intrinsic',
          fill: primaryColor_right,
          radius: i_radius,
        };
        const b_right: IbGibDiagramInfo = {
          startPos: [0,0],
          pos: [-b_distanceX,-b_distanceY],
          mode: 'intrinsic',
          fill: primaryColor_right,
          radius: b_radius,
        };
        const i_line_right: IbGibDiagramInfo = {
          startPos: [i_right.pos[0], i_right.pos[1]+i_radius],
          pos: [i_right.pos[0],b_right.pos[1]],
          mode: 'extrinsic',
          stroke: tertiaryColor_right,
        };
        const b_line_right: IbGibDiagramInfo = {
          startPos: [b_right.pos[0]-b_radius, b_right.pos[1]],
          pos: [b_right.pos[0]-b_radius,i_right.pos[1]],
          mode: 'extrinsic',
          stroke: tertiaryColor_right,
        };
        const ib_right: IbGibDiagramInfo = {
          startPos: [0,0],
          pos: [ib_distanceX,ib_distanceY],
          mode: 'intrinsic',
          // fill: 'blue',
          radius: ib_radius,
          stroke: primaryColor_right,
          // fill: 'transparent',
          fill: secondaryColor_right,
          // infos: [ i_right, b_right ],
          infos: [ i_right, b_right, i_line_right, b_line_right ],
        }


        const g_line_theta = Math.atan(ib_distanceY/ib_distanceX);
        const g_line: IbGibDiagramInfo = {
          // bottom left edge of right ib
          startPos: [
            ib_right.pos[0]-(ib_radius * Math.cos(g_line_theta)),
            ib_right.pos[1]+(ib_radius * Math.cos(g_line_theta))
          ],
          // top right edge of left ib
          pos: [
            ib_left.pos[0]-(ib_radius * Math.sin(g_line_theta)),
            ib_left.pos[1]+(ib_radius * Math.sin(g_line_theta))
          ],
          mode: 'extrinsic',
          stroke: primaryColor_left,
          strokeWidth: '5px',
        };

        gTransparent.infos = [
          ib_left,
          ib_right,
          g_line,
        ];

        await this.drawIbGibDiagram({ svg: svg, info: gTranslucent, });
        await this.drawIbGibDiagram({ svg: svg, info: gTransparent, });
        this.addWobble(svg);
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handlePrevSlide(): Promise<void> {
    const lc = `${this.lc}[${this.handleNextSlide.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 92cfc3686e7b42d5b4c09842b16125b5)`); }

      this.mainSwiper.slidePrev();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleCheers(): Promise<void> {
    const lc = `${this.lc}[${this.handleCheers.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 92cfc3686e7b42d5b4c09842b16125b5)`); }

      await this.drawAnimation();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleNextSlide(): Promise<void> {
    const lc = `${this.lc}[${this.handleNextSlide.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 92cfc3686e7b42d5b4c09842b16125b5)`); }

      this.mainSwiper.slideNext();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleMainSwiperSlideChange(): Promise<void> {
    const lc = `${this.lc}[${this.handleMainSwiperSlideChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: aa2fd63301d972d9775962e4b97d3422)`); }

      await this.drawAnimation();

      console.log(`${lc} this.slides.realIndex: ${this.mainSwiper.realIndex}`);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      setTimeout(() => this.ref.detectChanges());
    }
  }

  async handleGo(): Promise<void> {
    const lc = `${this.lc}[${this.handleGo.name}]`;
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

  handleSwiper(swiper: Swiper, name: SwiperName): void {
    const lc = `${this.lc}[${this.handleSwiper.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 4d902363fd616dd0c880935e3f321e22)`); }

      this.swipers[name] = swiper;
      // this.handleVertSlideChange(swiper, name);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  handleVertSlideChange(swiper: Swiper, name: SwiperName): void {
    const lc = `${this.lc}[${this.handleVertSlideChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 4b0c5cdf25a14dec9c64c196ee790ce3)`); }

      if (!this.swipers[name]) {
        if (logalot) { console.log(`${lc} this.swipers[${name}] falsy. returning (I: b0a3640e47390b617bbdd3b56003cc22)`); }
        return;
      }

      const tidbits = this.verticalSwiperTidbits[name];
      tidbits.forEach(x => x.focused = false);

      const i = (swiper.realIndex ?? 0) + 1 < tidbits.length ? (swiper.realIndex ?? 0) + 1 : 0;
      tidbits[i].focused = true;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}

type DiagramPosition = [number,number];

type IbGibDiagramMode = 'intrinsic' | 'extrinsic';
const IbGibDiagramMode = {
  /**
   * we're viewing the thing intrinsically as a thing on its own, i.e.,
   * not as a relationship that connects other things.
   */
  intrinsic: 'intrinsic' as IbGibDiagramMode,
  /**
   * we're viewing the thing extrinsically as a relationship connecting two
   * other things.
   */
  extrinsic: 'extrinsic' as IbGibDiagramMode,
}

/**
 * node, line, hoogle, whatever
 */
interface IbGibDiagramInfo {
  /**
   * If the mode is {@link IbGibDiagramMode.intrinsic}, then this is where does
   * the thing START in placement of animation.
   *
   * If {@link IbGibDiagramMode.extrinsic}, this is one endpoint position.
   */
  startPos?: DiagramPosition;
  /**
   * If the mode is {@link IbGibDiagramMode.intrinsic}, then this is where does
   * the thing STOP in placement of animation.
   *
   * If {@link IbGibDiagramMode.extrinsic}, this is one endpoint position.
   */
  pos?: DiagramPosition;
  /**
   * Graphs are thought of as nodes and edges (or whatever jargon you use).  But
   * they "aren't" nodes and edges, we are viewing them as nodes and edges. They
   * "are" just they, and we are creating proxy "theys" in a heuristic that we
   * like at the time.
   */
  mode?: IbGibDiagramMode;
  /**
   * composite "children".
   */
  infos?: IbGibDiagramInfo[];
  /**
   * fill color, if applicable.
   *
   * @optional
   */
  fill?: string;
  /**
   * stroke color, if applicable.
   *
   * @optional
   */
  stroke?: string;
  /**
   * width of the stroke
   *
   * @optional
   */
  strokeWidth?: string;
  /**
   * If given, will specify opacity of visual thing in diagram.
   *
   * @optional
   */
  opacity?: number;
  /**
   * If given, will set the radius of the thing.
   *
   * @optional
   */
  radius?: number;
}

const IBGIB_APP_INTRO: VerticalSwiperTidbit[] = [
  {
    title: `focus on time, repo of repos`,
    body: `ibgib is a dlt protocol that focuses on Time as a first-class citizen. it utilizes both blockchain-style linked lists of named merkle links, as well as dag-style merkle hash trees, with two key relationships: "past" and "ancestor". this enables "on-chain" version-controlled data. think meta-git for anything, including its own self-bootstrapping metadata (configuration).`,
  },
  {
    focused: true,
    title: `this app...`,
    body: `this app is only a prototype leveraging the unique architecture of the ibgib protocol. it is a general-purpose dapp, already able to do some pretty cool stuff, like synchronization via a branch timeline merging strategy. but it's the _approach_ that will enable truly distributed computation.`,
  },
  {
    title: `decentralized collaboration`,
    body: `with humans, this distributed computation means collaboration; with microservices, streamlined interop; with ais and ml models, the future - a biological approach for meta-evolutionary models.`,
  },
];

const IBGIB_PROTOCOL_FEATURES: VerticalSwiperTidbit[] = [
  {
    title: `currency is attention`,
    body: `currency/money, admittedly a domain i'm no expert in, is only one part in a larger architecture. in ibgib it is understood to be isomorphic to interneuronal weights in ANNs.`,
  },
  {
    title: `a protocol apart`,
    body: `ibgib is unique on this earth. born apart from bitcoin, the protocol does not inherit its technical debt. `,
  },
  {
    title: `monotonically increasing...`,
    body: `blockchains tries to keep around all data forever as absolute, objective truths. this is both inaccurate and intractable.`,
  },
  {
    title: `...but severable data`,
    body: `ibgib protocol empowers projected timeline dynamics. like dna, which can both fork and evolve, so can ibgib data (hint: it uses dna).`,
  },
  {
    title: `other dlts try to hard-code consensus`,
    body: `consensus is as consensus does. ibgib's protocol enables ad-hoc consensus architecture, with the configuration itself being "on-chain".`
  }
];

const IBGIB_APP_FEATURES: VerticalSwiperTidbit[] = [
  {
    title: `"chat"`,
    body: `not really great for chat atm, but it can limp along...`,
  },
  {
    focused: true,
    title: `notes, pics & links`,
    body: `take notes, pics. store links. You can add pics inside pics, notes inside notes, pics inside notes, links inside pics...`,
  },
  {
    title: `data synchronization`,
    body: `currently the prototype has an adapter implemented to utilize the user's aws infrastructure: dynamodb & s3. once configured, you can sync among spaces.`,
  },
];



const IBGIB_RETHINKS: VerticalSwiperTidbit[] = [
  {
    title: `what is money?`,
    body: `we must rethink money to understand how bitcoin/dlt fit into our future. not being a token, ibgib focuses on "money" as precisely analogous to voltage bias in neural networks in superhuman networks.`,
  },
  {
    focused: true,
    title: `wth is or are ibgib(s)?`,
    body: `moving away from an absolute knowledge, an ibgib can be thought of as a snapshot of some pov's belief which inevitably evolves over time. this fundamentally requires a Rethink of truths many of us may take for granted.`,
  },
  {
    focused: false,
    title: `what are files & folders?`,
    body: `in the early days of computing, we were taught about files & folders. with ibgib, we rethink this paradigm, remove the training wheels & grow .`,
  },
  {
    title: `what is data?`,
    body: `my data, your data, centralized & decentralized...in ibgib, we rethink data itself from the naive finite Shannon information perspective to living, sovereign & infinite entities.`,
  },
  {
    title: `what are apps?`,
    body: `just as we rethink our data, so too we rethink apps. no longer silos of activity, apps become living views into living data ecosystems.`,
  },
];

interface VerticalSwiperTidbit {
  focused?: boolean;
  title: string;
  body: string;
}

type SwiperName = 'intro' | 'protocol' | 'app' | 'rethinks';