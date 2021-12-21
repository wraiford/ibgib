import { Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
// import { analyzeAndValidateNgModules } from '@angular/compiler';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

import {AttributeValue, DynamoDBClient, PutItemCommand} from '@aws-sdk/client-dynamodb';

import * as h from 'ts-gib';
import { IbGibAddr, TransformResult } from 'ts-gib';
import { getIbGibAddr, pretty } from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { encrypt, decrypt, SaltStrategy } from 'encrypt-gib';

import { IbgibComponentBase } from '../common/bases/ibgib-component-base';
import { CommonService } from '../services/common.service';
import { SPECIAL_URLS } from '../common/constants';
import { LatestEventInfo } from '../common/types';
import {
  AWSDynamoSpaceOptionsData,
  AWSDynamoSpaceOptionsRel8ns,
  AWSDynamoSpaceOptionsIbGib,
  AWSDynamoSpace_V1,
} from '../common/spaces/aws-dynamo-space-v1';
import { argy_, WitnessBase_V1 } from '../common/witnesses';
import * as c from '../common/constants';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { EncryptionData_V1, SecretData_V1 } from '../common/types';
import { CreateSecretModalComponent } from '../common/create-secret-modal/create-secret-modal.component';
import { CreateEncryptionModalComponent } from '../common/create-encryption-modal/create-encryption-modal.component';
import { CreateOuterspaceModalComponent } from '../common/create-outerspace-modal/create-outerspace-modal.component';

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
      if (!this.paused) {
        this.item.refreshing = true;
        setTimeout(async () => {
          await this.common.ibgibs.pingLatest({ibGib: this.ibGib, tjp: this.tjp});
        });
      }
      document.title = this.title;
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

  async publishIbGibs({
    ibGibs,
    confirm,
  }: {
    ibGibs?: IbGib_V1[],
    confirm?: boolean,
  }): Promise<void> {
    const lc = `${this.lc}[${this.publishIbGibs.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!ibGibs || ibGibs.length === 0) { throw new Error(`ibGibs required.`)}

      let secretIbGibs: IbGib_V1[] = await this.common.ibgibs.getSpecialRel8dIbGibs({
        type: "secrets",
        rel8nName: c.SECRET_REL8N_NAME,
      });
      if (secretIbGibs.length === 0) {
        await Modals.alert({
          title: 'first create some stuff...',
          message: "First we'll need to do a couple things, like create a secret password, an encryption setting, and a cloud endpoint.",
        });
      }
      while (secretIbGibs.length === 0) {
        let secretIbGib = await this.promptCreateSecretIbGib();
        if (secretIbGib === undefined) {
          await Modals.alert({title: 'cancelled', message: 'Cancelled.'});
          return;
        }
        await this.common.ibgibs.registerNewIbGib({ ibGib: secretIbGib, });
        await this.common.ibgibs.rel8ToSpecialIbGib({
          type: "secrets",
          rel8nName: c.SECRET_REL8N_NAME,
          ibGibsToRel8: [secretIbGib],
        });
        secretIbGibs = await this.common.ibgibs.getSpecialRel8dIbGibs({
          type: "secrets",
          rel8nName: c.SECRET_REL8N_NAME,
        });
      }

      let encryptionIbGibs: IbGib_V1[] = await this.common.ibgibs.getSpecialRel8dIbGibs({
        type: "encryptions",
        rel8nName: c.ENCRYPTION_REL8N_NAME,
      });
      if (encryptionIbGibs.length === 0) {
        await Modals.alert({
          title: 'next create an encryption...',
          message: "Now we need to create an encryption setting...bear with me if you don't know what this is.",
        });
      }
      while (encryptionIbGibs.length === 0) {
        let encryptionIbGib = await this.promptCreateEncryptionIbGib();
        if (encryptionIbGib === undefined) {
          await Modals.alert({title: 'cancelled', message: 'Cancelled.'});
          return;
        }
        await this.common.ibgibs.registerNewIbGib({ ibGib: encryptionIbGib, });
        await this.common.ibgibs.rel8ToSpecialIbGib({
          type: "encryptions",
          rel8nName: c.ENCRYPTION_REL8N_NAME,
          ibGibsToRel8: [encryptionIbGib],
        });
        encryptionIbGibs = await this.common.ibgibs.getSpecialRel8dIbGibs({
          type: "encryptions",
          rel8nName: c.ENCRYPTION_REL8N_NAME,
        });
      }

      debugger;
      // put the ibgibs
      let awsSpace = new AWSDynamoSpace_V1(null, null);
      // let argPut =
        // await argy_<AWSDynamoSpaceOptionsData, AWSDynamoSpaceOptionsRel8ns, AWSDynamoSpaceOptionsIbGib>({
      let argPut = await awsSpace.argy({
          argData: { cmd: 'put', },
          ibGibs,
      });
      let resPut = await awsSpace.witness(argPut);

      if ((resPut?.data?.errors || []).length > 0) {
        throw new Error(`resPut had errors: ${resPut.data.errors}`);
      }

      if (confirm) {
        const ibGibAddrs = ibGibs.map(x => h.getIbGibAddr({ibGib: x}));
        console.warn(`test individual ibgibs confirming put was successful...need to remove!`);
        const argGet = await awsSpace.argy({
          argData: {
            cmd: 'get',
            ibGibAddrs,
          }
        });
        const resGet = await awsSpace.witness(argGet);

        if (resGet.ibGibs?.length !== ibGibs.length) {
          throw new Error(`resGet.ibGibs?.length: ${resGet.ibGibs?.length} but ibGibs.length: ${ibGibs.length}`);
        }

        for (let i = 0; i < ibGibAddrs.length; i++) {
          const addr = ibGibAddrs[i];
          const ibGib = ibGibs.filter(x => h.getIbGibAddr({ibGib: x}) === addr)[0];
          const gotIbGibs = resGet.ibGibs?.filter(x => h.getIbGibAddr({ibGib: x}) === addr);
          if (gotIbGibs.length !== 1) { throw new Error(`did not get addr: ${addr}`); }
          const gotIbGib = gotIbGibs[0];
          if (ibGib.ib !== gotIbGib.ib) { throw new Error(`ib is different`); }
          if (ibGib.gib !== gotIbGib.gib) { throw new Error(`gib is different`); }
          if (JSON.stringify(ibGib.data) !== JSON.stringify(gotIbGib.data)) { throw new Error(`data is different`); }
          if (JSON.stringify(ibGib.rel8ns) !== JSON.stringify(gotIbGib.rel8ns)) { throw new Error(`rel8ns is different`); }
          if (logalot) { console.log(`${lc} confirmed ${h.getIbGibAddr({ibGib})}`); }
        }

        if (logalot) { console.log(`${lc} confirmation complete.`); }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async promptCreateSecretIbGib(): Promise<IbGib_V1 | undefined> {
    const lc = `${this.lc}[${this.promptCreateSecretIbGib.name}]`;
    try {
      const modal = await this.common.modalController.create({
        component: CreateSecretModalComponent,
      });
      await modal.present();
      let resModal = await modal.onWillDismiss();
      if (resModal.data) {
        const resNewSecret = <TransformResult<IbGib_V1<SecretData_V1>>>resModal.data;
        await this.common.ibgibs.persistTransformResult({resTransform: resNewSecret});
        const addr = h.getIbGibAddr({ibGib: resNewSecret.newIbGib});
        if (logalot) { console.log(`${lc} created secret. addr: ${addr}`); }
        await this.common.ibgibs.rel8ToSpecialIbGib({
          type: "secrets",
          rel8nName: c.SECRET_REL8N_NAME,
          ibGibsToRel8: [resNewSecret.newIbGib],
        });
        return resNewSecret.newIbGib;
      } else {
        // didn't create one
        console.warn(`${lc} didn't create at this time.`);
        return undefined;
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      return undefined;
    }
  }

  async promptCreateEncryptionIbGib(): Promise<IbGib_V1 | undefined> {
    const lc = `${this.lc}[${this.promptCreateEncryptionIbGib.name}]`;
    try {
      const modal = await this.common.modalController.create({
        component: CreateEncryptionModalComponent,
      });
      await modal.present();
      let resModal = await modal.onWillDismiss();
      if (resModal.data) {
        const resNewEncryption = <TransformResult<IbGib_V1<EncryptionData_V1>>>resModal.data;
        await this.common.ibgibs.persistTransformResult({resTransform: resNewEncryption});
        const addr = h.getIbGibAddr({ibGib: resNewEncryption.newIbGib});
        if (logalot) { console.log(`${lc} created secret. addr: ${addr}`); }
        return resNewEncryption.newIbGib;
      } else {
        // didn't create one
        console.warn(`${lc} didn't create at this time.`);
        return undefined;
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      return undefined;
    }
  }

  async promptCreateOuterSpaceIbGib(): Promise<IbGib_V1 | undefined> {
    const lc = `${this.lc}[${this.promptCreateOuterSpaceIbGib.name}]`;
    try {
      const modal = await this.common.modalController.create({
        component: CreateOuterspaceModalComponent,
      });
      await modal.present();
      let resModal = await modal.onWillDismiss();
      if (resModal.data) {
        const newSpace = <IbGib_V1>resModal.data;
        const addr = h.getIbGibAddr({ibGib: newSpace});
        if (logalot) { console.log(`${lc} created outerspace. addr: ${addr}`); }
        return newSpace;
      } else {
        // didn't create one
        console.warn(`${lc} didn't create outerspace at this time.`);
        return undefined;
      }
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      return undefined;
    }
  }
  async handlePublishClick(): Promise<void> {
    const lc = `${this.lc}[${this.handlePublishClick.name}]`;
    this.item.publishing = true;
    try {
      if (logalot) { console.log(`${lc}`); }
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }

      // await Modals.alert({ title: 'debug', message: "publish clicked", });
      const resConfirmPublish = await Modals.confirm({ title: 'Publish to the world?', message: `This will publish your current ibGib (${this.ib})? Proceed?`, });
      if (resConfirmPublish.value) {
        const dependencyGraph =
          await this.common.ibgibs.getDependencyGraph({ibGib: this.ibGib});
        await this.publishIbGibs({ibGibs: Object.values(dependencyGraph)});
      } else {
        await Modals.alert({title: 'Publish cancelled.', message: 'Publish has been cancelled.'});
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      this.item.publishing = false;
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
      if (logalot) { console.log(`${lc} triggered.\nthis.addr: ${this.addr}\ninfo: ${JSON.stringify(info, null, 2)}`); }

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


