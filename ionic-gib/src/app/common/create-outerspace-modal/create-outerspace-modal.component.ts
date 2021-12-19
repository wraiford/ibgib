import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
  OuterSpaceType, OuterSpaceSubtype,
  SyncSpaceInfo, SyncSpace_AWSDynamoDB,
  VALID_OUTER_SPACE_TYPES, VALID_OUTER_SPACE_SUBTYPES, AWSRegion,
} from '../types';

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
  selector: 'create-outerspace-modal',
  templateUrl: './create-outerspace-modal.component.html',
  styleUrls: ['./create-outerspace-modal.component.scss'],
})
export class CreateOuterspaceModalComponent implements OnInit, OnDestroy {

  protected lc: string = `[${CreateOuterspaceModalComponent.name}]`;

  @Input()
  item: SyncSpaceInfo;

  @Input()
  types: OuterSpaceType[] = VALID_OUTER_SPACE_TYPES.concat();

  @Input()
  selectedType: OuterSpaceType = this.types[0];

  @Input()
  subtypes: OuterSpaceSubtype[] = VALID_OUTER_SPACE_SUBTYPES.concat();

  @Input()
  selectedSubtype: OuterSpaceSubtype = this.subtypes[0];

  // #region AWS DynamoDB settings

  @Input()
  region: AWSRegion = 'us-east-1';
  @Input()
  tableName: string;
  @Input()
  primaryKeyName: string = 'IbGibAddrHash';
  @Input()
  accessKeyId: string;
  @Input()
  secretAccessKey: string;

  // #endregion

  // #region encryption settings

  @Input()
  userSalt: string;
  @Input()
  userPassword: string;
  @Input()
  hint: string;
  @Input()
  initialRecursions: number = c.DEFAULT_ENCRYPTION_INITIAL_RECURSIONS;
  @Input()
  recursionsPerHash: number = c.DEFAULT_ENCRYPTION_RECURSIONS_PER_HASH;

  // #endregion

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

