import {
    AttributeValue, DynamoDBClient,
    PutItemCommand, PutItemCommandInput,
    GetItemCommand, GetItemCommandInput,
    BatchWriteItemCommand, BatchWriteItemCommandInput, BatchWriteItemCommandOutput,
    BatchGetItemCommand, BatchGetItemCommandInput, BatchGetItemCommandOutput,
    KeysAndAttributes,
} from '@aws-sdk/client-dynamodb';

import {
    IbGib_V1, IbGibRel8ns_V1, sha256v1, IBGIB_DELIMITER,
} from 'ts-gib/dist/V1';
import { getIbGibAddr, IbGibAddr, V1 } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
// import { encodeStringToHexString, decodeHexStringToString } from 'encrypt-gib/dist/helper';
// import { encrypt, decrypt, HashAlgorithm, SaltStrategy } from 'encrypt-gib';

import { SpaceBase_V1 } from './space-base-v1';
import {
    AWSRegion,
    IbGibSpaceData,
    IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib,
    IbGibSpaceOptionsRel8ns,
    IbGibSpaceRel8ns,
    IbGibSpaceResultData, IbGibSpaceResultIbGib, IbGibSpaceResultRel8ns, OuterSpaceData, OuterSpaceRel8ns, SyncSpaceData, SyncSpaceSubtype,
} from '../types';
import * as c from '../constants';
import { getBinAddr } from '../helper';
import { Plugins } from '@capacitor/core';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

// #region DynamoDB related

type AWSDynamoDBItem = { [key: string]: AttributeValue };



/**
 * Item interface
 */
interface AWSDynamoSpaceItem extends AWSDynamoDBItem {
    [c.DEFAULT_PRIMARY_KEY_NAME]: AttributeValue,
    ib: AttributeValue,
    gib: AttributeValue,
    data?: AttributeValue,
    rel8ns?: AttributeValue,
    binData?: AttributeValue,
};

/**
 * helper function that checks if an error is an aws throughput error.
 */
function isThroughputError(error: any): boolean {
    return error?.name === c.AWS_THROUGHPUT_ERROR_NAME;
}

/**
 * builds the filename based on the given params.
 *
 * @returns filename based on params
 */
