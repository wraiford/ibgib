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
import { ibCircle, ibGroup, ibSvg, SVG_NAMESPACE } from '../common/helper/svg';


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

  @Input()
  posers: string[] = IBGIB_POSERS;

  @Input()
  rethinks: VerticalSwiperTidbit[] = IBGIB_RETHINKS;

  private _subInitialized: Subscription;

  /**
   * Reference to the swiper control.
   *
   * @link https://ionicframework.com/docs/angular/slides#methods
   */
  slides: Swiper;

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

      // setInterval(() => {
      //   window.requestAnimationFrame(() => this.draw());
      // }, 16);

      setTimeout(async () => {
        // debugger;
        // this.annRect.nativeElement.fill = 'pink';

        await this.drawAnimation();
      }, 16);

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
      const opacity = info.opacity ?? 1.0;
      const radius = info.radius ?? 10; // arbitrary

      if (info.mode === 'intrinsic') {
        const diam = radius * 2;
        const width = svg.clientWidth;
        const height = svg.clientHeight;
        const centerX = Math.floor(width/2);
        const centerY = Math.floor(height/2);
        let [xStart, yStart] = info.startPos;
        let [cx, cy] = info.pos;
        let circle: SVGCircleElement;
        if (g) {
          circle = ibCircle({ parent: g, cx, cy, r: radius, fill, stroke, opacity });
        } else {
          // translate to center-based coordinates
          circle = ibCircle({ parent: svg, cx: centerX + cx, cy: centerY + cy, r: radius, fill, stroke, opacity });
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


      } else if (info.mode = 'extrinsic') {

      } else {
        throw new Error(`(UNEXPECTED) unknown info.mode: ${info.mode} (E: 1a203a5a173258a309fcac813ff6c422)`);
      }


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
      // svg.parentNode.replaceChild(svg.cloneNode(false), svg);

      // let hadChildren = false;
      // if (svg.childNodes?.length > 0) {
      //   while(svg.childNodes?.length > 0) {
      //     svg.removeChild(svg.lastChild);
      //   }
      //   this.ref.detectChanges();
      //   hadChildren = true;
      // }
      window.requestAnimationFrame(async () => {
        let centerX = Math.floor(svg.clientWidth/2);
        let centerY = Math.floor(svg.clientHeight/2);
        let mainPositionX = 80;
        let noise = Math.random() * 0.0001; // force reanimation?

        await this.drawIbGibDiagram({
          svg: svg,
          info: {
            // background/context
            startPos: [0,0],
            pos: [0,0],
            fill: 'transparent',
            stroke: 'transparent',
            // from: [centerX,centerY],
            // pos: [centerX,centerY],
            mode: 'intrinsic',
            // opacity: 0.05,
            radius: Math.floor(centerX * 0.9),
            infos: [
              // left
              {
                startPos: [0,0],
                pos: [-mainPositionX,0],
                // from: [centerX,centerY],
                // pos: [centerX,centerY],
                mode: 'intrinsic',
                // opacity: 0.05,
                fill: 'blue',
                radius: Math.floor(centerX * 0.5),
                infos: [
                  // testing yo
                  {
                    startPos: [0,0],
                    pos: [-50,-50],
                    mode: 'intrinsic',
                    fill: 'red',
                    opacity: 1,
                  },
                  {
                    startPos: [0,0],
                    pos: [-50,0],
                    mode: 'intrinsic',
                    fill: 'blue',
                    opacity: 1,
                  },
                  {
                    startPos: [0,0],
                    pos: [-50,50],
                    mode: 'intrinsic',
                    fill: 'green',
                    opacity: 1,
                  },
                  // {
                  //   from: [0,0],
                  //   pos: [100,100],
                  //   mode: 'intrinsic',
                  //   fill: 'pink',
                  //   opacity: 1,
                  //   stroke: 'white',
                  // }
                ]
              },

              // right
              {
                startPos: [0,0],
                pos: [mainPositionX,0],
                // from: [centerX,centerY],
                // pos: [centerX,centerY],
                mode: 'intrinsic',
                fill: hadChildren ? 'red' : 'yellow',
                // opacity: 0.05,
                radius: Math.floor(centerX * 0.5),
                infos: [
                  // testing yo
                  {
                    startPos: [0,0],
                    pos: [-50,-50],
                    mode: 'intrinsic',
                    fill: 'red',
                    opacity: 1,
                  },
                  {
                    startPos: [0,0],
                    pos: [-50,0],
                    mode: 'intrinsic',
                    fill: 'blue',
                    opacity: 1,
                  },
                  {
                    startPos: [0,0],
                    pos: [-50,50],
                    mode: 'intrinsic',
                    fill: 'green',
                    opacity: 1,
                  },
                  // {
                  //   from: [0,0],
                  //   pos: [100,100],
                  //   mode: 'intrinsic',
                  //   fill: 'pink',
                  //   opacity: 1,
                  //   stroke: 'white',
                  // }
                ]
              }
            ]
          }

        });
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

      this.slides.slidePrev();

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

      this.slides.slideNext();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSlideChange(): Promise<void> {
    const lc = `${this.lc}[${this.handleSlideChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: aa2fd63301d972d9775962e4b97d3422)`); }

      await this.drawAnimation();

      console.log(`${lc} this.slides.activeIndex: ${this.slides.activeIndex}`);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
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

  async handleRethinksSlideChange(event: Swiper): Promise<void> {
    const lc = `${this.lc}[${this.handleRethinksSlideChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: cc3ee923b3f64ea23629da8383667b22)`); }

      event.activeIndex
      this.rethinks.forEach(x => x.focused = false);
      /** dunno what swiper thinks of as activeIndex. Probably complicated. */
      const mappedIndex = (event.activeIndex - 2) % this.rethinks.length;
      if (mappedIndex >= 0 && mappedIndex < this.rethinks.length) {
        this.rethinks[mappedIndex].focused = true;
      }
      // console.dir(event);

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


const IBGIB_POSERS = [
  `requirement: how can i create a plugin engine wherein the plugin engine itself is pluggable?`,
  `foundational: if i make a single error, any statement i make - including mathematical axioms, corrolaries and "proofs" - have a non-zero probability of being in error.`,
  `sticky: why is the term 'negligible' so ubiquitous math?`,
  `sticky: why does the brain never fall asleep?`,
  `logic: sock drawer, 2 black, 2 white, min number to guarantee matching pair -> can never guarantee absolutely, only against some ruler that can be invalid at any time.`,
  `rethink: how can data be binary when "discrete" sections in space can be corrupted?`,
  `rethink: at the border of "corrupt" fields, different metrics can project different outcomes?`,
];

/**
 * swiper activeIndex is index here + 2 (??)
 * dunno wth, i'm sure there is a good reason.
 */
const IBGIB_RETHINKS: VerticalSwiperTidbit[] = [
  {
    title: `what are files & folders?`,
    body: `we were taught files & folders to help understand them newfangled computers. but now we can rethink this paradigm to grow beyond these training wheels.`,
  },
  {
    focused: true,
    title: `what is ibgib?`,
    body: `with no single definition possible, ibgib is a distributed computation architecture to "answer" its own definition as well as these other seemingly unrelated questions.`,
  },
  {
    title: `what is money?`,
    body: `a rethink is required to understand just wth bitcoin and other crypto technologies teach us about money, collaboration & us as individuals. in ibgib we focus on "money" as precisely analogous to voltage bias in neural networks in superhuman networks.`,
  },
  {
    title: `what is data?`,
    body: `my data, your data, centralized & decentralized...in ibgib, we rethink data itself from the naive finite Shannon information perspective to living, sovereign & infinite entities.`,
  },
  {
    title: `what are apps?`,
    body: `just as we rethink our data, so too we rethink apps. no longer silos of activity, apps become living views into living data ecosystems.`,
  },
  {
    title: `what is collaboration?`,
    body: `within each of our minds lives a thriving informational ecosystem which we experience & interact with via our thoughts & feelings. in ibgib, we rethink collaboration in terms of evolving ideas & concepts over time t.`,
  },
];

interface VerticalSwiperTidbit {
  focused?: boolean;
  title: string;
  body: string;
}