  async handleCreateClick(item: any): Promise<void> {
    const lc = `${this.lc}[${this.handleCreateClick.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      const validationErrors = await this.validateForm();
      if (validationErrors.length > 0) {
        console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
        return;
      }

      let newSpaceIbGib: IbGib_V1;

      // create the space
      if (this.selectedType === 'sync' && this.selectedSubtype === 'aws-dynamodb') {
        newSpaceIbGib = await this.createSyncSpace_AWSDynamoDB();
      } else {
        throw new Error(`unknown space type/subtype(?): ${this.selectedType}, ${this.selectedSubtype}`);
      }

      if (!newSpaceIbGib) { throw new Error(`newSpaceIbGib was not created`); }

      await this.modalController.dismiss(newSpaceIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async createSyncSpace_AWSDynamoDB(): Promise<IbGib_V1> {
    const lc = `${this.lc}[${this.createSyncSpace_AWSDynamoDB.name}]`;
    try {
      const syncInfo: SyncSpace_AWSDynamoDB = {
        type: 'sync',
        subtype: 'aws-dynamodb',
        tableName: this.tableName,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: this.region,
      };

      const data: OuterSpaceData = {
      }

      // create an ibgib with the filename and ext
      const resPicIbGib = await factory.firstGen({
        parentIbGib: factory.primitive({ib: 'pic'}),
        ib: `pic ${binHash}`,
        data,
        dna: true,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      });
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

  async validateForm(): Promise<string[]> {
    const lc = `${this.lc}[${this.validateForm.name}]`;
    const errors: string[] = [];

    let props: ValidationInfo[] = Object.values(validators);
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      let value = this[prop.name];
      if (logalot) { console.log(`${lc} doing ${prop.name}`); }
      if (value) {
        if (logalot) { console.log(`${lc} value: ${value}`); }

        if (typeof value === 'string') {
          if (prop.regexp) {
            if (logalot) { console.log(`${lc} ${prop.name} is a string. regexp: ${prop.regexp}`); }
            if ((value.match(prop.regexp) ?? []).length === 0) {
              errors.push(`${prop.name} must match regexp: ${prop.regexp}`);
            }
          }
          if ((<string>value).includes('\n')) {
            errors.push(`${prop.name} cannot contain new lines.`);
          }
        }
        if (prop.fn && !prop.fn(value)) {
          errors.push(`${prop.name} error: ${prop.fnErrorMsg}`);
        }
      } else {
        if (prop.required) {
          errors.push(`${prop.name} required.`);
        }
      }
    }

    return errors;
  }

}

interface ValidationInfo {
  name: string;
  label?: string;
  desc?: string;
  regexp?: RegExp;
  fn?: (value: string) => boolean;
  fnErrorMsg?: string;
  required?: boolean;
}

const ALLISH_SPECIAL_CHARS = `\`~!@#$%^&*()_\\-+=|\\\\\\]}[{"':;?/>.<,`;
const SAFE_SPECIAL_CHARS = `.'",!?`;
/**
 * @link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
 */
const AWS_DYNAMODB_REGEXP_TABLE_OR_INDEX: RegExp = /^[a-zA-Z0-9_\-.]{3,255}$/;
/**
 * @link https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html
 */
const AWS_DYNAMODB_REGEXP_ATTR: RegExp = /^[a-zA-Z0-9_\-.]{1,255}$/;

function getRegExp(min?: number, max?: number, specialChars?: string): RegExp {
  min = min ?? 1;
  max = max ?? 999999999999;
  specialChars = specialChars ?? SAFE_SPECIAL_CHARS;
  return new RegExp(`^[\\w\\s${specialChars}]{${min},${max}}$`);
}

const validators: { [name: string]: ValidationInfo } = {
  region: {
    name: "region",
    desc: "AWS Region",
    regexp: /^[a-z][a-z]-[a-z]{1,20}-[0-9]{1,2}$/,
    required: true,
  },
  tableName: {
    name: "tableName",
    desc: "AWS DynamoDB Table Name",
    regexp: AWS_DYNAMODB_REGEXP_TABLE_OR_INDEX,
    required: true,
  },
  primaryKeyName: {
    name: "primaryKeyName",
    desc: "Name of the primary key in the AWS DynamoDB table.",
    fn: (value) => { return value === 'IbGibAddrHash'; },
    fnErrorMsg: `Invalid primary key name. Right now, this must be IbGibAddrHash`,
    regexp: AWS_DYNAMODB_REGEXP_ATTR,
    required: true,
  },
  accessKeyId: {
    name: "accessKeyId",
    desc: "accessKeyId in AWS credentials for the DynamoDB API access",
    regexp: getRegExp(1, 50, ALLISH_SPECIAL_CHARS),
    required: true,
  },
  secretAccessKey: {
    name: "secretAccessKey",
    desc: "secretAccessKey in AWS credentials for the DynamoDB API access",
    regexp: getRegExp(1, 100, ALLISH_SPECIAL_CHARS),
    required: true,
  },

  userSalt: {
    name: "userSalt",
    desc: "Helps encryption. The longer and more random of salt, the better.",
    regexp: getRegExp(c.MIN_ENCRYPTION_SALT_LENGTH, c.MAX_ENCRYPTION_SALT_LENGTH, ALLISH_SPECIAL_CHARS),
    required: true,
  },
  userPassword: {
    name: "userPassword",
    desc: "Your own user password used to encrypt/decrypt whatever the information you're saving is.",
    regexp: getRegExp(c.MIN_ENCRYPTION_PASSWORD_LENGTH, c.MAX_ENCRYPTION_PASSWORD_LENGTH, ALLISH_SPECIAL_CHARS),
    fnErrorMsg: `Password must only contain letters, numbers and ${ALLISH_SPECIAL_CHARS}. Min: ${c.MIN_ENCRYPTION_PASSWORD_LENGTH}. Max: ${c.MAX_ENCRYPTION_PASSWORD_LENGTH}`,
    required: true,
  },
  hint: {
    name: "hint",
    desc: "Optional hint",
    regexp: getRegExp(1, 50, SAFE_SPECIAL_CHARS),
    fnErrorMsg: `Optional hint must contain letters, numbers and ${SAFE_SPECIAL_CHARS}`,
  },
  initialRecursions: {
    name: "initialRecursions",
    desc: "Number of initial recursions when encrypting/decrypting. Large number creates a one-time linear-ish cost.",
    fn: (value) => {
      if (!value || typeof value !== 'number') { return false; }
      const n = <number>value;
      return n >= c.MIN_ENCRYPTION_INITIAL_RECURSIONS && n <= c.MAX_ENCRYPTION_INITIAL_RECURSIONS && Number.isSafeInteger(n);
    },
    fnErrorMsg: `Initial recursions must be a whole number at least ${c.MIN_ENCRYPTION_INITIAL_RECURSIONS} and at most ${c.MAX_ENCRYPTION_INITIAL_RECURSIONS}`,
    required: true,
  },
  recursionsPerHash: {
    name: "recursionsPerHash",
    desc: "Number of recursions per hash when encrypting/decrypting. Huge cost as this gets bigger, since this happens for every single character of data.",
    fn: (value) => {
      if (!value || typeof value !== 'number') { return false; }
      const n = <number>value;
      return n >= c.MIN_ENCRYPTION_RECURSIONS_PER_HASH && n <= c.MAX_ENCRYPTION_INITIAL_RECURSIONS && Number.isSafeInteger(n);
    },
    fnErrorMsg: `Recursions per hash must be a whole number at least ${c.MIN_ENCRYPTION_RECURSIONS_PER_HASH} and at most ${c.MAX_ENCRYPTION_RECURSIONS_PER_HASH}, though really you probably want just a couple at most depending on the size of your data.`,
    required: true,
  },
  // : number = c.DEFAULT_ENCRYPTION_RECURSIONS_PER_HASH;
}