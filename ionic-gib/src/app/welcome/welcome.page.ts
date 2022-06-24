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
  verticalSwiperTidbits: { [name: string]: VerticalSwiperTidbit[] } = {
    intro: IBGIB_APP_INTRO,
    protocol: IBGIB_PROTOCOL_FEATURES,
    app: IBGIB_APP_FEATURES,
    rethinks: IBGIB_RETHINKS,
  };

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

  /**
   * swipers indexed by swiperName
   */
  swipers: {[name: string]: Swiper} = {};
  // swiperIntro: Swiper;
  // swiperProtocol: Swiper;
  // swiperApp: Swiper;
  // swiperRethinks: Swiper;

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
      }, 100);

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

        await this.drawIbGibDiagram({
          svg: svg,
          info: {
            // background/context
            startPos: [0,0],
            pos: [0,0],
            fill: 'transparent',
            stroke: 'transparent',
            mode: 'intrinsic',
            // opacity: 0.05,
            radius: Math.floor(centerX * 0.9),
            infos: [
              // left
              {
                startPos: [0,0],
                pos: [-mainPositionX,0],
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
                ]
              },

              // right
              {
                startPos: [0,0],
                pos: [mainPositionX,0],
                mode: 'intrinsic',
                fill: hadChildren ? 'red' : 'yellow',
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

  @Input()
  get mappedIndex_SwiperRethinks(): number {
      // const mappedIndex = (event.activeIndex - 2) % this.rethinks.length;
      const mappedIndex =
        this.swiperRethinks ?
        (this.swiperRethinks.activeIndex - 2) % this.rethinks.length :
        0;
      return mappedIndex;
  }

  getAdjustedActiveIndex(swiperName: SwiperName): number {
    const lc = `${this.lc}[${this.getAdjustedActiveIndex.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: aa74e8efab4b1e38e6248b9ffc152c22)`); }

      const swiper = this.swipers[swiperName];
      const tidbits =
      const mappedIndex =this.verticalSwiperTidbits[swiperName];
        swiper ?
        (swiper.activeIndex - 2) % .length :
        0;
      return mappedIndex;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  // handleSwiperRethinksSet(swiper: Swiper): void {
  //   this.swiperRethinks = swiper;
  //   this.handleRethinksSlideChange(swiper);
  // }
  handleSwiper(swiper: Swiper, swiperName: SwiperName): void {
    this.handleRethinksSlideChange(swiper, swiperName);
    this.swipers[swiperName] = swiper;
  }

  handleVertSlideChange(swiper: Swiper, name: SwiperName): void {
    const lc = `${this.lc}[${this.handleVertSlideChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 4b0c5cdf25a14dec9c64c196ee790ce3)`); }



      this.rethinks.forEach(x => x.focused = false);
      /** dunno what swiper thinks of as activeIndex. Probably complicated. */
      if (this.mappedIndex_SwiperRethinks >= 0 && this.mappedIndex_SwiperRethinks < this.rethinks.length) {
        this.rethinks[this.mappedIndex_SwiperRethinks].focused = true;
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

const IBGIB_APP_INTRO: VerticalSwiperTidbit[] = [
  {
    focused: true,
    title: `decentralized collaboration`,
    body: `ibgib enables distributed computation. with humans, this means collaboration; with microservices, interop; with ais and ml models, the future - a biological approach for meta-evolutionary models.`,
  },
  {
    title: `focus on time, repo of repos`,
    body: `ibgib is a dlt protocol that focuses on Time as a first-class citizen. it utilizes both blockchain-style linked lists of named merkle links, as well as dag-style merkle hash trees, with two key relationships: "past" and "ancestor". this enables "on-chain" version-controlled data. think meta-git for anything, including its own self-bootstrapping metadata (configuration).`,
  },
  {
    title: `this app...`,
    body: `this app is only a prototype leveraging the unique architecture of the ibgib protocol. it is a swiss-army knife of apps, already able to do some pretty cool stuff, like synchronization via a branch timeline merging strategy. but it's the _approach_ that will enable truly decentralized apps.`,
  },
];

const IBGIB_PROTOCOL_FEATURES: VerticalSwiperTidbit[] = [
  {
    focused: true,
    title: `enabling monotonically increasing data AND disconnected data slices`,
    body: ``,
  },
  {
    title: ``,
    body: ``,
  },
];

const IBGIB_APP_FEATURES: VerticalSwiperTidbit[] = [
  {
    focused: true,
    title: `comments within comments, pics within pics`,
    body: ``,
  },
];



/**
 * swiper activeIndex is index here + 2 (??)
 * dunno wth, i'm sure there is a good reason.
 */
const IBGIB_RETHINKS: VerticalSwiperTidbit[] = [
  {
    title: `what is money?`,
    body: `a rethink is required to understand just wth bitcoin and other crypto technologies teach us about money, collaboration & us as individuals. in ibgib we focus on "money" as precisely analogous to voltage bias in neural networks in superhuman networks.`,
  },
  {
    title: `wth is or are ibgib(s)?`,
    body: `moving away from a absolute knowledge-based paradigm, an ibgib can be thought of as a snapshot of some pov's belief which inevitably evolves over time. this fundamentally requires a Rethink of truths many of us may take for granted, or if you prefer, an extremely strict adherence to science as being fluidly best-effort heuristics. more tersely, you can think of an ibgib as a fundamental unit of science.`,
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

type SwiperName = 'intro' | 'rethinks';