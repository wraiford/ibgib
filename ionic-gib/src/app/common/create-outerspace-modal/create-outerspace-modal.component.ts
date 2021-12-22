import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
  OuterSpaceType, SyncSpaceSubtype,
  SyncSpaceInfo, SyncSpace_AWSDynamoDB,
  VALID_OUTER_SPACE_TYPES, VALID_OUTER_SPACE_SUBTYPES, AWSRegion, OuterSpaceData, SecretData_V1, FieldInfo, EncryptionData_V1,
} from '../types';
import { getRegExp } from '../helper';
import { CreateModalComponentBase } from '../bases/create-modal-component-base';
import { TransformResult } from 'ts-gib';
import { CommonService } from 'src/app/services/common.service';

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
export class CreateOuterspaceModalComponent
  extends CreateModalComponentBase<TransformResult<IbGib_V1<OuterSpaceData>>>
  implements OnInit, OnDestroy, AfterViewInit {

  protected lc: string = `[${CreateOuterspaceModalComponent.name}]`;


  @Input()
  name: string;
  @Input()
  description: string;

  @Input()
  types: OuterSpaceType[] = [];
  @Input()
  type: OuterSpaceType;

  @Input()
  subtypes: SyncSpaceSubtype[] = [];
  @Input()
  subtype: SyncSpaceSubtype;

  @Input()
  encryptions: IbGib_V1<EncryptionData_V1>[] = [];
  @Input()
  encryption: IbGib_V1<EncryptionData_V1>;

  @Input()
  secrets: IbGib_V1<SecretData_V1>[] = [];
  @Input()
  selectedSecrets: IbGib_V1<SecretData_V1>[] = [];


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

  fields: { [name: string]: FieldInfo } = {
    name: {
      name: "name",
      description: "Short name of the space, with only letters, underscores and hyphens.",
      label: "Name",
      placeholder: "brief_name-hyphensOK_32charMax",
      regexp: getRegExp({min: 1, max: 32, chars: '-', noSpaces: true}),
      required: true,
    },
    description: {
      name: "description",
      description: `Description/notes for this space endpoint, with only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      label: "Description",
      placeholder: `Optionally describe this space here...`,
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    },
    type: {
      name: "type",
      label: "Type",
      description: "Type of space.",
      required: true,
    },
    subtype: {
      name: "subtype",
      description: "Specific implementation of the space.",
      label: "Subtype",
      required: true,
    },
    region: {
      name: "region",
      description: "AWS Region",
      label: "AWS Region",
      regexp: c.AWS_REGION_REGEXP,
      required: true,
    },
    tableName: {
      name: "tableName",
      description: "AWS DynamoDB Table Name",
      label: "Table Name",
      regexp: c.AWS_DYNAMODB_REGEXP_TABLE_OR_INDEX,
      required: true,
    },
    primaryKeyName: {
      name: "primaryKeyName",
      description: "Name of the primary key in the AWS DynamoDB table.",
      label: "Primary Key Name",
      fnValid: (value) => { return value === 'IbGibAddrHash'; },
      fnErrorMsg: `Invalid primary key name. Right now, this must be IbGibAddrHash`,
      regexp: c.AWS_DYNAMODB_REGEXP_ATTR,
      required: true,
    },
    accessKeyId: {
      name: "accessKeyId",
      description: "accessKeyId in AWS credentials for the DynamoDB API access",
      label: "Access Key Id",
      regexp: getRegExp({min: 1, max: 50, chars: c.ALLISH_SPECIAL_CHARS}),
      required: true,
    },
    secretAccessKey: {
      name: "secretAccessKey",
      description: "secretAccessKey in AWS credentials for the DynamoDB API access",
      label: "Secret Access Key",
      regexp: getRegExp({min: 1, max: 100, chars: c.ALLISH_SPECIAL_CHARS}),
      required: true,
    },


    encryption: {
      name: "encryption",
      description: "Select an encryption to associate with this endpoint.",
      label: "Encryption",
      fnErrorMsg: `An Encryption is required.`,
    },
    selectedSecrets: {
      name: "selectedSecrets",
      description: "Select one or more secrets to associate with this endpoint. You'll be required to enter the password for each one in order for us to encrypt your space endpoint.",
      label: "Secrets",
      fnErrorMsg: `At least one secret is required.`,
    },
  }

  @Input()
  validationErrors: string[] = [];
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

  @Input()
  showHelp: boolean;

  constructor(
    protected modalController: ModalController,
    protected common: CommonService,
  ) {
    super(modalController);
  }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  async ngAfterViewInit(): Promise<void> {
    this.types = VALID_OUTER_SPACE_TYPES.concat();
    this.type = this.types[0];
    this.subtypes = VALID_OUTER_SPACE_SUBTYPES.concat();
    this.subtype = this.subtypes[0];

    debugger;
    this.encryptions = await this.common.ibgibs.getSpecialRel8dIbGibs({
      type: "encryptions", rel8nName: c.ENCRYPTION_REL8N_NAME
    });
    this.encryption = this.encryptions[0];

    this.secrets = await this.common.ibgibs.getSpecialRel8dIbGibs({
      type: "secrets", rel8nName: c.SECRET_REL8N_NAME
    });
    debugger;
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  protected async createImpl(): Promise<TransformResult<IbGib_V1<OuterSpaceData>>> {
  // async handleCreateClick(): Promise<void> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      let newSpaceIbGib: TransformResult<IbGib_V1<OuterSpaceData>>;

      // create the space
      if (this.type === 'sync' && this.subtype === 'aws-dynamodb') {
        newSpaceIbGib = await this.createSyncSpace_AWSDynamoDB();
      } else {
        throw new Error(`unknown space type/subtype(?): ${this.type}, ${this.subtype}`);
      }

      if (!newSpaceIbGib) { throw new Error(`newSpaceIbGib was not created`); }

      return newSpaceIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async validateForm(): Promise<string[]> {
      const lc = `${this.lc}[${this.validateForm.name}]`;
      try {
        const errors = await super.validateForm();

        if (this.selectedSecrets.length === 0) {
          const emsg = `Must select at least one secret`;
          this.validationErrors.push(emsg);
          errors.push(emsg)
        }

        return errors;
      } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
      }
  }

  async createSyncSpace_AWSDynamoDB(): Promise<TransformResult<IbGib_V1<OuterSpaceData>>> {
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

  handleSelectedTypeChange(item: any): void {
    if (item?.detail?.value && this.types.includes(item!.detail!.value)) {
      this.type = item!.detail!.value;
    }
  }
  handleSelectedSubtypeChange(item: any): void {
    if (item?.detail?.value && this.subtypes.includes(item!.detail!.value)) {
      this.subtype = item!.detail!.value;
    }
  }
  handleSelectedEncryptionChange(item: any): void {
    if (item?.detail?.value && this.encryptions.includes(item!.detail!.value)) {
      this.encryption = item!.detail!.value;
    }
  }
  handleSelectedSecretsChange(item: any): void {
    if (item?.detail?.value && this.secrets.includes(item!.detail!.value)) {
      this.selectedSecrets = item!.detail!.value;
    }
  }

  compareWith_Secrets(a: any, b: any): boolean {
    debugger;
    return a.gib === b.gib;
  }

  compareWith_Encryptions(a: any, b: any): boolean {
    debugger;
    return a.gib === b.gib;
  }
}
