import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
  OuterSpaceType, SyncSpaceSubtype,
  VALID_OUTER_SPACE_TYPES, VALID_OUTER_SPACE_SUBTYPES, AWSRegion,
  OuterSpaceData, OuterSpaceRel8ns,
  SecretData_V1, FieldInfo, EncryptionData_V1, OuterSpaceIbGib, SecretIbGib_V1,
} from '../types';
import { getFnPromptPassword_AlertController, getRegExp } from '../helper';
import { CreateModalComponentBase } from '../bases/create-modal-component-base';
import { IbGibAddr, TransformResult } from 'ts-gib';
import { CommonService } from 'src/app/services/common.service';
import { SyncSpaceData_AWSDynamoDB } from '../witnesses/spaces/aws-dynamo-space-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

const EXAMPLE_SYNC_SPACE_AWSDYNAMODB: SyncSpaceData_AWSDynamoDB = {
    uuid: '01c4bb00999741018716c47bf7bebcf2',
    name: 'default_name',
    description: 'this is a test space.',
    type: 'sync',
    subtype: 'aws-dynamodb',

    tableName: 'some-table-name-with-primary-key-named-ibGibAddrHash',
    bucketName: 'some-bucket-name-for-large-ibgibs',
    accessKeyId: 'some-aws-key-id',
    secretAccessKey: 'some-aws-secret-access-key',
    region: 'us-east-1',

    maxRetryThroughputCount: c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT,
    maxRetryUnprocessedItemsCount: c.DEFAULT_AWS_MAX_RETRY_UNPROCESSED_ITEMS,
    putBatchSize: c.DEFAULT_AWS_PUT_BATCH_SIZE,
    getBatchSize: c.DEFAULT_AWS_GET_BATCH_SIZE,
    queryBatchSize: c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE,
    throttleMsBetweenPuts: c.DEFAULT_AWS_PUT_THROTTLE_MS,
    throttleMsBetweenGets: c.DEFAULT_AWS_GET_THROTTLE_MS,
    throttleMsDueToThroughputError: c.DEFAULT_AWS_RETRY_THROUGHPUT_THROTTLE_MS,

    catchAllErrors: true,
    persistOptsAndResultIbGibs: true,
    validateIbGibAddrsMatchIbGibs: true,
    trace: false,
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
  extends CreateModalComponentBase<TransformResult<OuterSpaceIbGib>>
  implements OnInit, OnDestroy, AfterViewInit {

  protected lc: string = `[${CreateOuterspaceModalComponent.name}]`;

  @Input()
  uuid: string;
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
  secrets: SecretIbGib_V1[] = [];
  @Input()
  selectedSecrets: SecretIbGib_V1[] = [];


  @Input()
  region: AWSRegion = 'us-east-1';
  @Input()
  tableName: string;
  @Input()
  bucketName: string;
  @Input()
  primaryKeyName: string = 'IbGibAddrHash';
  @Input()
  accessKeyId: string;
  @Input()
  secretAccessKey: string;

  /**
   * Mainly for future use. This declares publicly how a space decides
   * to add to itself.
   */
  @Input()
  consensusAddr: IbGibAddr = c.CONSENSUS_ADDR_SYNC_NAIVE_PUT_MERGE;

  fields: { [name: string]: FieldInfo } = {
    name: {
      name: "name",
      description: "Short name of the space, with only letters, underscores and hyphens.",
      label: "Name",
      placeholder: `e.g. "def_sync_space-hyphensOK_32charMax"`,
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
      private: true,
    },
    bucketName: {
      name: "bucketName",
      description: "AWS S3 Bucket Name",
      label: "S3 Bucket Name",
      regexp: c.AWS_S3_REGEXP_BUCKET,
      required: true,
      private: true,
    },
    primaryKeyName: {
      name: "primaryKeyName",
      description: "Name of the primary key in the AWS DynamoDB table.",
      label: "Primary Key Name",
      fnValid: (value) => { return value === 'IbGibAddrHash'; },
      fnErrorMsg: `Invalid primary key name. Right now, this must be IbGibAddrHash`,
      regexp: c.AWS_DYNAMODB_REGEXP_ATTR,
      required: true,
      private: true,
    },
    accessKeyId: {
      name: "accessKeyId",
      description: "accessKeyId in AWS credentials for the DynamoDB API access",
      label: "Access Key Id",
      regexp: getRegExp({min: 1, max: 50, chars: c.ALLISH_SPECIAL_CHARS}),
      required: true,
      private: true,
    },
    secretAccessKey: {
      name: "secretAccessKey",
      description: "secretAccessKey in AWS credentials for the DynamoDB API access",
      label: "Secret Access Key",
      regexp: getRegExp({min: 1, max: 100, chars: c.ALLISH_SPECIAL_CHARS}),
      required: true,
      private: true,
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
      private: true,
    },
  }

  // @Input()
  // validationErrors: string[] = [];
  // @Input()
  // validationErrorString: string;
  // @Input()
  // erroredFields: string[] = [];

  // @Input()
  // showHelp: boolean;

  constructor(
    protected modalController: ModalController,
    protected common: CommonService,
    protected alertController: AlertController,
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
    this.uuid = await h.getUUID();

    this.encryptions = await this.common.ibgibs.getSpecialRel8dIbGibs({
      type: "encryptions", rel8nName: c.ENCRYPTION_REL8N_NAME
    });
    this.encryption = this.encryptions[0];

    this.secrets = await this.common.ibgibs.getSpecialRel8dIbGibs({
      type: "secrets", rel8nName: c.SECRET_REL8N_NAME
    });

  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  protected async createImpl(): Promise<TransformResult<OuterSpaceIbGib>> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      let resSpaceIbGib: TransformResult<OuterSpaceIbGib>;

      // create the space
      if (this.type === 'sync' && this.subtype === 'aws-dynamodb') {
        resSpaceIbGib = await this.createSyncSpace_AWSDynamoDB();
      } else {
        throw new Error(`unknown space type/subtype(?): ${this.type}, ${this.subtype}`);
      }

      if (!resSpaceIbGib) {
        console.warn(`${lc} Create failed.`);
        return undefined;
      }

      return resSpaceIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
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

  async createSyncSpace_AWSDynamoDB(): Promise<TransformResult<OuterSpaceIbGib>> {
    const lc = `${this.lc}[${this.createSyncSpace_AWSDynamoDB.name}]`;
    try {
      // prompt for the secret(s)
      const password = await this.common.ibgibs.promptForSecrets({
        secretIbGibs: this.secrets,
        fnPromptPassword:
          getFnPromptPassword_AlertController({alertController: this.alertController}),
        checkCacheFirst: false,
        cacheAfter: false, // should be true probably(?)
      });

      if (!password) { return undefined; }

      // create the info
      const uuid = await h.getUUID();
      const syncSpaceData: SyncSpaceData_AWSDynamoDB = {
        version: '2',
        uuid,
        name: this.name,
        description: this.description,
        type: 'sync',
        subtype: 'aws-dynamodb',

        tableName: this.tableName,
        bucketName: this.bucketName,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: this.region,

        maxRetryThroughputCount: c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT,
        maxRetryUnprocessedItemsCount: c.DEFAULT_AWS_MAX_RETRY_UNPROCESSED_ITEMS,
        putBatchSize: c.DEFAULT_AWS_PUT_BATCH_SIZE,
        getBatchSize: c.DEFAULT_AWS_GET_BATCH_SIZE,
        queryBatchSize: c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE,
        throttleMsBetweenPuts: c.DEFAULT_AWS_PUT_THROTTLE_MS,
        throttleMsBetweenGets: c.DEFAULT_AWS_GET_THROTTLE_MS,
        throttleMsDueToThroughputError: c.DEFAULT_AWS_RETRY_THROUGHPUT_THROTTLE_MS,
        validateIbGibAddrsMatchIbGibs: c.DEFAULT_AWS_VALIDATE_IBGIBADDRS_MATCH_IBGIBS,
      };

      // create the ciphertext ibgib, encrypting with the encryption and secret(s)
      const resCiphertext =
        await this.common.ibgibs.getCiphertextIbGib({
          plaintext: JSON.stringify(syncSpaceData),
          password,
          encryptionIbGib: this.encryption,
          confirm: true,
          persist: true,
          // publicIbMetadata: `outerspace sync ${this.name}`,
          // publicMetadata: { name: this.name, description: this.description, },
        });

      // create the outerspace ibgib, rel8ing to the ciphertext ibgib
      const resOuterSpace = await factory.firstGen({
        parentIbGib: factory.primitive({ib: 'outerspace'}),
        ib: `outerspace sync ${this.name}`,
        data: <OuterSpaceData>{
          name: this.name,
          uuid: this.uuid,
          description: this.description,
        },
        rel8ns: <OuterSpaceRel8ns>{
          [c.CIPHERTEXT_REL8N_NAME]:
            [h.getIbGibAddr({ibGib: resCiphertext.newIbGib})],
          [c.SECRET_REL8N_NAME]:
            this.selectedSecrets.map(ibGib => h.getIbGibAddr(ibGib)),
        },
        dna: false,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      });

      return <TransformResult<OuterSpaceIbGib>>resOuterSpace;
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
    if (!item?.detail?.value || !Array.isArray(item.detail.value)) {
      this.selectedSecrets = [];
      return;
    }
    const newSecrets: SecretIbGib_V1[] = item.detail!.value!;
    this.selectedSecrets = newSecrets;
  }

  compareWith_Secrets(a: any, b: any): boolean {
    return a.gib === b.gib;
  }

  compareWith_Encryptions(a: any, b: any): boolean {
    return a.gib === b.gib;
  }
}
