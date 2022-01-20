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

import { IbGib_V1, IbGibRel8ns_V1, Factory_V1 as factory, GIB, } from 'ts-gib/dist/V1';
import { getIbGibAddr, IbGibAddr, V1, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import { SpaceBase_V1 } from './space-base-v1';
import {
    SyncSpaceData, SyncSpaceRel8ns,
    SyncSpaceOptionsData, SyncSpaceOptionsRel8ns, SyncSpaceOptionsIbGib,
    IbGibSpaceOptionsCmd, SyncSpaceOptionsCmdModifier,
    SyncSpaceResultData, SyncSpaceResultRel8ns, SyncSpaceResultIbGib,
    AWSRegion,
    SyncStatusData,
    getStatusIb,
    getNewTxId,
    SyncStatusIbGib,
    HttpStatusCode,
    ParticipantInfo,
} from '../types';
import * as c from '../constants';
import { getBinAddr, getTjpAddrs, groupBy, hasTjp, splitIntoWithTjpAndWithoutTjp } from '../helper';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

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
    info: GetNewerQueryInfo,
    projectionExpression?: string,
}): Promise<QueryCommand> {
    const lc = `[${createDynamoDBQueryNewerCommand.name}]`;
    try {
        if (!tableName) { throw new Error(`tableName required.`); }
        if (!info) { throw new Error(`info required.`); }

        let expressionAttributeNames: {[key:string]:string} = undefined;
        if (projectionExpression) {
            const resExpression = await fixReservedWords({projectionExpression});
            if (resExpression.expressionAttributeNames) {
                if (logalot) { console.log(`${lc} resExpression: ${h.pretty(resExpression)}`); }
                projectionExpression = resExpression.projectionExpression;
                expressionAttributeNames = resExpression.expressionAttributeNames;
            }
        }

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
interface GetNewerQueryInfo {
    /**
     * The temporal junction point address for the ibgib we're looking for.
     *
     * Temporal junction points are like the birthdays for unique ibGib
     * timelines.  Or less anthromorphically, they're the first discrete ibGib
     * datum for a stream of ibGib mutations, either through `rel8` or `mut8`
     * transforms.
     */
    tjpAddr: IbGibAddr;
    /**
     * The projection expression used in the query.
     */
    projectionExpression: string;
    /**
     * If a `projectionExpression` is supplied, then this query may not
     * return the
     */
    fullIbGibQuery?: boolean;
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
     * If true, only return the latest for the given tjpAddr.
     * Else the query will return all newer ibGibs with given tjpAddr
     * greater than or equal to nLeast.
     */
    latestOnly?: boolean;
    /**
     * Original ibGib address that we're querying for the latest.
     *
     * Obviously, should have a tjp of {@link tjpAddr}.
     */
    queryAddr: IbGibAddr;
    /**
     * Result of query ibGibs, if `projectionExpression` contains all
     * four ibGib fields.
     */
    resultIbGibs?: IbGib_V1[];
    /**
     * Result items of query, if any, before being converted into ibgibs.
     */
    resultItems?: AWSDynamoSpaceItem[];
    /**
     * Error, if any, when sending the command.
     */
    errorMsg?: any;
}

// #endregion

// #region Space related interfaces/constants

/**
 * This is the shape of data about this space itself (not the contained ibgibs'
 * spaces).
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
    extends SyncSpaceRel8ns {
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
export interface AWSDynamoSpaceOptionsData extends SyncSpaceOptionsData {
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

    /**
     * If given, then a get will use this as the projection expression.
     *
     * ## notes
     *
     * Must have at least `ib` and `gib`
     */
    projectionExpression?: string;
}

export interface AWSDynamoSpaceOptionsRel8ns extends SyncSpaceOptionsRel8ns {
}

export interface AWSDynamoSpaceOptionsIbGib
    extends SyncSpaceOptionsIbGib<IbGib_V1, AWSDynamoSpaceOptionsData, AWSDynamoSpaceOptionsRel8ns> {
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
export interface AWSDynamoSpaceResultData extends SyncSpaceResultData {
}

/** Marker interface atm */
export interface AWSDynamoSpaceResultRel8ns extends SyncSpaceResultRel8ns {
}

export interface AWSDynamoSpaceResultIbGib
    extends SyncSpaceResultIbGib<IbGib_V1, AWSDynamoSpaceResultData, AWSDynamoSpaceResultRel8ns> {
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
            TRel8ns extends SyncSpaceRel8ns_AWSDynamoDB = SyncSpaceRel8ns_AWSDynamoDB
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

            if (!this.data) { throw new Error(`this.data falsy.`); }
            if (!this.data!.tableName) { throw new Error(`tableName not set`); }
            if (!this.data!.secretAccessKey) { throw new Error(`this.data!.secretAccessKey falsy`); }
            if (!this.data!.accessKeyId) { throw new Error(`this.data!.accessKeyid falsy`); }

            if (arg.data!.cmd === 'put' && (arg.ibGibs?.length === 0)) {
                errors.push(`when "put" cmd is called, ibGibs required.`);
            }

            if (
                arg.data?.cmd === 'get' &&
                !arg.data?.cmdModifiers?.includes('latest') &&
                !arg.data?.binExt && !arg.data?.binHash &&
                (arg.data?.ibGibAddrs?.length === 0)
            ) {
                errors.push(`when "get" cmd is called, either ibGibAddrs or binExt+binHash required.`);
            }

            if (arg.data.projectionExpression && !arg.data.projectionExpression.startsWith('ib,gib')) {
                errors.push(`when using projectionExpresion, must start with 'ib,gib'`)
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

    protected routeAndDoCommand<TCmdModifier extends SyncSpaceOptionsCmdModifier = SyncSpaceOptionsCmdModifier>({
        cmd,
        cmdModifiers,
        arg,
    }: {
        cmd: IbGibSpaceOptionsCmd | string,
        cmdModifiers: (TCmdModifier | string)[],
        arg: AWSDynamoSpaceOptionsIbGib,
    }): Promise<AWSDynamoSpaceResultIbGib | undefined> {
        const lc = `${this.lc}[${this.routeAndDoCommand.name}]`;
        // atow we only care about adding sync functionality to cmd routing
        if ((cmdModifiers ?? []).length === 0 || !cmdModifiers.includes('sync')) {
            return super.routeAndDoCommand({cmd, cmdModifiers, arg});
        }
        switch (cmd) {
            case IbGibSpaceOptionsCmd.put:
                if (cmdModifiers.includes('sync')) {
                    if (arg.data.tjpGib) {
                        return this.putSync_Continue(arg);
                    } else {
                        return this.putSync_Start(arg);
                    }
                } else {
                    return super.routeAndDoCommand({cmd, cmdModifiers, arg});
                }

            default:
                return super.routeAndDoCommand({cmd, cmdModifiers, arg});
        }
    }

    protected async getImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.get.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
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
        const warnings: string[] = [];
        const errors: string[] = [];
        let latestIbGibs: IbGib_V1[];
        try {
            try {
                if (logalot) { console.log(`${lc} starting...`); }
                if ((arg.ibGibs ?? []).length === 0) { throw new Error(`ibGibs required. (ERROR: 34d175b339bf4519a4da5e9b82e91ad6)`); }

                const client = createClient({
                    accessKeyId: this.data.accessKeyId,
                    secretAccessKey: this.data.secretAccessKey,
                    region: this.data.region,
                });

                latestIbGibs = await this.getNewerIbGibs({
                    client,
                    ibGibs: arg.ibGibs,
                    warnings,
                    errors,
                });
            } catch (error) {
                console.error(`${lc} error: ${error.message}`);
                errors.push(error.message);
            } finally {
                if (logalot) { console.log(`${lc} complete(ish).`); }
            }

            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
            }
            const result = await this.resulty({resultData});
            result.ibGibs = latestIbGibs;
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async getNewerImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getNewerImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const warnings: string[] = [];
        const errors: string[] = [];
        let newerIbGibs: IbGib_V1[];
        try {
            try {
                if (logalot) { console.log(`${lc} starting...`); }
                if ((arg.ibGibs ?? []).length === 0) { throw new Error(`ibGibs required. (ERROR: 34d175b339bf4519a4da5e9b82e91ad6)`); }

                const client = createClient({
                    accessKeyId: this.data.accessKeyId,
                    secretAccessKey: this.data.secretAccessKey,
                    region: this.data.region,
                });

                newerIbGibs = await this.getNewerIbGibs({
                    client,
                    ibGibs: arg.ibGibs,
                    warnings,
                    errors,
                });
            } catch (error) {
                console.error(`${lc} error: ${error.message}`);
                errors.push(error.message);
            } finally {
                if (logalot) { console.log(`${lc} complete(ish).`); }
            }

            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
            }
            const result = await this.resulty({resultData});
            result.ibGibs = newerIbGibs;
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
                    if (logalot) { console.log(`${lc}[${cmdLogLabel}] Consumed Capacity: ${JSON.stringify(capacities)}`); }
                }
                return resCmd;
            } catch (error) {
                if (!isThroughputError(error)){ throw error; }
            }
            if (logalot) { console.log(`${lc} retry ${i} due to throughput in ${this.data.throttleMsDueToThroughputError} ms`); }
            await h.delay(this.data.throttleMsDueToThroughputError);
        }
        // we return above, so if gets here then throw
        throw new Error(`Max retries (${maxRetries}) exceeded.`);
    }

    protected async getIbGibsBatch({
        ibGibAddrs,
        addrsNotFound,
        client,
        errors,
    }: {
        ibGibAddrs: IbGibAddr[],
        /**
         * Running list of addresses not found in the store.
         */
        addrsNotFound: IbGibAddr[],
        client: DynamoDBClient,
        errors: String[],
    }): Promise<IbGib_V1[]> {
        const lc = `${this.lc}[${this.getIbGibsBatch.name}]`;
        const ibGibs: IbGib_V1[] = [];
        errors = errors ?? [];
        try {
            // const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;
            if (!addrsNotFound) { throw new Error(`addrsNotFound requird. (ERROR: c10485bf678a4166a3bb1a90a5a88419)`); }

            let retryUnprocessedItemsCount = 0;
            const doItems = async (unprocessedKeys?: KeysAndAttributes) => {

                let cmd = unprocessedKeys ?
                    await createDynamoDBBatchGetItemCommand({tableName: this.data.tableName, unprocessedKeys}) :
                    await createDynamoDBBatchGetItemCommand({tableName: this.data.tableName, addrs: ibGibAddrs});

                const resCmd = await this.sendCmd<BatchGetItemCommandOutput>({cmd, client, cmdLogLabel: 'BatchGetItem'});

                const responseKeys = Object.keys(resCmd.Responses[this.data.tableName]);
                for (let i = 0; i < responseKeys.length; i++) {
                    const key = responseKeys[i];
                    const getIbGibsResponseItem =
                        <AWSDynamoSpaceItem>resCmd.Responses[this.data.tableName][key];

                    const ibGib = getIbGibFromResponseItem({item: getIbGibsResponseItem});
                    ibGibs.push(ibGib);
                    if (logalot) { console.log(`${lc} item: ${h.pretty(ibGib)}`); }
                }

                const newUnprocessedCount =
                    (resCmd?.UnprocessedKeys && resCmd?.UnprocessedKeys[this.data.tableName]?.Keys?.length > 0) ?
                    resCmd?.UnprocessedKeys[this.data.tableName].Keys.length :
                    0;

                if (newUnprocessedCount > 0) {
                    if (logalot) { console.log(`${lc} newUnprocessedCount: ${newUnprocessedCount}`); }
                    let newUnprocessedKeys = resCmd.UnprocessedKeys!;
                    const oldUnprocessedCount = unprocessedKeys?.Keys?.length ?? ibGibAddrs.length;
                    const progressWasMade = oldUnprocessedCount > newUnprocessedCount;
                    if (progressWasMade) {
                        // don't inc retry, just go again
                        if (logalot) { console.log(`${lc} unprocessed made progress, just going again`); }
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
                        if (logalot) { console.log(`${lc} unprocessed did NOT make progress, backing off then retry in ${backoffMs} ms`); }
                        await h.delay(backoffMs);
                        await doItems(newUnprocessedKeys[this.data.tableName]); // recursive
                    }
                }
            }

            // triggers first run, which has recursive calls
            await doItems();
            // at this point, all items are done.

            // populate which ones were not found.
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                if (!ibGibs.some(x => h.getIbGibAddr({ibGib: x}) === addr)) {
                    addrsNotFound.push(addr);
                }
            }

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
        let addrsNotFound: IbGibAddr[] = [];
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
                const gotIbGibs =
                    await this.getIbGibsBatch({ibGibAddrs, client, errors, addrsNotFound});
                ibGibs = [...ibGibs, ...gotIbGibs];

                if (errors.length > 0) { break; }

                runningCount = ibGibs.length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                ibGibAddrs = doNext;
            }

            if (logalot) { console.log(`${lc} total: ${runningCount}.`); }

            if (addrsNotFound.length > 0) { resultData.addrsNotFound = addrsNotFound; }
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
     * This means that you may receive a list of only one ibGib, the given ibGib
     * that you passed in...OR...YOU MAY GET A PARALLEL IBGIB TIMELINE WITH THE
     * SAME N!
     *
     * Or you may get more than one ibGib with the same n, which makes it
     * slightly more obvious that you are dealing with multiple timelines.
     *
     * Or you may receive multiple ibGibs with multiple values of n. Could be the
     * same timeline with newer versions, or this could be from different timeline(s)
     * with multiple versions, or it could be both the same current timeline
     * and other parallel ones.
     *
     * @returns a map of tjp addr -> all corresponding ibGibs with `data.n >= info.nLeast`
     */
    protected async getNewerIbGibInfosBatch({
        infos,
        client,
        errors,
    }: {
        infos: GetNewerQueryInfo[],
        client: DynamoDBClient,
        errors: String[],
    }): Promise<GetNewerQueryInfo[]> {
        const lc = `${this.lc}[${this.getNewerIbGibInfosBatch.name}]`;
        try {
            const resultInfos: GetNewerQueryInfo[] = [];
            const queryPromises = infos.map(async (info) => {
                try {
                    info = h.clone(info);
                    const projectionExpression =
                        info.projectionExpression || c.DEFAULT_AWS_PROJECTION_EXPRESSION;
                    const cmd = await createDynamoDBQueryNewerCommand({
                        tableName: this.data.tableName,
                        info,
                        projectionExpression,
                    });
                    debugger;
                    const resCmd =
                        await this.sendCmd<QueryCommandOutput>({cmd, client, cmdLogLabel: 'Query'});
                    debugger;
                    if (resCmd.Count > 0) {
                        debugger;
                        info.resultItems = <AWSDynamoSpaceItem[]>resCmd.Items;
                        info.resultIbGibs = info.fullIbGibQuery ?
                            resCmd.Items.map((item: AWSDynamoSpaceItem) => getIbGibFromResponseItem({item})) :
                            undefined;
                    }
                    debugger;
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
    protected async getNewerIbGibs({
        client,
        ibGibs,
        warnings,
        errors,
    }: {
        client: DynamoDBClient,
        ibGibs: IbGib_V1[],
        warnings: string[],
        errors: string[],
    }): Promise<IbGib_V1[]> {
        const lc = `${this.lc}[${this.getNewerIbGibs.name}]`;
        let resIbGibs: IbGib_V1[] = [];
        try {
            // argibGibs guaranteed at this point to be non-null and > 0

            // only need to get newer ibGibs for those with timelines.
            let {ibGibsWithTjpMap, ibGibsWithoutTjpMap} = splitIntoWithTjpAndWithoutTjp({ibGibs});
            let ibGibsWithTjp = Object.values(ibGibsWithTjpMap);
            const ibGibsWithoutTjp = Object.values(ibGibsWithoutTjpMap);

            if (ibGibsWithTjp.length === 0) {
                const warning = `${lc} ibGibsWithTjp.length is zero, meaning
                there aren't any ibgibs that we need to check for latest. No
                tjps + data.n values (no timelines). This may be expected.
                (WARNING: a2f7604814954946a58da11eb9648d7e)`;
                console.warn(warning);
                warnings.push(warning);
                return ibGibs; // returns
            }

            // build infos
            let infos: GetNewerQueryInfo[] = this.getGetNewerQueryInfos({ibGibs: ibGibsWithTjp});

            // execute rounds in batches, depending on this AWS dynamo space settings.
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

                // turn infos into recent ibGibs...
                let gotIbGibs: IbGib_V1[] = [];
                for (let j = 0; j < gotInfos.length; j++) {
                    const info = gotInfos[j];
                    // errored, so return null
                    if (info.errorMsg) {
                        errors.push(info.errorMsg);
                    } else {
                        // at this point, we're not sure of the state of our
                        // results.  there could be multiple newer ibgibs of
                        // the same timeline, or even divergent parallel
                        // branches (oh no!).
                        await this.checkMultipleTimelinesAndStuffWhatHoIndeed({info, warnings});
                        // for now, we're going to think simply and just
                        // return all ibgibs returned
                        gotIbGibs = gotIbGibs.concat(info.resultIbGibs);
                    }
                }

                resIbGibs = [...resIbGibs, ...gotIbGibs];

                if (errors.length > 0) { break; }

                runningCount = resIbGibs.length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                infos = doNext;
            }

            if (logalot) { console.log(`${lc} final runningCount: ${runningCount}.`); }

            resIbGibs = [...resIbGibs, ...ibGibsWithoutTjp];

            return resIbGibs;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            errors.push(error.message);
        }
    }

    /**
     * Builds a map of the latest address of given ibGibs in the store.
     *
     * The map is composed with the incoming ibGib.gib as the key and the latest
     * address or `undefined` as the value.
     *
     * @returns a map of incoming ibGib.gib's -> latest addr | `undefined`
     */
    protected async getLatestIbGibAddrsInStore({
        client,
        ibGibs,
        warnings,
        errors,
    }: {
        client: DynamoDBClient,
        ibGibs: IbGib_V1[],
        warnings: string[],
        errors: string[],
    }): Promise<{ [addr: string]: IbGibAddr | null }> {
        const lc = `${this.lc}[${this.getLatestIbGibAddrsInStore.name}]`;
        warnings = warnings ?? [];
        errors = errors ?? [];
        const initialErrorCount = errors.length;
        let resLatestMap: { [addr: string]: IbGibAddr | null } = {};
        try {
            // argibGibs guaranteed at this point to be non-null and > 0

            // for tjps, we check starting at the tjp in the store and get
            // all newer ones (because querying in DynamoDB for this is hard).
            // we then pick the one with highest 'n'.

            // for non-tjps, we are checking for existence
            // (because no timeline === no "latest" beyond itself)
            let {ibGibsWithTjpMap, ibGibsWithoutTjpMap} = splitIntoWithTjpAndWithoutTjp({ibGibs});
            let ibGibsWithTjp = Object.values(ibGibsWithTjpMap);
            let tjpIbGibs = ibGibsWithTjp.filter(x => x.data.isTjp); // ASSUMES ONLY ONE TJP ATOW!
            const ibGibsWithoutTjp = Object.values(ibGibsWithoutTjpMap);

            // for the tjpIbGibs we need to do a newer query, returning just the
            // addresses and `n` values.
            let tjpLatestInfosMap =
                await this.getTimelinesInfosPerTjpInStore({client, tjpIbGibs, errors, warnings});
            debugger; // not sure what the shape of tjpLatestInfosMap will be...

            // for the ibgibs without tjp, we need to just check for existence
            // via get items, returning only the address. If the value in the
            // result map is true, then it exists, so it is its own latest.
            // Otherwise, it has no "latest" in store.
            const addrsWithoutTjp = ibGibsWithoutTjp.map(x => h.getIbGibAddr({ibGib: x}));
            const resExistsMap: {[addr: string]: boolean} = await this.existsInStore({
                client,
                ibGibAddrs: addrsWithoutTjp,
                errors,
                warnings,
            });
            addrsWithoutTjp.forEach(addrWithoutTjp => {
                resLatestMap[addrWithoutTjp] =
                    resExistsMap[addrWithoutTjp] ? addrWithoutTjp : null;
            });
            debugger; // examine the result

            // build infos
            let infos: GetNewerQueryInfo[] = this.getGetNewerQueryInfos({
                ibGibs: tjpIbGibs,
                projectionExpression: 'ib,gib,n,tjp'
            });

            // execute rounds in batches, depending on this AWS dynamo space settings.
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

                // turn infos into recent ibGibs...
                let gotIbGibs: IbGib_V1[] = [];
                for (let j = 0; j < gotInfos.length; j++) {
                    const info = gotInfos[j];
                    // errored, so return null
                    if (info.errorMsg) {
                        errors.push(info.errorMsg);
                    } else {
                        // at this point, we're not sure of the state of our
                        // results.  there could be multiple newer ibgibs of
                        // the same timeline, or even divergent parallel
                        // branches (oh no!).
                        await this.checkMultipleTimelinesAndStuffWhatHoIndeed({info, warnings});
                        // for now, we're going to think simply and just
                        // return all ibgibs returned
                        gotIbGibs = gotIbGibs.concat(info.resultIbGibs);
                    }
                }

                resIbGibs = [...resIbGibs, ...gotIbGibs];

                if (errors.length > 0) { break; }

                runningCount = resIbGibs.length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                infos = doNext;
            }

            if (logalot) { console.log(`${lc} final runningCount: ${runningCount}.`); }

            resIbGibs = [...resIbGibs, ...ibGibsWithoutTjp];

            return resIbGibs;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            errors.push(error.message);
        }
    }

    protected async existsInStore({
        client,
        ibGibAddrs,
        errors,
        warnings,
    }: {
        client: DynamoDBClient,
        ibGibAddrs: IbGibAddr[],
        errors: string[],
        warnings: string[],
    }): Promise<{[addr: string]: boolean}> {
        const lc = `${this.lc}[${this.existsInStore.name}]`;
        errors = errors ?? [];
        warnings = warnings ?? [];
        const ibGibAddrsThatExistInStore: IbGibAddr[] = [];
        const resExistsMap: {[addr: string]: boolean} = {};
        try {
            // const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;

            let retryUnprocessedItemsCount = 0;
            const projectionExpression = 'ib,gib'
            const doItems = async (unprocessedKeys?: KeysAndAttributes) => {

                let cmd = unprocessedKeys ?
                    await createDynamoDBBatchGetItemCommand({
                        tableName: this.data.tableName, unprocessedKeys, projectionExpression
                    }) :
                    await createDynamoDBBatchGetItemCommand({
                        tableName: this.data.tableName, addrs: ibGibAddrs, projectionExpression
                    });

                const resCmd =
                    await this.sendCmd<BatchGetItemCommandOutput>({
                        cmd, client, cmdLogLabel: 'BatchGetItem'
                    });

                const responseKeys = Object.keys(resCmd.Responses[this.data.tableName]);
                for (let i = 0; i < responseKeys.length; i++) {
                    const key = responseKeys[i];
                    const item = <AWSDynamoSpaceItem>resCmd.Responses[this.data.tableName][key];
                    // const ibGib = getIbGibFromResponseItem({item: item});
                    if (logalot) { console.log(`${lc} item: ${h.pretty(item)}`) }
                    if (item?.ib?.S && item?.gib?.S) {
                        const ib = JSON.parse(item.ib.S);
                        const gib = JSON.parse(item.gib.S);
                        const addr = h.getIbGibAddr({ib, gib});
                        if (!ibGibAddrsThatExistInStore.includes(addr)) {
                            ibGibAddrsThatExistInStore.push(addr);
                        } else {
                            console.warn(`${lc} duplicate addr returned in query
                            response. (WARNING:
                            6eaecd5dd4514cfd98856a2eaa5eff11)`);
                        }
                    } else {
                        // not found
                    }
                }

                const newUnprocessedCount =
                    (resCmd?.UnprocessedKeys && resCmd?.UnprocessedKeys[this.data.tableName]?.Keys?.length > 0) ?
                    resCmd?.UnprocessedKeys[this.data.tableName].Keys.length :
                    0;

                if (newUnprocessedCount > 0) {
                    if (logalot) { console.log(`${lc} newUnprocessedCount: ${newUnprocessedCount}`); }
                    let newUnprocessedKeys = resCmd.UnprocessedKeys!;
                    const oldUnprocessedCount = unprocessedKeys?.Keys?.length ?? ibGibAddrs.length;
                    const progressWasMade = oldUnprocessedCount > newUnprocessedCount;
                    if (progressWasMade) {
                        // don't inc retry, just go again
                        if (logalot) { console.log(`${lc} unprocessed made progress, just going again`); }
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
                        if (logalot) { console.log(`${lc} unprocessed did NOT make progress, backing off then retry in ${backoffMs} ms`); }
                        await h.delay(backoffMs);
                        await doItems(newUnprocessedKeys[this.data.tableName]); // recursive
                    }
                }
            }

            // triggers first run, which may have recursive calls
            await doItems();
            // at this point, all items are done.

            // populate which ones were not found.
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                resExistsMap[addr] = ibGibAddrsThatExistInStore.includes(addr);
            }
            return resExistsMap;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            errors.push(error.message);
            return undefined; // explicit
        }
    }

    /**
     * This queries dynamodb for all ibgib addrs stored for a given list of
     * `tjpIbGibs`.
     *
     * if there are no ibgibs associated with any given tjpIbGib,
     * then this will map that tjpAddr to undefined.
     *
     * ## notes
     *
     * * Incoming ibGibs should each be a unique tjp ibGib.
     * * This function should not throw, rather it will populate/add to
     *   `errors`.
     *
     * @returns map of tjpAddr => query info
     */
    protected async getTimelinesInfosPerTjpInStore({
        client,
        tjpIbGibs,
        warnings,
        errors,
        dontStopOnErrors,
    }: {
        client: DynamoDBClient,
        tjpIbGibs: IbGib_V1[],
        warnings: string[],
        errors: string[],
        /**
         * If true, will do no more batches after errored result.
         */
        dontStopOnErrors?: boolean,
    }): Promise<{[addr: string]: GetNewerQueryInfo}> {
        const lc = `${this.lc}[${this.getTimelinesInfosPerTjpInStore.name}]`;
        let resInfosMap: {[addr: string]: GetNewerQueryInfo} = {};
        warnings = warnings ?? [];
        errors = errors ?? [];
        const initialErrorCount = errors.length;
        try {
            if ((tjpIbGibs ?? []).length === 0) { throw new Error(`tjpIbGibs required. (ERROR: 20f9118c0e9c492884bf7fcfcf335c4d)`); }
            if (tjpIbGibs.some(x => !x.data.isTjp)) { throw new Error(`all tjpIbGibs must be tjps. (data.isTjp truthy). (ERROR: 37352d01f431423189474cf7a30cc1bf)`); }

            // we only want the latest addr and tjp-related metadata, not the
            // whole record.
            let projectionExpression = 'ib,gib,n,tjp';

            // build infos
            let infos: GetNewerQueryInfo[] = this.getGetNewerQueryInfos({
                ibGibs: tjpIbGibs,
                projectionExpression,
                latestOnly: true,
            });

            // execute rounds in batches, depending on this AWS dynamo space settings.
            let runningCount = 0;
            const batchSize = this.data.queryBatchSize || c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE;
            const throttleMs = this.data.throttleMsBetweenGets || c.DEFAULT_AWS_GET_THROTTLE_MS;
            const rounds = Math.ceil(infos.length / batchSize);
            for (let i = 0; i < rounds; i++) {
                if (i > 0) {
                    if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                    await h.delay(throttleMs);
                }
                const infosTodoNextRound = infos.splice(batchSize);
                debugger;
                const gotInfos = await this.getNewerIbGibInfosBatch({infos, client, errors});

                // map the infos to the corresponding tjpAddr
                for (let j = 0; j < gotInfos.length; j++) {
                    const info = gotInfos[j];
                    if (info.errorMsg) { errors.push(info.errorMsg); }
                    if (!resInfosMap[info.queryAddr]) {
                        resInfosMap[info.queryAddr] = info;
                    } else {
                        console.warn(`${lc} duplicated info.queryAddr. The
                        caller should be providing a unique list of tjpIbGibs.
                        (WARNING: 8fd675b2309648a4ab66464f7bdcdd32)`);
                    }
                }

                runningCount = Object.keys(resInfosMap).length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }

                if (errors.length > initialErrorCount && !dontStopOnErrors) {
                    break;
                } else {
                    // will keep going if infos is non-empty
                    infos = infosTodoNextRound;
                }
            }

            if (logalot) { console.log(`${lc} final runningCount: ${runningCount}.`); }

            return resInfosMap;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            errors.push(error.message);
        }
    }

    protected async getLatestIbGibAddrsInStore_NonTjp({
        client,
        ibGibs,
        warnings,
        errors,
    }: {
        client: DynamoDBClient,
        ibGibs: IbGib_V1[],
        warnings: string[],
        errors: string[],
    }): Promise<{ [gib: string]: IbGibAddr | undefined }> {
        const lc = `${this.lc}[${this.getLatestIbGibAddrsInStore_NonTjp.name}]`;
        let resIbGibAddrs: IbGibAddr[] = [];
        try {
            // argibGibs guaranteed at this point to be non-null and > 0

            // for tjps, we only need to check the tjp itself and no succeeding frames.
            // for non-tjps, we are checking for existence.
            let {ibGibsWithTjpMap, ibGibsWithoutTjpMap} = splitIntoWithTjpAndWithoutTjp({ibGibs});
            let ibGibsWithTjp = Object.values(ibGibsWithTjpMap);
            let tjpIbGibs = ibGibsWithTjp.filter(x => x.data.isTjp); // ASSUMES ONLY ONE TJP ATOW!
            const ibGibsWithoutTjp = Object.values(ibGibsWithoutTjpMap);

            // for the tjpIbGibs we need to do a newer query, returning just the
            // addresses and `n` values.

            // for the ibgibs without tjp, we need to just check for existence via
            // get items, returning only the address

            // build infos
            let infos: GetNewerQueryInfo[] = this.getGetNewerQueryInfos({
                ibGibs: tjpIbGibs,
                projectionExpression: 'ib,gib,n,tjp'
            });

            // execute rounds in batches, depending on this AWS dynamo space settings.
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

                // turn infos into recent ibGibs...
                let gotIbGibs: IbGib_V1[] = [];
                for (let j = 0; j < gotInfos.length; j++) {
                    const info = gotInfos[j];
                    // errored, so return null
                    if (info.errorMsg) {
                        errors.push(info.errorMsg);
                    } else {
                        // at this point, we're not sure of the state of our
                        // results.  there could be multiple newer ibgibs of
                        // the same timeline, or even divergent parallel
                        // branches (oh no!).
                        await this.checkMultipleTimelinesAndStuffWhatHoIndeed({info, warnings});
                        // for now, we're going to think simply and just
                        // return all ibgibs returned
                        gotIbGibs = gotIbGibs.concat(info.resultIbGibs);
                    }
                }

                resIbGibs = [...resIbGibs, ...gotIbGibs];

                if (errors.length > 0) { break; }

                runningCount = resIbGibs.length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                infos = doNext;
            }

            if (logalot) { console.log(`${lc} final runningCount: ${runningCount}.`); }

            resIbGibs = [...resIbGibs, ...ibGibsWithoutTjp];

            return resIbGibs;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            errors.push(error.message);
        }
    }
    private async checkMultipleTimelinesAndStuffWhatHoIndeed({
        info,
        warnings,
    }: {
        info: GetNewerQueryInfo,
        warnings: string[],
    }): Promise<{[n: string]: IbGib_V1}> {
        const lc = `${this.lc}[${this.checkMultipleTimelinesAndStuffWhatHoIndeed.name}]`;
        try {
            if (!info.resultIbGibs || info.resultIbGibs.length === 0) {
                return {};
            }

            // a single info corresponds to a "single" ibGib tjp timeline.
            // the `resultibGibs` are the ibgib frames equal or forward in time
            // in 0, 1, or more timelines.
            // if info.resultIbGibs has more than one entry with the
            // same n, then we have multiple timelines
            // so this (nObj) is an object for checking for this,
            // we're not going to build our results off of it directly.
            const nObj: { [n: string]: IbGib_V1 } = {};
            const resIbGibsGroupedByN: { [n: number]: IbGib_V1[] } = groupBy<IbGib_V1>({
                items: info.resultIbGibs,
                keyFn: x => (x.data?.n ?? -1)
            });
            if (Object.values(resIbGibsGroupedByN).some(x => x.length > 1)) {
                // multiple timelines
                // shouldn't really happen with our merge/put strategy,
                // but it's possible if we don't lock resources well enough.
                // definitely want to log this.
            } else {
                const leastIbGibs = resIbGibsGroupedByN[info.nLeast] ?? [];
                if (leastIbGibs.length === 1) {
                    const gotLeastAddr = h.getIbGibAddr({ibGib: leastIbGibs[0]});
                    if (gotLeastAddr === info.queryAddr) {
                        // no parallel timelines.
                    } else {
                        // single parallel timeline
                        // so, we have the most recent thingies and we want to
                        // merge ours into those, and then update ours
                        // to point to the new timeline.
                        // consequently, we need to redo our ts-gib to include
                        // tjp gib hash in each link and/or address?.
                    }
                } else {
                    // hmm what?
                    throw new Error(`expected if anything to have the current ibGib with nLeast or an empty result set, since this is only supposed to be gt or eq to nLeast. (ERROR: b3270a724f854c3eb4aa4bcd707435e5)`);
                }
            }

            info.resultIbGibs.forEach(ibGib => {
                let key = ibGib.data!.n!.toString();
                if (nObj[key] && nObj[key].gib !== ibGib.gib) {
                    // we already have this n for a different ibGib.
                    // This means that we have at least one divergent timeline.
                    debugger; // just looking
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
                    debugger;
                    nObj[key] = ibGib;
                }
            });

            return nObj;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Converts ibGib(s) to query infos. If there is more than one
     * ibgib in a given timeline (per tjp), then this will only
     * use the highest ibgib.data.n for nLeast.
     *
     * @returns list of infos to throw off to a getLatest query
     */
    protected getGetNewerQueryInfos({
        ibGibs,
        projectionExpression,
        latestOnly,
    }: {
        ibGibs: IbGib_V1[],
        projectionExpression?: string,
        latestOnly?: boolean,
    }): GetNewerQueryInfo[] {
        const lc = `${this.lc}[${this.getGetNewerQueryInfos.name}]`;
        try {
            if ((ibGibs ?? []).length === 0) { throw new Error(`ibGibs required. (ERROR: 6e59b245ac984dd4af3ff2f576d5f9f9)`); }
            projectionExpression = projectionExpression || c.DEFAULT_AWS_PROJECTION_EXPRESSION;

            let infoMap: {[tjp: string]: GetNewerQueryInfo} = {};
            ibGibs.forEach(x => {
                if (!Number.isSafeInteger(x.data?.n)) {
                    if (logalot) { console.log(`${lc} no ibGib.data.n safe integer: ${h.getIbGibAddr({ibGib: x})}`); }
                    return;
                }
                if (x.rel8ns?.tjp?.length !== 1 && !x.data!.isTjp) {
                    if (logalot) { console.log(`${lc} no tjp info: ${h.getIbGibAddr({ibGib: x})}`); }
                    return;
                }
                const tjpAddr = x.data!.isTjp ? h.getIbGibAddr({ibGib: x}) : x.rel8ns!.tjp[0];
                const queryAddr = h.getIbGibAddr({ibGib: x});
                const nLeast = x.data!.n;
                const fullIbGibQuery =
                    projectionExpression.includes('ib') &&
                    projectionExpression.includes('gib') &&
                    projectionExpression.includes('data') &&
                    projectionExpression.includes('rel8ns');
                if (infoMap[tjpAddr]) {
                    // only do the highest n
                    if (nLeast > infoMap[tjpAddr].nLeast) {
                        infoMap[tjpAddr] =
                            {tjpAddr, nLeast, queryAddr, projectionExpression, latestOnly, fullIbGibQuery,};
                    }
                } else {
                    infoMap[tjpAddr] =
                        {tjpAddr, nLeast, queryAddr, projectionExpression, latestOnly, fullIbGibQuery};
                }
            });

            const infos: GetNewerQueryInfo[] = Object.values(infoMap);

            if (logalot) { console.log(`${lc} infos: ${h.pretty(infos)}`); }

            return infos;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async putImpl(arg: AWSDynamoSpaceOptionsIbGib): Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        try {
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
                    if (logalot) { console.log(`${lc} unprocessedCount: ${unprocessedCount}`); }
                    ibGibItems =
                        <AWSDynamoSpaceItem[]>resPut.UnprocessedItems[this.data.tableName];
                    const progressWasMade = prevUnprocessedCount > unprocessedCount;
                    if (progressWasMade) {
                        // don't inc retry, just go again
                        if (logalot) { console.log(`${lc} unprocessed made progress, just going again`); }
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
                        if (logalot) { console.log(`${lc} unprocessed did NOT make progress, backing off then retry in ${backoffMs} ms`); }
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
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                ibGibs = doNext;
            }

            if (logalot) { console.log(`${lc} total: ${runningCount}.`); }
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
                    if (logalot) { console.log(`${lc} unprocessedCount: ${unprocessedCount}`); }
                    binItems =
                        <AWSDynamoSpaceItem[]>putResult.UnprocessedItems[this.data.tableName];
                    const progressWasMade = prevUnprocessedCount > unprocessedCount;
                    if (progressWasMade) {
                        // don't inc retry, just go again
                        if (logalot) { console.log(`${lc} unprocessed made progress, just going again`); }
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
                        if (logalot) { console.log(`${lc} unprocessed did NOT make progress, backing off then retry in ${backoffMs} ms`); }
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
            throw new Error('not implemented');
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({resultData});
        return result;
    }
    protected async canPutImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canPut.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            throw new Error('not implemented');
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({resultData});
        return result;
    }

    protected async canDeleteImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canDeleteImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
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
     * We're just getting the ball rolling for the sync "saga".
     * So this method will return almost immediately with
     * an observable on it for the caller to subscribe to in order
     * to get the real progress updates (instead of just waiting on
     * one big, long-running function).
     *
     * ##
     * @returns AWSDynamoSpaceResultIbGib with syncStatus$ observable for sync updates.
     */
    protected async putSync_Start(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        let lc = `${this.lc}[${this.putSync_Start.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        // create observable that we will return almost immediately most of this
        // method will work inside of a spun-off promise.
        try {
            if (!arg.data) { throw new Error(`arg.data required. (ERROR: 847a1506e7054d53b7bf5ff87a4b32da)`); }
            if ((arg.data.ibGibAddrs ?? []).length === 0) { throw new Error(`arg.data.ibGibAddrs required. (ERROR: 6f2062572cc247f6a12b34759418c66b)`); }
            if (!arg.data.txrxId) { throw new Error(`txrxId required. (ERROR: af30b1b3cf3a4676a89399514743da79)`); }
            if ((arg.ibGibs ?? []).length === 0) { throw new Error(`no ibgibs given. (ERROR: 62ae74eab0434b90b866caa285403143)`); }
            if (!arg.syncStatus$) { throw new Error(`arg.syncStatus$ required. (ERROR: 33efb28789ff40b9b340eedcba0017f7)`); }

            const syncStatus$: ReplaySubject<SyncStatusIbGib|string> = arg.syncStatus$;

            const client = createClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            // create the initial status ibgib.
            // we will mut8/rel8 this status over course of sync.
            const {startIbGib, allIbGibs: statusStartIbGibs} =
                await this.getStatusIbGibs_Start({
                    client: client,
                    txrxId: arg.data.txrxId,
                    participants: arg.data.participants,
                    ibGibAddrs: arg.data.ibGibAddrs,
                });

            // spin off the rest of the execution
            new Promise<void>(async (resolve) => {
                const statusErrors: string[] = [];
                try {
                    await this.putIbGibBatch({
                        ibGibs: statusStartIbGibs,
                        client,
                        errors: statusErrors,
                    });
                    if (statusErrors?.length > 0) {
                        // errored, so we're through
                        syncStatus$.error(statusErrors.join('\n'));
                        resolve();
                    } else {
                        // publish the status that we've started
                        syncStatus$.next(startIbGib);
                    }

                    // now that we've started some paperwork, we can begin doing
                    // the actual work.

                    // here is the shortcut we're doing: for each timeline, we're
                    // going to get the latest one stored in our outerspace (dynamodb in this case).
                    // We'll check which transforms are applied in that one and ours, and we'll
                    // apply the transforms from our local timeline that we don't find in the
                    // stored one. We'll then store the new ibGibs and return these in our
                    // result ibgib. The caller will then be responsible for updating the
                    // local space with those new ones (rebasing essentially).

                    // We only want to query for latest on those ibGibs with tjps.
                    const ibGibsWithTjps: IbGib_V1[] = [];
                    arg.ibGibs.forEach(ibGib => {
                        const addr = h.getIbGibAddr({ibGib});
                        if (arg.data.ibGibAddrs_All_Tjps.includes(addr)) {
                            ibGibsWithTjps.push(ibGib);
                        }
                    });
                    // let infos = this.getGetLatestQueryInfos({ibGibs: ibGibsWithTjps});
                    this.getLatestIbGibAddrs

                    debugger;
                    let resNewer = await this.getNewerIbGibInfosBatch({
                        infos,
                        client,
                        errors: statusErrors
                    });
                    if ((resNewer ?? []).length === 1) {
                        debugger;
                        const resInfo = resNewer[0];
                        const { resultIbGibs } = resInfo;
                        if ((resultIbGibs ?? []).length > 0) {
                            // if there are newer ones hmm
                            debugger;
                            if (resultIbGibs.length === 1 && resultIbGibs[0].gib === ibGib.gib) {
                                // no newer ones (newer one is same we sent out)
                                debugger;
                            } else {
                                const resultIbGibsByN = groupBy({items: resultIbGibs, keyFn: x => x.data?.n?.toString() ?? '-1'});
                                if (resultIbGibsByN['-1']) { console.warn(`${lc} we got newer ibGibs that have data?.n be null/undefined`); }
                                const groups = Object.values(resultIbGibsByN);
                                if (groups.some(x => x.length > 1)) {
                                    // multiple timelines newer ones
                                    debugger;
                                } else {
                                    // one timeline newer ones
                                    debugger;
                                }
                            }
                        } else {
                            debugger;
                            // nothing stored yet
                            if (logalot) { console.log(`${lc} nothing stored yet.`)}
                            /* get the dependency graph
                            // need to see if anything in dependency graph needs syncing first.
                            // hmm, there is an issue if there is a rel8d ibgib that also has
                            // a timeline. can't just call recursively if we're talking about
                            // the ability to get latest before syncing...hmm.
                            // besides that complication, once we have a dependency graph
                            // we need to find out what addresses already are stored and which ones
                            // the space does not have.
                            */
                           this.putIbGibBatch({ibGibs: , client, errors: []})

                        }
                    } else {
                        debugger;
                        throw new Error(`There was an error getting newer ibgibs. (ERROR: 6c14a2fe0a404c0a8c1fd91644753860)`);
                    }

                    debugger;
                    // need to analyze which ibgibs we don't already have
                    //   (status of ibgibs)
                    // which ones will need to be merged
                    //   (status of dnas/transforms)
                    // also need to see what we have as tjp
                } catch (error) {
                    debugger;
                    syncStatus$.error(`${lc} ${error.message}`);
                    resolve();
                }
            });
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        try {
            const result = await this.resulty({resultData});
            if (syncStatus$) { result.syncStatus$ = syncStatus$; }
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async putSync_Continue(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.putSync_Continue.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            if (!arg.syncStatus$) { throw new Error(`arg.syncStatus$ falsy`); }
            const client = createClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            //   we will mut8/rel8 to this ticket over course of sync.
            // immediately publish the status
            // need to analyze which ibgibs we don't already have
            //   (status of ibgibs)
            // which ones will need to be merged
            //   (status of dnas/transforms)

            // we want to store our status ibgib graph and other metadata
            // throughout this process.


            // we now have started by saving the put metadata

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

    /**
     * Creates a new SyncStatusIbGib timeline (with tjp).
     *
     * * The tjp.gib acts as the timeline (stream/saga) id.
     * * Each individual ibgib frame.gib acts as the tx id.
     *
     * ## notes
     *
     * * a 'primitive' means it just has an ib with data and gib === "gib" (i.e. no hash)
     * * the initial tjp can't include the tjp gib because it can't be calculated until
     *   after this generation!!
     */
    private async getStatusIbGibs_Start({
        client,
        txrxId,
        participants,
        ibGibAddrs,
    }: {
        client: DynamoDBClient,
        txrxId: string,
        participants: ParticipantInfo[],
        ibGibAddrs: IbGibAddr[],
    }): Promise<{startIbGib: SyncStatusIbGib, allIbGibs: IbGib_V1[]}> {
        const lc = `${this.lc}[${this.getStatusIbGibs_Start.name}]`;
        try {
            if (!client) { throw new Error(`client required. (ERROR: 7e749ecc44f647dc8587c00c334337d4)`); }
            if ((participants ?? []).length === 0) { throw new Error(`participants required. (ERROR: a707efcdd7594a4aa70599e84ffa43c4)`); }

            // 1. parent primitive
            const parentIb = getStatusIb({
                spaceType: 'sync',
                spaceSubtype: 'aws-dynamodb',
                statusCode: HttpStatusCode.undefined, // "undefined" means '0' atow!!
                txrxId: c.STATUS_UNDEFINED_TX_ID, // "undefined" means '0' atow!!
            });
            const parentIbGib = factory.primitive({ib: parentIb});
            // we don't store primitives, so don't add to allIbGibs

            // 2. start tjp ibGib (has txId)
            const statusCode = HttpStatusCode.processing;
            const tjpIb = getStatusIb({
                statusCode,
                spaceType: 'sync',
                spaceSubtype: 'aws-dynamodb',
                txrxId,
            });
            const data = <SyncStatusData>{
                statusCode,
                participants,
                toTx: ibGibAddrs,
            };
            const resTjp = await factory.firstGen({
                parentIbGib,
                ib: tjpIb,
                data,
                dna: false,
                nCounter: true,
                tjp: { uuid: true, timestamp: true },
            });
            // we'll store this and intermediates
            const startIbGib = <SyncStatusIbGib>resTjp.newIbGib;
            let allIbGibs: IbGib_V1[] = [
                startIbGib,
                ...resTjp.intermediateIbGibs,
            ];

            // return em dude
            return { startIbGib, allIbGibs };
        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.error(emsg);
            // statusErrors.push(emsg);
            throw error;
        }
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

    /**
     * Extremely crude implementation that just
     * saves the ibgibs alongside existing data.
     */
    protected async persistOptsAndResultIbGibs({
        arg,
        result,
    }: {
        arg: AWSDynamoSpaceOptionsIbGib,
        result: AWSDynamoSpaceResultIbGib,
    }): Promise<void> {
        const lc = `${this.lc}[${this.persistOptsAndResultIbGibs.name}]`;
        if (logalot || this.data?.trace) {
            console.log(`${lc} doing arg?.data?.cmd: ${arg?.data?.cmd}, result?.data?.success: ${result?.data?.success}`);
        }
        const argPersist = await this.argy({
            argData: {
                cmd: 'put',
                isMeta: true,
                catchAllErrors: true,
            },
        });
        argPersist.ibGibs = [arg, result];

        const client = createClient({
            accessKeyId: this.data.accessKeyId,
            secretAccessKey: this.data.secretAccessKey,
            region: this.data.region,
        });

        // this is a best effort storage, so we aren't using the result other than logging
        // in the future, we should incorporate what to do if this persistence
        // fails into the larger success requirements of spaces.
        const resPut = await this.putIbGibsImpl({arg: argPersist, client});
        if (!resPut.data.success || resPut.data.errors) {
            console.error(`${lc} Errors persisting arg & result: ${resPut.data.errors.join('\n')}. (ERROR: 65ef314a4f8e445d851dab5b290e9a03)`);
        }
    }

}
