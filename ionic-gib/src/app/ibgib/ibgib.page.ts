import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { FilesService } from '../services/files.service';
import { IbGibAddr } from 'ts-gib';
import { Subscription } from 'rxjs';
import { CommonService } from '../services/common.service';
import { SPECIAL_URLS } from '../common/constants';
import { getIbGibAddr } from 'ts-gib/dist/helper';

@Component({
  selector: 'ibgib-page',
  templateUrl: './ibgib.page.html',
  styleUrls: ['./ibgib.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IbGibPage extends IbgibComponentBase
  implements OnInit, OnDestroy {

  protected lc: string = IbgibComponentBase.name;
  private paramMapSub: Subscription;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
  ) {
    super(common, ref);
  }

  async ngOnInit() {
    // this.folder = this.activatedRoute.snapshot.paramMap.get('addr');
    this.subscribeParamMap();
  }

  ngOnDestroy() {
    this.unsubscribeParamMap();
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc} updating...`);
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadItem();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      console.log(`${lc} updated.`);
    }
  }

  subscribeParamMap() {
    let lc = `${this.lc}[${this.subscribeParamMap.name}]`;

    this.activatedRoute.paramMap.subscribe(async map => {
      let addr = map.get('addr');
      lc = `${lc}[${addr}]`;
      console.log(`${lc} new addr`)

      if (!SPECIAL_URLS.includes((addr || "").toLowerCase()) && encodeURI(addr).includes('%5E')) {
        // normal handling for a normal ibGib is to update the page's ibgib
        // and load everything.
        console.log(`new paramMap. addr: ${addr}`);
        if (addr !== this.addr) {
          this.updateIbGib(addr);
        } else {
          // do nothing, it's the same as the current addr
        }
      // } else if (addr === 'something') { // example for future special cases
      } else {
        // default special non-ibgib handler, go to the tags ibGib
        console.log(`${lc} special url entered, navTo to tags ibGib`);
        const tags = await this.common.ibgibs.getTagsIbgib({initialize: true});
        addr = getIbGibAddr({ibGib: tags});
        await this.navTo({addr});
      }
    });
  }

  unsubscribeParamMap() {
    if (this.paramMapSub) {
      this.paramMapSub.unsubscribe();
      delete this.paramMapSub;
    }
  }

}
