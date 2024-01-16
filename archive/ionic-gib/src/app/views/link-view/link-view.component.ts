import { Component, OnInit, ChangeDetectorRef, Input, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../../common/bases/ibgib-component-base';
import { YOUTUBE_LINK_REG_EXP } from '../../common/constants';
import { PicData_V1, PicIbGib_V1 } from '../../common/types/pic';
import { IbGibItem } from 'src/app/common/types/ux';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'link-view',
  templateUrl: './link-view.component.html',
  styleUrls: ['./link-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinkViewComponent
  extends IbgibComponentBase
  implements OnInit {

  protected lc: string = `[${LinkViewComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "5px" : "0px"
  public debugBorderColor: string = "yellow";
  public debugBorderStyle: string = "solid";

  private _loadingPicLabelAddr: boolean;

  @Input()
  picLabelItem: IbGibItem;

  @Input()
  get picLabelAddr(): IbGibAddr { return this.picLabelItem?.addr; }

  @Input()
  get picLabelSrc(): string { return this.picLabelItem?.picSrc; }

  /**
   * redeclared for view
   */
  @Input()
  stopClickPropagation: boolean;

  @Input()
  get isYoutubeLink(): boolean {
    return this.item?.text ?
      !!this.item.text.match(YOUTUBE_LINK_REG_EXP) :
      false;
  }

  private _youtubeEmbedSrc: SafeUrl;
  @Input()
  get youtubeEmbedSrc(): SafeUrl {
    const lc = `${this.lc}[youtubeEmbedSrc]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 6507be3b4f0b1e69ca35c6c685eb6922)`); }
      if (this._youtubeEmbedSrc) { return this._youtubeEmbedSrc; /* <<<< returns early */ }
      if (!this.item?.text) { return undefined; /* <<<< returns early */ }

      let url = this.item?.text;
      // example https://youtu.be/iOROByrQu7A
      let prefix = "https://youtu.be/";
      let videoId = url.substring(prefix.length)
      let embedUrl = `https://www.youtube.com/embed/${videoId}`;
      let safe = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
      if (safe) { this._youtubeEmbedSrc = safe; }

      return safe;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return ""
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  @Input()
  youtubeTitle: string;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    protected sanitizer: DomSanitizer,
  ) {
    super(common, ref)
    // this.stopClickPropagation = true;
  }

  async ngOnInit(): Promise<void> {
    if (logalot) { console.log(`${this.lc} addr: ${this.addr}`); }
    await super.ngOnInit();
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await h.delay(250);
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
      await this.loadPicLabel();
      // trigger an initial ping to check for newer ibgibs
      if (!this.paused) {
        setTimeout(async () => {
          await this.smallDelayToLoadBalanceUI();
          await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: true });
        });
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }


  /**
   * "pic label" is the picture that is the representative pic of the link. It
   * is populated with the first child pic of the link (first pic ibGib with
   * addr, if any, in `this.ibGib.rel8ns.pic` array).
   */
  async loadPicLabel(): Promise<void> {
    const lc = `${this.lc}[${this.loadPicLabel.name}]`;

    if (this._loadingPicLabelAddr) {
      if (logalot) { console.log(`${lc} already loading pic label addr. returning early. (I: 45754e464e044e248ecb455527c614de)`); }
      return; /* <<<< returns early */
    }

    this._loadingPicLabelAddr = true;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c1d8329e074341618eeb9845f0f26107)`); }

      let tries = 0;
      while (!this.ibGib) { // arbitrary 30 seconds?
        if (logalot) { console.log(`${lc} this.ibGib falsy. checking again in a second (I: 321065b501334348bff72cd5bee92a9e)`); }
        await h.delay(1000);
        tries++;
        if (tries >= 30) {
          if (logalot) { console.log(`${lc} this.ibGib falsy. returning early. (I: a69678234bce4443b2bd9560657559ee)`); }
        }
      }

      if (this.picLabelAddr) {
        if (logalot) { console.log(`${lc} this.labelAddr already set. returning early. (I: a91d5a40fb44407c8290af5477d2a463)`); }
        return; /* <<<< returns early */
      }

      const picAddrs = this.ibGib.rel8ns?.pic ?? [];
      if (picAddrs.length === 0) {
        if (logalot) { console.log(`${lc} no pic addrs linked to ibGib. returning early. (I: 4bb5ea95f29e437089b7fa0ebc6f1c96)`); }
        return; /* <<<< returns early */
      }

      let picLabelAddr: IbGibAddr;
      let picLabelIbGib: PicIbGib_V1;

      // get the latest address for the pic
      for (let i = 0; i < picAddrs.length; i++) {
        const picAddr = picAddrs[i];
        let resGet = await this.common.ibgibs.get({ addr: picAddr });
        if (resGet.success && resGet.ibGibs?.length === 1 && (<PicData_V1>resGet.ibGibs[0].data)?.binHash) {
          let latestpicAddr = await this.common.ibgibs.getLatestAddr({ ibGib: resGet.ibGibs[0] });
          if (latestpicAddr && latestpicAddr !== picAddr) {
            const resGetLatest = await this.common.ibgibs.get({ addr: latestpicAddr });
            if (resGetLatest.success && resGetLatest.ibGibs?.length === 1 && (<PicData_V1>resGet.ibGibs[0].data)?.binHash) {
              picLabelIbGib = <PicIbGib_V1>resGetLatest.ibGibs[0];
              picLabelAddr = latestpicAddr;
            } else {
              // some kind of error, so use best get
              console.error(`${lc} problem getting the latest. (E: 00b7a5e2a5e34215a3f280ba7d6ac225)`);
              picLabelIbGib = <PicIbGib_V1>resGet.ibGibs[0];
              picLabelAddr = picAddr;
            }
          } else {
            // no latest or it's the same, so just use what we got
            picLabelIbGib = <PicIbGib_V1>resGet.ibGibs[0];
            picLabelAddr = picAddr;
          }
          break;
        } else {
          console.error(`${lc} there was a problem loading a child pic for the label? trying next. addr: ${picAddr}. error: ${resGet.errorMsg ?? 'some error'} (E: 00f0b8cf73024c0da6dd05ee87f2bb3c)`)
        }
      }

      const clearPicLabel = () => {
        delete this.picLabelItem;
      }

      if (picLabelAddr && picLabelIbGib) {
        // load the pic into an item
        let { ib, gib } = picLabelIbGib;
        let picLabelItem: IbGibItem = {
          ib, gib,
          ibGib: picLabelIbGib,
          addr: picLabelAddr,
        };
        // reuse the loadPic machinery but for a different "pic label" item (not
        // this component's `item` model.)
        await this.loadPic(picLabelItem);
        if (picLabelItem.picSrc) {
          this.picLabelItem = picLabelItem;
        } else {
          console.error(`${lc} (UNEXPECTED) loadPic returned but item.picSrc is falsy? (E: 7ebad3d9a87149ebbe4439d3e42c08a5)`)
          clearPicLabel();
        }
      } else {
        console.error(`${lc} (UNEXPECTED) couldn't load the label for some reason. labelIbGib falsy. (E: 0037c9fab17a42e9b4cbfb0209d91a43)`);
        clearPicLabel();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      this._loadingPicLabelAddr = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
