import {
  Component, ChangeDetectorRef, Output, EventEmitter, Input, ViewChild,
} from '@angular/core';

import { IbGibAddr } from 'ts-gib';

import * as c from '../../common/constants';
import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { CommonService } from '../../services/common.service';
import { IbGibItem, IbGibListItem, IbGibTimelineUpdateInfo } from '../../common/types/ux';
import { RootViewComponent } from '../root-view/root-view.component';
import { CommentViewComponent } from '../comment-view/comment-view.component';
import { PicViewComponent } from '../pic-view/pic-view.component';
import { LinkViewComponent } from '../link-view/link-view.component';
import { TagViewComponent } from '../tag-view/tag-view.component';
import { FallbackViewComponent } from '../fallback-view/fallback-view.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-item',
  templateUrl: './item-view.component.html',
  styleUrls: ['./item-view.component.scss'],
})
export class ItemViewComponent extends IbgibComponentBase<IbGibListItem> {

  protected lc: string = `[${ItemViewComponent.name}]`;
  public debugBorderWidth: string = debugBorder ? "1px" : "0px"
  public debugBorderColor: string = "#92ed80";
  public debugBorderStyle: string = "solid";


  @Input()
  get checked(): boolean {
    return this.childComponent?.item?.checked;
  }
  set checked(value: boolean) {
    if (this.childComponent?.item) {
      this.childComponent.item.checked = value;
    }
  }

  @Output()
  ibItemClicked = new EventEmitter<IbGibListItem>();

  @ViewChild('rootView')
  rootView: RootViewComponent;
  @ViewChild('commentView')
  commentView: CommentViewComponent;
  @ViewChild('picView')
  picView: PicViewComponent;
  @ViewChild('linkView')
  linkView: LinkViewComponent;
  @ViewChild('tagView')
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

  async updateIbGib_NewerTimelineFrame({ latestAddr, latestIbGib, tjpAddr, }: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 2c15f733144ced6f19bbbdb378adae22)`); }
      await super.updateIbGib_NewerTimelineFrame({ latestAddr, latestIbGib, tjpAddr });
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

      if (!this.childComponent.stopClickPropagation) { this.ibItemClicked.emit(item); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
