import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IonContent, ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';

import * as c from '../../constants';
import { HashAlgorithm } from 'encrypt-gib';
import { TransformResult } from 'ts-gib';
import { ModalFormComponentBase } from '../../bases/modal-form-component-base';
import { CommonService } from '../../../services/common.service';
import { EncryptionIbGib, EncryptionMethod, EncryptionData_V1, EncryptionInfo_EncryptGib } from '../../types/encryption';
import { FieldInfo } from '../../types/form';
import { getExpirationUTCString, getRegExp } from '../../helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'encryption-modal-form',
  templateUrl: './encryption-modal-form.component.html',
  styleUrls: ['./encryption-modal-form.component.scss'],
})
export class EncryptionModalFormComponent
  extends ModalFormComponentBase<TransformResult<EncryptionIbGib>> {

  protected lc: string = `[${EncryptionModalFormComponent.name}]`;

  public fields: { [name: string]: FieldInfo } = {
    name: {
      name: "name",
      description: "It's a name for the secret. Make it short with only letters, underscores and hyphens.",
      label: "Name (public)",
      placeholder: `e.g. "my_enc-hyphensOK_32charMax"`,
      regexp: getRegExp({min: 1, max: 32, chars: '-', noSpaces: true}),
      required: true,
    },
    description: {
      name: "description",
      description: `Description/notes for this encryption. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      label: "Description (public)",
      placeholder: `Describe these encryption settings here...`,
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    },
    method: {
      name: "method",
      description: `All we got right now is '${EncryptionMethod.encrypt_gib_weak}.'`,
      label: "Method (public)",
      fnValid: (value: string) => { return value === EncryptionMethod.encrypt_gib_weak; },
      fnErrorMsg: `Must be '${EncryptionMethod.encrypt_gib_weak}'`,
      required: true,
    },

    userSalt: {
      name: "userSalt",
      label: "Salt (public)",
      description: "Helps encryption. The longer and more random of salt, the better.",
      placeholder: "type in many many **random** characters (lots and lots)",
      regexp: getRegExp({
        min: c.MIN_ENCRYPTION_SALT_LENGTH,
        max: c.MAX_ENCRYPTION_SALT_LENGTH,
        chars: c.ALLISH_SPECIAL_CHARS
      }),
      required: true,
    },
    initialRecursions: {
      name: "initialRecursions",
      label: "Initial Recursions (public)",
      description: "Number of initial recursions when encrypting/decrypting. Large number creates a one-time linear-ish cost.",
      fnValid: (value) => {
        if (!value || typeof value !== 'number') { return false; }
        const n = <number>value;
        return n >= c.MIN_ENCRYPTION_INITIAL_RECURSIONS && n <= c.MAX_ENCRYPTION_INITIAL_RECURSIONS && Number.isSafeInteger(n);
      },
      fnErrorMsg: `Initial recursions must be a whole number at least ${c.MIN_ENCRYPTION_INITIAL_RECURSIONS} and at most ${c.MAX_ENCRYPTION_INITIAL_RECURSIONS}`,
      required: true,
    },
    recursionsPerHash: {
      name: "recursionsPerHash",
      label: "Recursions Per Hash Round (public)",
      description: "Number of recursions per hash when encrypting/decrypting. Huge cost as this gets bigger, since this happens for every single character of data.",
      fnValid: (value) => {
        if (!value || typeof value !== 'number') { return false; }
        const n = <number>value;
        return n >= c.MIN_ENCRYPTION_RECURSIONS_PER_HASH && n <= c.MAX_ENCRYPTION_INITIAL_RECURSIONS && Number.isSafeInteger(n);
      },
      fnErrorMsg: `Recursions per hash must be a whole number at least ${c.MIN_ENCRYPTION_RECURSIONS_PER_HASH} and at most ${c.MAX_ENCRYPTION_RECURSIONS_PER_HASH}, though really you probably want just a couple at most depending on the size of your data.`,
      required: true,
    },
    hashAlgorithm: {
      name: "hashAlgorithm",
      label: "Hash Algorithm",
      description: "Hash that the encryption uses internally.",
      fnValid: (value: string) => {
        return Object.values(HashAlgorithm).includes(<any>value);
      },
      fnErrorMsg: `Must be one of: ${Object.values(HashAlgorithm).join(', ')}`,
      required: true,
    },

  }

  @Input()
  name: string;
  @Input()
  description: string;

  @Input()
  method: EncryptionMethod = EncryptionMethod.encrypt_gib_weak;

  @Input()
  userSalt: string;
  @Input()
  initialRecursions: number = c.DEFAULT_ENCRYPTION_INITIAL_RECURSIONS;
  @Input()
  recursionsPerHash: number = c.DEFAULT_ENCRYPTION_RECURSIONS_PER_HASH;
  @Input()
  hashAlgorithm: HashAlgorithm = 'SHA-256';
  @Input()
  expirationUTC: string = getExpirationUTCString({years: 1});

  @Input()
  validationErrors: string[] = [];
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

  @Input()
  showHelp: boolean;

  constructor(
    protected common: CommonService,
  ) {
    super(common);
  }

  protected async createImpl(): Promise<TransformResult<EncryptionIbGib>> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      // this.showHelp = false;
      // const validationErrors = await this.validateForm();
      // if (validationErrors.length > 0) {
      //   console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
      //   return;
      // }

      let resNewIbGib: TransformResult<IbGib_V1<EncryptionData_V1>>;

      // create the encryption
      if (this.method === EncryptionMethod.encrypt_gib_weak) {
        resNewIbGib = await this.createEncryption_EncryptGibWeak();
      } else {
        throw new Error(`unknown encryption method (?): ${this.method}`);
      }

      if (!resNewIbGib) { throw new Error(`creation failed...`); }

      return resNewIbGib;
      // await this.modalController.dismiss(resNewIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async createEncryption_EncryptGibWeak(): Promise<TransformResult<EncryptionIbGib>> {
    const lc = `${this.lc}[${this.createEncryption_EncryptGibWeak.name}]`;
    try {

      let data: EncryptionInfo_EncryptGib = {
        name: this.name,
        description: this.description,
        method: this.method,
        hashAlgorithm: this.hashAlgorithm,
        initialRecursions: this.initialRecursions,
        recursionsPerHash: this.recursionsPerHash,
        salt: this.userSalt,
        saltStrategy: 'prependPerHash',
        encryptedDataDelimiter: ',',
      };

      const resCreate = await factory.firstGen({
        parentIbGib: factory.primitive({ib: 'secret'}),
        ib: `encryption ${this.method} ${this.name}`,
        data,
        dna: false,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      });

      return <TransformResult<IbGib_V1<EncryptionData_V1>>>resCreate;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  handleMethodChange(item: any): void {
    if (item?.detail?.value && item!.detail!.value! === EncryptionMethod.encrypt_gib_weak) {
      this.method = item!.detail!.value!;
    }
  }

  handleSelectedHashAlgorithmChange(item: any): void {
    if (item?.detail?.value && Object.values(HashAlgorithm).includes(item!.detail!.value!)) {
      this.hashAlgorithm = item!.detail!.value!;
    }
  }

}
