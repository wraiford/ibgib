import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
// import { analyzeAndValidateNgModules } from '@angular/compiler';
import { AlertController } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
const { Modals, Clipboard } = Plugins;

// import {AttributeValue, DynamoDBClient, PutItemCommand} from '@aws-sdk/client-dynamodb';

import * as h from 'ts-gib';
import { IbGibAddr, TransformResult } from 'ts-gib';
import { getIbGibAddr, pretty } from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { encrypt, decrypt, SaltStrategy } from 'encrypt-gib';

import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { CommonService } from '../services/common.service';
import { SPECIAL_URLS } from '../common/constants';
import { CiphertextIbGib_V1, LatestEventInfo, OuterSpaceIbGib, SecretIbGib_V1, } from '../common/types';
import * as c from '../common/constants';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { EncryptionData_V1 } from '../common/types';
import { CreateSecretModalComponent } from '../common/create-secret-modal/create-secret-modal.component';
import { CreateEncryptionModalComponent } from '../common/create-encryption-modal/create-encryption-modal.component';
import { CreateOuterspaceModalComponent } from '../common/create-outerspace-modal/create-outerspace-modal.component';
import { IbGibSpaceAny } from '../common/spaces/space-base-v1';
import { getFnAlert, getFnPromptPassword_AlertController } from '../common/helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ibgib-page',
  templateUrl: './ibgib.page.html',
  styleUrls: ['./ibgib.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IbGibPage extends IbgibComponentBase
  implements OnInit, OnDestroy {

  protected lc: string = `[${IbGibPage.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#abc123";
  public debugBorderStyle: string = "solid";

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
    protected alertController: AlertController,
  ) {
    super(common, ref);
  }

  async ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc} called.`) }
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

    if (logalot) { console.log(`${lc} initialData: ${initialData}`); }
    if (encryptedData) {
      if (logalot) { console.log(`${lc} encryptedData: ${encryptedData}`); }

      let { decryptedData, errors: errorsDecrypt } = await decrypt({
        encryptedData,
        initialRecursions: 100,
        recursionsPerHash: 10,
        salt,
        saltStrategy: SaltStrategy.appendPerHash,
        secret,
      });

      if (decryptedData) {
        if (logalot) { console.log(`${lc} decryptedData: ${decryptedData}`); }
        if (decryptedData === initialData) {
          if (logalot) { console.log(`${lc} initialData equals decryptedData`); }
        }
      } else {
        console.error(`${lc} decryptedData falsy!`);
      }
    } else if (errors?.length > 0) {
      console.error(`${lc} errored!!! here they are...`);
      for (let error in errors) { console.error(`${lc} ${error}`); }
      console.error(`${lc} end of errors.`)
    } else {
      if (logalot) { console.log(`${lc} no encryptedData and no errors?`); }
    }

  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc} called.`) }
    this.unsubscribeParamMap();
    super.ngOnDestroy();
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      if (logalot) { console.log(`${lc} ibGib: ${pretty(this.ibGib)}`); }
      await this.loadItem();
      this.updatePaused();
      if (!this.paused && !this.ib.startsWith('bin.')) {
        this.item.refreshing = true;
        setTimeout(async () => {
          await this.common.ibgibs.pingLatest_Local({ibGib: this.ibGib, tjp: this.tjp});
        });
      }
      document.title = this.item?.text ?? this.ibGib?.data?.text ?? this.gib;
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
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
      if (logalot) { console.log(`${lc} new addr`) }

      if (!SPECIAL_URLS.includes((addr || "").toLowerCase()) && encodeURI(addr).includes('%5E')) {
        // normal handling for a normal ibGib is to update the page's ibgib
        // and load everything.
        if (logalot) { console.log(`new paramMap. addr: ${addr}`); }
        if (addr !== this.addr) {
          this.updateIbGib(addr);
        } else {
          // do nothing, it's the same as the current addr
        }
      } else {
        // default special non-ibgib handler, go to the tags ibGib
        if (logalot) { console.log(`${lc} special url entered, navTo to tags ibGib`); }
        const tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags"});
        addr = getIbGibAddr({ibGib: tagsIbGib});
        await this.navTo({addr});
      }

    });

  }
  unsubscribeParamMap() {
    const lc = `${this.lc}[${this.unsubscribeParamMap.name}]`;
    if (logalot) { console.log(`${lc} unsubscribe called`); }
    if (this.paramMapSub) {
      if (logalot) { console.log(`${lc} unsubscribing`); }
      this.paramMapSub.unsubscribe();
      delete this.paramMapSub;
    }
  }

  async handleShareClick(): Promise<void> {
    const alert = getFnAlert();
    try {
      await Clipboard.write({ string: this.addr });

      await alert({title: 'ibgib address copied', msg:
        `Copied to clipboard!

        "${this.addr}"

        You can add this to another ibgib by going to that and clicking import (the little planet icon atm.)
        `
      });
    } catch (error) {
      await alert({title: 'ibgib address copied', msg: `clipboard failed...`});
    }

  }

  async handleSyncClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleSyncClick.name}]`;
    this.item.syncing = true;
    try {
      if (logalot) { console.log(`${lc}`); }
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }

      const resConfirmSync = await Modals.confirm({ title: 'Sync with outerspace?', message:
        `This will sync your current ibGib (${this.ib}) and ALL its rel8ns to your outerspace(s)? Proceed?`, });
      if (resConfirmSync.value) {
        // get newer ones

        // publish this one
        const dependencyGraph =
          await this.common.ibgibs.getDependencyGraph({ibGib: this.ibGib});
        await this.common.ibgibs.syncIbGibs({
          dependencyGraphIbGibs: Object.values(dependencyGraph)
        });
      } else {
        await Modals.alert({title: 'Sync cancelled.', message: 'Sync has been cancelled.'});
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      this.item.syncing = false;
      setTimeout(() => {
        this.ref.detectChanges();
      });
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
      await this.common.ibgibs.pingLatest_Local({ibGib: this.ibGib, tjp: this.tjp});
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
      if (logalot) { console.log(`${lc} triggered.\nthis.addr: ${this.addr}\ninfo: ${JSON.stringify(info, null, 2)}`); }

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
        setTimeout(() => { this.ref.detectChanges(); })
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

  async showFullscreenModal(): Promise<void> {
    const lc = `${this.lc}[${this.showFullscreenModal.name}]`;
    try {
      const addr = h.getIbGibAddr({ibGib: this.ibGib});
      const modal = await this.common.modalController.create({
        component: IbgibFullscreenModalComponent,
        componentProps: {
          addr,
        },
      });
      await modal.present();
      // await modal.componentOnReady();
      // await (<IbgibFullscreenModalComponent>modal.component).updateIbGib(this.addr);
      // let resModal = await modal.onWillDismiss();
      // const iconItem: IconItem = resModal.data;
      // if (!iconItem) {
      //   if (logalot) { console.log(`${lc} cancelled.`) }
      //   return;
      // }
      if (logalot) { console.log(`${lc} modal closed.`); }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
    }
  }

 }


