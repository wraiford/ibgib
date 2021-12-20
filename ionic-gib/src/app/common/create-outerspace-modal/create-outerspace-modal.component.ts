import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
  OuterSpaceType, OuterSpaceSubtype,
  SyncSpaceInfo, SyncSpace_AWSDynamoDB,
  VALID_OUTER_SPACE_TYPES, VALID_OUTER_SPACE_SUBTYPES, AWSRegion, OuterSpaceData, SecretData_V1, FieldInfo,
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

  // @Input()
  // item: SyncSpaceInfo;

  // #region Outerspace Details

  @Input()
  name: string;
  @Input()
  description: string;

  @Input()
  types: OuterSpaceType[] = VALID_OUTER_SPACE_TYPES.concat();
  @Input()
  selectedType: OuterSpaceType = this.types[0];

  @Input()
  subtypes: OuterSpaceSubtype[] = VALID_OUTER_SPACE_SUBTYPES.concat();
  @Input()
  selectedSubtype: OuterSpaceSubtype = this.subtypes[0];

  @Input()
  secrets: IbGib_V1<SecretData_V1>[] = [];
  @Input()
  selectedSecrets: IbGib_V1<SecretData_V1>[] = [];

  // #endregion


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


  private fields: { [name: string]: FieldInfo } = {
    name: {
      name: "name",
      description: "It's a name...for the thing...the space...what you want to call it.",
      regexp: getRegExp({min: 1, max: 32, chars: '-'}),
      required: true,
    },
    description: {
      name: "description",
      description: "Description/notes for your benefit that you want to keep with this space.",
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    },
    region: {
      name: "region",
      description: "AWS Region",
      regexp: c.AWS_REGION_REGEXP,
      required: true,
    },
    tableName: {
      name: "tableName",
      description: "AWS DynamoDB Table Name",
      regexp: c.AWS_DYNAMODB_REGEXP_TABLE_OR_INDEX,
      required: true,
    },
    primaryKeyName: {
      name: "primaryKeyName",
      description: "Name of the primary key in the AWS DynamoDB table.",
      fnValid: (value) => { return value === 'IbGibAddrHash'; },
      fnErrorMsg: `Invalid primary key name. Right now, this must be IbGibAddrHash`,
      regexp: c.AWS_DYNAMODB_REGEXP_ATTR,
      required: true,
    },
    accessKeyId: {
      name: "accessKeyId",
      description: "accessKeyId in AWS credentials for the DynamoDB API access",
      regexp: getRegExp({min: 1, max: 50, chars: c.ALLISH_SPECIAL_CHARS}),
      required: true,
    },
    secretAccessKey: {
      name: "secretAccessKey",
      description: "secretAccessKey in AWS credentials for the DynamoDB API access",
      regexp: getRegExp({min: 1, max: 100, chars: c.ALLISH_SPECIAL_CHARS}),
      required: true,
    },

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
      throw new Error('not implemented');
      const syncInfo: SyncSpace_AWSDynamoDB = {
        type: 'sync',
        subtype: 'aws-dynamodb',
        tableName: this.tableName,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: this.region,
      };

      const data: OuterSpaceData = {
        encryptedInfo: null,
        encryptionDetails: null,
        name: this.name,
        description: this.description,
      }

      // create an ibgib with the filename and ext
      const resPicIbGib = await factory.firstGen({
        parentIbGib: factory.primitive({ib: ''}),
        ib: ``,
        data,
        dna: false,
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
  handleSelectedSecretsChange(item: any): void {
    debugger;
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

    if (this.selectedSecrets.length === 0) {
      errors.push('At least one secret is required.');
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