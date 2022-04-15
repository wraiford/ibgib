import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IonContent, ModalController } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, Factory_V1 as factory, Rel8n } from 'ts-gib/dist/V1';

import { HashAlgorithm } from 'encrypt-gib';
import { TransformResult } from 'ts-gib';

import * as c from '../../constants';
import { ModalFormComponentBase } from '../../bases/modal-form-component-base';
import { FormItemInfo } from '../../../ibgib-forms/types/form-items';
import { RobbotIbGib_V1 } from '../../types/robbot';
import { CommonService } from '../../../services/common.service';
import { RandomRobbotData_V1, RandomRobbot_V1 } from '../../witnesses/robbots/random-robbot-v1';
import { getRobbotIb } from '../../helper/robbot';
import { getRegExp } from '../../helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export interface RobbotModalResult {

}

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'robbot-modal-form',
  templateUrl: './robbot-modal-form.component.html',
  styleUrls: ['./robbot-modal-form.component.scss'],
})
export class RobbotModalFormComponent
  extends ModalFormComponentBase<TransformResult<RobbotIbGib_V1>> {

  protected lc: string = `[${RobbotModalFormComponent.name}]`;

  fields: { [name: string]: FormItemInfo } = {
    name: {
      name: "name",
      description: "A robbot's name. Doesn't have to be unique, no spaces, up to 32 alphanumerics/underscores in length.",
      label: "Name",
      placeholder: `e.g. "bob_the_cool_robbot"`,
      regexp: getRegExp({min: 1, max: 32, noSpaces: true}),
      required: true,
    },
    description: {
      name: "description",
      description: `Description/notes for this robbot. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      label: "Description",
      placeholder: `Describe these robbot settings here...`,
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    },
    // id: {
    //   name: "id",
    //   description: `auto-generated id for this robbot`,
    //   label: "Id",
    //   placeholder: `Describe these robbot settings here...`,
    //   regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    // },

  }

  @Input()
  formItems: FormItemInfo[] = [
    {
      name: "name",
      description: "A robbot's name. Doesn't have to be unique, no spaces, up to 32 alphanumerics/underscores in length.",
      label: "Name",
      placeholder: `e.g. "bob_the_cool_robbot"`,
      regexp: getRegExp({min: 1, max: 32, noSpaces: true}),
      regexpSource: getRegExp({min: 1, max: 32, noSpaces: true}).source,
      required: true,
      dataType: 'text',
      value: 'my robbot name',
    },
    {
      name: "description",
      description: `Description/notes for this robbot. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      label: "Description",
      placeholder: `Describe these robbot settings here...`,
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
      regexpSource: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}).source,
      dataType: 'textarea',
      value: 'my robbot description is great',
    },
  ];

  @Input()
  name: string;
  @Input()
  description: string;
  // @Input()
  // id: string;
  @Input()
  classname: string;


  @Input()
  validationErrors: string[] = super.validationErrors
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

  @Input()
  showHelp: boolean;

  /**
   * If we are editing an ibGib, this will be populated and {@link createImpl}
   * will mutate it. Otherwise, this will be falsy, and {@link createImpl} will
   * create a new one.
   */
  @Input()
  ibGib: RobbotIbGib_V1;

  constructor(
    protected common: CommonService,
  ) {
    super(common);
    const lc = `${this.lc}[ctor]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      // spin off auto-generated id (done now when creating ibgib via tjp uuid)
      // if (logalot) { console.log(`${lc} spinning off initializing id (I: 8bebe8f77154c39cd55d92d509849d22)`); }
      // h.getUUID().then(uuid => {
      //   this.id = uuid;
      //   if (logalot) { console.log(`${lc} id set. this.id = ${this.id} (I: e67d18ce32679a629839c80b50cc1f22)`); }
      // });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<TransformResult<RobbotIbGib_V1>> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      // this.showHelp = false;
      // const validationErrors = await this.validateForm();
      // if (validationErrors.length > 0) {
      //   console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
      //   return;
      // }
      debugger;

      let resNewIbGib: TransformResult<RobbotIbGib_V1>;

      // create the robbot
      // ...how should I be doing the creating for various types of robbots?
      // some kind of ioc?

      if (!resNewIbGib) { throw new Error(`creation failed... (E: ddc73faeb9d74eeca5f415d4b9e3f425)`); }

      return resNewIbGib;
      // await this.modalController.dismiss(resNewIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async createRobbot_Random(): Promise<TransformResult<RobbotIbGib_V1>> {
    const lc = `${this.lc}[${this.createRobbot_Random.name}]`;
    try {

      debugger;

      let robbotData: RandomRobbotData_V1 = {
        name: this.name,
        uuid: 'some uuid',
        // uuid: this.id,
      };

      const ib = getRobbotIb({robbotData, classname: this.classname});

      const resRobbot = <TransformResult<RobbotIbGib_V1>>await factory.firstGen({
        ib,
        parentIbGib: factory.primitive({ib: `robbot ${this.classname}`}),
        data: robbotData,
        dna: true,
        linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
        nCounter: true,
        tjp: { uuid: true, timestamp: true },
      });
      const robbotDto = resRobbot.newIbGib;

      let robbotIbGib = new RandomRobbot_V1(null, null);
      // robbotIbGib.loadDto(robbotDto);

      resRobbot.newIbGib = robbotIbGib;
      return resRobbot;

      // let data: RobbotInfo_EncryptGib = {
      //   name: this.name,
      //   description: this.description,
      //   method: this.method,
      //   hashAlgorithm: this.hashAlgorithm,
      //   initialRecursions: this.initialRecursions,
      //   recursionsPerHash: this.recursionsPerHash,
      //   salt: this.userSalt,
      //   saltStrategy: 'prependPerHash',
      //   encryptedDataDelimiter: ',',
      // };

      // const resCreate = await factory.firstGen({
      //   parentIbGib: factory.primitive({ib: 'secret'}),
      //   ib: `robbot ${this.method} ${this.name}`,
      //   data,
      //   dna: false,
      //   tjp: { uuid: true, timestamp: true },
      //   nCounter: true,
      // });

      // return <TransformResult<IbGib_V1<RobbotData_V1>>>resCreate;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  // handleMethodChange(item: any): void {
  //   if (item?.detail?.value && item!.detail!.value! === RobbotMethod.encrypt_gib_weak) {
  //     this.method = item!.detail!.value!;
  //   }
  // }

  // handleSelectedHashAlgorithmChange(item: any): void {
  //   if (item?.detail?.value && Object.values(HashAlgorithm).includes(item!.detail!.value!)) {
  //     this.hashAlgorithm = item!.detail!.value!;
  //   }
  // }

  async handleValidated({
    validatedItems,
  }: {
    validatedItems: FormItemInfo[],
  }): Promise<void> {
    const lc = `${this.lc}[${this.handleValidated.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      debugger;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleCancel(): Promise<void> {
    const lc = `${this.lc}[${this.handleCancel.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      debugger;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
