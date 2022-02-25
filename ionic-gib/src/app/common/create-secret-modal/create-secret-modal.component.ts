import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory, IbGibRel8ns_V1 } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
  VALID_SECRET_TYPES,
  FieldInfo,
  SecretType, SecretData_V1, SecretInfo_Password, SecretInfo,
} from '../types';
import { TransformResult } from 'ts-gib';
import { getExpirationUTCString, getRegExp, hash16816 } from '../helper';
import { CreateModalComponentBase } from '../bases/create-modal-component-base';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

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
export class CreateSecretModalComponent
  extends CreateModalComponentBase<TransformResult<IbGib_V1<SecretData_V1>>>
  implements OnInit, OnDestroy {

  protected lc: string = `[${CreateSecretModalComponent.name}]`;

  // @Input()
  // item: SyncSpaceInfo;

  // #region Secret Details

  @Input()
  name: string;
  @Input()
  description: string;
  @Input()
  hash16816_SHA256: string;

  @Input()
  secretTypes: SecretType[] = VALID_SECRET_TYPES.concat();
  @Input()
  secretType: SecretType = this.secretTypes[0];

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
  expirationUTC: string = getExpirationUTCString({years: 1});

  @Input()
  validationErrors: string[] = [];
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

  // #endregion

  fields: { [name: string]: FieldInfo } = {
    name: {
      name: "name",
      description: "It's a name for the secret. Make it short with only letters, underscores and hyphens.",
      label: "Name (public)",
      placeholder: `e.g. "default_password". brief_name-hyphensOK_32charMax`,
      regexp: getRegExp({min: 1, max: 32, chars: '-', noSpaces: true}),
      required: true,
    },
    description: {
      name: "description",
      description: `Optional description/notes for this secret. You can use this and/or hint. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      label: "Description (public)",
      placeholder: `Description/notes for this secret. Can use this and/or hint. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    },
    secretType: {
      name: "secretType",
      description: "Only 'password' right now. ",
      label: "Secret Type (public)",
      regexp: /^(password)$/,
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
      private: true,
    },
    userPasswordConfirm: {
      name: "userPasswordConfirm",
      label: "Password (confirm)",
      description: "Make sure we type in the same password...",
      required: true,
      private: true,
    },
    hint: {
      name: "hint",
      label: "Hint (public)",
      description: "Optional hint for your use as you see fit",
      placeholder: "Optional...",
      regexp: getRegExp({min: 1, max: 50, chars: c.SAFE_SPECIAL_CHARS}),
      fnErrorMsg: `Optional hint must contain letters, numbers and ${c.SAFE_SPECIAL_CHARS}`,
      private: true,
    },

  }

  @Input()
  showHelp: boolean;

  constructor(
    protected modalController: ModalController,
    private ref: ChangeDetectorRef,
  ) {
    super(modalController);
  }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  protected async createImpl(): Promise<TransformResult<IbGib_V1<SecretData_V1>>> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      // if (logalot) { console.log(`${lc}`); }
      // this.showHelp = false;
      // const validationErrors = await this.validateForm();
      // if (validationErrors.length > 0) {
      //   console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
      //   return;
      // }

      let resNewIbGib: TransformResult<IbGib_V1<SecretData_V1>>;

      // create the space
      if (this.secretType === 'password') {
        resNewIbGib = await this.createSecret_Password();
      } else {
        throw new Error(`unknown secret type(?): ${this.secretType}`);
      }

      if (!resNewIbGib) { throw new Error(`creation failed...`); }
      return resNewIbGib;

      // await this.modalController.dismiss(resNewIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async createSecret_Password(): Promise<TransformResult<IbGib_V1<SecretData_V1>>> {
    const lc = `${this.lc}[${this.createSecret_Password.name}]`;
    try {
      // already been validated
      const hash16816_SHA256 = await hash16816({s: this.userPassword, algorithm: 'SHA-256'});
      let data: SecretInfo_Password = {
        name: this.name,
        description: this.description,
        expirationUTC: getExpirationUTCString({years: 1}),
        type: 'password',
        hint: this.hint,
        hash16816_SHA256,
      };

      const resCreate = await factory.firstGen({
        parentIbGib: factory.primitive({ib: 'secret'}),
        ib: `secret password ${this.name}`,
        data,
        dna: false,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      });

      return <TransformResult<IbGib_V1<SecretData_V1>>>resCreate;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  handleSelectedSecretTypeChange(item: any): void {
    if (item?.detail?.value && this.secretTypes.includes(item!.detail!.value)) {
      this.secretType = item!.detail!.value!;
    }
  }

  async validateForm(): Promise<string[]> {
    const lc = `${this.lc}[${this.validateForm.name}]`;

    const errors = await super.validateForm();
    // this.validationErrors.splice(0, this.validationErrors.length);
    // this.erroredFields.splice(0, this.erroredFields.length);
    // const errors: string[] = [];
    // const erroredFields: string[] = [];

    // let fields: FieldInfo[] = Object.values(this.fields);
    // for (let i = 0; i < fields.length; i++) {
    //   const field = fields[i];
    //   let value = this[field.name];
    //   if (logalot) { console.log(`${lc} doing ${field.name}`); }
    //   if (value) {
    //     if (logalot) { console.log(`${lc} value: ${value}`); }

    //     if (typeof value === 'string') {
    //       if (field.regexp) {
    //         if (logalot) { console.log(`${lc} ${field.name} is a string. regexp: ${field.regexp}`); }
    //         if ((value.match(field.regexp) ?? []).length === 0) {
    //           erroredFields.push(field.name);
    //           errors.push(`${field.name} must match regexp: ${field.regexp}`);
    //         }
    //       }
    //       if ((<string>value).includes('\n')) {
    //         erroredFields.push(field.name);
    //         errors.push(`${field.name} cannot contain new lines.`);
    //       }
    //     }
    //     if (field.fnValid && !field.fnValid(value)) {
    //       erroredFields.push(field.name);
    //       errors.push(`${field.name} error: ${field.fnErrorMsg}`);
    //     }
    //   } else {
    //     if (field.required) {
    //       erroredFields.push(field.name);
    //       errors.push(`${field.name} required.`);
    //     }
    //   }
    // }

    if (this.userPassword !== this.userPasswordConfirm) {
      let emsg = `passwords don't match`;
      errors.push(emsg);
      this.validationErrors.push(emsg);
      this.erroredFields.push('userPassword');
    }

    return errors;
  }

  handleShowHelpClick(): void {
    this.showHelp = !this.showHelp;
  }

}
