import { Component, OnInit, ChangeDetectorRef, Input, ChangeDetectionStrategy } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { IbGib_V1 } from 'ts-gib/dist/V1';

import { IbgibComponentBase } from 'src/app/common/bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import * as c from '../../common/constants';
import { YOUTUBE_LINK_REG_EXP } from '../../common/constants';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

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

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1) { super.ibGib_Context = value; }

  public debugBorderWidth: string = debugBorder ? "5px" : "0px"
  public debugBorderColor: string = "yellow";
  public debugBorderStyle: string = "solid";

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

}
