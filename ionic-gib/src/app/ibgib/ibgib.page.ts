import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { IbGibAddr } from 'ts-gib';
import { Subscription } from 'rxjs';
import { CommonService } from '../services/common.service';
import { SPECIAL_URLS } from '../common/constants';
import { getIbGibAddr, pretty } from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbgibItem, LatestEventInfo } from '../common/types';
// import * as encGib from 'encrypt-gib';
import * as h from 'ts-gib';
import { encrypt, decrypt, SaltStrategy } from 'encrypt-gib';

@Component({
  selector: 'ibgib-page',
  templateUrl: './ibgib.page.html',
  styleUrls: ['./ibgib.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IbGibPage extends IbgibComponentBase
  implements OnInit, OnDestroy {

  protected lc: string = `[${IbGibPage.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  private paramMapSub: Subscription;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute,
  ) {
    super(common, ref);
  }

  async ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    console.log(`${lc} called.`)
    // this.folder = this.activatedRoute.snapshot.paramMap.get('addr');
    this.subscribeParamMap();
    super.ngOnInit();

    // await this.testEncryptGib();
  }

  async testEncryptGib(): Promise<void> {
    const lc = `${this.lc}[${this.testEncryptGib.name}]`;
    // debug test enc-gib
    let initialData = 'here is some text';
    // let hexString = await encGib.encodeStringToHexString(data);
    // let data2 = await encGib.decodeHexStringToString(hexString);
    // console.log(`${lc} data: ${data}`);
    // console.log(`${lc} hexString: ${hexString}`);
    // console.log(`${lc} data2: ${data2}`);
    const salt = await h.getUUID();
    const secret = `great p4SSw0rd?`;
    let {encryptedData, errors} = await encrypt({
      dataToEncrypt: initialData,
      initialRecursions: 100,
      recursionsPerHash: 10,
      salt,
      saltStrategy: SaltStrategy.appendPerHash,
      secret,
      confirm: true,
    });

    console.log(`${lc} initialData: ${initialData}`);
    if (encryptedData) {
      console.log(`${lc} encryptedData: ${encryptedData}`);

      let { decryptedData, errors: errorsDecrypt } = await decrypt({
        encryptedData,
        initialRecursions: 100,
        recursionsPerHash: 10,
        salt,
        saltStrategy: SaltStrategy.appendPerHash,
        secret,
      });

      if (decryptedData) {
        console.log(`${lc} decryptedData: ${decryptedData}`);
        if (decryptedData === initialData) {
          console.log(`${lc} initialData equals decryptedData`);
        }
      } else {
        console.error(`${lc} decryptedData falsy!`);
      }
    } else if (errors?.length > 0) {
      console.error(`${lc} errored!!! here they are...`);
      for (let error in errors) { console.error(`${lc} ${error}`); }
      console.error(`${lc} end of errors.`)
    } else {
      console.log(`${lc} no encryptedData and no errors?`);
    }

  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    console.log(`${lc} called.`)
    this.unsubscribeParamMap();
    super.ngOnDestroy();
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc} updating...`);
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      console.log(`${lc} ibGib: ${pretty(this.ibGib)}`);
      await this.loadItem();
      this.updatePaused();
      if (!this.paused) {
        this.item.refreshing = true;
        setTimeout(async () => {
          await this.common.ibgibs.pingLatest({ibGib: this.ibGib, tjp: this.tjp});
        });
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      console.log(`${lc} updated.`);
    }
  }

  updatePaused(): void {
    this.paused = (this.activatedRoute.snapshot.queryParams['paused'] || 'false') === 'true';
   }

  subscribeParamMap() {
    let lc = `${this.lc}[${this.subscribeParamMap.name}]`;

    this.paramMapSub = this.activatedRoute.paramMap.subscribe(async map => {
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
      } else {
        // default special non-ibgib handler, go to the tags ibGib
        console.log(`${lc} special url entered, navTo to tags ibGib`);
        const tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags", initialize: true});
        addr = getIbGibAddr({ibGib: tagsIbGib});
        await this.navTo({addr});
      }

    });

  }
  unsubscribeParamMap() {
    const lc = `${this.lc}[${this.unsubscribeParamMap.name}]`;
    console.log(`${lc} unsubscribe called`);
    if (this.paramMapSub) {
      console.log(`${lc} unsubscribing`);
      this.paramMapSub.unsubscribe();
      delete this.paramMapSub;
    }
  }

  async handleRefreshClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleRefreshClick.name}]`;
    try {
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (!this.tjp) { await this.loadTjp(); }

      if (this.paused) {
        this.paused = false;
        await this.navTo({addr: this.addr, queryParams: { paused: null }, queryParamsHandling: 'merge'})
      }
      if (this.item) { this.item.refreshing = true; }
      await this.common.ibgibs.pingLatest({ibGib: this.ibGib, tjp: this.tjp});
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handlePauseClick(): Promise<void> {
    const lc = `${this.lc}[${this.handlePauseClick.name}]`;
    try {
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (!this.tjp) { await this.loadTjp(); }

      this.paused = true;
      await this.navTo({addr: this.addr, queryParams: { paused: true }, queryParamsHandling: 'merge'})
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }
  async handleIbGib_NewLatest(info: LatestEventInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleIbGib_NewLatest.name}]`;
    try {
      if (!this.tjp) { await this.loadTjp(); }
      if (this.tjpAddr !== info.tjpAddr) { return; }
      console.log(`${lc} triggered.\nthis.addr: ${this.addr}\ninfo: ${JSON.stringify(info, null, 2)}`);

      // await (new Promise(resolve => {
      //   console.warn('DEBUG DEBUG DEBUG DEBUG delaying...');
      //   setTimeout(() => { resolve(null); }, 1000)
      // }));

      if (!this.ibGib) { return; }
      if (!this.tjpAddr) { await this.loadTjp(); }
      if (info.tjpAddr !== this.tjpAddr) { return; }
      if (this.addr !== info.latestAddr) {
        await this.navTo({addr: info.latestAddr}); // hack
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      // at this point, we're guaranteed to be the latest in this component's tjp/timeline
      if (this.item) {
        this.item.refreshing = false;
        this.ref.detectChanges();
      }
    }
  }

  async handleTitleClick(): Promise<void> {
    if (this.item?.type === 'comment') {
      await Modals.alert({
        title: 'Context',
        message: this.item?.text,
      });
    }
  }
 }