async function getPrimaryKey({
    addr,
    binHash,
    binExt
}: {
    addr?: string,
    binHash?: string,
    binExt?: string,
}): Promise<string> {
    const lc = `[${getPrimaryKey.name}]`;
    try {
        if (!addr && !(binHash && binExt)) { throw new Error('either addr or binHash+binExt required.'); }
        if (!addr) {
            addr = getBinAddr({binHash, binExt});
        }
        const primaryKey = await h.hash({s: addr, algorithm: 'SHA-256'});
        return primaryKey;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

async function createDynamoDBPutItem({
    ibGib,
    binHash,
    binExt,
    binData,
}: {
    ibGib?: IbGib_V1,
    binHash?: string,
    binExt?: string,
    binData?: any,
}): Promise<AWSDynamoSpaceItem> {
    const lc = `[${createDynamoDBPutItem.name}]`;
    try {
        let item: AWSDynamoSpaceItem;
        if (ibGib) {
            const addr = h.getIbGibAddr({ibGib});
            const primaryKey = await getPrimaryKey({addr});

            item = {
                [c.DEFAULT_PRIMARY_KEY_NAME]: { S: primaryKey },
                ib: { S: JSON.stringify(ibGib.ib) },
                gib: { S: JSON.stringify(ibGib.gib) },
            }
            if (ibGib.data) { item.data = { S: JSON.stringify(ibGib.data) }; }
            if (ibGib.rel8ns) { item.rel8ns = { S: JSON.stringify(ibGib.rel8ns) }; }
        } else if (binHash && binExt && binData) {
            const addrHash = await getPrimaryKey({binHash, binExt});
            const addr = getBinAddr({binHash, binExt});
            const { ib, gib } = h.getIbAndGib({ibGibAddr: addr});

            item = {
                [c.DEFAULT_PRIMARY_KEY_NAME]: { S: addrHash },
                ib: { S: ib },
                gib: { S: gib },
                data: { B: binData },
            }
        } else {
            throw new Error(`either ibGib or binHash+binExt+binData required.`);
        }

        if (!item) { throw new Error(`item not set(?)`); }

        return item;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

function createDynamoDBGetItemCommand({
    tableName,
    keyName,
    primaryKey,
}: {
    tableName: string,
    keyName: string,
    primaryKey: string,
}): GetItemCommand {
    const params: GetItemCommandInput = {
        TableName: tableName,
        Key: { [keyName]: { S: primaryKey } },
    };
    return new GetItemCommand(params);
}
function createDynamoDBPutItemCommand({
    tableName,
    item,
}: {
    tableName: string,
    item: AWSDynamoSpaceItem,
}): PutItemCommand {
    const params: PutItemCommandInput = {
        TableName: tableName,
        Item: item,
    };
    return new PutItemCommand(params);
}
function createDynamoDBBatchWriteItemCommand({
    tableName,
    items,
}: {
    tableName: string,
    items: AWSDynamoSpaceItem[],
}): BatchWriteItemCommand {
    const params: BatchWriteItemCommandInput = {
        RequestItems: {
            [tableName]: items.map(Item => { return {PutRequest: { Item }} })
        }
    };
    return new BatchWriteItemCommand(params);
}
/**
 *
 * @param param0
 * @returns
 *
 * ## from aws doc (hard to find which one that helps)
 *
 * ```
 * {
    "Thread": {
        "Keys": [
            {
                "ForumName":{"S": "Amazon DynamoDB"},
                "Subject":{"S": "DynamoDB Thread 1"}
            },
            {
                "ForumName":{"S": "Amazon S3"},
                "Subject":{"S": "S3 Thread 1"}
            }
        ],
        "ProjectionExpression":"ForumName, Subject, LastPostedDateTime, Replies"
    }
 * }
 */
async function createDynamoDBBatchGetItemCommand({
    tableName,
    addrs,
    projectionExpression,
    unprocessedKeys,
}: {
    tableName: string,
    addrs?: IbGibAddr[],
    projectionExpression?: string,
    unprocessedKeys?: KeysAndAttributes,
}): Promise<BatchGetItemCommand> {
    const lc = `[${createDynamoDBBatchGetItemCommand.name}]`;
    try {
        if (!tableName) { throw new Error(`tableName required.`); }

        // build the params input either from scratch of the unprocessedKeys
        let params: BatchGetItemCommandInput;
        if (addrs) {
            // populate keys
            const keys: string[] = [];
            for (let i = 0; i < addrs.length; i++) {
                const addr = addrs[i];
                const primaryKey = await getPrimaryKey({addr});
                keys.push(primaryKey);
            }
            params = {
                RequestItems: {
                    [tableName]: {
                        // e.g. { IbGibAddrHash: { S: '3b5781e8653a40269132a5c586e6472b'} },
                        Keys: keys.map(key => { return { [c.DEFAULT_PRIMARY_KEY_NAME]: { S: key }} }),
                        ConsistentRead: true,
                        ProjectionExpression: projectionExpression,
                    }
                }
            };
        } else if (unprocessedKeys) {
            params = { RequestItems: { unprocessedKeys } };
        } else {
            // bubbles up
            throw new Error(`either addrs or unprocessedKeys required.`);
        }

        // create the cmd
        return new BatchGetItemCommand(params);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

function getIbGibFromResponseItem({
    getIbGibsResponseItem,
}: {
    getIbGibsResponseItem: AWSDynamoSpaceItem,
}): IbGib_V1 {
    const lc = `[${getIbGibFromResponseItem.name}]`;
    try {
        if (!getIbGibsResponseItem) { throw new Error(`getIbGibsResponseItem required`); }
        const ibGib: IbGib_V1 = {
            ib: JSON.parse(getIbGibsResponseItem.ib.S),
            gib: JSON.parse(getIbGibsResponseItem.gib.S),
        };
        if (getIbGibsResponseItem.data) { ibGib.data = JSON.parse(getIbGibsResponseItem.data.S); }
        if (getIbGibsResponseItem.rel8ns) { ibGib.rel8ns = JSON.parse(getIbGibsResponseItem.rel8ns.S); }
        return ibGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

function createClient({
    accessKeyId,
    secretAccessKey,
    region,
}: {
    accessKeyId: string,
    secretAccessKey: string,
    region: AWSRegion,
}): DynamoDBClient {
    const lc = `[${createClient.name}]`;
    try {
        const client = new DynamoDBClient({
            credentials: { accessKeyId, secretAccessKey, },
            region,
            tls: true,
        });

        return client;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

// #endregion

// #region Space related interfaces/constants


// export interface SyncSpaceData_AWSDynamoDB extends SyncSpaceData {
//     tableName: string;
//     accessKeyId: string;
//     secretAccessKey: string;
//     region: AWSRegion;
// }

/**
 * This is the shape of data about this space itself (not the contained ibgibs' spaces).
 */
export interface SyncSpaceData_AWSDynamoDB extends SyncSpaceData {
    tableName: string;
    accessKeyId: string;
    secretAccessKey: string;
    region: AWSRegion;
    /**
     * Max number of times to retry due to 400 errors related to throughput.
     */
    maxRetryThroughputCount: number;
    /**
     * Max number of times to retry due to unprocessed items in command result.
     */
    maxRetryUnprocessedItemsCount: number;
    /**
     * Puts of ibgibs will be batched into this size max.
     */
    putBatchSize: number;
    /**
     * Gets of ibgibAddrs will be batched into this size max.
     */
    getBatchSize: number;
    /**
     * delays this ms between batch put calls in a tight loop.
     */
    throttleMsBetweenPuts: number;
    /**
     * delays this ms between batch get calls in a tight loop.
     */
    throttleMsBetweenGets: number;
    /**
     * Delays this ms if we get a 400 error about exceeding throughput.
     */
    throttleMsDueToThroughputError: number;
}

export interface SyncSpaceRel8ns_AWSDynamoDB
    extends OuterSpaceRel8ns {
}

const DEFAULT_AWS_DYNAMO_SPACE_DATA_V1: SyncSpaceData_AWSDynamoDB = {
    name: c.IBGIB_SPACE_NAME_DEFAULT,
    type: 'sync',
    subtype: 'aws-dynamodb',
    tableName: '',
    maxRetryThroughputCount: c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT,
    maxRetryUnprocessedItemsCount: c.DEFAULT_AWS_MAX_RETRY_UNPROCESSED_ITEMS,
    accessKeyId: '',
    secretAccessKey: '',
    region: '',
    putBatchSize: c.DEFAULT_AWS_PUT_BATCH_SIZE,
    getBatchSize: c.DEFAULT_AWS_GET_BATCH_SIZE,
    throttleMsBetweenPuts: c.DEFAULT_AWS_PUT_THROTTLE_MS,
    throttleMsBetweenGets: c.DEFAULT_AWS_GET_THROTTLE_MS,
    throttleMsDueToThroughputError: c.DEFAULT_AWS_RETRY_THROUGHPUT_THROTTLE_MS,
}

/**
 * Space options involve whether we're getting/putting ibgibs categorized as
 * meta, bin, dna.
 *
 * We'll leverage the fact that we don't need to get dna very often, and that
 * meta ibgibs act differently and are recorded differently.
 *
 * For example, we don't necessarily want to keep the past of certain meta
 * objects, because it may change (and thus grow) too quickly.
 */
export interface AWSDynamoSpaceOptionsData extends IbGibSpaceOptionsData {
    /**
     * If getting binary, this is the hash we're looking for (binId)
     */
    binHash?: string;
    /**
     * If getting binary, this is the extension.
     */
    binExt?: string;
    /**
     * If truthy, will look in the meta subpath first, then the regular if not found.
     */
    isMeta?: boolean;
    /**
     * Are we looking for a DNA ibgib?
     */
    isDna?: boolean;
}

export interface AWSDynamoSpaceOptionsRel8ns extends IbGibSpaceOptionsRel8ns {
}

export interface AWSDynamoSpaceOptionsIbGib
    extends IbGibSpaceOptionsIbGib<IbGib_V1, AWSDynamoSpaceOptionsData, AWSDynamoSpaceOptionsRel8ns> {
    /**
     * Binary data from files like pics.
     *
     * ## notes
     *
     * This is not in the data interface itself, because we don't want
     * to persist this data
     */
    binData?: any;
}

/** Marker interface atm */
export interface AWSDynamoSpaceResultData extends IbGibSpaceResultData {
}

export interface AWSDynamoSpaceResultRel8ns extends IbGibSpaceResultRel8ns {
}

export interface AWSDynamoSpaceResultIbGib
    extends IbGibSpaceResultIbGib<IbGib_V1, AWSDynamoSpaceResultData, AWSDynamoSpaceResultRel8ns> {
    /**
     * This is used when you're getting a pic's binary content.
     *
     * ## notes
     *
     * This is not in the data interface itself, because we don't want
     * to persist this data
     */
    binData?: any;
}

// #endregion

// #region get/put files related (re-using from files service)

interface BaseResult {
  success?: boolean;
  /**
   * If errored, this will contain the errorMsg.
   */
  errorMsg?: string;
}

/**
 * Options for retrieving data from the file system.
 */
interface GetIbGibOpts {
  /**
   * If getting ibGib object, this is its address.
   */
  addr?: IbGibAddr;
  /**
   * If getting binary, this is the hash we're looking for (binId)
   */
  binHash?: string;
  /**
   * If getting binary, this is the extension.
   */
  binExt?: string;
  /**
   * If truthy, will look in the meta subpath first, then the regular if not found.
   */
  isMeta?: boolean;
  /**
   * Are we looking for a DNA ibgib?
   */
  isDna?: boolean;
}
/**
 * Result for retrieving an ibGib from the file system.
 */
interface GetIbGibResult extends BaseResult {
  /**
   * ibGib if retrieving a "regular" ibGib.
   *
   * This is used when you're not getting a pic, e.g.
   */
  ibGib?: IbGib_V1;
  /**
   * This is used when you're getting a pic's binary content.
   */
  binData?: any;
}

interface PutIbGibOpts {
  ibGib?: IbGib_V1;
  /**
   * if true, will store this data in the bin folder with its hash.
   */
  binData?: string;
  /**
   * If true, will store in a different folder.
   */
  isDna?: boolean;
  /**
   * extension to store the bindata with.
   */
  binExt?: string;
  /**
   * hash of binData if doing bin and already calculated.
   */
  binHash?: string;
  /**
   * If true, will store with metas.
   */
  isMeta?: boolean;
}
interface PutIbGibResult extends BaseResult {
  binHash?: string;
}

interface DeleteIbGibOpts extends GetIbGibOpts { }
interface DeleteIbGibResult extends BaseResult { }

// #endregion


/**
 * Quick and dirty class for persisting ibgibs to the cloud with AWS DynamoDB.
 *
 * ## thanks
 *
 * * https://advancedweb.hu/how-to-use-dynamodb-batch-write-with-retrying-and-exponential-backoff/
 *   * and https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/
 *   * thank you for the exponential backoff
 */
export class AWSDynamoSpace_V1<
        TData extends SyncSpaceData_AWSDynamoDB = SyncSpaceData_AWSDynamoDB,
        TRel8ns extends SyncSpaceRel8ns_AWSDynamoDB = SyncSpaceRel8ns_AWSDynamoDB
    > extends SpaceBase_V1<
        IbGib_V1,
        AWSDynamoSpaceOptionsData,
        AWSDynamoSpaceOptionsRel8ns,
        AWSDynamoSpaceOptionsIbGib,
        AWSDynamoSpaceResultData,
        AWSDynamoSpaceResultRel8ns,
        AWSDynamoSpaceResultIbGib,
        TData,
        TRel8ns
    > {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `[${AWSDynamoSpace_V1.name}]`;

    /**
     * Naive caching in-memory. Memory leak as it stands right now!
     */
    protected ibGibs: { [key: string]: IbGib_V1 } = {};

    constructor(
        // /**
        //  * Default predicate value when putting an unknown ibGib.
        //  *
        //  * ## notes
        //  *
        //  * So when a repo witnesses another ibGib, it either defaults to
        //  * storing that ibGib or not storing that ibGib. This is what that
        //  * is referring to. If it's optimistic, then it stores any ibGib by
        //  * default and it passes its put predicate.
        //  */
        // public optimisticPut: boolean = true,
        initialData: TData,
        initialRel8ns: TRel8ns,
    ) {
        super(initialData, initialRel8ns);
        const lc = `${this.lc}[ctor]`;

        // console.log(`${lc} initializing...`);
        // this.initialize().catch(e => {
        //     console.error(`${lc} ${e.message}`);
        // }).finally(() => {
        //     console.log(`${lc} initializing complete.`);
        // })

        this.ib = `witness space ${AWSDynamoSpace_V1.name}`;
    }

    /**
     * Factory static method to create the space with the given
     * `dto` param's ibGib properties.
     *
     * We do this because when we persist this space (and its settings
     * located in `data`), we do not save the actual class instantiation
     * but just the ibgib properties. Use this factory method to
     * create a new space instance and rehydrate from that saved dto.
     *
     * ## notes
     *
     * * DTO stands for data transfer object.
     *
     * @param dto space ibGib dto that we're going to load from
     * @returns newly created space built upon `dto`
     */
    static createFromDto<
            TData extends SyncSpaceData_AWSDynamoDB = SyncSpaceData_AWSDynamoDB,
            TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
        >(dto: IbGib_V1<TData, TRel8ns>): AWSDynamoSpace_V1<TData, TRel8ns> {
        const space = new AWSDynamoSpace_V1<TData, TRel8ns>(null, null);
        space.loadDto(dto);
        return space;
    }

    protected async validateWitnessArg(arg: AWSDynamoSpaceOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg}]`;
        let errors: string[] = [];
        try {
            errors = (await super.validateWitnessArg(arg)) || [];
            if (arg.data?.cmd === 'put' && !arg.binData && (arg.ibGibs?.length === 0)) {
                errors.push(`when "put" cmd is called, either ibGibs or binData required.`);
            }
            if (
                arg.data?.cmd === 'get' &&
                !arg.data?.binExt && !arg.data?.binHash &&
                (arg.data?.ibGibAddrs?.length === 0)
            ) {
                errors.push(`when "get" cmd is called, either ibGibAddrs or binExt+binHash required.`);
            }
            if (!this.data?.tableName) { await this.initialize(); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (errors?.length > 0) { console.error(`${lc} errors: ${errors}`); }
        }

        return errors;
    }

    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (!this.data) { this.data = h.clone(DEFAULT_AWS_DYNAMO_SPACE_DATA_V1); }

            // let resPrompt = await Plugins.Modals.prompt({title: 'hi', message: 'yo enter the thing'});

            // let result = await encrypt({
            //     dataToEncrypt: JSON.stringify(tempCredentials),
            //     initialRecursions: 50000,
            //     salt: tempsalt,
            //     secret: resPrompt.value,
            //     confirm: true,
            //     hashAlgorithm: 'SHA-256',
            //     saltStrategy: 'appendPerHash',
            //     recursionsPerHash: 2,
            // });

            // console.log(`${lc} result.encryptedData:\n`);
            // console.log(`${lc} ${result.encryptedData}`);
            // let {
            //     encryptedData, initialRecursions, salt, hashAlgorithm,
            //     saltStrategy, recursionsPerHash,
            // } = tempCredentialsEncrypted;
            // let result = await decrypt({
            //     encryptedData,
            //     initialRecursions,
            //     salt,
            //     secret: resPrompt.value,
            //     hashAlgorithm,
            //     saltStrategy,
            //     recursionsPerHash,
            // });
            // let credentials = JSON.parse(result.decryptedData);
            // this.data.tableName = credentials.tableName;
            // this.data.accessKeyId = credentials.accessKeyId;
            // this.data.secretAccessKey = credentials.secretAccessKey;

            // console.log(`result.errors: ${result.errors}`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        }
    }

    protected async getImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.get.name}]`;
        const resultIbGibs: IbGib_V1[] = [];
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        let notFoundIbGibAddrs: IbGibAddr[] = undefined;
        let resultBinData: any | undefined;
        try {
            if (!this.data) { throw new Error(`this.data falsy.`); }
            if (!this.data!.tableName) { throw new Error(`tableName not set`); }
            if (!this.data!.secretAccessKey) { throw new Error(`this.data!.secretAccessKey falsy`); }
            if (!this.data!.accessKeyId) { throw new Error(`this.data!.accessKeyid falsy`); }

            const client = createClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            if (arg.data!.ibGibAddrs?.length > 0) {
                return await this.getIbGibs({arg, client}); // returns
            } else if (arg.binData && arg.data.binHash && arg.data.binExt) {
                // return await this.getBin({arg, client}); // returns
            } else {
                throw new Error(`either ibGibs or binData/binHash/binExt required.`);
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        try {
            const result = await this.resulty({resultData});
            // const result = await resulty_<AWSDynamoSpaceResultData, AWSDynamoSpaceResultIbGib>({
            //     resultData,
            // });
            if (resultIbGibs.length > 0) {
                result.ibGibs = resultIbGibs;
            } else if (resultBinData) {
                result.binData = resultBinData;
            }
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Sends a given `cmd`, which for ease of coding atm is just typed as `any`,
     * using the given `client`.
     *
     * @returns result of the aws `client.send`
     */
    protected async sendCmd<TOutput>({
        cmd,
        client,
    }: {
        cmd: any,
        client: DynamoDBClient,
    }): Promise<TOutput> {
        const lc = `${this.lc}[${this.sendCmd.name}]`;
        const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const resSend: TOutput = <any>(await client.send(cmd));
                return resSend;
            } catch (error) {
                if (!isThroughputError(error)){ throw error; }
            }
            console.log(`${lc} retry ${i} due to throughput in ${this.data.throttleMsDueToThroughputError} ms`);
            await h.delay(this.data.throttleMsDueToThroughputError);
        }
        // we return above, so if gets here then throw
        throw new Error(`Max retries (${maxRetries}) exceeded.`);
    }

    protected async getIbGibBatch({
        ibGibAddrs,
        client,
        errors,
    }: {
        ibGibAddrs: IbGibAddr[],
        client: DynamoDBClient,
        errors: String[],
    }): Promise<IbGib_V1[]> {
        const lc = `${this.lc}[${this.getIbGibBatch.name}]`;
        const ibGibs: IbGib_V1[] = [];
        try {
            // const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;

            let retryUnprocessedItemsCount = 0;
            const doItems = async (unprocessedKeys?: KeysAndAttributes) => {

                let cmd = unprocessedKeys ?
                    await createDynamoDBBatchGetItemCommand({ tableName: this.data.tableName, unprocessedKeys }) :
                    await createDynamoDBBatchGetItemCommand({ tableName: this.data.tableName, addrs: ibGibAddrs });

                const resGet = await this.sendCmd<BatchGetItemCommandOutput>({cmd, client});

                const responseKeys = Object.keys(resGet.Responses[this.data.tableName]);
                for (let i = 0; i < responseKeys.length; i++) {
                    const key = responseKeys[i];
                    const getIbGibsResponseItem =
                        <AWSDynamoSpaceItem>resGet.Responses[this.data.tableName][key];

                    const ibGib = getIbGibFromResponseItem({getIbGibsResponseItem});
                    ibGibs.push(ibGib);
                    console.log(`${lc} item: ${h.pretty(ibGib)}`);
                }

                const newUnprocessedCount =
                    (resGet?.UnprocessedKeys && resGet?.UnprocessedKeys[this.data.tableName]?.Keys?.length > 0) ?
                    resGet?.UnprocessedKeys[this.data.tableName].Keys.length :
                    0;

                if (newUnprocessedCount > 0) {
                    console.log(`${lc} newUnprocessedCount: ${newUnprocessedCount}`);
                    let newUnprocessedKeys = resGet.UnprocessedKeys!;
                    const oldUnprocessedCount = unprocessedKeys?.Keys?.length ?? ibGibAddrs.length;
                    const progressWasMade = oldUnprocessedCount > newUnprocessedCount;
                    if (progressWasMade) {
                        // don't inc retry, just go again
                        console.log(`${lc} unprocessed made progress, just going again`);
                        await doItems(newUnprocessedKeys[this.data.tableName]); // recursive
                    } else {
                        // no progress, so do an exponentially backed off retry
                        retryUnprocessedItemsCount++;
                        if (retryUnprocessedItemsCount > this.data.maxRetryUnprocessedItemsCount) {
                            throw new Error(`Exceeded max retry unprocessed items count (${this.data.maxRetryUnprocessedItemsCount})`);
                        }
                        // thank you https://advancedweb.hu/how-to-use-dynamodb-batch-write-with-retrying-and-exponential-backoff/
                        // for the exponential backoff.
                        const backoffMs = (2 ** retryUnprocessedItemsCount) * 10;
                        console.log(`${lc} unprocessed did NOT make progress, backing off then retry in ${backoffMs} ms`);
                        await h.delay(backoffMs);
                        await doItems(newUnprocessedKeys[this.data.tableName]); // recursive
                    }
                }
            }

            await doItems(); // first run
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            errors.push(error.message);
        }

        return ibGibs;
    }


    protected async getIbGibs({
        arg,
        client,
    }: {
        arg: AWSDynamoSpaceOptionsIbGib,
        client: DynamoDBClient,
    }): Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getIbGibs.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        let ibGibs: IbGib_V1[] = [];
        try {
            let ibGibAddrs = (arg.data.ibGibAddrs || []).concat();
            if (ibGibAddrs.length === 0) { throw new Error(`No ibGibAddrs provided.`); }

            let runningCount = 0;
            const batchSize = this.data.getBatchSize || c.DEFAULT_AWS_GET_BATCH_SIZE;
            const throttleMs = this.data.throttleMsBetweenGets || c.DEFAULT_AWS_GET_THROTTLE_MS;
            const rounds = Math.ceil(ibGibAddrs.length / batchSize);
            for (let i = 0; i < rounds; i++) {
                if (i > 0) {
                    if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                    await h.delay(throttleMs);
                }
                let doNext = ibGibAddrs.splice(batchSize);
                const gotIbGibs = await this.getIbGibBatch({ibGibAddrs, client, errors});
                ibGibs = [...ibGibs, ...gotIbGibs];

                if (errors.length > 0) { break; }

                runningCount = ibGibs.length;
                console.log(`${lc} runningCount: ${runningCount}...`);
                ibGibAddrs = doNext;
            }

            console.log(`${lc} total: ${runningCount}.`);

            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.success = false;
        }
        const result = await this.resulty({resultData});
        // const result = await resulty_<AWSDynamoSpaceResultData, AWSDynamoSpaceResultIbGib>({
        //     resultData
        // });
        result.ibGibs = ibGibs;
        return result;
    }

    protected async putImpl(arg: AWSDynamoSpaceOptionsIbGib): Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        try {
            if (!this.data) { throw new Error(`this.data falsy.`); }
            if (!this.data!.tableName) { throw new Error(`tableName not set`); }
            if (!this.data!.secretAccessKey) { throw new Error(`this.data!.secretAccessKey falsy`); }
            if (!this.data!.accessKeyId) { throw new Error(`this.data!.accessKeyid falsy`); }

            const client = createClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });


            if (arg.ibGibs?.length > 0) {
                return await this.putIbGibsImpl({arg, client}); // returns
            } else if (arg.binData && arg.data.binHash && arg.data.binExt) {
                return await this.putBin({arg, client}); // returns
            } else {
                throw new Error(`either ibGibs or binData/binHash/binExt required.`);
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.success = false;
        }
        // only executes if there is an error.
        const result = await this.resulty({resultData});
        // const result = await resulty_<AWSDynamoSpaceResultData, AWSDynamoSpaceResultIbGib>({
        //     resultData
        // });
        return result;
    }

    protected async putIbGibBatch({
        ibGibs,
        client,
        errors,
    }: {
        ibGibs: IbGib_V1[],
        client: DynamoDBClient,
        errors: string[],
    }): Promise<void> {
        const lc = `${this.lc}[${this.putIbGibBatch.name}]`;
        try {
            let retryUnprocessedItemsCount = 0;
            let ibGibItems: AWSDynamoSpaceItem[] = [];

            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                const item = await createDynamoDBPutItem({ibGib});
                ibGibItems.push(item);
            }
            // const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;

            const doItems = async (items: AWSDynamoSpaceItem[]) => {
                let cmd = createDynamoDBBatchWriteItemCommand({
                    tableName: this.data.tableName,
                    items,
                });

                const resPut = await this.sendCmd<BatchWriteItemCommandOutput>({cmd, client});

                let prevUnprocessedCount = Number.MAX_SAFE_INTEGER;
                let unprocessedCount = Object.keys(resPut?.UnprocessedItems || {}).length;
                if (unprocessedCount > 0) {
                    console.log(`${lc} unprocessedCount: ${unprocessedCount}`);
                    ibGibItems =
                        <AWSDynamoSpaceItem[]>resPut.UnprocessedItems[this.data.tableName];
                    const progressWasMade = prevUnprocessedCount > unprocessedCount;
                    if (progressWasMade) {
                        // don't inc retry, just go again
                        console.log(`${lc} unprocessed made progress, just going again`);
                        await doItems(ibGibItems);
                    } else {
                        // no progress, so do an exponentially backed off retry
                        retryUnprocessedItemsCount++;
                        if (retryUnprocessedItemsCount > this.data.maxRetryUnprocessedItemsCount) {
                            throw new Error(`Exceeded max retry unprocessed items count (${this.data.maxRetryUnprocessedItemsCount})`);
                        }
                        // thank you https://advancedweb.hu/how-to-use-dynamodb-batch-write-with-retrying-and-exponential-backoff/
                        // for the exponential backoff.
                        const backoffMs = (2 ** retryUnprocessedItemsCount) * 10;
                        console.log(`${lc} unprocessed did NOT make progress, backing off then retry in ${backoffMs} ms`);
                        await h.delay(backoffMs);
                        await doItems(ibGibItems); // recursive
                    }
                }
            }

            await doItems(ibGibItems);

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            errors.push(error.message);
        }
    }

    /**
     * need to convert to max batch size
     * @returns space result
     */
    protected async putIbGibsImpl({
        arg,
        client,
    }: {
        arg: AWSDynamoSpaceOptionsIbGib,
        client: DynamoDBClient,
    }): Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.putIbGibsImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        try {
            let ibGibs = (arg.ibGibs || []).concat(); // copy

            let runningCount = 0;
            const batchSize = this.data.putBatchSize || c.DEFAULT_AWS_PUT_BATCH_SIZE;
            const throttleMs = this.data.throttleMsBetweenPuts || c.DEFAULT_AWS_PUT_THROTTLE_MS;
            const rounds = Math.ceil(ibGibs.length / batchSize);
            for (let i = 0; i < rounds; i++) {
                if (i > 0) {
                    if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                    await h.delay(throttleMs);
                }
                let doNext = ibGibs.splice(batchSize);
                await this.putIbGibBatch({ibGibs, client, errors});

                if (errors.length > 0) { break; }

                runningCount += ibGibs.length;
                console.log(`${lc} runningCount: ${runningCount}...`);
                ibGibs = doNext;
            }

            console.log(`${lc} total: ${runningCount}.`);
            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.success = false;
        }
        const result = await this.resulty({resultData});
        // const result = await resulty_<AWSDynamoSpaceResultData, AWSDynamoSpaceResultIbGib>({
        //     resultData
        // });
        return result;
    }

    protected async putBin({
        arg,
        client,
    }: {
        arg: AWSDynamoSpaceOptionsIbGib,
        client: DynamoDBClient,
    }): Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }

            if (!this.data?.tableName) { throw new Error(`tableName not set`); }

            let retryUnprocessedItemsCount = 0;

            // we're only doing one bin at a time right now, but I'm going to
            // write this assuming we're expanding.
            const { binExt, binHash, } = arg.data!;
            const binData = arg.binData!;
            const binItem = await createDynamoDBPutItem({binHash, binExt, binData});
            let binItems: AWSDynamoSpaceItem[] = [binItem];

            const doItems = async (items: AWSDynamoSpaceItem[]) => {
                let writeCommand = createDynamoDBBatchWriteItemCommand({
                    tableName: this.data.tableName,
                    items,
                });
                const putResult = await client.send(writeCommand);

                let prevUnprocessedCount = Number.MAX_SAFE_INTEGER;
                let unprocessedCount = Object.keys(putResult?.UnprocessedItems || {}).length;
                if (unprocessedCount > 0) {
                    console.log(`${lc} unprocessedCount: ${unprocessedCount}`);
                    binItems =
                        <AWSDynamoSpaceItem[]>putResult.UnprocessedItems[this.data.tableName];
                    const progressWasMade = prevUnprocessedCount > unprocessedCount;
                    if (progressWasMade) {
                        // don't inc retry, just go again
                        console.log(`${lc} unprocessed made progress, just going again`);
                        await doItems(binItems);
                    } else {
                        // no progress, so do an exponentially backed off retry
                        retryUnprocessedItemsCount++;
                        if (retryUnprocessedItemsCount > this.data.maxRetryUnprocessedItemsCount) {
                            throw new Error(`Exceeded max retry unprocessed items count (${this.data.maxRetryUnprocessedItemsCount})`);
                        }
                        // thank you https://advancedweb.hu/how-to-use-dynamodb-batch-write-with-retrying-and-exponential-backoff/
                        // for the exponential backoff.
                        const backoffMs = (2 ** retryUnprocessedItemsCount) * 10;
                        console.log(`${lc} unprocessed did NOT make progress, backing off then retry in ${backoffMs} ms`);
                        await h.delay(backoffMs);
                        await doItems(binItems); // recursive
                    }
                }
            }

            await doItems(binItems);

            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
                resultData.addrsErrored = addrsErrored;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.addrsErrored = addrsErrored;
            resultData.success = false;
        }
        const result = await this.resulty({ resultData });
        return result;
    }

    // /**
    //  * wrapper convenience for this space.
    //  * @param param0
    //  * @returns
    //  */
    // private async resulty({
    //     resultData,
    // }: {
    //     resultData: AWSDynamoSpaceResultData,
    // }): Promise<AWSDynamoSpaceResultIbGib> {
    //     const result =
    //         await resulty_<AWSDynamoSpaceResultData, AWSDynamoSpaceResultIbGib>({
    //             resultData
    //         });
    //     return result;
    // }

    protected async deleteImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.delete.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsDeleted: IbGibAddr[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            throw new Error(`not implemented`);
            const { isMeta, isDna, binExt, binHash, } = arg.data!;
            const ibGibAddrs = arg.data!.ibGibAddrs || [];
            const binData = arg.binData;

            // implementation to do here...

            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
                resultData.addrs = addrsDeleted;
            } else {
                resultData.errors = errors;
                resultData.addrsErrored = addrsErrored;
                if (addrsDeleted.length > 0) {
                    const warningMsg =
                        `some addrs (${addrsDeleted.length}) were indeed deleted, but not all. See result addrs and addrsErrored.`;
                    resultData.warnings = (resultData.warnings || []).concat([warningMsg]);
                }
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.addrsErrored = addrsErrored;
            resultData.success = false;
        }
        const result = await this.resulty({resultData});
        return result;
    }

    /**
     * Get the addresses of the current
     * @param arg
     * @returns
     */
    protected async getAddrsImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getAddrs.name}]`;
        throw new Error(`${lc} not implemented`);
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            resultData.addrs = Object.keys(this.ibGibs).concat();
            resultData.success = true;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
            resultData.success = false;
        }
        const result = await this.resulty({resultData});
        return result;
    }

    /**
     * Performs a naive `exists: boolean` or `includes: boolean` analog.
     *
     * If all of the addresses are found, will result in `success` and `can` being `true`.
     *
     * Else, `can` will be falsy, and `addrsNotFound` will be populated with all/some of
     * the queried addresses.
     *
     * ## notes
     *
     * This does not take authorization into account in any way. it's a simple, naive in-memory
     * storage ibGib witness.
     *
     * @returns result ibGib whose primary value is `can`
     */
    protected async canGetImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canGet.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const { ibGibAddrs } = arg.data!;
            let notFoundIbGibAddrs: IbGibAddr[] = undefined;
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                if (!Object.keys(this.ibGibs).includes(addr)) {
                    if (!notFoundIbGibAddrs) { notFoundIbGibAddrs = []; }
                    notFoundIbGibAddrs.push(addr);
                }
            }
            resultData.success = true;
            if (notFoundIbGibAddrs && notFoundIbGibAddrs.length > 0) {
                resultData.addrsNotFound = notFoundIbGibAddrs;
                resultData.can = false;
            } else {
                resultData.can = true;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({resultData});
        // const result =
        //     await resulty_<
        //         AWSDynamoSpaceResultData,
        //         AWSDynamoSpaceResultIbGib
        //     >({
        //         resultData
        //     });
        return result;
    }
    protected async canPutImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canPut.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        try {
            throw new Error('not implemented');
            // just feeling out here...not sure if this is necessary
            if (!this.data.tableName) {
                resultData.can = false;
                errors.push(`this.data.tableName is falsy. Need to initialize aws space`);
            }
            if (!this.data.secretAccessKey) {
                resultData.can = false;
                errors.push(`this.data.secretAccessKey is falsy. Need to initialize aws space`);
            }
            if (!this.data.accessKeyId) {
                resultData.can = false;
                errors.push(`this.data.accessKeyId is falsy. Need to initialize aws space`);
            }
            const addrsAlreadyHave: IbGibAddr[] = [];
            // for (let i = 0; i < ibGibs?.length; i++) {
            //     const ibGib = ibGibs[i];
            //     const addr = getIbGibAddr({ibGib});
            //     if (Object.keys(this.ibGibs).includes(addr)) {
            //         addrsAlreadyHave.push(addr);
            //     }
            // }
            resultData.success = true;
            if (addrsAlreadyHave.length > 0) {
                resultData.addrsAlreadyHave = addrsAlreadyHave;
                resultData.warnings = (resultData.warnings || []).concat([`${lc} already have addr(s).`]);
            }
            // resultData.can = ibGibs.length > addrsAlreadyHave.length;
            resultData.can = true;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({resultData});
        // const result =
        //     await resulty_<
        //         AWSDynamoSpaceResultData,
        //         AWSDynamoSpaceResultIbGib
        //     >({
        //         resultData
        //     });
        return result;
    }

    /**
     * Calculates the hash of the given `binData`.
     *
     * ## notes
     *
     * I've pulled this out into its own method because I'm sure this is going
     * to adapt to multiple hashing algorithms in the future depending on the
     * version.
     *
     * @returns hash string of the given `binData`
     */
    protected getBinHash({binData, version}: {binData: any, version?: string}): Promise<string> {
        const lc = `${this.lc}[${this.getBinHash.name}]`;
        try {
            return h.hash({s: binData});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async persistOptsAndResultIbGibs({
        arg,
        result
    }: {
        arg: AWSDynamoSpaceOptionsIbGib,
        result: AWSDynamoSpaceResultIbGib,
    }): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
