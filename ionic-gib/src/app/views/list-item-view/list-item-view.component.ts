import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter, Input, ElementRef, ViewChild } from '@angular/core';

import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { CommonService } from '../../services/common.service';
import { IbGibItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import * as c from '../../common/constants';
import { AnimationController } from '@ionic/angular';
import { RootViewComponent } from '../root-view/root-view.component';
import { CommentViewComponent } from '../comment-view/comment-view.component';
import { PicViewComponent } from '../pic-view/pic-view.component';
import { LinkViewComponent } from '../link-view/link-view.component';
import { TagViewComponent } from '../tag-view/tag-view.component';
import { FallbackViewComponent } from '../fallback-view/fallback-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'list-item',
  templateUrl: './list-item-view.component.html',
  styleUrls: ['./list-item-view.component.scss'],
})
export class ListItemViewComponent extends IbgibComponentBase {

  protected lc: string = `[${ListItemViewComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  @Output()
  ibclicked: EventEmitter<IbGibItem> = new EventEmitter();

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#92ed80";
  public debugBorderStyle: string = "solid";

  /**
   * redeclared
   */
  @Input()
  stopClickPropagation: boolean;

  @ViewChild('rootView')
  rootView: RootViewComponent;
  @ViewChild('commentView')
  commentView: CommentViewComponent;
  @ViewChild('picView')
  picView: PicViewComponent;
  @ViewChild('linkView')
  linkView: LinkViewComponent;
  @ViewChild('TagView')
  tagView: TagViewComponent;
  @ViewChild('fallbackView')
  fallbackView: FallbackViewComponent;

  get childComponent(): IbgibComponentBase {
    return this.commentView ??
      this.picView ??
      this.linkView ??
      this.tagView ??
      this.rootView ??
      this.fallbackView;
  }

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private elementRef: ElementRef,
    private animation: AnimationController,
  ) {
    super(common, ref)
    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} created`); }
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

  updateIbGib_NewerTimelineFrame({ latestAddr, latestIbGib, tjpAddr, }: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 2c15f733144ced6f19bbbdb378adae22)`); }
      return super.updateIbGib_NewerTimelineFrame({latestAddr, latestIbGib, tjpAddr });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClicked(item: IbGibItem): Promise<void> {
    const lc = `${this.lc}[${this.handleClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (logalot) { console.log(`${lc} item: ${JSON.stringify(item, null, 2)}`); }
      if (!this.childComponent) { throw new Error(`this.childComponent falsy (E: 7f11dc3ce9a5bdc0b8da033b53d41822)`); }

      if (!this.childComponent.stopClickPropagation) { this.ibclicked.emit(item); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  initializeAnimation(): void {
    const lc = `${this.lc}[${this.initializeAnimation.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 23a07bccfede43ac41fbcd65ae905e22)`); }
      // this.animation.create().
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}

