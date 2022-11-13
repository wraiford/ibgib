import {
  Component, ChangeDetectorRef, Output, EventEmitter, Input, ViewChild,
} from '@angular/core';

import * as h from 'ts-gib/dist/helper';
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
import { CommentIbGib_V1 } from 'src/app/common/types/comment';

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

  private _loadingLabelAddr: boolean;

  @Input()
  get checked(): boolean {
    return this.childComponent?.item?.checked;
  }
  set checked(value: boolean) {
    if (this.childComponent?.item) {
      this.childComponent.item.checked = value;
    }
  }

  @Input()
  disableSelection: boolean;

  @Input()
  labelAddr: IbGibAddr;

  @Input()
  labelText: string;

  private _showLabel: boolean;
  @Input()
  set showLabel(value: boolean) {
    const lc = `${this.lc}[set showLabel]`;
    if (value === this._showLabel) {
      if (logalot) { console.log(`${lc} no change. returning early. (I: 0ce0e4549538b90963fc562e1576fa22)`); }
      return; /* <<<< returns early */
    }

    if (value) {
      this._showLabel = true;
      this.loadLabelAddr(); // spins off
    } else if (this.labelAddr) {
      // hide it if not already
      delete this.labelAddr;
      delete this.labelText;
      setTimeout(() => this.ref.detectChanges());
    }
  }
  get showLabel(): boolean {
    return this._showLabel;
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
      if (this.showLabel && !this.labelAddr) {
        this.loadLabelAddr(); // spins off
      }
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
      if (this.showLabel && !this.labelAddr) {
        this.loadLabelAddr(); // spins off
      }
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

  async loadLabelAddr(): Promise<void> {
    const lc = `${this.lc}[${this.loadLabelAddr.name}]`;
    if (this._loadingLabelAddr) {
      if (logalot) { console.log(`${lc} already loading label addr. returning early. (I: 91d47bcc4e381f48189f65cd352ce822)`); }
      return; /* <<<< returns early */
    }
    this._loadingLabelAddr = true;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 753cd7157629a3ce05a9e7cb20867c22)`); }

      let tries = 0;
      while (!this.ibGib) { // arbitrary 30 seconds?
        if (logalot) { console.log(`${lc} this.ibGib falsy. checking again in a second (I: cd496f9bf67045d58d0502e0e177b5d9)`); }
        await h.delay(1000);
        tries++;
        if (tries >= 30) {
          if (logalot) { console.log(`${lc} this.ibGib falsy. returning early. (I: f138f328717b7de4ea145e48ee802122)`); }
        }
      }

      if (this.labelAddr) {
        if (logalot) { console.log(`${lc} this.labelAddr already set. returning early. (I: 0ff17253f6bc561aa656b4060d0e0222)`); }
        return; /* <<<< returns early */
      }

      if (this.item?.type !== 'link' && this.item?.type !== 'pic') {
        if (logalot) { console.log(`${lc} only showing labels for links and pics right now, hardcoded kluge. returning early (I: 3792a7cab158ca1651241776f9b90322)`); }
        return; /* <<<< returns early */
      }

      const commentAddrs = this.ibGib.rel8ns?.comment ?? [];
      if (commentAddrs.length === 0) {
        if (logalot) { console.log(`${lc} no comment addrs linked to ibGib. returning early. (I: 9f1b92200013e679e9277302c6e16822)`); }
        return; /* <<<< returns early */
      }

      let labelAddr: IbGibAddr;
      let labelIbGib: CommentIbGib_V1;
      for (let i = 0; i < commentAddrs.length; i++) {
        const commentAddr = commentAddrs[i];
        let resGet = await this.common.ibgibs.get({ addr: commentAddr });
        if (resGet.success && resGet.ibGibs?.length === 1 && resGet.ibGibs[0].data?.text) {
          let latestCommentAddr = await this.common.ibgibs.getLatestAddr({ ibGib: resGet.ibGibs[0] });
          if (latestCommentAddr && latestCommentAddr !== commentAddr) {
            const resGetLatest = await this.common.ibgibs.get({ addr: latestCommentAddr });
            if (resGetLatest.success && resGetLatest.ibGibs?.length === 1 && resGetLatest.ibGibs[0].data?.text) {
              labelIbGib = <CommentIbGib_V1>resGetLatest.ibGibs[0];
              labelAddr = latestCommentAddr;
            } else {
              // some kind of error, so use best get
              console.error(`${lc} problem getting the latest. (E: 2aa478fcd5a048af9453b68a0ae640b4)`)
              labelIbGib = <CommentIbGib_V1>resGet.ibGibs[0];
              labelAddr = commentAddr;
            }
          } else {
            // no latest or it's the same, so just use what we got
            labelIbGib = <CommentIbGib_V1>resGet.ibGibs[0];
            labelAddr = commentAddr;
          }
          break;
        } else {
          console.error(`${lc} there was a problem loading a child comment for the label? trying next. addr: ${commentAddr}. error: ${resGet.errorMsg ?? 'some error'} (E: 66e9fa8d159842059bf34efe084a2924)`)
        }
      }

      if (labelAddr && labelIbGib) {
        this.labelAddr = labelAddr;
        this.labelText = labelIbGib.data.text;
      } else {
        console.error(`${lc} couldn't load the label for some reason. labelIbGib falsy. (E: 9c51525467d54dbc8743d7242e1b8a0b)`);
        delete this.labelAddr;
        delete this.labelText;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      this._loadingLabelAddr = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
