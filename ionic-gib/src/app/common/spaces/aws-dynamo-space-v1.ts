import {
    AttributeValue, DynamoDBClient,
    // PutItemCommand, PutItemCommandInput,
    // GetItemCommand, GetItemCommandInput,
    BatchWriteItemCommand, BatchWriteItemCommandInput, BatchWriteItemCommandOutput,
    BatchGetItemCommand, BatchGetItemCommandInput, BatchGetItemCommandOutput,
    QueryCommand, QueryCommandInput, QueryCommandOutput,
    KeysAndAttributes,
    ConsumedCapacity,
} from '@aws-sdk/client-dynamodb';

import { IbGib_V1, IbGibRel8ns_V1, } from 'ts-gib/dist/V1';
import { getIbGibAddr, IbGibAddr, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import { SpaceBase_V1 } from './space-base-v1';
import {
    AWSRegion,
    IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib,
    IbGibSpaceOptionsRel8ns,
    IbGibSpaceResultData, IbGibSpaceResultIbGib, IbGibSpaceResultRel8ns,
    OuterSpaceRel8ns,
    SyncSpaceData,
} from '../types';
import * as c from '../constants';
import { getBinAddr } from '../helper';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

// #region DynamoDB related

type AWSDynamoDBItem = { [key: string]: AttributeValue };

/**
 * Item interface
 */
interface AWSDynamoSpaceItem extends AWSDynamoDBItem {
    [c.DEFAULT_PRIMARY_KEY_NAME]: AttributeValue,
    ib: AttributeValue.SMember,
    gib: AttributeValue.SMember,
    data?: AttributeValue.SMember | AttributeValue.BMember,
    rel8ns?: AttributeValue.SMember,
    binData?: AttributeValue,
    n?: AttributeValue.NMember,
    tjp?: AttributeValue.SMember,
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
        addr = addr ?? getBinAddr({binHash, binExt});
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
            if (ibGib.data) {
                item.data = { S: JSON.stringify(ibGib.data) };
                if (
                    // n == 0 - first tjp slightly different
                    (ibGib.data!.n === 0 && ibGib.data!.isTjp) ||
                    // n > 0
                    (Number.isSafeInteger(ibGib.data!.n) && ibGib.rel8ns?.tjp?.length === 1)
                ) {
                    item.n = { N: ibGib.data!.n!.toString() };
                }
                // the very first ibGib after a fork with tjp options sets this flag.
                if (ibGib.data!.isTjp) { item.tjp = { S: addr }; }
            }
            if (ibGib.rel8ns) {
                item.rel8ns = { S: JSON.stringify(ibGib.rel8ns) };

                // if tjp not already given, capture & extract tjp if exists
                if (!item.tjp && ibGib.rel8ns!.tjp) {
                    if (ibGib.rel8ns!.tjp!.length === 1) {
                        if (ibGib.rel8ns!.tjp![0].length > 0) {
                            item.tjp = { S: ibGib.rel8ns!.tjp![0]! };
                        } else {
                            console.warn(`${lc}(gib: ${ibGib.gib}) tjp is empty string(?)`);
                        }
                    } else if (ibGib.rel8ns!.tjp!.length === 1) {
                        console.warn(`${lc}(gib: ${ibGib.gib}) tjp has more than one value(?)`);
                    }
                }
            }

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

// function createDynamoDBGetItemCommand({
//     tableName,
//     keyName,
//     primaryKey,
// }: {
//     tableName: string,
//     keyName: string,
//     primaryKey: string,
// }): GetItemCommand {
//     const params: GetItemCommandInput = {
//         TableName: tableName,
//         Key: { [keyName]: { S: primaryKey } },
//         ReturnConsumedCapacity: 'TOTAL',
//     };
//     return new GetItemCommand(params);
// }
// function createDynamoDBPutItemCommand({
//     tableName,
//     item,
// }: {
//     tableName: string,
//     item: AWSDynamoSpaceItem,
// }): PutItemCommand {
//     const params: PutItemCommandInput = {
//         TableName: tableName,
//         Item: item,
//         ReturnConsumedCapacity: 'TOTAL',
//     };
//     return new PutItemCommand(params);
// }

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
        },
        ReturnConsumedCapacity: 'TOTAL', // includes consumed capacity information
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

/**
 * Can't have reserved words in projection expressions.
 *
 * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
 */
interface ProjectionExpressionInfo {
    projectionExpression: string;
    expressionAttributeNames?: {[key:string]:string};
}
/**
 * Can't have reserved words in projection expressions.
 *
 * https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
 *
 * ## notes
 *
 * NOT perfect, since it doesn't work for array expressions, e.g. "data[5]"
 */
async function fixReservedWords({
    projectionExpression,
}: {
    projectionExpression: string,
}): Promise<ProjectionExpressionInfo> {
    const lc = `[${fixReservedWords.name}]`;
    try {
        let pieces = projectionExpression.split(',');
        if (pieces.length === 0) { throw new Error(`invalid projectionExpression: ${projectionExpression}`); }

        if (pieces.some(piece => piece.includes('.') || piece.includes('['))) {
            console.warn(`${lc} arrays or dot-scopes not implemented.`);
            return { projectionExpression };
        }

        if (pieces.some(piece => c.AWS_RESERVED_WORDS.includes(piece.toUpperCase()))) {
            // reserve word found, so create expressionAttributeNames
            if (logalot) { console.log(`${lc} fixing expression: ${projectionExpression}`); }
            let fixedExpression = '';
            let namesMap: {[key: string]: string} = {};
            for (let i = 0; i < pieces.length; i++) {
                const piece = pieces[i];
                if (c.AWS_RESERVED_WORDS.includes(piece.toUpperCase())) {
                    let chars = (await h.getUUID()).slice(0, 3);
                    let name = `#${piece}_${chars}`;
                    namesMap[name] = piece;
                    if (i === 0) { fixedExpression = name; } else { fixedExpression += `,${name}`; }
                } else {
                    if (i === 0) { fixedExpression = piece; } else { fixedExpression += `,${piece}`; }
                }
            }
            const resExpression = {
                projectionExpression: fixedExpression,
                expressionAttributeNames: namesMap,
            };
            if (logalot) { console.log(`${lc} resExpression: ${h.pretty(resExpression)}`); }
            return resExpression;

        } else {
            // no reserve word found, so just return the projectionExpression alone
            return { projectionExpression };
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return { projectionExpression };
    }
}

/**
 * Creates a command formatted for AWS Query.
 *
 * @returns query command according to given info
 */
async function createDynamoDBQueryNewerCommand({
    tableName,
    info,
    projectionExpression,
}: {
    tableName: string,
    info: GetLatestInfo,
    projectionExpression?: string,
}): Promise<QueryCommand> {
    const lc = `[${createDynamoDBQueryNewerCommand.name}]`;
    try {
        if (!tableName) { throw new Error(`tableName required.`); }
        if (!info) { throw new Error(`info required.`); }

        debugger;
        let expressionAttributeNames: {[key:string]:string} = undefined;
        if (projectionExpression) {
            const resExpression = await fixReservedWords({projectionExpression});
            if (resExpression.expressionAttributeNames) {
                if (logalot) { console.log(`${lc} resExpression: ${h.pretty(resExpression)}`); }
                projectionExpression = resExpression.projectionExpression;
                expressionAttributeNames = resExpression.expressionAttributeNames;
            }
        }

        debugger;
        const params: QueryCommandInput = {
            TableName: tableName,
            ConsistentRead: false, // ConsistentRead not available on global secondary indexes https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#API_Query_RequestSyntax
            IndexName: c.AWS_DYNAMODB_TJP_N_SECONDARY_INDEX_NAME,
            KeyConditionExpression: 'tjp = :tjp and n >= :nLeast',
            ExpressionAttributeValues: {
                ":tjp": { S: info.tjpAddr },
                ":nLeast": { N: info.nLeast.toString() },
            },
            ProjectionExpression: projectionExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ScanIndexForward: false, // returns higher n first (I believe!...not 100% sure here)
            ReturnConsumedCapacity: 'TOTAL',
        };
        if (logalot) { console.log(`${lc} params: ${h.pretty(params)}`); }
        return new QueryCommand(params);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}
function getIbGibFromResponseItem({
    item,
}: {
    item: AWSDynamoSpaceItem,
}): IbGib_V1 {
    const lc = `[${getIbGibFromResponseItem.name}]`;
    try {
        if (!item) { throw new Error(`item required`); }
        const ibGib: IbGib_V1 = {
            ib: JSON.parse(item.ib.S),
            gib: JSON.parse(item.gib.S),
        };
        if (item.data) { ibGib.data = JSON.parse(item.data.S); }
        if (item.rel8ns) { ibGib.rel8ns = JSON.parse(item.rel8ns.S); }
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

/**
 * Information required to search against a global secondary index
 * involved with getting the latest ibgib
 */
interface GetLatestInfo {
    /**
     * The temporal junction point address for the ibgib we're looking for.
     *
     * Temporal junction points are like the birthdays for unique ibGib timelines.
     * Or less anthromorphically, they're the first discrete ibGib datum for a
     * stream of ibGib mutations, either through `rel8` or `mut8` transforms.
     */
    tjpAddr: IbGibAddr;
    /**
     * Only get the latest if it's greater than this n.
     *
     * ## notes
     *
     * ibGib.data.n is the value that tracks how many mutations
     * have occurred in an ibGib's timeline.
     *
     * Of course, there is nothing precluding on down the road someone hijacking
     * this property.
     */
    nLeast: number;
    /**
     * Result of query ibGibs.
     */
    resultIbGibs?: IbGib_V1[];
    /**
     * Error, if any, when sending the command.
     */
    errorMsg?: any;
}

// #endregion

// #region Space related interfaces/constants

/**
 * This is the shape of data about this space itself (not the contained ibgibs' spaces).
 */
export interface SyncSpaceData_AWSDynamoDB extends SyncSpaceData {
    /**
     * Table name in DynamoDB
     */
    tableName: string;
    /**
     * AWS Credentials accessKeyId
     */
    accessKeyId: string;
    /**
     * AWS Credentials secretAccessKey
     */
    secretAccessKey: string;
    /**
     * AWS Region
     */
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
    /** Size of batches when doing queries. atow getlatest */
    queryBatchSize: number;
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
    queryBatchSize: c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE,
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
 * ## notes on creating dynamoDB table
 *
 * * Currently, the primary key must be 'ibGibAddrHash'.
 * * A global secondary index must be created.
 *   * currently the name is stored in c.AWS_DYNAMODB_REGEXP_TABLE_OR_INDEX (atow = tjp-n-index)
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
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        let errors: string[] = [];
        try {
            errors = (await super.validateWitnessArg(arg)) || [];
            if (arg.data?.cmd === 'put' && !arg.binData && (arg.ibGibs?.length === 0)) {
                errors.push(`when "put" cmd is called, either ibGibs or binData required.`);
            }
            if (
                arg.data?.cmd === 'get' &&
                !arg.data?.cmdModifiers?.includes('latest') &&
                !arg.data?.binExt && !arg.data?.binHash &&
                (arg.data?.ibGibAddrs?.length === 0)
            ) {
                errors.push(`when "get" cmd is called, either ibGibAddrs or binExt+binHash required.`);
            }
            // if (!this.data?.tableName) { await this.initialize(); }
            if (!this.data?.tableName) {
                throw new Error('this.data.tableName falsy');
            }
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
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
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
            } else {
                throw new Error(`either ibGibs or binData/binHash/binExt required.`);
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        try {
            const result = await this.resulty({resultData});
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async getLatestImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getLatestImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            if (logalot) { console.log(`${lc} starting...`); }
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
                let tmpResult = await this.getLatestIbGibs({arg, client}); // returns
                debugger;
                return tmpResult;
            } else {
                throw new Error(`ibGibs required.`);
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        } finally {
            if (logalot) { console.log(`${lc} complete(ish).`); }
        }
        try {
            const result = await this.resulty({resultData});
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
        cmdLogLabel,
    }: {
        cmd: any,
        client: DynamoDBClient,
        /**
         * I want the logging information to include which type of command it is.
         *
         * ## driving use case
         *
         * include which command in logging of consumed capacity.
         */
        cmdLogLabel: string,
    }): Promise<TOutput> {
        const lc = `${this.lc}[${this.sendCmd.name}]`;
        const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;
        for (let i = 0; i < maxRetries; i++) {
            try {

                const resCmd: TOutput = <any>(await client.send(cmd));
                if (logalot && (<any>resCmd)?.ConsumedCapacity) {
                    const capacities = <ConsumedCapacity[]>(<any>resCmd)?.ConsumedCapacity;
                    console.log(`${lc}[${cmdLogLabel}] Consumed Capacity: ${JSON.stringify(capacities)}`);
                }
                return resCmd;
            } catch (error) {
                if (!isThroughputError(error)){ throw error; }
            }
            console.log(`${lc} retry ${i} due to throughput in ${this.data.throttleMsDueToThroughputError} ms`);
            await h.delay(this.data.throttleMsDueToThroughputError);
        }
        // we return above, so if gets here then throw
        throw new Error(`Max retries (${maxRetries}) exceeded.`);
    }

    protected async getIbGibsBatch({
        ibGibAddrs,
        client,
        errors,
    }: {
        ibGibAddrs: IbGibAddr[],
        client: DynamoDBClient,
        errors: String[],
    }): Promise<IbGib_V1[]> {
        const lc = `${this.lc}[${this.getIbGibsBatch.name}]`;
        const ibGibs: IbGib_V1[] = [];
        try {
            // const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;

            let retryUnprocessedItemsCount = 0;
            const doItems = async (unprocessedKeys?: KeysAndAttributes) => {

                let cmd = unprocessedKeys ?
                    await createDynamoDBBatchGetItemCommand({ tableName: this.data.tableName, unprocessedKeys }) :
                    await createDynamoDBBatchGetItemCommand({ tableName: this.data.tableName, addrs: ibGibAddrs });

                const resCmd = await this.sendCmd<BatchGetItemCommandOutput>({cmd, client, cmdLogLabel: 'BatchGetItem'});

                const responseKeys = Object.keys(resCmd.Responses[this.data.tableName]);
                for (let i = 0; i < responseKeys.length; i++) {
                    const key = responseKeys[i];
                    const getIbGibsResponseItem =
                        <AWSDynamoSpaceItem>resCmd.Responses[this.data.tableName][key];

                    const ibGib = getIbGibFromResponseItem({item: getIbGibsResponseItem});
                    ibGibs.push(ibGib);
                    console.log(`${lc} item: ${h.pretty(ibGib)}`);
                }

                const newUnprocessedCount =
                    (resCmd?.UnprocessedKeys && resCmd?.UnprocessedKeys[this.data.tableName]?.Keys?.length > 0) ?
                    resCmd?.UnprocessedKeys[this.data.tableName].Keys.length :
                    0;

                if (newUnprocessedCount > 0) {
                    console.log(`${lc} newUnprocessedCount: ${newUnprocessedCount}`);
                    let newUnprocessedKeys = resCmd.UnprocessedKeys!;
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
                const gotIbGibs = await this.getIbGibsBatch({ibGibAddrs, client, errors});
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
        result.ibGibs = ibGibs;
        return result;
    }

    /**
     * Gets the latest ibGibs corresponding to the given infos.
     * Note that this returns muliple ibGibs that are greater than
     * or equal to the given ibGib's n value.
     *
     * This means that you may receive a list of only one ibGib, the given one.
     * BUT THIS MAY NOT BE THE SAME IBGIB YOU PASSED IN. This is because it's
     * querying off of the tjp + n only, and there may be an alternative timeline
     * in the space.
     *
     * You may also receive multiple ibGibs. Could be the same timeline with
     * newer versions, or could be different timeline(s) with multiple versions,
     * or it could be both the same current timeline and other divergent ones.
     *
     * @returns a map of tjp addr -> latest ibGibs
     */
    protected async getNewerIbGibInfosBatch({
        infos,
        client,
        errors,
    }: {
        infos: GetLatestInfo[],
        client: DynamoDBClient,
        errors: String[],
    }): Promise<GetLatestInfo[]> {
        const lc = `${this.lc}[${this.getNewerIbGibInfosBatch.name}]`;
        try {
            const resultInfos: GetLatestInfo[] = [];
            const queryPromises = infos.map(async (info) => {
                try {
                    info = h.clone(info);
                    const cmd = await createDynamoDBQueryNewerCommand({
                        tableName: this.data.tableName,
                        info,
                        projectionExpression: 'ib,gib,data,rel8ns,n',
                    });
                    const resCmd =
                        await this.sendCmd<QueryCommandOutput>({cmd, client, cmdLogLabel: 'Query'});
                    if (resCmd.Count > 0) {
                        info.resultIbGibs =
                            resCmd.Items.map((item: AWSDynamoSpaceItem) => getIbGibFromResponseItem({item}));
                    }
                } catch (error) {
                    const errorMsg = error.message || 'some kind of error';
                    console.error(`${lc} ${errorMsg}`);
                    info.errorMsg = errorMsg;
                    errors.push(errorMsg);
                }
                resultInfos.push(info);
            });

            await Promise.all(queryPromises);

            debugger;

            return resultInfos;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            // I'm assuming I've coded this to not throw, so getting to this point is unexpected (so rethrow)
            throw error;
        }
    }

    /**
     * Gets the latest ibGibs in the space corresponding to the given arg.ibGibs'
     * temporal junction points (tjps).
     *
     * You can only check for ibGibs with data.n, which implies consequently they have tjps.
     *
     * ## notes
     *
     * ATOW I'm actually using this to get "newer or equal" ibgibs.
     *
     * @returns result with ibGibs being the latest found. WARNING: Could possibly be more than 1 per tjp!
     */
    protected async getLatestIbGibs({
        arg,
        client,
    }: {
        arg: AWSDynamoSpaceOptionsIbGib,
        client: DynamoDBClient,
    }): Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getLatestIbGibs.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        let ibGibs: IbGib_V1[] = [];
        try {
            // GetLatestInfo
            // ibGibs guaranteed at this point to be non-null and > 0
            let infoMap: {[tjp: string]: GetLatestInfo} = {};
            arg.ibGibs.forEach(ibGib => {
                if (!Number.isSafeInteger(ibGib.data?.n)) {
                    if (logalot) { console.log(`${lc} no ibGib.data.n safe integer: ${h.getIbGibAddr({ibGib})}`); }
                    return;
                }
                if (ibGib.rel8ns?.tjp?.length !== 1 && !ibGib.data!.isTjp) {
                    if (logalot) { console.log(`${lc} no tjp info: ${h.getIbGibAddr({ibGib})}`); }
                    return;
                }
                const tjpAddr = ibGib.data!.isTjp ? h.getIbGibAddr({ibGib}) : ibGib.rel8ns!.tjp[0];
                const nLeast = ibGib.data!.n;
                if (infoMap[tjpAddr]) {
                    // only do the highest n
                    if (nLeast > infoMap[tjpAddr].nLeast) { infoMap[tjpAddr] = {tjpAddr, nLeast} }
                } else {
                    infoMap[tjpAddr] = {tjpAddr, nLeast};
                }
            });
            let infos: GetLatestInfo[] = Object.values(infoMap);
            if (logalot) { console.log(`${lc} infos: ${h.pretty(infos)}`); }

            if (infos.length === 0) {
                const warning = `${lc} infos.length is zero, meaning we havent' found any ibgibs that are valid to be checking for latest. No tjps + data.n values.`;
                console.warn(warning);
                warnings.push(warning);
            } else {
                // execute rounds in batches, depending on AWS space settings.
                let runningCount = 0;
                const batchSize = this.data.queryBatchSize || c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE;
                const throttleMs = this.data.throttleMsBetweenGets || c.DEFAULT_AWS_GET_THROTTLE_MS;
                const rounds = Math.ceil(infos.length / batchSize);
                for (let i = 0; i < rounds; i++) {
                    if (i > 0) {
                        if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                        await h.delay(throttleMs);
                    }
                    let doNext = infos.splice(batchSize);
                    debugger;
                    const gotInfos = await this.getNewerIbGibInfosBatch({infos, client, errors});
                    // at this point, we're not sure of the state of our results.
                    // there could be multiple newer ibgibs of the same timeline, or even
                    // divergent parallel branches (oh no!).
                    // for now, we're going to think simply and just return all ibgibs returned
                    const gotIbGibs = gotInfos.flatMap(info => {
                        // errored, so return null
                        if (info.errorMsg) { errors.push(info.errorMsg); return null; }

                        // if info.resultIbGibs has more than entry with the same n, then we have multiple timelines
                        // so this is just a checking object,
                        // we're not going to build our results off of it directly.
                        let nObj: { [n: string]: IbGib_V1 } = {};
                        info.resultIbGibs.forEach(ibGib => {
                            let key = ibGib.data!.n!.toString();
                            if (nObj[key] && nObj[key].gib !== ibGib.gib) {
                                // we already have this n for a different ibGib.
                                // This means that we have at least one divergent timeline.
                                const addr = h.getIbGibAddr({ibGib});
                                const addr2 = h.getIbGibAddr({ibGib: nObj[key]});
                                // NOTE addrs should not contain \n characters...
                                if (addr.includes('\n')) { throw new Error(`addr contains newline(?)`); }
                                if (addr2.includes('\n')) { throw new Error(`addr contains newline(?)`); }
                                if (!ibGib.data!.isTjp && ibGib.rel8ns!.tjp[0].includes('\n')) { throw new Error(`tjp addr contains newline(?)`); }
                                const warning =
                                    `Divergent timeline found (same tjp/n, different ibGib).\n
                                    ibGib1:\n${addr}\n
                                    ibGib2:\n${addr2}\n
                                    tjp:\n${ibGib.data!.isTjp ? addr : ibGib.rel8ns!.tjp[0]}\n
                                    n:\n${ibGib.data!.n!}
                                    `;
                                console.warn(`${lc} ${warning}`);
                                warnings.push(warning);
                                debugger;
                            } else {
                                nObj[key] = ibGib;
                            }
                        });

                        return info.errorMsg ? null : info.resultIbGibs;
                    }).filter(x => x !== null);

                    ibGibs = [...ibGibs, ...gotIbGibs];

                    if (errors.length > 0) { break; }

                    runningCount = ibGibs.length;
                    console.log(`${lc} runningCount: ${runningCount}...`);
                    infos = doNext;
                }

                console.log(`${lc} total: ${runningCount}.`);
            }

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

                const resPut = await this.sendCmd<BatchWriteItemCommandOutput>({cmd, client, cmdLogLabel: 'BatchWriteItem'});

                const prevUnprocessedCount = Number.MAX_SAFE_INTEGER;
                const unprocessedCount = Object.keys(resPut?.UnprocessedItems || {}).length;
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

                const prevUnprocessedCount = Number.MAX_SAFE_INTEGER;
                const unprocessedCount = Object.keys(putResult?.UnprocessedItems || {}).length;
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

    protected async canDeleteImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canDeleteImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        try {
            throw new Error('not implemented');
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({resultData});
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
