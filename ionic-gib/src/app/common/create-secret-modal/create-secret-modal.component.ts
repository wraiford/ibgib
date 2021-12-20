import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
  SecretType, SecretSubtype,
  SyncSpaceInfo, SyncSpace_AWSDynamoDB,
  VALID_SECRET_TYPES, VALID_SECRET_SUBTYPES,
  SecretData_V1,
  EncryptionInfo_EncryptGib,
  FieldInfo,
} from '../types';
import { HashAlgorithm } from 'encrypt-gib';
import { TransformResult } from 'ts-gib';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

const EXAMPLE_SYNC_SPACE_AWSDYNAMODB: SyncSpace_AWSDynamoDB = {
    type: 'sync',
    subtype: 'aws-dynamodb',
    tableName: 'some-table-name-with-primary-key-named-ibGibAddrHash',
    accessKeyId: 'some-aws-key-id',
    secretAccessKey: 'some-aws-secret-access-key',
    region: 'us-east-1',
}

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'create-secret-modal',
  templateUrl: './create-secret-modal.component.html',
  styleUrls: ['./create-secret-modal.component.scss'],
})
export class CreateSecretModalComponent implements OnInit, OnDestroy {

  protected lc: string = `[${CreateSecretModalComponent.name}]`;

  // @Input()
  // item: SyncSpaceInfo;

  // #region Secret Details

  @Input()
  name: string;
  @Input()
  description: string;

  @Input()
  types: SecretType[] = VALID_SECRET_TYPES.concat([<any>'x', <any>'y']);
  @Input()
  selectedType: SecretType = this.types[0];

  @Input()
  subtypes: SecretSubtype[] = VALID_SECRET_SUBTYPES.concat();
  @Input()
  selectedSubtype: SecretSubtype = this.subtypes[0];

  handleDebug(): void {
    debugger;
    let x = this.types;
    let x2 = this.selectedType;
    let y = this.subtypes;
    let y2 = this.selectedSubtype;
  }
  // #endregion


  // #region encryption settings

  @Input()
  userSalt: string;
  @Input()
  userPassword: string;
  @Input()
  userPasswordConfirm: string;
  @Input()
  hint: string;
  @Input()
  initialRecursions: number = c.DEFAULT_ENCRYPTION_INITIAL_RECURSIONS;
  @Input()
  recursionsPerHash: number = c.DEFAULT_ENCRYPTION_RECURSIONS_PER_HASH;
  @Input()
  hashAlgorithm: HashAlgorithm;
  @Input()
  expirationUTC: string = (new Date(new Date().setFullYear(new Date().getFullYear() + 1))).toUTCString();

  // #endregion

