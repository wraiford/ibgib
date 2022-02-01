import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
  EncryptionData_V1,
  EncryptionInfo_EncryptGib,
  EncryptionMethod,
  FieldInfo,
} from '../types';
import { HashAlgorithm } from 'encrypt-gib';
import { TransformResult } from 'ts-gib';
import { getRegExp } from '../helper';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'create-encryption-modal',
  templateUrl: './create-encryption-modal.component.html',
  styleUrls: ['./create-encryption-modal.component.scss'],
})
export class CreateEncryptionModalComponent implements OnInit, OnDestroy {

  protected lc: string = `[${CreateEncryptionModalComponent.name}]`;

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
  expirationUTC: string = (new Date(new Date().setFullYear(new Date().getFullYear() + 1))).toUTCString();

  @Input()
  validationErrors: string[] = [];
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

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
  showHelp: boolean;

  constructor(
    private modalController: ModalController,
  ) {
  }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  async handleCreateClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleCreateClick.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      this.showHelp = false;
      const validationErrors = await this.validateForm();
      if (validationErrors.length > 0) {
        console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
        return;
      }

      let resNewIbGib: TransformResult<IbGib_V1<EncryptionData_V1>>;

      // create the encryption
      if (this.method === EncryptionMethod.encrypt_gib_weak) {
        resNewIbGib = await this.createEncryption_EncryptGibWeak();
      } else {
        throw new Error(`unknown encryption method (?): ${this.method}`);
      }

      if (!resNewIbGib) { throw new Error(`creation failed...`); }

      await this.modalController.dismiss(resNewIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async createEncryption_EncryptGibWeak(): Promise<TransformResult<IbGib_V1<EncryptionData_V1>>> {
    const lc = `${this.lc}[${this.createEncryption_EncryptGibWeak.name}]`;
    try {

      let data: EncryptionInfo_EncryptGib = {
        name: this.name,
        description: this.description,
        // /**
        //  * ty
        //  * https://stackoverflow.com/questions/8609261/how-to-determine-one-year-from-now-in-javascript
        //  */
        // expirationUTC: (new Date(new Date().setFullYear(new Date().getFullYear() + 1))).toUTCString(),
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

  async handleCancelClick(): Promise<void> {
    await this.modalController.dismiss();
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

  async validateForm(): Promise<string[]> {
    const lc = `${this.lc}[${this.validateForm.name}]`;
    this.validationErrors.splice(0, this.validationErrors.length);
    this.erroredFields.splice(0, this.erroredFields.length);
    const errors: string[] = [];
    const erroredFields: string[] = [];

    let fields: FieldInfo[] = Object.values(this.fields);
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      let value = this[field.name];
      if (logalot) { console.log(`${lc} doing ${field.name}`); }
      if (value) {
        if (logalot) { console.log(`${lc} value: ${value}`); }

        if (typeof value === 'string') {
          if (field.regexp) {
            if (logalot) { console.log(`${lc} ${field.name} is a string. regexp: ${field.regexp}`); }
            if ((value.match(field.regexp) ?? []).length === 0) {
              erroredFields.push(field.name);
              errors.push(`${field.name} must match regexp: ${field.regexp}`);
            }
          }
          if ((<string>value).includes('\n')) {
            erroredFields.push(field.name);
            errors.push(`${field.name} cannot contain new lines.`);
          }
        }
        if (field.fnValid && !field.fnValid(value)) {
          erroredFields.push(field.name);
          errors.push(`${field.name} error: ${field.fnErrorMsg}`);
        }
      } else {
        if (field.required) {
          erroredFields.push(field.name);
          errors.push(`${field.name} required.`);
        }
      }
    }

    errors.forEach(e => this.validationErrors.push(e));
    if (this.validationErrors.length > 0) {
      console.error('wth')
      console.error(`${lc} this.validationErrors:\n${this.validationErrors.join('\n')}`);
    }
    return errors;
  }

  handleShowHelpClick(): void {
    this.showHelp = !this.showHelp;
  }

}
