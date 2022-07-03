import { Component, OnInit, ChangeDetectorRef, Output, Input, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { EventEmitter } from '@angular/core';
import { IonContent, IonInfiniteScroll } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../../common/constants';
import { IbGibItem, IbgibListItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { IbgibListComponentBase } from '../../common/bases/ibgib-list-component-base';
import { CommonService } from '../../services/common.service';
import { ibCircle, ibGroup, ibLine, ibSvg, } from '../../common/helper/svg';
import { IbGibDiagramInfo, SVG_NAMESPACE } from '../../common/types/svg';

const logalot = c.GLOBAL_LOG_A_LOT || false;

interface SvgIbgibItem extends IbGibItem {
  diagramInfo: IbGibDiagramInfo;
}

@Component({
  selector: 'svg-view',
  templateUrl: './svg-view.component.html',
  styleUrls: ['./svg-view.component.scss'],
})
export class SvgViewComponent extends IbgibListComponentBase<SvgIbgibItem>
  implements AfterViewInit {

  protected lc: string = `[${SvgViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1) { super.ibGib_Context = value; }

  /**
   * Rel8n names to show in the list by default.
   */
  @Input()
  rel8nNames: string[] = c.DEFAULT_LIST_REL8N_NAMES;

  @Input()
  svgInfo: SVGInfo;

  @Output()
  ibclicked: EventEmitter<IbGibItem> = new EventEmitter();

  // @Output()
  // scrolled: EventEmitter<void> = new EventEmitter();

  @Output()
  itemsAdded: EventEmitter<number> = new EventEmitter();

  @ViewChild('svgViewContent')
  svgViewContent: IonContent;

  @ViewChild('svgContainer')
  svgContainerRef: ElementRef;

  get svgContainerDiv(): HTMLDivElement { return this.svgContainerRef?.nativeElement; }

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    protected elementRef: ElementRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} called (I: )`); }

    if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }

    setTimeout(() => { this.ref.detectChanges(); }, 5000); // no idea
  }

  async ngAfterViewInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngAfterViewInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: aa29977d0ec93cb89690e9a24ae16b22)`); }

      this.initializeSvg();

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
      // setTimeout(async () => { await this.drawAnimation(); }, hackyDelayMs);

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }

  }

  async updateIbGib_NewerTimelineFrame(info: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      await super.updateIbGib_NewerTimelineFrame(info);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClicked(item: IbGibItem, itemRef: any): Promise<void> {
    const lc = `${this.lc}[${this.handleClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: )`); }
      if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`); }

      if (!this.stopClickPropagation) { this.ibclicked.emit(item); }
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
      if (logalot) { console.log(`${lc} starting... (I: )`); }
      await this.drawAnimation();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  initializeSvg(): void {
    const lc = `${this.lc}[${this.initializeSvg.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: a0fc24cf8ed46ef6c5955f189c49f122)`); }

      // if already has svg, remove it
      // let hadChildren = false;
      if (this.svgContainerDiv.childNodes?.length === 1) {
        this.svgContainerDiv.removeChild(this.svgContainerDiv.lastChild);
        // hadChildren = true;
      }

      const componentWidth = this.elementRef.nativeElement.clientWidth;
      const componentHeight = this.elementRef.nativeElement.clientHeight;
      const width = Math.ceil(componentWidth * 0.99);
      const height = Math.ceil(componentHeight * 0.99);
      const centerX = Math.floor(width / 2);
      const centerY = Math.floor(height / 2);
      this.svgInfo = {
        el: ibSvg({ width, height }),
        width, height,
        centerX, centerY,
      }
      // this.svg.el.addEventListener('click', (() => {
      //   this.drawAnimation();
      // }))
      this.svgContainerDiv.appendChild(this.svgInfo.el);

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
      if (logalot) { console.log(`${lc} starting... (I: )`); }
      if (!this.svgContainerDiv || !this.svgInfo) { return; }

      const { centerX, centerY } = this.svgInfo;

      window.requestAnimationFrame(async () => {
        let g_radius = Math.floor(centerX * 0.99);

        const greenish = '#47a135';
        const purplish = '#53118e';

        const primaryColor_left = greenish;
        const secondaryColor_left = purplish;
        const tertiaryColor_left = 'white';
        const primaryColor_right = secondaryColor_left;
        const secondaryColor_right = primaryColor_left;
        const tertiaryColor_right = 'black';


        // /**
        //  * If I draw the background in the same group, then its
        //  * opacity will carry over and I want separate opacities.
        //  */
        // const gTranslucent: IbGibDiagramInfo = {
        //   // background/context
        //   startPos: [0, 0],
        //   pos: [0, 0],
        //   fill: primaryColor_left,
        //   stroke: '#53118e',
        //   mode: 'intrinsic',
        //   opacity: 0.16,
        //   radius: g_radius,
        // };
        // /**
        //  * this g contains the other ibgib infos and has full opacity.
        //  */
        // const gTransparent: IbGibDiagramInfo = h.clone(gTranslucent);
        // gTransparent.fill = 'transparent';
        // delete gTransparent.opacity;


        // const ib_distanceX = Math.floor(g_radius * 0.37);
        // const ib_distanceY = -Math.floor(g_radius * 0.37);
        // const ib_radius = Math.floor(g_radius * 0.42);
        // const i_distanceX = (Math.floor(ib_radius * 0.37));
        // const i_distanceY = Math.floor(ib_radius * 0.3);
        // const i_radius = Math.floor(ib_radius * 0.2);
        // // const b_distanceX = -(Math.floor(i_distanceX * 0.99));
        // const b_distanceX = -Math.floor(i_radius * 1.2);
        // const b_distanceY = -Math.floor(i_distanceY * 0.99);
        // const b_radius = Math.floor(ib_radius * 0.4);

        // // left
        // const i_left: IbGibDiagramInfo = {
        //   startPos: [0, 0],
        //   pos: [-i_distanceX, -i_distanceY],
        //   mode: 'intrinsic',
        //   fill: primaryColor_left,
        //   stroke: tertiaryColor_left,
        //   radius: i_radius,
        // };
        // const b_left: IbGibDiagramInfo = {
        //   startPos: [0, 0],
        //   pos: [-b_distanceX, -b_distanceY],
        //   mode: 'intrinsic',
        //   fill: primaryColor_left,
        //   stroke: tertiaryColor_left,
        //   radius: b_radius,
        // };
        // const i_line_left: IbGibDiagramInfo = {
        //   startPos: [i_left.pos[0], i_left.pos[1] + i_radius],
        //   pos: [i_left.pos[0], b_left.pos[1]],
        //   mode: 'extrinsic',
        //   stroke: tertiaryColor_left,
        // };
        // const b_line_left: IbGibDiagramInfo = {
        //   startPos: [b_left.pos[0] - b_radius, b_left.pos[1]],
        //   pos: [b_left.pos[0] - b_radius, i_left.pos[1]],
        //   mode: 'extrinsic',
        //   stroke: tertiaryColor_left,
        // };
        // const ib_left: IbGibDiagramInfo = {
        //   startPos: [0, 0],
        //   pos: [-ib_distanceX, -ib_distanceY],
        //   mode: 'intrinsic',
        //   stroke: primaryColor_left,
        //   // fill: 'transparent',
        //   fill: secondaryColor_left,
        //   radius: ib_radius,
        //   infos: [i_left, b_left, i_line_left, b_line_left],
        // }

        // // right
        // const i_right: IbGibDiagramInfo = {
        //   startPos: [0, 0],
        //   pos: [-i_distanceX, -i_distanceY],
        //   mode: 'intrinsic',
        //   fill: primaryColor_right,
        //   radius: i_radius,
        // };
        // const b_right: IbGibDiagramInfo = {
        //   startPos: [0, 0],
        //   pos: [-b_distanceX, -b_distanceY],
        //   mode: 'intrinsic',
        //   fill: primaryColor_right,
        //   radius: b_radius,
        // };
        // const i_line_right: IbGibDiagramInfo = {
        //   startPos: [i_right.pos[0], i_right.pos[1] + i_radius],
        //   pos: [i_right.pos[0], b_right.pos[1]],
        //   mode: 'extrinsic',
        //   stroke: tertiaryColor_right,
        // };
        // const b_line_right: IbGibDiagramInfo = {
        //   startPos: [b_right.pos[0] - b_radius, b_right.pos[1]],
        //   pos: [b_right.pos[0] - b_radius, i_right.pos[1]],
        //   mode: 'extrinsic',
        //   stroke: tertiaryColor_right,
        // };
        // const ib_right: IbGibDiagramInfo = {
        //   startPos: [0, 0],
        //   pos: [ib_distanceX, ib_distanceY],
        //   mode: 'intrinsic',
        //   // fill: 'blue',
        //   radius: ib_radius,
        //   stroke: primaryColor_right,
        //   // fill: 'transparent',
        //   fill: secondaryColor_right,
        //   // infos: [ i_right, b_right ],
        //   infos: [i_right, b_right, i_line_right, b_line_right],
        // }


        // const g_line_theta = Math.atan(ib_distanceY / ib_distanceX);
        // const g_line: IbGibDiagramInfo = {
        //   // bottom left edge of right ib
        //   startPos: [
        //     ib_right.pos[0] - (ib_radius * Math.cos(g_line_theta)),
        //     ib_right.pos[1] + (ib_radius * Math.cos(g_line_theta))
        //   ],
        //   // top right edge of left ib
        //   pos: [
        //     ib_left.pos[0] - (ib_radius * Math.sin(g_line_theta)),
        //     ib_left.pos[1] + (ib_radius * Math.sin(g_line_theta))
        //   ],
        //   mode: 'extrinsic',
        //   stroke: primaryColor_left,
        //   strokeWidth: '5px',
        // };

        // gTransparent.infos = [
        //   ib_left,
        //   ib_right,
        //   g_line,
        // ];

        // await this.drawIbGibDiagram({ svg: this.svgInfo.el, info: gTranslucent, });
        // await this.drawIbGibDiagram({ svg: this.svgInfo.el, info: gTransparent, });
        // this.addWobble(this.svgInfo.el);
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async drawItems(): Promise<void> {
    const lc = `${this.lc}[${this.drawItems.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: deb0e830cb87f464519711d339cd9422)`); }

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

      if (!svg && !g) { throw new Error(`either svg or g required. (E: c350ceba1d542d642fc61e47d7f76422)`); }

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
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        let [xStart, yStart] = info.startPos ?? info.pos;
        let [cx, cy] = info.pos;
        let circle: SVGCircleElement;
        if (g) {
          circle = ibCircle({
            parent: g,
            cx, cy, r: radius,
            fill, stroke, strokeWidth, opacity,
            picSrcFn: info.picSrcFn
          });
        } else {
          // translate to center-based coordinates
          circle = ibCircle({
            parent: svg,
            cx: centerX + cx, cy: centerY + cy, r: radius,
            fill, stroke, strokeWidth, opacity,
            picSrcFn: info.picSrcFn
          });
        }

        // <!-- <animateMotion
        //    path="M 250,80 H 50 Q 30,80 30,50 Q 30,20 50,20 H 250 Q 280,20,280,50 Q 280,80,250,80Z"
        //    dur="3s" repeatCount="indefinite" rotate="auto" /> -->
        if (xStart !== cx || yStart !== cy) {
          let animation = document.createElementNS(SVG_NAMESPACE, 'animateMotion');
          // let path = `M0,0 L${cx},${cy} L${centerX},${centerY} L${fromX},${fromY}`;
          let path = `M${xStart - cx},${yStart - cy} L0,0`;
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
              width: 2 * radius, height: 2 * radius,
              fill, opacity,
            });
          } else {
            group = ibGroup({
              parent: g ?? svg,
              x: cx + centerX, y: cy + centerY,
              width: 2 * radius, height: 2 * radius,
              fill, opacity,
            });
          }
          await Promise.all(
            info.infos.map(info => this.drawIbGibDiagram({ svg: group, info })),
          );
        }

        // this.addWobble(circle);
      } else if (info.mode = 'extrinsic') {
        // const diam = radius * 2;
        const width = svg.clientWidth;
        const height = svg.clientHeight;
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
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
          let path = `M${x1 - x2},${y1 - y2} L0,0`;
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

  async updateItems({
    reloadAll,
    direction,
    scrollAfter,
  }: {
    /**
     * If true, will clear current items and load all from scratch.
     *
     * Else, this will perform a differential update to the items, incrementally
     * adding/removing items that are found in the current ibGib.
     */
    reloadAll?: boolean,
    direction?: 'insert' | 'append',
    /**
     * if items are in a scrolling list, this will indicate scroll to bottom
     * after update complete.
     */
    scrollAfter?: boolean,
  } = {
      reloadAll: false,
      direction: 'append',
      scrollAfter: true,
    }): Promise<void> {
    const lc = `${this.lc}[${this.updateItems.name}]`;
    if (logalot) { console.log(`${lc} updating... (I: 95369f2f29f040bb81a278be6f56c5f1)`); }
    let updatingCheckCount = 0;
    while (this._updatingItems) {
      if (logalot) { console.log(`${lc} already _updatingItems. delaying... (I: 176913fc1e18d619838b8abdf6be1222)`); }
      await h.delay(500); // arbitrary but finite...
      if (!this._updatingItems) {
        if (logalot) { console.log(`${lc} delaying done. no longer updating items from previous call. (I: 2cbe6daddf6f5faf51fd81ac20eb8422)`); }
        break;
      } else if (updatingCheckCount > 60) { // arbitrary but finite...
        if (logalot) { console.log(`${lc} already updating and we've waited 10 times. aborting this updateItems call. (I: 1c8d7eba8cf52e3f6d0cc98f75a6fc22)`); }
        return; /* <<<< returns early */
      } else {
        if (logalot) { console.log(`${lc} still _updatingItems. updatingCheckCount: ${updatingCheckCount} (I: f18f6ca56b88a6b325a069dd7f292a22)`); }
        updatingCheckCount++;
      }
    }

    try {
      if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }

      await super.updateItems({ reloadAll, direction, scrollAfter });

      if (logalot) { console.log(`${lc} this.items count: ${this.items.length}`); }
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async addItems({ itemsToAdd, direction }: { itemsToAdd: SvgIbgibItem[]; direction: 'insert' | 'append'; }): Promise<void> {
    const lc = `${this.lc}[${this.addItems.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c6af613bbff2d12379c0a933c8d08e22)`); }

      await super.addItems({ itemsToAdd, direction });

      const itemWidth = 50;
      const itemHeight = 50;
      const minItemWidth = 50;
      const minItemHeight = 50;
      const itemPadding = 5;
      const itemRadius = Math.ceil(itemHeight / 2);
      const greenish = '#47a135';
      const purplish = '#53118e';
      const primaryColor_left = greenish;
      const secondaryColor_left = purplish;
      const tertiaryColor_left = 'white';
      const primaryColor_right = secondaryColor_left;
      const secondaryColor_right = primaryColor_left;
      const tertiaryColor_right = 'black';

      if (itemsToAdd?.length > 0) {
        window.requestAnimationFrame(async () => {
          for (let i = 0; i < itemsToAdd.length; i++) {
            const item = itemsToAdd[i];
            /**
             * index in this.items (not in itemsToAdd).
             */
            let realIndex = this.items.indexOf(item);
            let itemX = (realIndex * itemWidth) + itemPadding;
            let itemY = (realIndex * itemHeight) + itemPadding;
            await this.loadItemPrimaryProperties(item.addr, item);
            await this.loadType(item);
            const isPic = item.ib?.startsWith('pic ') || false;
            if (isPic) {
              await this.loadPic(item);
            }
            const info: IbGibDiagramInfo = {
              fill: isPic ? 'transparent' : 'pink',
              mode: 'intrinsic',
              radius: itemRadius,
              stroke: 'red',
              pos: [itemX, itemY],
              picSrcFn: item.picSrc ? () => item.picSrc : undefined,
            }
            item.diagramInfo = info;

            await this.drawIbGibDiagram({ svg: this.svgInfo.el, info });
          }

        });
      }
      // /**
      //  * If I draw the background in the same group, then its
      //  * opacity will carry over and I want separate opacities.
      //  */
      // const gTranslucent: IbGibDiagramInfo = {
      //   // background/context
      //   startPos: [0, 0],
      //   pos: [0, 0],
      //   fill: primaryColor_left,
      //   stroke: '#53118e',
      //   mode: 'intrinsic',
      //   opacity: 0.16,
      //   radius: g_radius,
      // };
      // /**
      //  * this g contains the other ibgib infos and has full opacity.
      //  */
      // const gTransparent: IbGibDiagramInfo = h.clone(gTranslucent);
      // gTransparent.fill = 'transparent';
      // delete gTransparent.opacity;


      // const ib_distanceX = Math.floor(g_radius * 0.37);
      // const ib_distanceY = -Math.floor(g_radius * 0.37);
      // const ib_radius = Math.floor(g_radius * 0.42);
      // const i_distanceX = (Math.floor(ib_radius * 0.37));
      // const i_distanceY = Math.floor(ib_radius * 0.3);
      // const i_radius = Math.floor(ib_radius * 0.2);
      // // const b_distanceX = -(Math.floor(i_distanceX * 0.99));
      // const b_distanceX = -Math.floor(i_radius * 1.2);
      // const b_distanceY = -Math.floor(i_distanceY * 0.99);
      // const b_radius = Math.floor(ib_radius * 0.4);

      // // left
      // const i_left: IbGibDiagramInfo = {
      //   startPos: [0, 0],
      //   pos: [-i_distanceX, -i_distanceY],
      //   mode: 'intrinsic',
      //   fill: primaryColor_left,
      //   stroke: tertiaryColor_left,
      //   radius: i_radius,
      // };
      // const b_left: IbGibDiagramInfo = {
      //   startPos: [0, 0],
      //   pos: [-b_distanceX, -b_distanceY],
      //   mode: 'intrinsic',
      //   fill: primaryColor_left,
      //   stroke: tertiaryColor_left,
      //   radius: b_radius,
      // };
      // const i_line_left: IbGibDiagramInfo = {
      //   startPos: [i_left.pos[0], i_left.pos[1] + i_radius],
      //   pos: [i_left.pos[0], b_left.pos[1]],
      //   mode: 'extrinsic',
      //   stroke: tertiaryColor_left,
      // };
      // const b_line_left: IbGibDiagramInfo = {
      //   startPos: [b_left.pos[0] - b_radius, b_left.pos[1]],
      //   pos: [b_left.pos[0] - b_radius, i_left.pos[1]],
      //   mode: 'extrinsic',
      //   stroke: tertiaryColor_left,
      // };
      // const ib_left: IbGibDiagramInfo = {
      //   startPos: [0, 0],
      //   pos: [-ib_distanceX, -ib_distanceY],
      //   mode: 'intrinsic',
      //   stroke: primaryColor_left,
      //   // fill: 'transparent',
      //   fill: secondaryColor_left,
      //   radius: ib_radius,
      //   infos: [i_left, b_left, i_line_left, b_line_left],
      // }

      // // right
      // const i_right: IbGibDiagramInfo = {
      //   startPos: [0, 0],
      //   pos: [-i_distanceX, -i_distanceY],
      //   mode: 'intrinsic',
      //   fill: primaryColor_right,
      //   radius: i_radius,
      // };
      // const b_right: IbGibDiagramInfo = {
      //   startPos: [0, 0],
      //   pos: [-b_distanceX, -b_distanceY],
      //   mode: 'intrinsic',
      //   fill: primaryColor_right,
      //   radius: b_radius,
      // };
      // const i_line_right: IbGibDiagramInfo = {
      //   startPos: [i_right.pos[0], i_right.pos[1] + i_radius],
      //   pos: [i_right.pos[0], b_right.pos[1]],
      //   mode: 'extrinsic',
      //   stroke: tertiaryColor_right,
      // };
      // const b_line_right: IbGibDiagramInfo = {
      //   startPos: [b_right.pos[0] - b_radius, b_right.pos[1]],
      //   pos: [b_right.pos[0] - b_radius, i_right.pos[1]],
      //   mode: 'extrinsic',
      //   stroke: tertiaryColor_right,
      // };
      // const ib_right: IbGibDiagramInfo = {
      //   startPos: [0, 0],
      //   pos: [ib_distanceX, ib_distanceY],
      //   mode: 'intrinsic',
      //   // fill: 'blue',
      //   radius: ib_radius,
      //   stroke: primaryColor_right,
      //   // fill: 'transparent',
      //   fill: secondaryColor_right,
      //   // infos: [ i_right, b_right ],
      //   infos: [i_right, b_right, i_line_right, b_line_right],
      // }


      // const g_line_theta = Math.atan(ib_distanceY / ib_distanceX);
      // const g_line: IbGibDiagramInfo = {
      //   // bottom left edge of right ib
      //   startPos: [
      //     ib_right.pos[0] - (ib_radius * Math.cos(g_line_theta)),
      //     ib_right.pos[1] + (ib_radius * Math.cos(g_line_theta))
      //   ],
      //   // top right edge of left ib
      //   pos: [
      //     ib_left.pos[0] - (ib_radius * Math.sin(g_line_theta)),
      //     ib_left.pos[1] + (ib_radius * Math.sin(g_line_theta))
      //   ],
      //   mode: 'extrinsic',
      //   stroke: primaryColor_left,
      //   strokeWidth: '5px',
      // };

      // gTransparent.infos = [
      //   ib_left,
      //   ib_right,
      //   g_line,
      // ];

      // await this.drawIbGibDiagram({ svg: this.svgInfo.el, info: gTranslucent, });
      // await this.drawIbGibDiagram({ svg: this.svgInfo.el, info: gTransparent, });
      // this.addWobble(this.svgInfo.el);

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}

interface SVGInfo {
  el: SVGElement;
  width: number; height: number;
  centerX: number; centerY: number;
}