  public fields: { [name: string]: FieldInfo } = {
    name: {
      name: "name (public)",
      description: "It's a name for the secret. Make it short with only letters, underscores and hyphens.",
      label: "Name",
      placeholder: "brief_name-hyphensOK_32charMax",
      regexp: getRegExp({min: 1, max: 32, chars: '-'}),
      required: true,
    },
    description: {
      name: "description",
      description: `Description/notes for this secret. Can use this and/or hint. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      label: "Description (public)",
      placeholder: `Description/notes for this secret. Can use this and/or hint. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
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
    userPassword: {
      name: "userPassword",
      label: "Password (private)",
      description: "Your own user password used to encrypt/decrypt whatever the information you're saving is.",
      placeholder: "Enter a password for this data. This is NOT your secret for the API. This is to encrypt this ibGib's information only.",
      regexp: getRegExp({
        min: c.MIN_ENCRYPTION_PASSWORD_LENGTH,
        max: c.MAX_ENCRYPTION_PASSWORD_LENGTH,
        chars: c.ALLISH_SPECIAL_CHARS
      }),
      fnErrorMsg: `Password must only contain letters, numbers and ${c.ALLISH_SPECIAL_CHARS}. Min: ${c.MIN_ENCRYPTION_PASSWORD_LENGTH}. Max: ${c.MAX_ENCRYPTION_PASSWORD_LENGTH}`,
      required: true,
    },
    userPasswordConfirm: {
      name: "userPasswordConfirm",
      label: "Password (confirm)",
      description: "Make sure we type in the same password...",
      required: true,
    },
    hint: {
      name: "hint",
      label: "Hint (public)",
      description: "Optional hint for your use as you see fit",
      placeholder: "Optional...",
      regexp: getRegExp({min: 1, max: 50, chars: c.SAFE_SPECIAL_CHARS}),
      fnErrorMsg: `Optional hint must contain letters, numbers and ${c.SAFE_SPECIAL_CHARS}`,
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

    expirationUTC: {
      name: 'expirationUTC',
      label: 'Expiration (UTC, public)',
      description: "Conventional wisdom says you shouldn't use the same secret forever.",
      fnValid: (value) => {
        if (!value || typeof value !== 'string') return false;
        const valueAsDate = new Date(value);
        const isValidDateString = valueAsDate.toString() !== 'Invalid Date';
        const isInFuture = valueAsDate.getTime() - (new Date()).getTime() > 0;
        return isValidDateString && isInFuture;
      },
      fnErrorMsg: `Invalid date/time value. (?) Should be a valid UTC string and in the future.`,
      required: true,
    }
  }

  constructor(
    private modalController: ModalController,
  ) { }

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
      const validationErrors = await this.validateForm();
      if (validationErrors.length > 0) {
        console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
        return;
      }

      let resNewIbGib: TransformResult<IbGib_V1<SecretData_V1>>;

      // create the space
      if (this.selectedType === 'password' && this.selectedSubtype === 'encryption') {
        resNewIbGib = await this.createSecret_PasswordEncryption();
      } else {
        throw new Error(`unknown space type/subtype(?): ${this.selectedType}, ${this.selectedSubtype}`);
      }

      if (!resNewIbGib) { throw new Error(`creation failed...`); }

      await this.modalController.dismiss(resNewIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async createSecret_PasswordEncryption(): Promise<TransformResult<IbGib_V1<SecretData_V1>>> {
    const lc = `${this.lc}[${this.createSecret_PasswordEncryption.name}]`;
    try {

      let data: EncryptionInfo_EncryptGib = {
        name: this.name,
        description: this.description,
        /**
         * ty
         * https://stackoverflow.com/questions/8609261/how-to-determine-one-year-from-now-in-javascript
         */
        expirationUTC: (new Date(new Date().setFullYear(new Date().getFullYear() + 1))).toUTCString(),
        type: 'password',
        subtype: 'encryption',
        method: 'encrypt-gib (weak)',
        hint: this.hint,
        hashAlgorithm: this.hashAlgorithm,
        initialRecursions: this.initialRecursions,
        recursionsPerHash: this.recursionsPerHash,
        salt: this.userSalt,
        saltStrategy: 'prependPerHash',
        encryptedDataDelimiter: ',',
      };

      // create an ibgib with the filename and ext
      const res = await factory.firstGen({
        parentIbGib: factory.primitive({ib: 'secret'}),
        ib: `secret password encryption ${this.name}`,
        data,
        dna: false,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      });

      return <TransformResult<IbGib_V1<SecretData_V1>>>res;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async handleCancelClick(): Promise<void> {
    await this.modalController.dismiss();
  }

  handleSelectedTypeChange(item: any): void {
    debugger;
    if (item?.detail?.value && this.types.includes(item!.detail!.value)) {
      this.selectedType = item!.detail!.value;
    }
  }
  handleSelectedSubtypeChange(item: any): void {
    debugger;
    if (item?.detail?.value && this.subtypes.includes(item!.detail!.value)) {
      this.selectedSubtype = item!.detail!.value;
    }
    // this.selectedSubtype = item;
  }

  handleSelectedHashAlgorithmChange(item: any): void {
    debugger;
    if (item?.detail?.value && Object.values(HashAlgorithm).includes(item!.detail!.value)) {
      this.hashAlgorithm = item!.detail!.value;
    }
  }

  async validateForm(): Promise<string[]> {
    const lc = `${this.lc}[${this.validateForm.name}]`;
    const errors: string[] = [];

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
              errors.push(`${field.name} must match regexp: ${field.regexp}`);
            }
          }
          if ((<string>value).includes('\n')) {
            errors.push(`${field.name} cannot contain new lines.`);
          }
        }
        if (field.fnValid && !field.fnValid(value)) {
          errors.push(`${field.name} error: ${field.fnErrorMsg}`);
        }
      } else {
        if (field.required) {
          errors.push(`${field.name} required.`);
        }
      }
    }

    if (this.userPassword !== this.userPasswordConfirm) {
      errors.push(`passwords don't match`);
    }

    return errors;
  }

}

function getRegExp({
  min,
  max,
  chars,
}: {
  min?: number,
  max?: number,
  chars?: string
}): RegExp {
  min = min ?? 1;
  max = max ?? 999999999999;
  chars = chars ?? '';
  return new RegExp(`^[\\w\\s${chars}]{${min},${max}}$`);
}
