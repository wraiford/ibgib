/**
 * @module AWSDynamoSpace_V1 space provides a sync space substrate that uses
 * DynamoDB for most ibGibs and S3 for ibGibs that are too large for DynamoDB
 * (e.g. binaries). These still have a record inserted into DynamoDB, but the
 * entire ibGib is stored in S3.
 *
 * ## DynamoDB
 *
 * ## S3
 *
 * This space uses S3 for large ibgib storage and all binaries (ibgibs that
 * start with `bin.` in the `ib`.)
 *
 * ### CORS
 *
 * CORS is a factor when configuring S3 bucket. This config is found in the same
 * folder as this space atow, in AWS_S3_CORS.json.
 *
 * @see {@link SpaceBase_V1}
 * @see {@link IbGibSpace}
 */

// #region imports
import {
    DynamoDBClient, AttributeValue,
    KeysAndAttributes, ConsumedCapacity,
    BatchWriteItemCommand, BatchWriteItemCommandInput, BatchWriteItemCommandOutput,
    BatchGetItemCommand, BatchGetItemCommandInput, BatchGetItemCommandOutput,
    DeleteItemCommand, DeleteItemCommandInput, DeleteItemCommandOutput,
    QueryCommand, QueryCommandInput, QueryCommandOutput,
} from '@aws-sdk/client-dynamodb';
import {
    S3Client,
    PutObjectCommand, PutObjectCommandInput, PutObjectCommandOutput,
    GetObjectCommand, GetObjectCommandInput, GetObjectCommandOutput,
    HeadObjectCommand, HeadObjectCommandInput, HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';

import { IbGib_V1, Factory_V1 as factory, FORBIDDEN_ADD_RENAME_REMOVE_REL8N_NAMES, IbGibRel8ns_V1, GIB, ROOT} from 'ts-gib/dist/V1';
import {
    getIbGibAddr, Gib, Ib, IbGibAddr,
    TransformOpts, TransformOpts_Mut8, TransformOpts_Rel8,
    TransformResult,
    V1,
} from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import { SpaceBase_V1 } from './space-base-v1';
// import {
//     SyncSpaceData, SyncSpaceRel8ns,
//     SyncSpaceOptionsData, SyncSpaceOptionsRel8ns, SyncSpaceOptionsIbGib,
//     SyncSpaceResultData, SyncSpaceResultRel8ns, SyncSpaceResultIbGib,
//     IbGibSpaceOptionsCmd, SyncSpaceOptionsCmdModifier,
//     AWSRegion,
//     getStatusIb, StatusCode,
//     SyncStatusData, SyncStatusIbGib,
//     ParticipantInfo,
//     SyncSagaInfo,
// } from '../../types';
import * as c from '../../constants';
import { getGib } from 'ts-gib/dist/V1/transforms/transform-helper';
import {
    AWSRegion,
    SyncSpaceData, SyncSpaceRel8ns,
    SyncSpaceOptionsData, SyncSpaceOptionsRel8ns, SyncSpaceOptionsIbGib,
    SyncSpaceResultData, SyncSpaceResultRel8ns, SyncSpaceResultIbGib,
    SyncSpaceOptionsCmdModifier, SyncSagaInfo, SyncStatusIbGib,
    StatusCode, getStatusIb, SyncStatusData, ParticipantInfo,
} from '../../types/outer-space';
import { IbGibSpaceOptionsCmd } from '../../types/space';
import { groupBy } from '../../helper/utils';
import { isBinary, mergeMapsOrArrays_Naive, splitPerTjpAndOrDna } from '../../helper/ibgib';
import { execInSpaceWithLocking, getDependencyGraph, throwIfDuplicates } from '../../helper/space';
import { validateIbGibIntrinsically } from '../../helper/validate';

// #endregion imports

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

// #region AWS related

type AWSDynamoDBItem = { [key: string]: AttributeValue };

/**
 * Item interface
 */
interface AWSDynamoSpaceItem extends AWSDynamoDBItem {
    [c.DEFAULT_PRIMARY_KEY_NAME]: AttributeValue,
    ib: AttributeValue.SMember,
    gib: AttributeValue.SMember,
    data?: AttributeValue.SMember | AttributeValue.BMember,
    dataIsEncoded?: AttributeValue.BOOLMember,
    rel8ns?: AttributeValue.SMember,
    n?: AttributeValue.NMember,
    tjp?: AttributeValue.SMember,
    /**
     * True if the item is large, and we had to store in S3.
     */
    inS3?: AttributeValue.BOOLMember,
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
    // binHash,
    // binExt
}: {
    addr?: string,
    // binHash?: string,
    // binExt?: string,
}): Promise<string> {
    const lc = `[${getPrimaryKey.name}]`;
    try {
        // if (!addr && !(binHash && binExt)) { throw new Error('either addr or binHash+binExt required.'); }
        if (!addr) { throw new Error('addr required. (E: 18067151d46746faa8217239219754d2)'); }
        // addr = addr ?? getBinAddr({binHash, binExt});
        const primaryKey = await h.hash({s: addr, algorithm: 'SHA-256'});
        return primaryKey;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * atow, the key is the **hash** of the ibGib addr, i.e.,
 * ```typescript
 * return await h.hash({s: h.getIbGibAddr({ibGib}), algorithm: 'SHA-256'});
 * ```
 * @returns key used to put/get the ibgib into/from S3
 */
async function getS3Key({
    ibGib,
    addr,
}: {
    ibGib?: IbGib_V1,
    addr?: IbGibAddr,
}): Promise<string> {
    if (!addr && !ibGib) { throw new Error(`ibGib or addr required. (E: 46c35941c9de4f5581e1e39cbdfdfd95)`); }
    addr = addr || h.getIbGibAddr({ibGib});
    return await h.hash({s: addr, algorithm: 'SHA-256'});
}

async function createDynamoDBPutItem({
    ibGib,
    storeInS3,
}: {
    ibGib: IbGib_V1,
    /**
     * If provided, the ibGib will be incomplete in dynamodb, with only the `ib`
     * and `gib` along with the `s3Link` being stored there. The `s3link` will
     * be the resource pointer to the object in S3, stored as a
     * `JSON.stringify(ibGib)`.
     */
    storeInS3?: boolean,
}): Promise<AWSDynamoSpaceItem> {
    const lc = `[${createDynamoDBPutItem.name}]`;
    try {
        if (!ibGib) { throw new Error(`ibGib required (E: 0d5f409b119849119795894fc457e27c)`); }

        let item: AWSDynamoSpaceItem;
        const addr = h.getIbGibAddr({ibGib});
        const primaryKey = await getPrimaryKey({addr});

        item = {
            [c.DEFAULT_PRIMARY_KEY_NAME]: { S: primaryKey },
            ib: { S: JSON.stringify(ibGib.ib) },
            gib: { S: JSON.stringify(ibGib.gib) },
        }
        if (!storeInS3) {
            // most ibGib will be here. We are storing the actual ibGib
            // directly in DynamoDB. For large ibgibs, we will store
            // in S3 and only metadata in DynamoDB.
            if (ibGib.data) {
                let dataString = JSON.stringify(ibGib.data);
                // \`~!@#$%^&*()_\\-+=|\\\\\\]}[{"':;?/>.<,
                if (dataString.match(c.IBGIB_DATA_REGEX_INDICATES_NEED_TO_ENCODE)) {
                    // need to encode because emoji or funky characters found
                    if (logalot) { console.log(`${lc} encoding data for addr: ${h.getIbGibAddr({ibGib})}`); }
                    item.data = { S: encodeURIComponent(dataString) };
                    item.dataIsEncoded = { BOOL: true };
                } else {
                    // no need to encode
                    item.data = { S: dataString };
                }
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
        } else {
            // large ibgib object, so no `data` or `rel8ns`, and our item will
            // only contain the `ib` and `gib` fields (already set above), as
            // well as the `s3Link` which points to the S3 resource.
            item.inS3 = { BOOL: true };
        }

        if (!item) { throw new Error(`(UNEXPECTED) item not set. (E: f691276d0c554c16a8f5bc5a113c68c1)`); }
        return item;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
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
        const cmd = new BatchGetItemCommand(params);
        return cmd;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}
async function createDynamoDBDeleteItemCommand({
    tableName,
    addr,
}: {
    tableName: string,
    addr: IbGibAddr,
}): Promise<DeleteItemCommand> {
    const lc = `[${createDynamoDBDeleteItemCommand.name}]`;
    try {
        if (!tableName) { throw new Error(`tableName required. (E: 999e4822cb1440378d4f49d430168ac1)`); }
        if (!addr) { throw new Error(`addr required. (E: f8bbdb60992e4fb5990d15dd7c761d3c)`); }

        // build the params input either from scratch of the unprocessedKeys
        let params: DeleteItemCommandInput;
        // populate key
        const primaryKey = await getPrimaryKey({addr});
        params = {
            TableName: tableName,
            Key: {
                ibGibAddrHash: { S: primaryKey }
            },
            // ConditionExpression: "begins_with(#ib, :ib_start)",
            // ExpressionAttributeNames: {
            //     "#ib": "ib",
            // },
            // ExpressionAttributeValues: {
            //     ":ib_start": { S: c.SPACE_LOCK_IB_TERM },
            // },
            // ReturnConsumedCapacity: "TOTAL",
        };

        // create the cmd
        let cmd = new DeleteItemCommand(params);
        return cmd;
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
            ScanIndexForward: true, // returns higher n first (I believe!...not 100% sure here)
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
        if (item.data) {
            ibGib.data = item.dataIsEncoded?.BOOL ?
                JSON.parse(decodeURIComponent(item.data.S)) :
                JSON.parse(item.data.S);
        }
        if (item.rel8ns) { ibGib.rel8ns = JSON.parse(item.rel8ns.S); }
        return ibGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

function createDynamoDBClient({
    accessKeyId,
    secretAccessKey,
    region,
}: {
    accessKeyId: string,
    secretAccessKey: string,
    region: AWSRegion,
}): DynamoDBClient {
    const lc = `[${createDynamoDBClient.name}]`;
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

function createS3Client({
    accessKeyId,
    secretAccessKey,
    region,
}: {
    accessKeyId: string,
    secretAccessKey: string,
    region: AWSRegion,
}): S3Client {
    const lc = `[${createS3Client.name}]`;
    try {
        const client = new S3Client({
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
     * Bucket name in S3 for storing large objects.
     */
    bucketName: string;
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
    version: '3',
    name: c.IBGIB_SPACE_NAME_DEFAULT,
    uuid: undefined, // must be set when this is used.
    type: 'sync',
    subtype: 'aws-dynamodb',
    tableName: '',
    bucketName: '',
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
    validateIbGibAddrsMatchIbGibs: true,
    longPollingIntervalMs: c.DEFAULT_LOCAL_SPACE_POLLING_INTERVAL_MS,
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
    // binData?: any;
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
    // binData?: any;
}

interface AWSDynamoWatchSpaceData {
    /**
     * the keys of this map are all of the tjpAddrs that this
     * space is watching. If there are any updates, the latest
     * ibGib address will be the value, else it will be null.
     */
    updates?: { [tjpAddr: string]: IbGibAddr|null };
}
interface AWSDynamoWatchSpaceRel8ns extends IbGibRel8ns_V1 { }
/**
 * IbGib for keeping track of watching tjp timeline for updates,
 * from the space end.
 */
interface AWSDynamoWatchSpaceIbGib
    extends IbGib_V1<AWSDynamoWatchSpaceData, AWSDynamoWatchSpaceRel8ns> { }

interface AWSDynamoWatchTjpData {
    /**
     * Tjp addr that this watch is watching.
     *
     * ## notes
     *
     * This is also in the ib itself, but I'm adding it here to be explicit
     * (and because I'm probably too lazy to extract it from the ib atm)
     */
    tjpAddr: IbGibAddr;
    /**
     * List of spaceIds watching this tjp's timeline for updates.
     */
    spaceIdsWatching: string[];
}
interface AWSDynamoWatchTjpRel8ns extends IbGibRel8ns_V1 { }
/**
 * IbGib for keeping track of watching tjp timeline for updates,
 * from the tjp end.
 */
interface AWSDynamoWatchTjpIbGib
    extends IbGib_V1<AWSDynamoWatchTjpData, AWSDynamoWatchTjpRel8ns> { }

// #endregion

/**
 * "Quick" and dirty class for persisting ibgibs to the cloud with AWS DynamoDB.
 *
 * ## notes on creating dynamoDB table
 *
 * * Currently, the primary key must be 'ibGibAddrHash'.
 *   * A global secondary index must be created.
 *   * currently the name is stored in c.AWS_DYNAMODB_REGEXP_TABLE_OR_INDEX (atow = tjp-n-index)
 *
 *
 * ## naive first implementation
 *
 * I'm writing here some points on the assumptions of this V1 extremely naive
 * implementation.
 *
 * ### put-merge sync - always auto merge
 *
 * We are doing a put-merge sync, where we always merge automatically. This is
 * not a bad idea for us in ibgib, because we should be structuring the ibgib
 * themselves as single units that individual entities will be working on
 * independently. So "locking" a resource (in the future will implement locking)
 * should cause minimal resistance because granularity is appropriate. Contrast
 * this nowadays to people (before git) trying to lock entire VCS repos, which
 * obviously is worked on without this granularity and locking doesn't make
 * sense.
 *
 * ### stones always stored
 *
 * I've toyed with the idea that only the ibgibs with tjps ("living" ibgibs) should
 * be stored and that "stones" (ibgibs without tjps) should have to be
 * rel8d to a living ibgib. But that would require more in-depth analysis of
 * inter-dependencies of living ibgibs across time.
 *
 * ## thanks
 *
 * * thank you for the exponential backoff
 *   * https://advancedweb.hu/how-to-use-dynamodb-batch-write-with-retrying-and-exponential-backoff/
 *   * https://advancedweb.hu/how-to-implement-an-exponential-backoff-retry-strategy-in-javascript/
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

    /**
     * Cache of addresses that we have confirmed already that do
     * indeed exist in S3.
     *
     * Used in {@link `existsInS3`}
     */
    private cache_existsInS3: IbGibAddr[] = [];

    constructor(
        initialData: TData,
        initialRel8ns: TRel8ns,
    ) {
        super(initialData, initialRel8ns);
        const lc = `${this.lc}[ctor]`;

        this.ib = `witness space ${AWSDynamoSpace_V1.name}`;
        this.gib = GIB;
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
    static async createFromDto<
            TData extends SyncSpaceData_AWSDynamoDB = SyncSpaceData_AWSDynamoDB,
            TRel8ns extends SyncSpaceRel8ns_AWSDynamoDB = SyncSpaceRel8ns_AWSDynamoDB
        >(dto: IbGib_V1<TData, TRel8ns>): Promise<AWSDynamoSpace_V1<TData, TRel8ns>> {
        const space = new AWSDynamoSpace_V1<TData, TRel8ns>(null, null);
        await space.loadIbGibDto(dto);
        return space;
    }

    protected async validateWitnessArg(arg: AWSDynamoSpaceOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        let errors: string[] = [];
        try {
            errors = (await super.validateWitnessArg(arg)) || [];

            if (!this.data) { throw new Error(`this.data falsy.`); }
            if (!this.data!.tableName) { throw new Error(`tableName not set`); }
            if (!this.data!.bucketName) { throw new Error(`bucketName not set`); }
            if (!this.data!.secretAccessKey) { throw new Error(`this.data!.secretAccessKey falsy`); }
            if (!this.data!.accessKeyId) { throw new Error(`this.data!.accessKeyid falsy`); }

            if (arg.data!.cmd === 'put' && (arg.ibGibs?.length === 0)) {
                errors.push(`when "put" cmd is called, ibGibs required.`);
            }

            if (
                arg.data.cmd === 'get' &&
                !arg.data.cmdModifiers?.includes('latest') &&
                !arg.data.binExt && !arg.data?.binHash &&
                ((arg.data.ibGibAddrs ?? []).length === 0)
            ) {
                errors.push(`when "get" cmd is called, either ibGibAddrs or binExt+binHash required.`);
            }

            if (arg.data.cmd === 'delete') {
                if ((arg.data.ibGibAddrs ?? []).length === 0) {
                    errors.push(`when "delete" cmd is called, one ibGibAddr is required. Zero have been provided.`);
                } else if (arg.data.ibGibAddrs.length > 1) {
                    errors.push(`when "delete" cmd is called, only one ibGibAddr is required. ${arg.data.ibGibAddrs.length} have been provided.`);
                }
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
            if (!this.data) {
                if (logalot) { console.log(`${lc} initializing data with DEFAULT_AWS_DYNAMO_SPACE_DATA_V1`); }
                this.data = h.clone(DEFAULT_AWS_DYNAMO_SPACE_DATA_V1);
                this.data.uuid = await h.getUUID();
            }

            if (!this.data.longPollingIntervalMs && this.data.longPollingIntervalMs !== 0) {
                this.data.longPollingIntervalMs = c.DEFAULT_LOCAL_SPACE_POLLING_INTERVAL_MS;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        }
    }

    protected async routeAndDoCommand<TCmdModifier extends SyncSpaceOptionsCmdModifier = SyncSpaceOptionsCmdModifier>({
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
                    if (logalot) { console.log(`${lc} cmd is put and modifier includes sync. Routing to putSync function. (I: 2dc358c88a1746329b379d4e8ba7e09e)`); }
                    let resPutSync = await this.putSync(arg);
                    return resPutSync;
                } else {
                    return super.routeAndDoCommand({cmd, cmdModifiers, arg});
                }

            default:
                return super.routeAndDoCommand({cmd, cmdModifiers, arg});
        }
    }

    /**
     * ## dev notes
     *
     * OOOOOOk, this is how watch will work. When you put the watch, there
     * are two ends that we have to create:
     *
     * 1. From the space end.
     * 2. From the tjpAddr end.
     *
     * From the space end, we want to know, given a space, what are our watch
     * updates. From the tjpAddr end, we want to know, given a tjpAddr that is
     * updated, what are the spaces that are watching this.
     *
     * So given the space (and in particular spaceId which is space.data.uuid),
     * we will construct a deterministic `ib` of something like `watch space
     * ${spaceId}` and pair this up with a no-metadata `gib` of `"gib"` (or the
     * constant `GIB` in code). So the total address will be `watch space
     * ${spaceId}^gib`. This watch space has a record of all tjpAddrs that it is
     * watching, and any updates to that tjpAddr.
     *
     * When a tjpAddr is updated, you don't yet know which spaces are watching,
     * regardless of what space is doing the updating.  So given a tjpAddr, we
     * will construct a deterministic `ib` of something like `watch tjp
     * ${tjpGib} ${tjpAddrHash}` which has a record of all interested spaces.
     * It then triggers the update for the space + tjpAddr combination, which in
     * the first naive, optimistic, non-locking implementation, will just access
     * the `watch space ${spaceId}` ibgib to point to the updated address (the
     * addr hash helps avoid collisions further than just tjpGib collisions).
     *
     * This will have race conditions, even if there are atomic read/writes, but
     * I believe the worst that will happen is that a most-recent update is
     * replaced by a different, slightly less recent update. In the future, this
     * should be remedied, but most likely an outer sync space not built on
     * dynamodb + s3 is a better allocation of resources.
     *
     */
    private async putSync_AddWatches({
        arg,
        srcSpaceId,
    }: {
        arg: AWSDynamoSpaceOptionsIbGib,
        srcSpaceId: string,
    }): Promise<void> {
        const lc = `${this.lc}[${this.putSync_AddWatches.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            // #region validate, initialize some variables, returns if fails

            if (!arg.syncSagaInfo) {
                console.warn(`${lc} arg.syncSagaInfo required to watch. (W: 0e3641020d96479eb6a8a29dfff8e994)`);
                return; /* <<<< returns early */
            }
            if (!srcSpaceId) {
                console.warn(`${lc} srcSpaceId required to watch. (W: ee815a021f2c48b0a3764809d69e942a)`);
                return; /* <<<< returns early */
            }

            const {syncAddrs_All_AreTjps} = arg.syncSagaInfo;

            if ((syncAddrs_All_AreTjps ?? []).length === 0) {
                if (logalot) { console.log(`${lc} no tjp timelines to watch. (I: 36b0d293025a47a980bde66672ff23e2)`); }
                return; /* <<<< returns early */
            }

            const client = createDynamoDBClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            // #endregion validate, initialize some variables, returns if fails

            /** watch ibgib that tracks space -> tjpAddrs */
            let resGetWatch = await this.getSpaceWatchIbGibsOrNull({client, spaceIds: [srcSpaceId]});
            let spaceWatchIbGib: AWSDynamoWatchSpaceIbGib = resGetWatch?.length > 0 ?
                resGetWatch[0] :
                null;

            /**
             * List that we need to add. If we're already watching all incoming
             * tjpAddrs, then we don't need to add any and we don't need to
             * save anything new (and we can return at that point).
             */
            let tjpAddrsToAddToWatchList: IbGibAddr[] = [];
            // #region populate tjpAddrsToAddToWatchList (returns if no changes)

            if (spaceWatchIbGib) {
                // already exists. if we have no new tjps, then we're already
                // done so go ahead and check for this
                if (logalot) { console.log(`${lc} spaceWatchIbGib ALREADY exists.`); }
                let existingTjpAddrsWatched = Object.keys(spaceWatchIbGib.data.updates);
                if (logalot) { console.log(`${lc} existingTjpAddrsWatched.length: ${existingTjpAddrsWatched.length}`); }
                for (let i = 0; i < syncAddrs_All_AreTjps.length; i++) {
                    const tjpAddr = syncAddrs_All_AreTjps[i];
                    if (!existingTjpAddrsWatched.includes(tjpAddr) &&
                        !tjpAddrsToAddToWatchList.includes(tjpAddr)) {
                        tjpAddrsToAddToWatchList.push(tjpAddr);
                    }
                }

                if (tjpAddrsToAddToWatchList.length === 0) {
                    // watch space already exists and no new addresses to watch
                    if (logalot) { console.log(`${lc} space watch already exists and no tjp addrs to add, so returning.`); }
                    return; /* <<<< returns early */
                } else {
                    if (logalot) { console.log(`${lc} adding watches...tjpAddrsToAddToWatchList.length ${tjpAddrsToAddToWatchList.length}`); }
                }
            } else {
                // doesn't exist, so create it
                if (logalot) { console.log(`${lc} spaceWatchIbGib does NOT exist, so create it.`); }
                const spaceWatchAddr = await this.getWatchAddr({spaceId: srcSpaceId});
                const {ib,gib} = h.getIbAndGib({ibGibAddr: spaceWatchAddr});
                const updates: { [tjpAddr: string]: IbGibAddr|null } = {};
                syncAddrs_All_AreTjps.forEach(tjpAddr => { updates[tjpAddr] = null; });
                spaceWatchIbGib = <AWSDynamoWatchSpaceIbGib>{
                    ib, gib,
                    data: { updates },
                    rel8ns: { ancestor: [`watch space^gib`] }
                };
                syncAddrs_All_AreTjps.forEach(x => {
                    if (!tjpAddrsToAddToWatchList.includes(x)) {
                        tjpAddrsToAddToWatchList.push(x);
                    } else {
                        console.warn(`${lc} syncAddrs_All_AreTjps contains duplicates. When initializing sync, duplicates should be pruned. (W: d882b1e725614446a05397409d35c4ae)`);
                    }
                });
                if (tjpAddrsToAddToWatchList.length === 0) {
                    console.warn(`${lc} space watch didnt exist, but no new tjp watches to create? (W: 17cea02120704fadac32ffa048bf8a08)`);
                } else {
                    if (logalot) { console.log(`${lc} created new space watch, and now adding watches...tjpAddrsToAddToWatchList.length ${tjpAddrsToAddToWatchList.length}`); }
                }
            }

            // #endregion populate tjpAddrsToAddToWatchList (returns if no changes)

            // add references to the tjpAddrs to the spaceWatch ibGib
            tjpAddrsToAddToWatchList.forEach(tjpAddr => {
                spaceWatchIbGib.data.updates[tjpAddr] = null;
            });

            // If we've gotten here, then we have a watchIbGib_Space and
            // possibly some tjpAddrs to add. We need to get/create a watch
            // ibGib for each tjp, and add the incoming space to its list of
            // watching spaces if it's not already related.
            const watchIbGibs_Tjp_ToPut = await this.getWatchIbGibs_Tjp_ToPut({
                client,
                srcSpaceId,
                tjpAddrsToAddToWatchList,
            });

            /** IbGibs to put, guaranteed to be at least one (the space watch) */
            const allWatches_ToPut: IbGib_V1[] =
                [ spaceWatchIbGib, ...watchIbGibs_Tjp_ToPut ];

            const errors: string[] = [];
            const warnings: string[] = [];
            await this.putIbGibs({client, ibGibs: allWatches_ToPut, errors, warnings});
            if ((warnings?.length ?? 0) > 0) { console.warn(`${lc} warnings: ${warnings.join('\n')} (W: a3a1de795f5d47428259ec5267e2633f)`); }
            if ((errors?.length ?? 0) > 0) { throw new Error(`Error(s) saving watches. Errors: ${errors.join('\n')} (E: 4554560203c8416f84c34f13501a7ec8)`); }

        } catch (error) {
            // does not rethrow atm, because this is not "mission critical"
            // (but I sure want to know if something is happening here...)
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async getWatchAddr({
        spaceId,
        tjpAddr,
    }: {
        spaceId?: string,
        tjpAddr?: IbGibAddr,
    }): Promise<IbGibAddr> {
        const lc = `${this.lc}[${this.getWatchAddr.name}]`;
        try {
            let ib: Ib;
            if (spaceId) {
                ib = `watch space ${spaceId}`;
            } else if (tjpAddr) {
                const tjpGib = h.getIbAndGib({ibGibAddr: tjpAddr}).gib;
                /**
                 * In the extremely rare occurrence of a tjpGib collision, this
                 * would ensure that the tjp's ib (metadata) is equal as well.
                 * (but we can't just have the address, because it has an
                 * ibGibAddr delimiter). If both the ib and gib are "colliding",
                 * probably something rotten in Denmark.
                 */
                const tjpAddrHash = await h.hash({s: tjpAddr, algorithm: 'SHA-256'});
                ib = `watch tjp ${tjpGib} ${tjpAddrHash}`;
            } else {
                throw new Error(`Either spaceId or tjpAddr is required. (E: fb258615d27b41209d5caefaaacd6010)`);
            }
            return h.getIbGibAddr({ib, gib: GIB});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Tries (best effort) to get the watch for the space.
     *
     * Does not throw.
     *
     * @returns watch ibgib if found, or null if not found or error
     */
    private async getSpaceWatchIbGibsOrNull({
        client,
        spaceIds,
    }: {
        client: DynamoDBClient,
        spaceIds: string[],
    }): Promise<AWSDynamoWatchSpaceIbGib[] | null> {
        const lc = `${this.lc}[${this.getSpaceWatchIbGibsOrNull.name}]`;
        try {
            if (spaceIds.length === 0) {
                console.warn(`${lc} (UNEXPECTED) incoming spaceIds empty. (W: 9e0f122311d74200a3697891f96a4b6f)`);
            }
            const warnings: string[] = [];
            const errors: string[] = [];
            const spaceWatchAddrs: IbGibAddr[] = [];
            for (let i = 0; i < spaceIds.length; i++) {
                const spaceId = spaceIds[i];
                const spaceWatchAddr = await this.getWatchAddr({ spaceId });
                spaceWatchAddrs.push(spaceWatchAddr);
            }
            const spaceWatchIbGibs = await this.getIbGibs({
                client,
                ibGibAddrs: spaceWatchAddrs,
                warnings, errors,
                addrsNotFound: [],
            });
            if ((warnings?.length ?? 0) > 0) { console.warn(`${lc} warnings: ${warnings.join('\n')} (W: f83ff79a548f499b955ecdc17e2206e4)`); }
            if ((errors?.length ?? 0) > 0) { console.error(`${lc} errors: ${errors.join('\n')} (E: 3dfd4d762105416494f9b18c7f83b36e)`); }
            return (spaceWatchIbGibs ?? []).length > 0 ?
                <AWSDynamoWatchSpaceIbGib[]>spaceWatchIbGibs :
                null;
        } catch (error) {
            // not overly concerned with errors here I don't _think_...  because
            // we will be overwriting whatever we get anyway.  but I will leave
            // this as error and not info log atm.  definitely not rethrowing
            console.error(`${lc} ${error.message}`);
            return null;
        }
    }

    /**
     * Tries (best effort) to get incoming watch addrs if they exist.
     *
     * Does not throw.
     *
     * @returns found ibgibs if any found, or null if none found or error
     */
    private async getTjpWatchIbGibsOrNull({
        client,
        tjpAddrs,
        watchAddrs_Tjp,
    }: {
        client: DynamoDBClient,
        tjpAddrs?: IbGibAddr[],
        watchAddrs_Tjp?: IbGibAddr[],
    }): Promise<AWSDynamoWatchTjpIbGib[] | null> {
        const lc = `${this.lc}[${this.getTjpWatchIbGibsOrNull.name}]`;
        try {
            if (!tjpAddrs && !watchAddrs_Tjp) { throw new Error(`either tjpAddrs or watchAddrs_Tjp required. (E: 1fbba5a36c274a598a1e9fb11720db99)`); }

            if (!watchAddrs_Tjp) {
                // build the watch addrs from tjpAddrs
                watchAddrs_Tjp = [];
                for (let i = 0; i < tjpAddrs.length; i++) {
                    const tjpAddr = tjpAddrs[i];
                    const watchAddr_Tjp = await this.getWatchAddr({tjpAddr});
                    watchAddrs_Tjp.push(watchAddr_Tjp);
                }
            }
            const warnings: string[] = [];
            const errors: string[] = [];
            const resGetWatchIbGibs_Tjp = <AWSDynamoWatchTjpIbGib[]>(await this.getIbGibs({
                client,
                ibGibAddrs: watchAddrs_Tjp,
                warnings, errors,
                addrsNotFound: [], // not interested in ones not found
            }));
            if ((warnings?.length ?? 0) > 0) { console.warn(`${lc} warnings: ${warnings.join('\n')} (W: f83ff79a548f499b955ecdc17e2206e4)`); }
            if ((errors?.length ?? 0) > 0) { console.error(`${lc} errors: ${errors.join('\n')} (E: 3dfd4d762105416494f9b18c7f83b36e)`); }
            return resGetWatchIbGibs_Tjp.length > 0 ? resGetWatchIbGibs_Tjp : null;
        } catch (error) {
            // not overly concerned with errors here I don't _think_...  because
            // we will be overwriting whatever we get anyway.  but I will leave
            // this as error and not info log atm.  definitely not rethrowing
            console.error(`${lc} ${error.message}`);
            return null;
        }
    }

    /**
     * we want to have a watch for each tjpAddr. we're going to get any
     * existing ones, as well as create new ones - ensuring that all of
     * them are related to the given spaceId.
     *
     * @returns new watch ibgibs to insert and existing ibgibs to update/overwrite.
     */
    private async getWatchIbGibs_Tjp_ToPut({
        client,
        srcSpaceId,
        tjpAddrsToAddToWatchList,
    }: {
        client: DynamoDBClient,
        srcSpaceId: string,
        tjpAddrsToAddToWatchList: IbGibAddr[],
    }): Promise<AWSDynamoWatchTjpIbGib[]> {
        const lc = `${this.lc}[${this.getWatchIbGibs_Tjp_ToPut.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            /** Existing watches, possibly already related to spaceId */
            let tjpWatchIbGibs_ThatAlreadyExist: AWSDynamoWatchTjpIbGib[];
            /** YES overwrite these, because newly adding spaceId */
            let tjpWatchIbGibs_ThatAlreadyExist_NotYetRelatedToIncomingSpace: AWSDynamoWatchTjpIbGib[] = [];
            /** DO NOT re-put/save these, because already related to spaceId. */
            let tjpWatchIbGibs_ThatAlreadyExist_AlreadyRelatedToIncomingSpace: AWSDynamoWatchTjpIbGib[] = [];

            // #region get any/all watch tjp ibgibs

            const lc_getTjpWatchIbGibs = `${lc}[getTjpWatchIbGibs]`;
            try {
                const warnings: string[] = [];
                const errors: string[] = [];

                if (logalot) { console.log(`${lc} populating tjpWatchAddrs...`)}
                const tjpWatchAddrs: IbGibAddr[] = [];
                for (let i = 0; i < tjpAddrsToAddToWatchList.length; i++) {
                    const tjpAddr = tjpAddrsToAddToWatchList[i];
                    const tjpWatchAddr = await this.getWatchAddr({tjpAddr});
                    if (!tjpWatchAddrs.includes(tjpWatchAddr)) {
                        tjpWatchAddrs.push(tjpWatchAddr);
                    }
                }
                if (logalot) { console.log(`${lc} tjpWatchAddrs: ${tjpWatchAddrs}.`)}
                tjpWatchIbGibs_ThatAlreadyExist =
                    <AWSDynamoWatchTjpIbGib[]>(await this.getIbGibs({
                        client,
                        ibGibAddrs: tjpWatchAddrs,
                        warnings, errors,
                        addrsNotFound: [],
                    }));
                if (logalot) { console.log(`${lc} tjpWatchIbGibs_ThatAlreadyExist: ${h.pretty(tjpWatchIbGibs_ThatAlreadyExist)}`); }
                if ((warnings?.length ?? 0) > 0) { console.warn(`${lc} warnings: ${warnings.join('\n')} (W: f83ff79a548f499b955ecdc17e2206e4)`); }
                if ((errors?.length ?? 0) > 0) { console.error(`${lc} errors: ${errors.join('\n')} (E: 3dfd4d762105416494f9b18c7f83b36e)`); }
            } catch (error) {
                const hmmMsg = `hmm, if it's throwing because it doesnt exist,
                then we don't care. If it's throwing for some other reason, and
                one DOES already exist, then we don't want to just overwrite it
                because then existing watch references would be lost. (The space
                watch would still have a reference though). Perhaps this is
                self-healing though, since we're about to add the space if the
                reference doesnt exist.`.replace(/\n/g, ' ').replace(/  /g, '');
                console.error(`${lc_getTjpWatchIbGibs} ${error.message} (${hmmMsg})`);
                tjpWatchIbGibs_ThatAlreadyExist = [];
            }

            // #endregion get any/all watch tjp ibgibs

            // relate space to each, tracking ones we have to actually change.
            tjpWatchIbGibs_ThatAlreadyExist.forEach(tjpWatchIbGib => {
                // initialize just in case was cleared out previously
                if (!tjpWatchIbGib.data.spaceIdsWatching) {
                    if (logalot) { console.log(`${lc} initializing falsy tjpWatchIbGib.data.spaceIdsWatching (${h.getIbGibAddr({ibGib: tjpWatchIbGib})})`); }
                    tjpWatchIbGib.data.spaceIdsWatching = [];
                }

                if (tjpWatchIbGib.data.spaceIdsWatching.includes(srcSpaceId)) {
                    // do nothing more with these, b/c already related to space
                    if (logalot) { console.log(`${lc} existing tjpWatchIbGib already related to src space.`); }
                    tjpWatchIbGibs_ThatAlreadyExist_AlreadyRelatedToIncomingSpace.push(tjpWatchIbGib);
                } else {
                    // overwrite existing watch with this one
                    tjpWatchIbGibs_ThatAlreadyExist_NotYetRelatedToIncomingSpace.push(tjpWatchIbGib);
                    if (logalot) { console.log(`${lc} adding srcSpaceId (${srcSpaceId} to tjpWatchIbGib (${h.getIbGibAddr({ibGib: tjpWatchIbGib})}))`); }
                    tjpWatchIbGib.data.spaceIdsWatching.push(srcSpaceId);
                    if (logalot) { console.log(`${lc} modified tjpWatchIbGib: ${h.pretty(tjpWatchIbGib)}`); }
                }
            });

            /** We will create/save new watches for these */
            const tjpAddrsToAdd_ThatDontExistYet =
                tjpAddrsToAddToWatchList.filter(tjpAddr =>
                    !tjpWatchIbGibs_ThatAlreadyExist.some(x =>
                        tjpAddr === x.data.tjpAddr
                    )
                );
            const tjpWatchIbGibs_ThatDidntAlreadyExist: AWSDynamoWatchTjpIbGib[] = [];
            if (logalot) { console.log(`${lc} tjpAddrsToAdd_ThatDontExistYet: ${tjpAddrsToAdd_ThatDontExistYet.join('|')}`); }
            for (let i = 0; i < tjpAddrsToAdd_ThatDontExistYet.length; i++) {
                const tjpAddr = tjpAddrsToAdd_ThatDontExistYet[i];
                if (logalot) { console.log(`${lc} tjpAddr: ${tjpAddr}`); }
                const tjpWatchAddr = await this.getWatchAddr({tjpAddr});
                const {ib, gib} = h.getIbAndGib({ibGibAddr: tjpWatchAddr});
                const newTjpWatchIbgib = <AWSDynamoWatchTjpIbGib>{
                    ib, gib,
                    data: {
                        tjpAddr,
                        spaceIdsWatching: [srcSpaceId],
                    },
                    rel8ns: { ancestor: ['watch tjp^gib'] },
                };
                if (logalot) { console.log(`${lc} newTjpWatchIbgib: ${h.pretty(newTjpWatchIbgib)}`); }
                tjpWatchIbGibs_ThatDidntAlreadyExist.push(newTjpWatchIbgib);
            }

            // extremely inefficient but I'm trying to eliminate a duplication bug
            const watchIbGibs_Tjp_ToPut: AWSDynamoWatchTjpIbGib[] = [];
            tjpWatchIbGibs_ThatAlreadyExist_NotYetRelatedToIncomingSpace.forEach(x => {
                let xAddr = h.getIbGibAddr({ibGib: x});
                if (!watchIbGibs_Tjp_ToPut.some(y => xAddr === h.getIbGibAddr({ibGib: y}))) {
                    watchIbGibs_Tjp_ToPut.push(x);
                }
            });
            tjpWatchIbGibs_ThatDidntAlreadyExist.forEach(x => {
                let xAddr = h.getIbGibAddr({ibGib: x});
                if (!watchIbGibs_Tjp_ToPut.some(y => xAddr === h.getIbGibAddr({ibGib: y}))) {
                    watchIbGibs_Tjp_ToPut.push(x);
                }
            });

            return watchIbGibs_Tjp_ToPut;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData =
            { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsNotFound: string[] = [];
        let resIbGibs: IbGib_V1[];
        try {
            const client = createDynamoDBClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            if (arg.data!.ibGibAddrs?.length > 0) {
                resIbGibs = await this.getIbGibs({
                    client,
                    ibGibAddrs: arg.data.ibGibAddrs,
                    errors,
                    warnings,
                    addrsNotFound,
                });
            } else {
                throw new Error(`ibGibAddrs required. (E: 3acec57e5eef4c5482fcdca847061ef6)`);
            }
            if (addrsNotFound.length > 0) { resultData.addrsNotFound = addrsNotFound; }
            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
            }
        } catch (error) {
            const emsg = `${lc} error: ${error.message}`;
            console.error(emsg);
            errors.push(emsg)
            resultData.errors = errors;
            resultData.success = false;
        }
        try {
            const result = await this.resulty({resultData});
            if ((resIbGibs ?? []).length > 0) { result.ibGibs = resIbGibs; }
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}\nerrors: ${errors.join('\n')}.\nwarnings: ${warnings.join('\n')}`);
            throw error;
        }
    }

    protected async getLatestIbGibsImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getLatestIbGibsImpl.name}]`;
        try {
            const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
            const warnings: string[] = [];
            const errors: string[] = [];
            let latestIbGibs: IbGib_V1[];
            try {
                if (logalot) { console.log(`${lc} starting...`); }
                if ((arg.ibGibs ?? []).length === 0) { throw new Error(`ibGibs required. (E: 34d175b339bf4519a4da5e9b82e91ad6)`); }

                const client = createDynamoDBClient({
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
                if ((arg.ibGibs ?? []).length === 0) { throw new Error(`ibGibs required. (E: 34d175b339bf4519a4da5e9b82e91ad6)`); }

                const client = createDynamoDBClient({
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
         * @example 'BatchGetItem'
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
            const delayMs = this.data.throttleMsDueToThroughputError * (Math.pow(2, i+1));
            if (logalot || true) { console.log(`${lc} retry ${i+1} of ${maxRetries} due to throughput in ${delayMs} ms`); }
            await h.delay(delayMs);
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
        /** We're returning these. going to populate as we go. */
        const resIbGibs: IbGib_V1[] = [];
        errors = errors ?? [];
        try {
            // const maxRetries = this.data.maxRetryThroughputCount || c.DEFAULT_AWS_MAX_RETRY_THROUGHPUT;
            if (!addrsNotFound) { throw new Error(`addrsNotFound required. (E: c10485bf678a4166a3bb1a90a5a88419)`); }

            /** large ibgibs and all binaries are stored in s3. */
            const binaryAddrs: IbGibAddr[] = [];
            /** non-binary & non-large ibgibs are stored directly in dynamodb. */
            const nonBinaryAddrs: IbGibAddr[] = [];
            ibGibAddrs.forEach(addr => {
                if (isBinary({addr})) { binaryAddrs.push(addr); } else { nonBinaryAddrs.push(addr); }
            });

            // go ahead and get binary ibgibs that we know
            for (let i = 0; i < binaryAddrs.length; i++) {
                const binaryAddr = binaryAddrs[i];
                try {
                    // this is the shape of an error if it doesn't exist:
                    // [AWSDynamoSpace_V1][getIbGibFromS3] Get ibgib from S3 failed. Access Denied (E: 57088c83048e4874b80c0c269e24dcb9)
                    // not sure what to do with this atm.

                    const resBinaryIbGib = await this.getIbGibFromS3({addr: binaryAddr});
                    // always validate large binaries
                    const validationErrors = await validateIbGibIntrinsically({ibGib: resBinaryIbGib});
                    if ((validationErrors ?? []).length === 0) {
                        resIbGibs.push(resBinaryIbGib);
                    } else {
                        throw new Error(validationErrors.join('\n'));
                    }
                } catch (error) {
                    const emsg = `${lc} ${error?.message || 'error getting addr from S3: (E: a7df594a7f384923a66f1e0c42a72317)'}`;
                    console.error(emsg);
                    addrsNotFound.push(binaryAddr);
                    errors.push(emsg);
                }
            }

            let retryUnprocessedItemsCount = 0;
            const getIbGibs_NonBinary = async (unprocessedKeys?: KeysAndAttributes) => {

                let cmd = unprocessedKeys ?
                    await createDynamoDBBatchGetItemCommand({tableName: this.data.tableName, unprocessedKeys}) :
                    await createDynamoDBBatchGetItemCommand({tableName: this.data.tableName, addrs: nonBinaryAddrs});

                const resCmd = await this.sendCmd<BatchGetItemCommandOutput>({cmd, client, cmdLogLabel: 'BatchGetItem'});

                const responseKeys = Object.keys(resCmd.Responses[this.data.tableName]);
                for (let i = 0; i < responseKeys.length; i++) {
                    const key = responseKeys[i];
                    const getIbGibsResponseItem =
                        <AWSDynamoSpaceItem>resCmd.Responses[this.data.tableName][key];

                    if (getIbGibsResponseItem.inS3?.BOOL === true) {
                        // need to get it from s3
                        let addr = h.getIbGibAddr({ib: getIbGibsResponseItem.ib.S, gib: getIbGibsResponseItem.gib.S});
                        let resGetFromS3 = await this.getIbGibFromS3({addr});
                        resGetFromS3
                    } else {
                        const ibGib = getIbGibFromResponseItem({item: getIbGibsResponseItem});
                        // validate yo...
                        resIbGibs.push(ibGib);
                        // if (logalot) { console.log(`${lc} item: ${h.pretty(ibGib)}`); }
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
                        await getIbGibs_NonBinary(newUnprocessedKeys[this.data.tableName]); // recursive
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
                        await getIbGibs_NonBinary(newUnprocessedKeys[this.data.tableName]); // recursive
                    }
                }
            }

            // triggers first run, which has recursive calls
            if (nonBinaryAddrs.length > 0) { await getIbGibs_NonBinary(); }
            // at this point, all non-binary items are done.

            // populate which ones were not found.
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                if (!resIbGibs.some(x => h.getIbGibAddr({ibGib: x}) === addr)) {
                    addrsNotFound.push(addr);
                }
            }

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            errors.push(error.message);
        }

        return resIbGibs;
    }

    protected async getIbGibs({
        client,
        ibGibAddrs,
        /**
         * ignored ATOW
         */
        warnings,
        errors,
        addrsNotFound,
    }: {
        client: DynamoDBClient,
        ibGibAddrs: IbGibAddr[],
        warnings: string[],
        errors: string[],
        addrsNotFound: IbGibAddr[],
    }): Promise<IbGib_V1[]> {
        const lc = `${this.lc}[${this.getIbGibs.name}]`;
        let ibGibs: IbGib_V1[] = [];
        try {
            // let ibGibAddrs = (arg.data.ibGibAddrs || []).concat();
            if ((ibGibAddrs ?? []).length === 0) { throw new Error(`No ibGibAddrs provided. (E: 96042fcd9af74f2787af6e2e0bbce349)`); }

            // local copy that we will mutate
            let addrs = ibGibAddrs.concat();

            let runningCount = 0;
            let batchSize = this.data.getBatchSize || c.DEFAULT_AWS_GET_BATCH_SIZE;
            if (batchSize > c.DEFAULT_AWS_GET_BATCH_SIZE) {
                console.warn(`${lc} this.data.queryBatchSize exceeds allowed size of ${c.DEFAULT_AWS_GET_BATCH_SIZE}. setting to this max size. (W: 6e8789252f654c9397554e2a7f0d2fcc)`);
                batchSize = c.DEFAULT_AWS_GET_BATCH_SIZE;
            }
            if (batchSize < 1) {
                console.warn(`${lc} batchSize < 1. Setting to 1. (W: fbc52d4dfa3544f491a3dc276658fc2f)`);
                batchSize = 1;
            }
            const throttleMs = this.data.throttleMsBetweenGets || c.DEFAULT_AWS_GET_THROTTLE_MS;
            const rounds = Math.ceil(addrs.length / batchSize);
            for (let i = 0; i < rounds; i++) {
                if (logalot) { console.log(`${lc} i: ${i} of ${rounds} rounds (I: c107d13c8e956020959e36adce7c2c22)`); }
                if (i > 0) {
                    if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                    await h.delay(throttleMs);
                }
                let addrsToDoNextRound = addrs.splice(batchSize);
                const gotIbGibs =
                    await this.getIbGibsBatch({ibGibAddrs: addrs, client, errors, addrsNotFound});
                ibGibs = [...ibGibs, ...gotIbGibs];

                if (errors.length > 0) {
                    if (logalot) { console.log(`${lc} errors.length > 0, breaking... (I: cb90edde840c03f3687330bed4f82622)`); }
                    break;
                }

                runningCount = ibGibs.length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                addrs = addrsToDoNextRound;
            }

            if (logalot) { console.log(`${lc} total: ${runningCount}.`); }

            return ibGibs;
        } catch (error) {
            const emsg = `${lc} error: ${error.message}`;
            console.error(emsg);
            errors.push(emsg);
        }
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
     * ## notes
     *
     * * `addrsNotFound` is not supplied, because this is encapsulated by the result
     *   fields of each info. IOW, if info.resultIbGibs/Items is empty, then that query
     *   addr `was not found`.
     *
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
                    if (logalot) { console.log(`${lc} projectionExpression: ${projectionExpression} (I: 91e261857baffeb1a4c794b478cef522)`); }
                    const cmd = await createDynamoDBQueryNewerCommand({
                        tableName: this.data.tableName,
                        info,
                        projectionExpression,
                    });
                    const resCmd =
                        await this.sendCmd<QueryCommandOutput>({cmd, client, cmdLogLabel: 'Query'});
                    if (resCmd.Count > 0) {
                        info.resultItems = <AWSDynamoSpaceItem[]>resCmd.Items;
                        info.resultIbGibs = info.fullIbGibQuery ?
                            resCmd.Items.map((item: AWSDynamoSpaceItem) => getIbGibFromResponseItem({item})) :
                            undefined;
                    }
                } catch (error) {
                    const errorMsg = error.message || `${lc}(UNEXPECTED) some kind of error (E: 556157fa58b1404e9e72c3338a86efd5)`;
                    console.error(`${lc} ${errorMsg}`);
                    info.errorMsg = errorMsg;
                    errors.push(errorMsg);
                }
                resultInfos.push(info);
            });

            await Promise.all(queryPromises);

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
            let {mapWithTjp_YesDna, mapWithTjp_NoDna, mapWithoutTjps} = splitPerTjpAndOrDna({ibGibs});
            const mapIbGibsWithTjp = { ...mapWithTjp_YesDna, ...mapWithTjp_NoDna };
            const ibGibsWithTjp = Object.values(mapIbGibsWithTjp);
            const ibGibsWithoutTjp = Object.values(mapWithoutTjps);

            if (ibGibsWithTjp.length === 0) {
                const warning = `${lc} ibGibsWithTjp.length is zero, meaning
                there aren't any ibgibs that we need to check for latest. No
                tjps + data.n values (no timelines). This may be expected.
                (W: a2f7604814954946a58da11eb9648d7e)`;
                console.warn(warning);
                warnings.push(warning);
                return ibGibs; // <<<< returns early
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
                const gotInfos = await this.getNewerIbGibInfosBatch({infos, client, errors});

                // turn infos into recent ibGibs...
                let gotIbGibs: IbGib_V1[] = [];
                for (let j = 0; j < gotInfos.length; j++) {
                    const info = gotInfos[j];
                    // errored, so return null
                    if (info.errorMsg) {
                        errors.push(info.errorMsg);
                    } else {
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
     * The map is composed with the incoming ibGib addr as the key and the latest
     * address or `undefined` as the value.
     *
     * @returns a map of incoming ibGib addr's -> latest addr | `null`
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
        const resLatestMap: { [addr: string]: IbGibAddr | null } = {};
        try {
            // argibGibs guaranteed at this point to be non-null and > 0

            // for tjps, we check starting at the tjp in the store and get
            // all newer ones (because querying in DynamoDB for this is hard).
            // we then pick the one with highest 'n'.

            // for non-tjps, we will be checking for existence
            // (because no timeline === no "latest" beyond itself)

            // prepare our collections
            let {mapWithTjp_YesDna, mapWithTjp_NoDna, mapWithoutTjps} = splitPerTjpAndOrDna({ibGibs});
            const mapIbGibsWithTjp = { ...mapWithTjp_YesDna, ...mapWithTjp_NoDna };
            const ibGibsWithTjp = Object.values(mapIbGibsWithTjp);
            const ibGibsWithoutTjp = Object.values(mapWithoutTjps);

            const ibGibsWithTjpGroupedByTjpAddr = groupBy({
                items: ibGibsWithTjp,
                keyFn: x => x.data.isTjp ? h.getIbGibAddr({ibGib: x}) : x.rel8ns.tjp[0]
            });
            const tjpIbGibs = ibGibsWithTjp.filter(x => x.data.isTjp); // ASSUMES ONLY ONE TJP ATOW!

            // Do the tjp part, this mutates resLatestMap
            if (tjpIbGibs?.length > 0) {
                if (logalot) { console.log(`${lc} checking latest addr for ibgibs with tjps (timelines)... (I: e92e6a0c05fce1849f005f0ceaf4c122)`); }
                await this.getLatestIbGibAddrsInStore_Tjp({
                    client, warnings, errors,
                    tjpIbGibs, ibGibsWithTjpGroupedByTjpAddr, resLatestMap
                });

                if (logalot) { console.log(`${lc} check complete. resLatestMap: ${h.pretty(resLatestMap)} (I: 2121f39c2af647989e1d54dcf500e6f0)`); }

                // at this point, resLatestMap should have mappings for all incoming
                // ibgibs with tjps, including any tjps proper (n=0).
                if (Object.keys(resLatestMap).length !== ibGibsWithTjp.length) {
                    console.warn(`${lc}(UNEXPECTED) resLatestMap size is not equal to size of tjp ibgibs(?) (W: 9e07d44c527f49b48fb9320422a70481)`);
                }
            }

            // Do the non-tjp part, this mutates resLatestMap
            if (ibGibsWithoutTjp.length > 0) {
                if (logalot) { console.log(`${lc} now doing non-tjp ibgibs (check if e.g. a fork transform exists in store)... (I: 1228a5a70063e33d14b3f69e3d5eab22)`); }
                await this.getLatestIbGibAddrsInStore_NonTjp({
                    client, warnings, errors,
                    ibGibsWithoutTjp, resLatestMap
                });
                if (logalot) { console.log(`${lc} non-tjp ibgibs complete. (I: 853dda4633adce528c4afdef26963b22)`); }
            }

            // at this point, our resLatestMap should be completely filled for
            // all incoming ibGibs.
            if (Object.keys(resLatestMap).length !== ibGibs.length) {
                console.warn(`${lc}(UNEXPECTED) resLatestMap size is not equal to size of tjp ibgibs(?) (W: 9e07d44c527f49b48fb9320422a70481)`);
            }

            return resLatestMap;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            errors.push(error.message);
        }
    }

    protected async getLatestIbGibAddrsInStore_Tjp({
        client,
        warnings,
        errors,
        tjpIbGibs,
        ibGibsWithTjpGroupedByTjpAddr,
        resLatestMap,
    }: {
        client: DynamoDBClient,
        /**
         * running list of warnings.
         */
        warnings: string[],
        /**
         * running list of errors.
         */
        errors: string[],
        tjpIbGibs: IbGib_V1[],
        ibGibsWithTjpGroupedByTjpAddr: { [key: string]: IbGib_V1[] }
        /**
         * Ongoing map that will be populated by this call.
         */
        resLatestMap: { [addr: string]: IbGibAddr | null },
    }): Promise<void> {
        const lc = `${this.lc}[${this.getLatestIbGibAddrsInStore_Tjp.name}]`;
        errors = errors ?? [];
        warnings = warnings ?? [];
        try {
            // for the tjpIbGibs we need to do a newer query, returning just the
            // addresses and `n` values.
            let tjpLatestInfosMap = await this.getTimelinesInfosPerTjpInStore({
                client,
                tjpIbGibs,
                errors,
                warnings
            });
            // this is a map of tjp addr => GetNewerQueryInfo. Each query info
            // has resultItems?: AWSDynamoSpaceItem[] that are only populated
            // with ib, gib, n, tjp (address)
            const tjpAddrs = Object.keys(tjpLatestInfosMap);
            for (let i = 0; i < tjpAddrs.length; i++) {
                const tjpAddr = tjpAddrs[i];
                const infos = tjpLatestInfosMap[tjpAddr];
                let resultItems = infos.resultItems ?? [];
                let latestAddr: IbGibAddr | null = null;
                let highestN = -1; // tjp n === 0
                for (let j = 0; j < resultItems.length; j++) {
                    const resultItem = resultItems[j];
                    if (resultItem.n?.N !== undefined) {
                        let resultItemN = Number.parseInt(resultItem.n!.N);
                        if (resultItemN > highestN) {
                            const ib = JSON.parse(resultItem.ib.S);
                            const gib = JSON.parse(resultItem.gib.S);
                            latestAddr = h.getIbGibAddr({ib, gib});
                            if (logalot) { console.log(`${lc} n: ${resultItemN}. latestAddr: ${latestAddr}`); }
                        } else {
                            if (logalot) { console.log(`${lc} n: ${resultItemN} not higher than ${highestN}.`); }
                        }
                    } else {
                        console.warn(`${lc} only expected resultItem.n >= 0. `)
                    }
                }

                // resLatestMap is not grouped by tjp, so set update the resLatestMap
                // for each corresponding addr in the timeline
                const argIbGibsWithThisTjp = ibGibsWithTjpGroupedByTjpAddr[tjpAddr];
                argIbGibsWithThisTjp.forEach((ibGib) => {
                    resLatestMap[h.getIbGibAddr({ibGib})] = latestAddr;
                });
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            errors.push(error.message);
        }
    }

    protected async getLatestIbGibAddrsInStore_NonTjp({
        client,
        warnings,
        errors,
        ibGibsWithoutTjp,
        resLatestMap,
    }: {
        client: DynamoDBClient,
        warnings: string[],
        errors: string[],
        ibGibsWithoutTjp: IbGib_V1[],
        resLatestMap: { [addr: string]: IbGibAddr | null },
    }): Promise<void> {
        const lc = `${this.lc}[${this.getLatestIbGibAddrsInStore_NonTjp.name}]`;
        warnings = warnings ?? [];
        errors = errors ?? [];
        try {
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
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            errors.push(error.message);
        }
    }

    /**
     * builds a map of addr: boolean for existence in store.
     *
     * does not throw. populates `errors` & `warnings` if any.
     *
     * @returns map of addr: boolean for existence in store
     */
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
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!errors) { throw new Error(`errors array (empty or not) required (E: 409b726324a80f9d7889671e18e23322)`); }
            if (!warnings) { throw new Error(`warnings array (empty or not) required (E: ef33f0734f80405bb9dead37ef6fa0f1)`); }

            let addrs = ibGibAddrs.concat();
            let resExists_Aggregate: {[addr: string]: boolean} = {};

            let runningCount = 0;
            let batchSize = this.data.getBatchSize || c.DEFAULT_AWS_GET_BATCH_SIZE;
            if (batchSize > c.DEFAULT_AWS_GET_BATCH_SIZE) {
                console.warn(`${lc} this.data.getBatchSize exceeds allowed size of ${c.DEFAULT_AWS_GET_BATCH_SIZE}. setting to this max size. (W: 2c80e69d2ba7448f9427c6009d42a06c)`);
                batchSize = c.DEFAULT_AWS_GET_BATCH_SIZE;
            }
            if (batchSize < 1) {
                console.warn(`${lc} batchSize < 1. Setting to 1. (W: fbc52d4dfa3544f491a3dc276658fc2f)`);
                batchSize = 1;
            }
            const throttleMs = this.data.throttleMsBetweenGets || c.DEFAULT_AWS_GET_THROTTLE_MS;
            const rounds = Math.ceil(addrs.length / batchSize);
            for (let i = 0; i < rounds; i++) {
                // throttle between calls slightly
                if (i > 0) {
                    if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                    await h.delay(throttleMs * (Math.pow(2, i+2)));
                }
                // prepare batch call
                let addrsToDoNextRound = addrs.splice(batchSize);
                const errors_Batch: string[] = [];
                const warnings_Batch: string[] = [];

                // execute batch call
                let resExists_Batch = await this.existsInStoreBatch({
                    client,
                    ibGibAddrs: addrs,
                    errors: errors_Batch,
                    warnings: warnings_Batch,
                });

                // update our aggregate result map
                resExists_Aggregate = { ...resExists_Aggregate, ...resExists_Batch };

                // update our aggregate incoming errors/warnings
                errors_Batch.forEach(x => errors.push(x));
                warnings_Batch.forEach(x => warnings.push(x));

                if (errors.length > 0) {
                    if (logalot) { console.log(`${lc} errors.length > 0, breaking... (I: cb90edde840c03f3687330bed4f82622)`); }
                    break;
                }

                runningCount = Object.keys(resExists_Aggregate).length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                addrs = addrsToDoNextRound;
            }

            if (logalot) { console.log(`${lc} total: ${runningCount}.`); }

            return resExists_Aggregate;
        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.error(emsg);
            if (errors) { errors.push(emsg); }
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async existsInStoreBatch({
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
        const lc = `${this.lc}[${this.existsInStoreBatch.name}]`;
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
                            console.warn(`${lc} duplicate addr returned in query response. (W: 6eaecd5dd4514cfd98856a2eaa5eff11)`);
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
     * @returns map of tjpAddr => query info (which has resultItems with ib, gib, n, tjp)
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
            if ((tjpIbGibs ?? []).length === 0) { throw new Error(`tjpIbGibs required. (E: 20f9118c0e9c492884bf7fcfcf335c4d)`); }
            if (tjpIbGibs.some(x => !x.data.isTjp)) { throw new Error(`all tjpIbGibs must be tjps. (data.isTjp truthy). (E: 37352d01f431423189474cf7a30cc1bf)`); }

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
            let batchSize = this.data.queryBatchSize || c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE;
            if (batchSize > c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE) {
                console.warn(`${lc} this.data.queryBatchSize exceeds allowed size of ${c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE}. setting to this max size. (W: a7015e45d61f4d5aa0a10712fecd596c)`)
                batchSize = c.DEFAULT_AWS_QUERY_LATEST_BATCH_SIZE;
            }
            const throttleMs = this.data.throttleMsBetweenGets || c.DEFAULT_AWS_GET_THROTTLE_MS;
            const rounds = Math.ceil(infos.length / batchSize);
            for (let i = 0; i < rounds; i++) {
                if (i > 0) {
                    if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                    await h.delay(throttleMs);
                }
                const infosTodoNextRound = infos.splice(batchSize);
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
                        (W: 8fd675b2309648a4ab66464f7bdcdd32)`);
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
                keyFn: x => (x.data?.n ?? -1).toString(),
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
                    throw new Error(`expected if anything to have the current ibGib with nLeast or an empty result set, since this is only supposed to be gt or eq to nLeast. (E: b3270a724f854c3eb4aa4bcd707435e5)`);
                }
            }

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
                } else {
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
            if ((ibGibs ?? []).length === 0) { throw new Error(`ibGibs required. (E: 6e59b245ac984dd4af3ff2f576d5f9f9)`); }
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
        const lc = `${this.lc}[${this.putImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        try {
            const client = createDynamoDBClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            if (arg.ibGibs?.length > 0) {
                throwIfDuplicates({ibGibs: arg.ibGibs});
                return await this.putIbGibsImpl({arg, client}); // <<<< returns early
            } else {
                throw new Error(`ibGibs required. (E: 235902107ad64c6fa2232041b234b546)`);
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.success = false;
        }
        // only executes if there is an error.
        return await this.resulty({resultData});
    }

    /**
     * Stores a single ibGib in S3, using this space's
     * credentials and bucketName.
     *
     * @returns the s3Link to the resource.
     */
    protected async putIbGibInS3({
        ibGib,
    }: {
        ibGib: IbGib_V1,
    }): Promise<void> {
        const lc = `${this.lc}[${this.putIbGibInS3.name}]`;
        try {
            if (!ibGib) { throw new Error(`ibGib required. (E: 054918cd74704d37aaaa762c85d6bbb7)`); }

            const client = createS3Client({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });
            const bucketParams: PutObjectCommandInput = {
                Bucket: this.data.bucketName,
                // Specify the name of the new object. For example, 'index.html'.
                // To create a directory for the object, use '/'. For example, 'myApp/package.json'.
                Key: await getS3Key({ibGib}),
                // Content of the new object.
                Body: JSON.stringify(ibGib),
                // ContentMD5: // add MD5 to ts-gib
            };
            const cmd = new PutObjectCommand(bucketParams);
            const data_unused: PutObjectCommandOutput = await client.send(cmd);
            if (logalot) { console.log(`${lc} ibgib put in s3 bucket. addr: ${h.getIbGibAddr({ibGib})}`); }
        } catch (error) {
            console.error(`${lc} Put ibgib in S3 failed. ${error.message}`);
            throw error;
        }
    }

    protected async existsInS3({
        addr,
    }: {
        addr: IbGibAddr,
    }): Promise<boolean> {
        const lc = `${this.lc}[${this.existsInS3.name}]`;
        try {
            if (!addr) { throw new Error(`addr required. (E: 242ee3f7cccb4cbfb1fe80e853320443)`); }

            // if we're already sure it exists, go ahead and return true.
            if (this.cache_existsInS3.includes(addr)) { return true; }

            // prepare...
            const client = createS3Client({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });
            const bucketParams: HeadObjectCommandInput = {
                Bucket: this.data.bucketName,
                // Specify the name of the new object. For example, 'index.html'.
                // To create a directory for the object, use '/'. For example, 'myApp/package.json'.
                Key: await getS3Key({addr}),
                // Content of the new object.
            };

            // head just gets metadata (i.e. if it exists)
            const cmd = new HeadObjectCommand(bucketParams);

            // send it.
            const data: HeadObjectCommandOutput = await client.send(cmd);

            // 200 means that it found it (but just returned metadata)
            const exists = data.$metadata.httpStatusCode === 200;

            // cache the result if it does indeed exist
            if (exists) { this.cache_existsInS3.push(addr); }

            if (logalot) { console.log(`${lc} ibgib checked from s3 bucket. addr: ${addr}. exists: ${exists}`); }

            return exists;
        } catch (error) {
            if (error.$metadata?.httpStatusCode === 404) {
                // doesn't exist and we have the listBucket permission on the bucket
                return false;
            } else if (error.$metadata?.httpStatusCode === 403) {
                // doesn't exist and we do NOT have the listBucket permission on the bucket
                return false;
            } else {
                // some other error
                const emsg = `${lc} ${error.message ?? 'some kind of aws error... (E: 29c23afd29ff4c2fa92f6d6e46b995fa)'}`;
                console.error(emsg);
                throw new Error(emsg);
            }
        }
    }

    /**
     * ty montreux https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-967223047
     * ty Vincent Schieb  https://stackoverflow.com/questions/8936984/uint8array-to-string-in-javascript
     * amalgam of these two used
     *
     * @returns the ibgib in S3, if by God it's there and we're able to get it.
     */
    protected async getIbGibFromS3({
        addr,
    }: {
        addr: IbGibAddr,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.getIbGibFromS3.name}]`;
        try {
            if (!addr) { throw new Error(`addr required. (E: 242ee3f7cccb4cbfb1fe80e853320443)`); }

            const client = createS3Client({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });
            const bucketParams: GetObjectCommandInput = {
                Bucket: this.data.bucketName,
                // Specify the name of the new object. For example, 'index.html'.
                // To create a directory for the object, use '/'. For example, 'myApp/package.json'.
                Key: await getS3Key({addr}),
                // Content of the new object.
            };
            const cmd = new GetObjectCommand(bucketParams);
            const streamToString: (stream: any) => Promise<string> = async (stream: any) => {
                if (stream['on']) {
                 return await new Promise<string>(async (resolve, reject) => {
                        const chunks: any[] = [];
                        stream.on("data", (chunk: any) => {
                            if (logalot) { console.log(`${lc} chunk received. addr: ${addr}`); }
                            chunks.push(chunk);
                        });
                        stream.on("error", (err: any) => reject(err));
                        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
                    });
                } else if (stream['getReader']) {
                    // ty montreux https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-967223047
                    // ty Vincent Schieb  https://stackoverflow.com/questions/8936984/uint8array-to-string-in-javascript
                    // amalgam of these two
                    const chunkStrings: string[] = [];
                    const decoder = new TextDecoder('utf-8');
                    const reader = stream.getReader();
                    let moreData = true;
                    do {
                        const { done, value } = await reader.read();
                        if (done) {
                            moreData = false;
                        } else {
                            if (logalot) { console.log(`${lc} chunk received. addr: ${addr}`); }
                            chunkStrings.push(decoder.decode(value));
                        }
                    } while (moreData);

                    let result = chunkStrings.join('');
                    return result; // suboptimal but hey
                } else {
                    // ?
                    throw new Error('unknown stream whoops. (E: d156b309c4e7461291ed459a8a61fa75)')
                }
            }

            const data: GetObjectCommandOutput = await client.send(cmd);
            const ibGibAsString = await streamToString(data.Body);
            const resIbGib = <IbGib_V1>JSON.parse(ibGibAsString);
            if (logalot) { console.log(`${lc} ibgib gotten from s3 bucket. addr: ${addr}. ibGibAsString.length: ${ibGibAsString.length}`); }
            return resIbGib;
        } catch (error) {
            const emsg = error?.message ?
                `${lc} Get ibgib from S3 failed. ${error.message} (E: 57088c83048e4874b80c0c269e24dcb9)` :
                `${lc} Get ibgib from S3 failed. ${error?.toString()} (E: 63baeea887434c808ec83955594730ea)`
            console.error(emsg);
            throw new Error(emsg);
        }
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
        let ibGibItems: AWSDynamoSpaceItem[] = [];
        try {

            let retryUnprocessedItemsCount = 0;

            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                // we handle large ibgibs differently. we'll store the ibgib in
                // S3, and the item we create in dynamodb will have only the
                // `ib`, `gib`, and `s3Link` to that s3 resource. When getting
                // the ibgib back, the truthiness of `s3Link` indicates if an
                // ibGib is large or not.
                let isLarge: boolean = false;
                if (isBinary({ibGib})) {
                    // we'll assume all binaries are large
                    isLarge = true;
                } else {
                    // not a binary, but maybe e.g. a very large ibGib comment
                    const jsonStringLength = JSON.stringify(ibGib).length;
                    if (jsonStringLength > c.AWS_DYNAMODB_LARGE_ITEM_SIZE_LIMIT_ISH_BYTES) {
                        isLarge = true;
                    }
                }

                // if it's large, then we need to store it in s3 first
                if (isLarge) {
                    let exists = await this.existsInS3({addr: h.getIbGibAddr({ibGib})});
                    if (!exists) { await this.putIbGibInS3({ibGib}); }
                }
                const item = await createDynamoDBPutItem({ibGib, storeInS3: isLarge});
                ibGibItems.push(item);
            }

            const putDynamoDbItems = async (items: AWSDynamoSpaceItem[]) => {
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
                        await putDynamoDbItems(ibGibItems); // recursive
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
                        await putDynamoDbItems(ibGibItems); // recursive
                    }
                }
            }

            await putDynamoDbItems(ibGibItems);

        } catch (error) {
            let items = ibGibItems;
            let ibgibs = ibGibs;
            console.error(`${lc} ${error.message}`);
            errors.push(error.message);
        }
    }

    protected async putIbGibs({
        client,
        ibGibs,
        errors,
        warnings,
    }: {
        client: DynamoDBClient,
        ibGibs: IbGib_V1[],
        errors: string[],
        warnings: string[],
    }): Promise<void> {
        const lc = `${this.lc}[${this.putIbGibs.name}]`;
        errors = errors ?? [];
        warnings = warnings ?? [];
        try {
            throwIfDuplicates({ibGibs});
            // first we want to get only ib,gib,data,rel8ns projections of
            // ibgibs, in case there are other properties on the objects.
            ibGibs = ibGibs.map(x => {
                return {ib: x.ib, gib: x.gib, data: x.data, rel8ns: x.rel8ns}
            });

            let runningCount = 0;
            const batchSize = this.data.putBatchSize || c.DEFAULT_AWS_PUT_BATCH_SIZE;
            const throttleMs = this.data.throttleMsBetweenPuts || c.DEFAULT_AWS_PUT_THROTTLE_MS;
            const rounds = Math.ceil(ibGibs.length / batchSize);
            for (let i = 0; i < rounds; i++) {
                if (i > 0) {
                    if (logalot) { console.log(`${lc} delaying ${throttleMs}ms`); }
                    await h.delay(throttleMs);
                }
                const ibGibsToDoNextRound = ibGibs.splice(batchSize);
                await this.putIbGibBatch({ibGibs, client, errors});

                if (errors.length > 0) { break; }

                runningCount += ibGibs.length;
                if (logalot) { console.log(`${lc} runningCount: ${runningCount}...`); }
                ibGibs = ibGibsToDoNextRound;
            }
            if (logalot) { console.log(`${lc} total: ${runningCount}.`); }
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
            try {
                let ibGibs = (arg.ibGibs || []).concat(); // copy

                await this.putIbGibs({client, ibGibs, errors, warnings});

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
        } catch (error) {
            console.error(`${lc}(UNEXPECTED) error creating result via resulty. (E: f1ace7da97d3498997a13486d06dd8d4)`);
            throw error;
        }
    }

    protected async deleteImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.deleteImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        // const warnings: string[] = [];
        // const addrsDeleted: IbGibAddr[] = [];
        // const addrsErrored: IbGibAddr[] = [];
        try {
            if (logalot) { console.log(`${lc} starting... (I: f688b87409b290b158578afd606fcd22)`); }
            // validated already to have one and only one ibgibAddr
            const addr = arg.data.ibGibAddrs[0];
            try {
                const client = createDynamoDBClient({
                    accessKeyId: this.data.accessKeyId,
                    secretAccessKey: this.data.secretAccessKey,
                    region: this.data.region,
                });
                const cmd = await createDynamoDBDeleteItemCommand({
                    tableName: this.data.tableName,
                    addr,
                });
                let resCmd = await this.sendCmd<DeleteItemCommandOutput>({
                    cmd,
                    client,
                    cmdLogLabel: 'DeleteItem',
                });

                console.dir(resCmd); // debug only
                resultData.success = true;
            } catch (error) {
                debugger;
                console.error(`${lc} error: ${error.message}`);
                resultData.errors = errors.concat([error.message]);
                resultData.addrsErrored = [addr];
                resultData.success = false;
            }
            const result = await this.resulty({resultData});
            return result;
        } catch (error) {
            console.error(`${lc}(UNEXPECTED) error creating result via resulty. (E: ecf8643373bd44b490f167939453ed31)`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete. (I: c729a16647f3f8fec7a3251cda567522)`); }
        }
    }

    /**
     * First run implementation does incoming addresses singly.
     *
     * Super inefficient of course, but the first driving intent is to get the
     * latest address for the current context (i.e. a single ibgib).
     */
    protected async getLatestAddrsImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getLatestAddrsImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            // #region initialize

            const latestAddrs: IbGibAddr[] = [];
            const addrsNotFound: IbGibAddr[] = [];
            const addrsErrored: IbGibAddr[] = [];

            const client = createDynamoDBClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            // #endregion initialize

            /** This is a map of incoming ibGibAddr -> corresponding ibGib */
            const errors: string[] = [];
            const warnings_getIbGibs: string[] = [];
            const ibGibs = await this.getIbGibs({
                client,
                ibGibAddrs: arg.data.ibGibAddrs,
                addrsNotFound,
                errors,
                warnings: warnings_getIbGibs,
            });
            if (errors.length > 0) { throw new Error(`errors getting ibgibs: ${errors.join('|')} (E: e9271532d74646d3bdaf2c763d436622)`); }
            if (warnings_getIbGibs.length > 0) {
                console.warn(`${lc}[getIbGibs] warnings: ${warnings_getIbGibs.join('|')} (W: 62d18f251767434493338a7024fa7d22)`);
            }

            // populate addrs not found map (will merge later)
            let addrsNotFoundMap: { [addr: string]: IbGibAddr } = {};
            addrsNotFound.forEach(addr => { addrsNotFoundMap[addr] = null; });

            // of the ibgibs that WERE found, get the latest
            const warnings_getLatestInStore: string[] = [];
            const resGetLatestInStore = await this.getLatestIbGibAddrsInStore({
                client,
                ibGibs,
                errors,
                warnings: warnings_getLatestInStore,
            });
            if (errors.length > 0) { throw new Error(`resGetLatestInStore errors: ${errors.join('|')} (E: b5f26ea26aa043778389cd9ef2d13222)`); }
            if (warnings_getIbGibs.length > 0) {
                console.warn(`${lc}[getIbGibs] warnings: ${warnings_getIbGibs.join('|')} (W: 2c43e487ab9f4cf8b2eb3753ba6bb022)`);
            }

            // populate our result map with merger of two maps
            resultData.latestAddrsMap = {
                ...addrsNotFoundMap,
                ...resGetLatestInStore,
            };

            // not sure if necessary, but I'm going ahead and populating these...
            resultData.addrs = Object.values(resGetLatestInStore).filter(x => !!x);
            resultData.addrsNotFound = addrsNotFound.length > 0 ?
                addrsNotFound.concat() :
                undefined;

            resultData.success = true;
        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.error(emsg);
            resultData.errors = [emsg];
        }
        try {
            let result = await this.resulty({resultData});
            return result;
        } catch (error) {
            console.error(`${lc}[resulty] ${error.message}`);
            throw error;
        }
    }

    /**
     * Get the addresses of the current
     * @param arg
     * @returns
     */
    protected async getAddrsImpl(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getAddrsImpl.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            throw new Error(`${lc} not implemented (E: bd3c8909bbe54bbe97b42cf11dbdf64d)`);
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
        const lc = `${this.lc}[${this.canGetImpl.name}]`;
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
        const lc = `${this.lc}[${this.canPutImpl.name}]`;
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
     * ## arg
     *
     * * `arg.ibGibs` should be the entire (inter)dependency graph of local ibGibs
     *   to store.
     *   * This graph may be required to act as a mini-local-space,
     *
     * ## future
     *
     * * In the future, it may be best to create an intermediate dependency InnerSpace
     *   instead of the literal `arg.ibGibs` array. This would enable get of ibGibs
     *   to be on-demand instead of having to load all ibGibs into memory at once.
     *
     * @returns AWSDynamoSpaceResultIbGib with syncStatus$ observable for sync updates.
     */
    protected async putSync(arg: AWSDynamoSpaceOptionsIbGib):
        Promise<AWSDynamoSpaceResultIbGib> {
        let lc = `${this.lc}[${this.putSync.name}]`;
        const resultData: AWSDynamoSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        // create observable that we will return almost immediately most of this
        // method will work inside of a spun-off promise.
        let errors: string[] = [];
        let warnings: string[] = [];
        let syncSagaInfo: SyncSagaInfo = arg?.syncSagaInfo;
        try {
            // #region validation, initialize some variables
            if (!arg.data) { throw new Error(`arg.data required. (E: 847a1506e7054d53b7bf5ff87a4b32da)`); }
            if ((arg.data.ibGibAddrs ?? []).length === 0) { throw new Error(`arg.data.ibGibAddrs required. (E: 6f2062572cc247f6a12b34759418c66b)`); }
            throwIfDuplicates({ibGibAddrs: arg.data.ibGibAddrs});
            if (!arg.data.sagaId) { throw new Error(`sagaId required. (E: af30b1b3cf3a4676a89399514743da79)`); }
            const timeLogName = `sync_log ${arg.data.sagaId}`;
            console.timeLog(timeLogName, `${lc} starting...`);
            await h.delay(1000); // seeing if it's just not registering the console.timeLog
            if ((arg.ibGibs ?? []).length === 0) { throw new Error(`no ibgibs given. (E: 62ae74eab0434b90b866caa285403143)`); }
            throwIfDuplicates({ibGibs: arg.ibGibs});
            if (!arg.syncSagaInfo) { throw new Error(`arg.syncSagaInfo required. (E: 33efb28789ff40b9b340eedcba0017f7)`); }

            if (!arg.syncSagaInfo.spaceId) { throw new Error(`arg.syncSagaInfo.spaceId required. (E: b20f6dbf3c4a466c9ff5aa7488e903ee)`); }
            if ((arg.data.participants ?? []).length === 0) { throw new Error(`arg.data.participants required. (E: 3e8121dc078342d18810a3e2c9671f98)`); }
            if (arg.data.participants.filter(x => x.s_d === "src").length === 0) { throw new Error(`invalid participants. src required. (E: fbfcab1b8cf34d4a8d51a48a0a43e6af)`); }
            if (arg.data.participants.filter(x => x.s_d === "src").length > 1) { throw new Error(`invalid participants. only 1 src allowed. (E: 9c2d76ab4dc141ce878de2649a68d4b6)`); }
            if (arg.data.participants.filter(x => x.s_d === "dest").length === 0) { throw new Error(`invalid participants. at least 1 dest required. (E: 7d037be500844191b25655521eb4cde7)`); }
            const srcSpaceId = arg.data.participants.filter(p => p.s_d === "src")[0].id;
            if (!srcSpaceId) { throw new Error(`invalid participants. srcSpaceId required. (E: c55c96ebb1c9429fabb0e90adf5ce157)`); }

            const client = createDynamoDBClient({
                accessKeyId: this.data.accessKeyId,
                secretAccessKey: this.data.secretAccessKey,
                region: this.data.region,
            });

            // #endregion validation, initialize some variables

            // #region add new watches, get any existing watch updates for space
            console.timeLog(timeLogName, 'add new watches, get any existing watch updates for space starting...');
            if (arg.data.cmdModifiers?.includes('watch')) {
                if (logalot) { console.log(`${lc} cmd is put, modifier includes watch sync. Hooking into tjp addr updates. (I: f1d1ed57d03c4842b0654215113297e6)`); }
                // hook into any updates if the caller has included the
                // `watch` CmdModifier.
                await this.putSync_AddWatches({arg, srcSpaceId});
                const getWatchWarnings: string[] = [];
                const watchUpdates =
                    await this.getWatchUpdates({client, spaceId: srcSpaceId, warnings: getWatchWarnings});
                if (getWatchWarnings.length > 0) { console.log(`${lc} getWatchWarnings: ${getWatchWarnings.join('|')}`); }
                if (watchUpdates) { resultData.watchTjpUpdateMap = watchUpdates; }
            } else {
                if (logalot) { console.log(`${lc} cmd is put, modifier includes sync but NOT watch. (I: 82180b881b7f47c49d157c14f8128785)`); }
            }
            console.timeLog(timeLogName, 'add new watches, get any existing watch updates for space complete.');
            // #endregion add new watches, get any existing watch updates for space

            // create the initial status ibgib.
            // we will mut8/rel8 this status over course of sync.
            const {statusIbGib: syncStatusIbGib_Start, statusIbGibsGraph: statusStartIbGibs} =
                await this.getStatusIbGibs_Start({
                    client: client,
                    sagaId: arg.data.sagaId,
                    participants: arg.data.participants,
                    ibGibAddrs: arg.data.ibGibAddrs,
                });
            resultData.sagaId = arg.data.sagaId;
            resultData.statusTjpAddr = syncStatusIbGib_Start.rel8ns.tjp[0];

            // this will communicate to the caller via the syncStatus$ stream
            this.spinOffToCompleteSync({
                client,
                srcSpaceId,
                sagaId: arg.data.sagaId,
                ibGibs: arg.ibGibs.concat(),
                statusStartIbGibs,
                syncStatusIbGib_Start,
                syncStatus$: syncSagaInfo.syncStatus$,
                errors,
                warnings,
            });
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        try {
            const result = await this.resulty({resultData});
            if (logalot) { console.log(`${lc} result.data: ${result.data}`); }
            result.syncSagaInfo = syncSagaInfo;
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async getWatchUpdates({
        client,
        spaceId,
        warnings,
    }: {
        client: DynamoDBClient,
        spaceId: string,
        warnings: string[],
    }): Promise<{[tjpAddr: string]: IbGibAddr}|undefined> {
        const lc = `${this.lc}[${this.getWatchUpdates.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            const resTjpAddrUpdateMap: { [tjpAddr: string]: IbGibAddr } = {};
            // get the watch ibgib for the space

            let resGetWatch = await this.getSpaceWatchIbGibsOrNull({client, spaceIds: [spaceId]});
            if (resGetWatch?.length === 0) {
                if (logalot) { console.log(`${lc} NO space watch NOT found for spaceId: ${spaceId}, so returning.`); }
                // no watch on space
                return undefined; // <<<< returns early
            } else {
                if (logalot) { console.log(`${lc} YES space watch found for spaceId: ${spaceId}.`); }
            }

            const spaceWatchIbGib = resGetWatch[0];

            if (Object.values(spaceWatchIbGib.data.updates).every(v => v === null)) {
                if (logalot) { console.log(`${lc} NO updates found, so returning.`); }
                return undefined; // no updates, returns
            } else {
                if (logalot) { console.log(`${lc} YES updates found.`); }
                // get a copy of updates, clear and re-save space watch asap to
                // minimize non-locking resource losses. (there is a race condition
                // if an update comes in after this watch ibgib was loaded, where
                // that update is lost due to the clear-updates/resave we're about to do.)
                let copyUpdates = h.clone(spaceWatchIbGib.data.updates);

                if (logalot) { console.log(`${lc} clearing spaceWatch.data.updates.`); }
                let clearedUpdates: { [tjpAddr: string]: IbGibAddr } = {};
                Object.keys(spaceWatchIbGib.data.updates).forEach(tjpAddr => {
                    clearedUpdates[tjpAddr] = null;
                });
                spaceWatchIbGib.data.updates = clearedUpdates;

                // immediately re-save
                if (logalot) { console.log(`${lc} re-saving (re-putting) cleared spaceWatchIbgib immediately.`); }
                const warnings: string[] = [];
                const errors: string[] = [];
                await this.putIbGibs({client, ibGibs: [spaceWatchIbGib], warnings, errors});
                if (warnings.length > 0) { console.warn(`${lc} ${warnings.join('|')} (W: 59b6ad282eb94b37930cb9993dd88e5f)`); }
                if (errors.length > 0) { throw new Error(`problem re-saving space watch ibgib. errors: ${errors.join('\n')}. (E: 87e7b183b4184879826f42460b97453d)`); }

                // filter any non-null updates from copyUpdates
                if (logalot) { console.log(`${lc} populating result tjpAddr updates map.`); }
                Object.keys(copyUpdates).forEach(tjpAddr => {
                    const updateAddrOrNull: IbGibAddr|null = copyUpdates[tjpAddr];
                    if (updateAddrOrNull) { resTjpAddrUpdateMap[tjpAddr] = updateAddrOrNull; }
                });

                // return map
                if (logalot) { console.log(`${lc} returning tjpAddrUpdateMap: ${h.pretty(resTjpAddrUpdateMap)}`); }
                return Object.keys(resTjpAddrUpdateMap).length > 0 ? resTjpAddrUpdateMap : undefined;
            }

        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.log(emsg);
            warnings.push(emsg);
            return undefined;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Stores the given `statusIbGibGraph`, outputting any warnings, throwing on
     * any errors.
     *
     * If no errors, then publishes the `statusIbGib` to the `syncStatus$`
     * subject.
     *
     * If there are errors, throws but does NOT call `syncStatus$.error`.
     * (maybe I should move that behavior here.)
     */
    protected async saveInStoreAndPublishStatus({
        client,
        statusIbGib,
        syncStatus$,
    }: {
        client: DynamoDBClient,
        /** primary status ibGib */
        statusIbGib: SyncStatusIbGib,
        syncStatus$: ReplaySubject<SyncStatusIbGib>;
    }): Promise<void> {
        const lc = `${this.lc}[${this.saveInStoreAndPublishStatus.name}]`;
        const errors: string[] = [];
        const warnings: string[] = [];
        try {
            if ((statusIbGib.statusIbGibGraph ?? []).length === 0) {
                throw new Error(`statusIbGib must have statusIbGibGraph attached, that should include the statusIbGib itself. (E: 590ff22e23db482ab979b0b87fba70a0)`);
            }
            if (logalot) {
                console.log(`${lc} statusIbGibGraph: ${h.pretty(statusIbGib.statusIbGibGraph.map(x => {
                    return {ib: x.ib, gib: x.gib, data: x.data ?? {}, rel8ns: x.rel8ns ?? {}};
                }))}`)
            }
            await this.putIbGibs({client, ibGibs: statusIbGib.statusIbGibGraph, errors, warnings});
            if (warnings.length > 0) { console.warn(`${lc} warnings:\n${warnings.join('\n')}`); }
            if (errors.length > 0) {
                // errored, so we're done. syncStatus$.error in catch block
                throw new Error(errors.join('\n'));
            } else {
                // publish the status that we've started
                syncStatus$.next(statusIbGib);
            }
        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.error(emsg);
            errors.push(emsg);
        }
    }

    /**
     * Very large function atow that does the work of storing statuses,
     * publishing statuses, reconciling timelines, etc.
     *
     * When the function finishes, the sync saga will be complete, but
     * this function is spun off and not itself awaited.
     */
    private async spinOffToCompleteSync({
        client,
        srcSpaceId,
        sagaId,
        ibGibs,
        statusStartIbGibs,
        syncStatusIbGib_Start,
        syncStatus$,
        errors,
        warnings,
    }: {
        client: DynamoDBClient,
        srcSpaceId: string,
        sagaId: string,
        ibGibs: IbGib_V1[],
        statusStartIbGibs: IbGib_V1[],
        syncStatusIbGib_Start: SyncStatusIbGib,
        syncStatus$: ReplaySubject<SyncStatusIbGib>;
        errors: string[],
        warnings: string[],
    }): Promise<void> {
        const lc = `${this.lc}[${this.spinOffToCompleteSync.name}]`;
        errors = errors ?? [];
        warnings = warnings ?? [];
        const timeLogName = `sync_log ${sagaId}`;
        try {
            // #region initialize sync timer log
            // console.time(timeLogName);
            console.timeLog(timeLogName, `${lc} starting...`);
            // #endregion initialize sync timer log

            // #region set statusIbGib/Graph, save & publish (syncStatusIbGib_Start)

            // this variable will be used for references to the most recent
            // status ibgib (and dependencies) to publish to the status update
            // observable. So when you go to update the status, mutate off of
            // this (AND BE SURE TO ASSIGN `statusIbGib.statusIbGibGraph`!!) and
            // then reassign this var for the next update to reference.
            let statusIbGib = syncStatusIbGib_Start;
            statusIbGib.statusIbGibGraph = statusStartIbGibs;

            // save first status that we'll use to track the entire sync saga
            await this.saveInStoreAndPublishStatus({client, statusIbGib, syncStatus$});

            // console.timeLog(timeLogName, 'saveInStoreAndPublishStatus complete');

            // #endregion

            /**
             * We will populate this list in this function.
             *
             * These are ibgibs that we ultimately will store with `putIbGibs`
             * call.
             */
            const ibGibsToStoreNotAlreadyStored: IbGib_V1[] = [];
            /**
             * We will populate this map in this function.
             *
             * These are updates to ibgib timelines (i.e., those that have
             * tjps).  If there are watches for these, then we will record these
             * updates in those watches for all spaces that are not the incoming
             * src space (which is excluded because it is already aware of any
             * update(s) via the sync status updates).
             */
            const updates: { [tjpAddr: string]: IbGibAddr } = {};

            // now that we've started some paperwork, we can begin doing
            // the actual work.

            // here is the shortcut we're doing: for each timeline, we're going
            // to get the latest one stored in our outerspace (dynamodb in this
            // case).  We'll check which transforms are applied in that one and
            // ours, and we'll apply the transforms from our local timeline that
            // we don't find in the stored one. We'll then store the new ibGibs
            // and return these in our result ibgib. The caller will then be
            // responsible for updating the local space with those new ones
            // (rebasing essentially).

            // note that we will not store stone ibgibs at the moment (no tjps),
            // because atow all ibgibs being sync will at the root be a living tjp.

            // #region initial gather/organize info about all incoming ibgibs

            // we will want to know what are the latest versions of our incoming ibGibs
            // that are currently in the store.
            const resLatestAddrsMap =
                await this.getLatestIbGibAddrsInStore({client, ibGibs, errors, warnings});
            console.timeLog(timeLogName, 'getLatestIbGibAddrsInStore complete');
            if (errors.length > 0) { throw new Error(`${lc}[${this.getLatestIbGibAddrsInStore.name}] errors: ${errors.join('|')} (E: 0c929b53b906412781da867c68288b03)`); }
            if (warnings.length > 0) {
                console.warn(`${lc}[getLatestAddrsInStore] warnings: ${warnings.join('|')} (W: 9bca93caf1bd43218da0749a62c8f722) `)
                warnings = [];
            }

            // now that we have a map of local addr => latest store addr | null,
            // we will group our incoming ibgibs by tjp in preparation to
            // iterate.
            let {mapWithTjp_YesDna, mapWithTjp_NoDna, mapWithoutTjps} = splitPerTjpAndOrDna({ibGibs});
            const mapIbGibsWithTjp = { ...mapWithTjp_YesDna, ...mapWithTjp_NoDna };
            const ibGibsWithoutTjp = Object.values(mapWithoutTjps);

            const ibGibsWithTjp = Object.values(mapIbGibsWithTjp);
            const mapIbGibsWithTjpGroupedByTjpAddr = groupBy({
                items: ibGibsWithTjp,
                keyFn: x => x.data.isTjp ? h.getIbGibAddr({ibGib: x}) : x.rel8ns.tjp[0]
            });
            const tjpAddrs = Object.keys(mapIbGibsWithTjpGroupedByTjpAddr);

            // #endregion initial gather/organize info about all incoming ibgibs

            // #region iterate through tjps, reconciling and publishing status

            for (let i = 0; i < tjpAddrs.length; i++) {

                let statusCode: StatusCode;
                const tjpAddr = tjpAddrs[i];
                const tjpGib = h.getIbAndGib({ibGibAddr: tjpAddr}).gib;

                console.timeLog(timeLogName, `execInSpaceWithLocking tjpGib: ${tjpGib.slice(0,16)} starting...`);
                await execInSpaceWithLocking({
                    space: this,
                    scope: tjpGib,
                    secondsValid: 60*5, // testing
                    maxDelayMs: 1000 * 60, // testing
                    callerInstanceId: sagaId,
                    maxLockAttempts: 5,
                    fn: async () => {
                        const lcFn = `${lc}[fn][${tjpGib.slice(0,5)}]`;
                        // #region prepare

                        // we're going to build up a list of ibgibs that we're going
                        // to put to the store. These will either be those who are totally
                        // untracked or those that we create by applying local transforms to
                        // latest ibgibs.
                        const ibGibsToStore_thisTjp: IbGib_V1[] = [];
                        /**
                         * These are new ibGibs that are created here in the sync space.
                         *
                         * ## notes
                         *
                         * * It just so happens that the timeline merging in this particular
                         *   aws sync space happens physically on the local machine. But this
                         *   is really happenining logically inside this sync space, which is
                         *   an outerspace relative to the local space.
                         */
                        const ibGibsCreated_thisTjp: IbGib_V1[] = [];
                        /**
                         * These are ibgibs that originate in some other space and are found
                         * in the store's timeline and not the local timeline.
                         */
                        const ibGibsOnlyInStore_thisTjp: IbGib_V1[] = [];
                        /**
                         * map of "old" local ibgib addr to new latest ibgib created in the store,
                         * if a timeline merge occurs.
                         */
                        const ibGibsMergeMap_thisTjp: { [oldAddr: string]: IbGib_V1 } = {};

                        const tjpGroupIbGibs_Local_Ascending = mapIbGibsWithTjpGroupedByTjpAddr[tjpAddr]
                            .filter(x => (x.data.n ?? -1) >= 0)
                            .sort((a, b) => a.data.n > b.data.n ? 1 : -1); // sorts ascending, e.g., 0,1,2...[Highest]
                        const latestAddr_Store = resLatestAddrsMap[tjpAddr];
                        if (logalot) { console.log(`${lcFn} tjpAddr: ${tjpAddr}`); }
                        if (logalot) { console.log(`${lcFn} resLatestAddrsMap: ${h.pretty(resLatestAddrsMap)}`); }
                        if (logalot) { console.log(`${lcFn} latestAddr_Store: ${latestAddr_Store}`); }

                        // #endregion prepare

                        // #region reconcile local timeline with store

                        if (latestAddr_Store) {

                            // the tjp timeline DOES exist in the sync space.  analyze
                            // and reconcile (if not already synced).
                            const tjpGroupAddrs_Local_Ascending =
                                tjpGroupIbGibs_Local_Ascending.map(x => h.getIbGibAddr({ibGib: x}));
                            if (logalot) { console.log(`${lcFn} tjpGroupAddrs_Local_Ascending: ${tjpGroupAddrs_Local_Ascending}`); }

                            const latestAddr_Local =
                                tjpGroupAddrs_Local_Ascending[tjpGroupAddrs_Local_Ascending.length-1];
                            if (logalot) { console.log(`${lcFn} latestAddr_Local: ${latestAddr_Local}`); }

                            if (latestAddr_Store === latestAddr_Local) {
                                console.timeLog(timeLogName, 'already synced');
                                // #region already synced
                                if (logalot) { console.log(`${lcFn} store and local spaces are already synced.`); }
                                // todo: cache this address as already synced with timestamp
                                statusCode = StatusCode.already_synced;
                                // ibGibsToStore = [];
                                // ibGibsCreated = [];
                                // ibGibMergeMap = {};
                                // do not need to do anything with watches
                                // #endregion already synced

                            } else if (tjpGroupAddrs_Local_Ascending.includes(latestAddr_Store)) {
                                console.timeLog(timeLogName, 'only Local has changes');
                                // #region only Local has changes
                                if (logalot) { console.log(`${lcFn} local space has changes, store does NOT. Will update store with more recent local.`); }
                                // sync call, i.e. no need for await
                                this.reconcile_UpdateStoreWithMoreRecentLocal({
                                    tjpAddr,
                                    latestAddr_Store,
                                    tjpGroupAddrs_Local_Ascending,
                                    tjpGroupIbGibs_Local_Ascending,
                                    ibGibsWithoutTjp: ibGibsWithoutTjp,
                                    ibGibsToStore: ibGibsToStore_thisTjp,
                                    updates,
                                });
                                console.timeLog(timeLogName, 'reconcile_UpdateStoreWithMoreRecentLocal complete');
                                statusCode = StatusCode.updated;
                                // nothing created or merged
                                // ibGibsCreated = [];
                                // ibGibsMerged = [];
                                // #endregion only Local has changes

                            } else {
                                console.timeLog(timeLogName, 'store has changes, maybe also local');
                                // #region store has changes, maybe also local

                                // store definitely has changes. maybe only the store
                                // has changes OR maybe both store & local have changes
                                // also, maybe we have ibgibs with dna, maybe not

                                if (logalot) { console.log(`${lcFn} store has changes not in local, maybe also local has changes. So, merge timelines appropriately. If so, then will apply those local changes to store's foreign-changed latest and save the resulting store's latest. (I: 86d0f267afce439db7d62b3703e1007d)`.replace(/\n/g, ' ').replace(/  /g, '')); }

                                const latestIbGib_Local =
                                    tjpGroupIbGibs_Local_Ascending
                                        .filter(x => h.getIbGibAddr({ibGib: x}) === latestAddr_Local)[0];
                                const latestIbGib_Local_HasDna =
                                    (latestIbGib_Local.rel8ns?.dna ?? []).length > 0;

                                let latestIbGib_Store: IbGib_V1;
                                // #region get latestIbGib_Store
                                const errorsGetLatestStore: string[] = [];
                                const warningsGetLatestStore: string[] = [];
                                const addrsNotFound_GetLatestStore: IbGibAddr[] = [];
                                let resGetStoreIbGib = await this.getIbGibs({
                                    client,
                                    ibGibAddrs: [latestAddr_Store],
                                    warnings: warningsGetLatestStore,
                                    errors: errorsGetLatestStore,
                                    addrsNotFound: addrsNotFound_GetLatestStore,
                                });
                                console.timeLog(timeLogName, 'resGetStoreIbGib complete');
                                if (addrsNotFound_GetLatestStore.length > 0) { throw new Error(`store ibgib addr not found, but we just got this addr from the store. latestAddr_Store: ${latestAddr_Store}. (E: c9ed2f2854a74ddb82d932fb31cc301a)(UNEXPECTED)`); }
                                if (errorsGetLatestStore.length > 0) { throw new Error(`problem getting full ibgib for latest addr from store. errors: ${errors.join('\n')}. (E: 3525deb3c668441fb6f4605d20845fc6)`); }
                                if (warningsGetLatestStore.length > 0) { console.warn(`${lcFn} ${warningsGetLatestStore} (W: c310638669784e78b5e34b447754eafb)`); }
                                if ((resGetStoreIbGib ?? []).length === 0) { throw new Error(`resGetStoreIbGib empty, but addrsNotFound not populated? (E: d2e7183af0ae4b98a2905b0e79c550ec)(UNEXPECTED)`); }
                                if ((resGetStoreIbGib ?? []).length > 1) { throw new Error(`resGetStoreIbGib.length > 1? Expecting just the single ibgib corresponding to latest ibgib addr (${latestAddr_Store}). (E: d2e7183af0ae4b98a2905b0e79c550ec)(UNEXPECTED)`); }
                                latestIbGib_Store = resGetStoreIbGib[0];
                                // #endregion get latestIbGib_Store

                                const latestIbGib_Store_HasDna =
                                    (latestIbGib_Store.rel8ns?.dna ?? []).length > 0;
                                if (latestIbGib_Local_HasDna && latestIbGib_Store_HasDna) {
                                    if (logalot) { console.log(`${lcFn} merge via dna. latestAddr_Local: ${latestAddr_Local}`); }
                                    console.timeLog(timeLogName, 'reconcile_MergeLocalWithStore_ViaDna starting...');
                                    debugger;
                                    await this.reconcile_MergeLocalWithStore_ViaDna({
                                        client,
                                        tjpAddr,
                                        latestAddr_Local, latestIbGib_Local,
                                        latestAddr_Store,
                                        latestIbGib_Store,
                                        // tjpGroupIbGibs_Local_Ascending,
                                        ibGibsCreated: ibGibsCreated_thisTjp,
                                        ibGibMergeMap: ibGibsMergeMap_thisTjp,
                                        ibGibsOnlyInStore: ibGibsOnlyInStore_thisTjp,
                                        allLocalIbGibs: ibGibs,
                                        updates,
                                        timeLogName,
                                    });
                                    console.timeLog(timeLogName, 'reconcile_MergeLocalWithStore_ViaDna complete.');
                                    ibGibsCreated_thisTjp.forEach(x => ibGibsToStore_thisTjp.push(x));
                                    statusCode = StatusCode.merged_dna;
                                } else {
                                    console.timeLog(timeLogName, 'merge manually via state');
                                    if (logalot) { console.log(`${lcFn} merge manually via state. latestAddr_Local: ${latestAddr_Local}`); }
                                    await this.reconcile_MergeLocalWithStore_ViaState({
                                        client,
                                        tjpAddr,
                                        latestIbGib_Local,
                                        latestAddr_Local,
                                        latestAddr_Store,
                                        ibGibsCreated: ibGibsCreated_thisTjp,
                                        ibGibMergeMap: ibGibsMergeMap_thisTjp,
                                        updates,
                                    });
                                    console.timeLog(timeLogName, 'reconcile_MergeLocalWithStore_ViaState complete');
                                    ibGibsCreated_thisTjp.forEach(x => ibGibsToStore_thisTjp.push(x));
                                    statusCode = StatusCode.merged_state;
                                }

                                // #endregion store has changes, maybe also local
                            }
                        } else {
                            console.timeLog(timeLogName, 'the timeline DOES NOT exist in the store');

                            if (logalot) { console.log(`${lcFn} the timeline DOES NOT exist in the store, so insert it.`)}

                            // if we're inserting the first time into the store, then there
                            // can't have been any watches to update
                            await this.reconcile_InsertFirstTimeIntoStore({
                                tjpGroupIbGibs_Local_Ascending,
                                ibGibsWithoutTjp: ibGibsWithoutTjp,
                                ibGibsToStore: ibGibsToStore_thisTjp,
                            });
                            console.timeLog(timeLogName, 'reconcile_InsertFirstTimeIntoStore complete');
                            statusCode = StatusCode.inserted;
                            // nothing created or merged
                            // ibGibsCreated = [];
                            // ibGibMergeMap = {};

                        }

                        // #endregion reconcile local timeline with store

                        // #region execute put in store operation

                        // some of the ibGibs may already be stored. but we'll skip only
                        // those that we definitely know are already there.  Note that
                        // "inserting" or "storing" ibGibs is an idempotent process,
                        // since they are content addressable.
                        const ibGibAddrsForSureAlreadyInStore = Object.values(resLatestAddrsMap);
                        for (let i = 0; i < ibGibsToStore_thisTjp.length; i++) {
                            const maybeIbGib = ibGibsToStore_thisTjp[i];
                            const maybeAddr = h.getIbGibAddr({ibGib: maybeIbGib});
                            if (!ibGibAddrsForSureAlreadyInStore.includes(maybeAddr) &&
                                !ibGibsToStoreNotAlreadyStored.some(x => h.getIbGibAddr({ibGib: x}) === maybeAddr)) {
                                ibGibsToStoreNotAlreadyStored.push(maybeIbGib);
                            }
                        }
                        console.timeLog(timeLogName, `update ibGibsToStoreNotAlreadyStored (${ibGibsToStoreNotAlreadyStored?.length}) complete`);

                        // in this first naive implementation, we're just going all or none
                        // in terms of success and publishing it.
                        // (though not in the transactional sense for the time being).
                        if (ibGibsToStoreNotAlreadyStored.length > 0) {
                            await this.putIbGibs({client, ibGibs: ibGibsToStoreNotAlreadyStored, errors, warnings});
                            if (errors.length > 0) {
                                throw new Error(errors.join('\n'));
                            }
                            if (warnings.length > 0) { console.warn(`${lcFn} warnings:\n${warnings.join('\n')}`); }
                        }
                        console.timeLog(timeLogName, `putIbGibs ibGibsToStoreNotAlreadyStored (${ibGibsToStoreNotAlreadyStored?.length}) complete`);

                        if (logalot) { console.log(`${lcFn} checking if need to updated tjpWatches via updates`); }
                        if (Object.keys(updates).length > 0) {
                            if (logalot) { console.log(`${lcFn} updates occurred. calling updateTjpWatches...`); }
                            // we've updated at least one tjpAddr with a new ibGib.
                            // So we need to go through and register these changes
                            // with the corresponding watch ibgibs. those updates
                            // will be picked up on the next call by the incoming
                            // space.
                            console.timeLog(timeLogName, 'updateTjpWatches starting...');
                            await this.updateTjpWatches({client, srcSpaceId, updates});
                            console.timeLog(timeLogName, 'updateTjpWatches complete.');
                        } else {
                            if (logalot) { console.log(`${lcFn} no updates occurred, so NOT calling updateTjpWatches.`); }
                        }

                        // #endregion execute put in store operation

                        // #region publish status update

                        // putting of non-metadata ibGibs succeeded now we must create
                        // the new status ibgib and store it. if that succeeds, then we
                        // can publish that to the status observable.

                        const ibGibAddrs_DidRxFromLocal = ibGibsToStoreNotAlreadyStored.length > 0 ?
                            ibGibsToStoreNotAlreadyStored.map(x => h.getIbGibAddr({ibGib: x})) :
                            undefined;
                        const ibGibAddrsCreated = ibGibsCreated_thisTjp.length > 0 ?
                            ibGibsCreated_thisTjp.map(x => h.getIbGibAddr({ibGib: x})) :
                            undefined;
                        const ibGibAddrs_DidTxToLocal = ibGibsOnlyInStore_thisTjp.length > 0 ?
                            ibGibsOnlyInStore_thisTjp.map(x => h.getIbGibAddr({ibGib: x})) :
                            undefined;
                        const ibGibAddrsMergeMap: {[oldAddr: string]: IbGibAddr } = {};
                        for (const [oldAddr, newIbGib] of Object.entries(ibGibsMergeMap_thisTjp)) {
                            ibGibAddrsMergeMap[oldAddr] = h.getIbGibAddr({ibGib: newIbGib});
                        }
                        const resSyncStatusIbGib = await V1.mut8({
                            src: statusIbGib,
                            mut8Ib: getStatusIb({
                                spaceType: 'sync', spaceSubtype: 'aws-dynamodb', statusCode, sagaId,
                            }),
                            dataToAddOrPatch: <SyncStatusData>{
                                statusCode: statusCode,
                                success: true,
                                errors: (errors ?? []).length > 0 ? errors.concat() : undefined,
                                warnings: (warnings ?? []).length > 0 ? warnings.concat() : undefined,
                                didRx: ibGibAddrs_DidRxFromLocal?.concat(),
                                didTx: ibGibAddrs_DidTxToLocal?.concat(),
                                didCreate: ibGibAddrsCreated?.concat(),
                                didMergeMap: h.clone(ibGibAddrsMergeMap),
                            },
                            dna: false,
                        });

                        // update our references to statusIbGib/Graph
                        statusIbGib = <SyncStatusIbGib>resSyncStatusIbGib.newIbGib;
                        statusIbGib.statusIbGibGraph = resSyncStatusIbGib.intermediateIbGibs ?
                            [statusIbGib, ...resSyncStatusIbGib.intermediateIbGibs] :
                            [statusIbGib];
                        if (ibGibsCreated_thisTjp.length > 0) {
                            statusIbGib.createdIbGibs = ibGibsCreated_thisTjp.concat();
                        }
                        if (ibGibsOnlyInStore_thisTjp.length > 0) {
                            statusIbGib.storeOnlyIbGibs = ibGibsOnlyInStore_thisTjp.concat();
                        }
                        if (Object.keys(ibGibsMergeMap_thisTjp).length > 0) {
                            statusIbGib.ibGibsMergeMap = h.clone(ibGibsMergeMap_thisTjp);
                        }

                        // publish the intermediate status corresponding to this tjpAddr
                        await this.saveInStoreAndPublishStatus({client, statusIbGib, syncStatus$});

                        // #endregion complete/finalize sync saga
                    }
                });
                console.timeLog(timeLogName, `execInSpaceWithLocking tjpGib: ${tjpGib.slice(0,16)} complete.`);

            }

            // #endregion iterate through tjps, reconciling and publishing status

            // #region complete saga

            console.timeLog(timeLogName, 'complete saga cleanup starting...');
            const statusCode = StatusCode.completed;
            const resSyncStatusIbGib_Complete = await V1.mut8({
                src: statusIbGib,
                mut8Ib: getStatusIb({
                    spaceType: 'sync', spaceSubtype: 'aws-dynamodb', statusCode, sagaId,
                }),
                dataToAddOrPatch: <SyncStatusData>{
                    statusCode,
                    success: true,
                    errors: (errors ?? []).length > 0 ? errors.concat() : undefined,
                    warnings: (warnings ?? []).length > 0 ? warnings.concat() : undefined,
                },
                dna: false,
            });
            // update our references to statusIbGib/Graph
            statusIbGib = <SyncStatusIbGib>resSyncStatusIbGib_Complete.newIbGib;
            statusIbGib.statusIbGibGraph = resSyncStatusIbGib_Complete.intermediateIbGibs ?
                [statusIbGib, ...resSyncStatusIbGib_Complete.intermediateIbGibs] :
                [statusIbGib];

            // publish the last status to indicate sync completion (for this space's saga).
            await this.saveInStoreAndPublishStatus({client, statusIbGib, syncStatus$});

            console.timeLog(timeLogName, 'complete saga cleanup complete.');

            // complete this space's observable
            syncStatus$.complete();

            // #endregion complete saga

        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.timeLog(timeLogName, `errored. emsg: ${emsg}`);
            if (error.message === c.AWS_ERROR_MSG_ITEM_SIZE_EXCEEDED) {
                // hmm, try to handle this post hoc?
                console.error(emsg);
            } else {
                console.error(emsg);
            }

            // in the future, need to attempt to make this a status ibgib if
            // possible, even if we don't store it in the outerspace (which off
            // the top of my head would be the case).
            if (logalot) { console.warn(`${lc} error happened...checking if should publish error to syncStatus...`)}
            if (!syncStatus$.closed) {
                if (logalot) { console.warn(`${lc} error happened...YES publish error to syncStatus...`)}
                syncStatus$.error(emsg);
            } else {
                if (logalot) { console.warn(`${lc} error happened...NO do NOT publish error to syncStatus...`)}
            }
            // does not rethrow because this is a spun off promise
        } finally {
            console.timeLog(timeLogName, `${lc} complete.`);
        }
    }

    private async updateTjpWatches({
        client,
        updates,
        srcSpaceId,
    }: {
        client: DynamoDBClient,
        /**
         * These are the updates to tjpAddrs
         */
        updates: { [tjpAddr: string]: IbGibAddr },
        /**
         * src spaceId provided because we will update all spaceId's not equal
         * to this. The rationale behind this is that the src space already is
         * aware of the updates, as they are returned in the sync call. The
         * watch updates are for spaces not actively involved in the transaction
         * who want to be made aware of it.
         */
        srcSpaceId: string,
    }): Promise<void> {
        const lc = `${this.lc}[${this.updateTjpWatches.name}]`;
        try {
            /** total list of tjpAddrs that we are updating */
            let tjpAddrs = Object.keys(updates);
            if (logalot) { console.log(`${lc} tjpAddrs: ${tjpAddrs}`); }
            /** map of spaceIds, excluding the srcSpaceId, to collated tjpAddrs */
            let spaceToTjpAddrUpdateMap: { [spaceId: string]: IbGibAddr[] } = {};

            // get the watch ibGibs to start...
            let tjpWatchIbGibs =
                await this.getTjpWatchIbGibsOrNull({client, tjpAddrs});

            // no watches means nothing to update, so return
            if (!tjpWatchIbGibs) {
                if (logalot) { console.log(`${lc} tjpWatchIbGibs is falsy, so returning early.`); }
                return;
            } // <<<< returns

            if (logalot) { console.log(`${lc} tjpWatchIbGibs: ${h.pretty(tjpWatchIbGibs)}`); }

            // we have watches, so collate spaceIds -> tjpAddr map so we only
            // have to update each space watch ibgib a total of one time.
            if (logalot) { console.log(`${lc} srcSpaceId: ${srcSpaceId}`); }
            for (let i = 0; i < tjpWatchIbGibs.length; i++) {
                const tjpWatchIbGib = tjpWatchIbGibs[i];
                if (logalot) { console.log(`${lc} doing tjpWatchIbGib: ${h.pretty(tjpWatchIbGib)}`); }
                const tjpAddr = tjpWatchIbGib.data.tjpAddr;
                if (logalot) { console.log(`${lc} checking tjp watch for tjpWatchIbGib.data.tjpAddr: ${tjpAddr}`)}
                let spaceIdsWatching = tjpWatchIbGib.data.spaceIdsWatching || [];
                if (logalot) { console.log(`${lc} tjpWatchIbGib.data.spaceIdsWatching: ${spaceIdsWatching}`); }
                spaceIdsWatching.forEach(spaceIdWatching => {
                    if (spaceIdWatching !== srcSpaceId) {
                        if (logalot) { console.log(`${lc} adding spaceIdWatching: ${spaceIdWatching}`); }
                        spaceToTjpAddrUpdateMap[spaceIdWatching] =
                            (spaceToTjpAddrUpdateMap[spaceIdWatching] ?? []).concat([tjpAddr]);
                    } else {
                        if (logalot) { console.log(`${lc} spaceIdWatching === srcSpaceId`); }
                    }
                });
            }

            // we now have a map of spaceId -> tjpAddr, so get the space watch
            // ibGibs, update and save/overwrite them
            if (logalot) { console.log(`${lc} building spaceIdsToUpdate`); }
            let spaceIdsToUpdate = Object.keys(spaceToTjpAddrUpdateMap);
            if (spaceIdsToUpdate.length === 0) {
                if (logalot) { console.log(`${lc} spaceIdsToUpdate.length === 0, so returning without updating any space watch ibgibs (I: c6cd69a708184bad9b604cc531f79f0e)`); }
                return; /* <<<< returns early */
            } else {
                if (logalot) { console.log(`${lc} spaceIdsToUpdate: ${spaceIdsToUpdate.join('|')}`); }
            }
            if (logalot) { console.log(`${lc} spaceIdsToUpdate: ${spaceIdsToUpdate}`); }

            // if (logalot) { console.log(`${lc} building spaceWatchAddrs`); }
            // let spaceWatchAddrs: IbGibAddr[] = [];
            // for (let i = 0; i < spaceIdsToUpdate.length; i++) {
            //     const spaceId = spaceIdsToUpdate[i];
            //     const spaceWatchAddr = await this.getWatchAddr({spaceId});
            //     spaceWatchAddrs.push(spaceWatchAddr);
            // }
            // if (logalot) { console.log(`${lc} spaceWatchAddrs: ${h.pretty(spaceWatchAddrs ?? [])}`); }

            if (logalot) { console.log(`${lc} getting spaceWatchIbGibs`); }
            let spaceWatchIbGibs = await this.getSpaceWatchIbGibsOrNull({
                client, spaceIds: spaceIdsToUpdate,
            });
            if (logalot) { console.log(`${lc} spaceWatchIbGibs gotten: ${h.pretty(spaceWatchIbGibs ?? {})}`); }

            if (spaceWatchIbGibs && spaceWatchIbGibs.length > 0) {
                if (logalot) { console.log(`${lc} updating spaceWatchIbGibs updates`); }
                // update each one in preparation to put/overwrite them all back
                spaceWatchIbGibs.forEach(spaceWatch => {
                    if (!spaceWatch.data.updates) {
                        if (logalot) { console.warn(`${lc} (UNEXPECTED) spaceWatch.data.updates is falsy(?)`); }
                        spaceWatch.data.updates = {};
                    }
                    tjpAddrs.forEach(tjpAddr => {
                        const updatedAddr = updates[tjpAddr];
                        if (logalot) { console.log(`${lc} updatedAddr: ${updatedAddr}`); }
                        spaceWatch.data.updates[tjpAddr] = updates[tjpAddr];
                    });
                });

                // all space watches have been updated with tjpAddr updates,
                // so reput/overwrite them
                if (logalot) { console.log(`${lc} re-saving spaceWatchIbGibs`); }
                const warnings: string[] = [];
                const errors: string[] = [];
                await this.putIbGibs({
                    client, ibGibs: spaceWatchIbGibs, warnings, errors,
                });
                if (warnings.length > 0) { console.warn(`${lc} warnings: ${warnings.join('|')} (W: a4ed938730ff4d27ad02cba9eb30b544)`); }
                if (errors.length > 0) { console.error(`${lc} errors: ${errors.join('|')} (E: efd4ac3094854934abd1317289c5df47)`); }
            } else {
                console.warn(`${lc} (UNEXPECTED) we had spaceIds but couldn't get their watches? (W: e9ca32c4d92c43e4a5a1322e841a60c6)`);
                return; /* <<<< returns early */
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            // do not rethrow because watches are not "mission critical"
        }
    }

    /**
     * Gets ibgibs newer than the `latestAddr_Store`.
     *
     * if our local addrs includes the latest addr in store but latest local
     * does not equal latest store, then local space is ahead of sync space. But
     * it's the same timeline as the local. we just need to upload the new ones
     * from the local space to the store.
     *
     * ## assumes
     *
     * * `latestAddr_Store` is a member of `tjpGroupAddrs_Local_Ascending`.
     *
     * ## notes
     *
     * * normal function validation is not performed, since this is a refactor to
     *   clean up code and not meant to be a general-purpose function.
     */
    protected reconcile_UpdateStoreWithMoreRecentLocal({
        tjpAddr,
        latestAddr_Store,
        tjpGroupAddrs_Local_Ascending,
        tjpGroupIbGibs_Local_Ascending,
        ibGibsWithoutTjp,
        ibGibsToStore,
        updates,
    }: {
        /**
         * TjpAddr that we are currently dealing with.
         */
        tjpAddr: IbGibAddr,
        /**
         * Address for the latest ibGib we currently have in the store.
         */
        latestAddr_Store: IbGibAddr,
        /**
         * The ibgib ADDRS in the tjpAddr's group in ascending order.
         */
        tjpGroupAddrs_Local_Ascending: IbGibAddr[],
        /**
         * The IBGIBS in the tjpAddr's group in ascending order.
         */
        tjpGroupIbGibs_Local_Ascending: IbGib_V1[],
        /**
         * These are passed in but not analyzed at the moment. They're
         * just passed on into the `ibGibsToStore` wholesale.
         */
        ibGibsWithoutTjp: IbGib_V1[],
        /**
         * This is populated in this function with the ibGibs that
         * the store doesn't already have.
         */
        ibGibsToStore: IbGib_V1[],
        /**
         * This is populated/added to in this function.  Adds the most recent
         * address for this tjpAddr that is reconciled with the store.
         */
        updates: { [tjpAddr: string]: IbGibAddr },
    }): void {
        const lc = `${this.lc}[${this.reconcile_UpdateStoreWithMoreRecentLocal.name}]`;
        try {
            // get the addresses of all ibgibs more recent than the one already
            // in the store. These will be stored, and the absolute latest one
            // will be published to watchers for notifications.
            const indexOfLatestInStore =
                tjpGroupAddrs_Local_Ascending.indexOf(latestAddr_Store);
            const newerAddrsInLocalSpace =
                tjpGroupAddrs_Local_Ascending.slice(indexOfLatestInStore+1);
            tjpGroupIbGibs_Local_Ascending.forEach(ibGib => {
                if (newerAddrsInLocalSpace.includes(h.getIbGibAddr({ibGib}))) {
                    ibGibsToStore.push(ibGib);
                }
            });

            // brute forcing here...should do dependency graph
            ibGibsWithoutTjp.forEach(x => ibGibsToStore.push(x));

            // set updates for watchers
            const newestAddrInLocalSpace =
                newerAddrsInLocalSpace[newerAddrsInLocalSpace.length-1];
            updates[tjpAddr] = newestAddrInLocalSpace;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * There have been additional changes in the sync space that originated from
     * some other space. We will find the transforms (if any) that the local
     * version has but which the sync space version does not have, and we will
     * apply those local transforms to the store's latest ibgib.  we then will
     * store the newly generated ibgib and dependencies in the sync space.  We
     * will also return those newly generated ibGibs, so our calling function
     * can save them in local space and rebase its local timeline to the newly
     * generated one.
     *
     * The local ibgib DOES have dna, so we will merge via DNA.
     *
     * ## notes
     *
     * we do not want to have the case where the OLD local version has a higher
     * value of n than the newly generated version. I'm not sure if this is
     * possible, since the end product should have at least the number of
     * transforms as the old local version... but it's something to think about.
     */
    protected async reconcile_MergeLocalWithStore_ViaDna({
        client,
        tjpAddr,
        latestAddr_Local, latestIbGib_Local,
        latestAddr_Store,
        latestIbGib_Store,
        // tjpGroupIbGibs_Local_Ascending,
        ibGibsCreated,
        ibGibsOnlyInStore,
        ibGibMergeMap,
        allLocalIbGibs,
        updates,
        timeLogName,
    }: {
        client: DynamoDBClient,
        tjpAddr: IbGibAddr,
        latestAddr_Local: IbGibAddr,
        latestIbGib_Local: IbGib_V1,
        latestAddr_Store: IbGibAddr,
        latestIbGib_Store: IbGib_V1,
        // tjpGroupIbGibs_Local_Ascending: IbGib_V1[],
        /**
         * Populated by this function.
         *
         * ibgibs that will be stored in the outer space. With respect to this
         * function, this will be the same as ibGibsCreated, as this will only
         * be a result of merging timelines.
         */
        // ibGibsToStore: IbGib_V1[],
        /**
         * Populated by this function.
         *
         * IbGibs that were created as a result of merging timelines.
         */
        ibGibsCreated: IbGib_V1[],
        /**
         * Populated by this function.
         *
         * These are ibgibs that are newer on the store and are not found
         * locally in the `latestIbGib_Local`.
         *
         * ## notes
         *
         * Basically the latest on the store may have changes that occurred
         * outside of the local space, and regardless of if the local space also
         * has changes, these need to be propagated to the local space. So this
         * list is like a "diff" of those foreign changes.
         */
        ibGibsOnlyInStore: IbGib_V1[],
        /**
         * Populated by this function.
         *
         * Map of old local latest ibgib addr to the latest ibgib in the store
         * after merger.
         *
         * ## on what to do with old ibgibs
         *
         * The calling code may choose to orphan these ibgibs, or somehow
         * mark/tag them as being involved in this operation, but if they do it
         * will become MUCH MORE COMPLICATED! There may be references to the
         * newly vestigial old ibGib. Also orphaning may lead to cyclical
         * metadata updates when syncing, etc.
         *
         * So basically, keep them around unless some other mechanism is put
         * in place that takes into account various complexity issues.
         */
        ibGibMergeMap: { [oldLatestAddr: string]: IbGib_V1 },
        /**
         * All incoming ibgibs involved in the sync operation, to act
         * as a local space from which transforms can be retrieved.
         *
         * All transforms from the store-side ibgib will have to be retrieved
         * via a batch get ibgibs operation.
         */
        allLocalIbGibs: IbGib_V1[],
        /**
         * This is populated/added to in this function.  Adds the most recent
         * address for this tjpAddr that is reconciled with the store.
         */
        updates: { [tjpAddr: string]: IbGibAddr },
        timeLogName: string,
    }): Promise<void> {
        const lc = `${this.lc}[${this.reconcile_MergeLocalWithStore_ViaDna.name}]`;
        try {
            const ibGibAddrsOnlyInStore: IbGibAddr[] = [];

            // get `dna` and `past` rel8ns from local and store latest ibgibs
            const dnaAddrs_Local = latestIbGib_Local.rel8ns?.dna?.concat();
            if ((dnaAddrs_Local ?? []).length === 0) { throw new Error(`local ibgib with tjp does not have dna. (E: a8796a652e0749aa89f5419e88b53c98)`); }
            if (logalot) { console.log(`${lc} dnaAddrs_Local: ${dnaAddrs_Local.join('\n')}`); }
            const pastAddrs_Local = latestIbGib_Local.rel8ns?.past?.concat() ?? [];
            if (logalot) { console.log(`${lc} pastAddrs_Local: ${pastAddrs_Local.join('\n')}`); }
            // if ((pastAddrs_Local ?? []).length === 0) { throw new Error(`local ibgib does not have past. (E: 76a8e4238a5f41bfaed2d92d88cc1665)`); }
            const dnaAddrs_Store = latestIbGib_Store.rel8ns?.dna?.concat();
            if ((dnaAddrs_Store ?? []).length === 0) { throw new Error(`store ibgib with tjp does not have dna. (E: 4fd9ebcaad10449aafba6d76cdb49531)`); }
            if (logalot) { console.log(`${lc} dnaAddrs_Store: ${dnaAddrs_Store.join('\n')}`); }
            const pastAddrs_Store = latestIbGib_Store.rel8ns?.past?.concat() ?? [];
            if (logalot) { console.log(`${lc} pastAddrs_Store: ${pastAddrs_Store.join('\n')}`); }
            // if ((pastAddrs_Store ?? []).length === 0) { throw new Error(`store ibgib does not have past. (E: 6f621d46d390435eb4d8421fe90d0086)`); }

            // #region find where dna diverges
            // console.timeLog(timeLogName, 'find where dna diverges starting...');

            // we're going to have to do a subset of a dependency graph.  we
            // only want additional dependencies that exist since the divergent
            // point on the store. So first, let's find the divergence via dna.

            /** guaranteed to avoid an index out of bounds error. */
            let dnaSmallerArray = (dnaAddrs_Local ?? []).length <= (dnaAddrs_Store ?? []).length ?
                dnaAddrs_Local : dnaAddrs_Store;
            if (logalot) { console.log(`${lc} dnaSmallerArray(${dnaSmallerArray?.length}): ${dnaSmallerArray?.join('\n')}`); }
            let dnaFirstDifferent_Index_Store: number = undefined; // explicit for clarity
            for (let i = 0; i < dnaSmallerArray.length; i++) {
                const dnaAddr_Local = dnaAddrs_Local[i];
                const dnaAddr_Store = dnaAddrs_Store[i];
                if (dnaAddr_Local !== dnaAddr_Store) {
                    dnaFirstDifferent_Index_Store = i;
                    break;
                }
            }
            if (logalot) { console.log(`${lc} dnaFirstDifferent_Index_Store: ${dnaFirstDifferent_Index_Store}`); }
            let pastSmallerArray = (pastAddrs_Local ?? []).length <= (pastAddrs_Store ?? []).length ?
                pastAddrs_Local : pastAddrs_Store;
            if (logalot) { console.log(`${lc} pastSmallerArray(${pastSmallerArray?.length}): ${pastSmallerArray?.join('\n')}`); }
            let pastFirstDifferent_Index_Store: number = undefined; // explicit for clarity
            for (let i = 0; i < pastSmallerArray.length; i++) {
                const pastAddr_Local = pastAddrs_Local[i];
                const pastAddr_Store = pastAddrs_Store[i];
                if (pastAddr_Local !== pastAddr_Store) {
                    if (logalot) { console.log(`${lc} different found.\npastAddr_Local: ${pastAddr_Local}\npastAddr_Store: ${pastAddr_Store}`); }
                    pastFirstDifferent_Index_Store = i;
                    break;
                }
            }
            if (logalot) { console.log(`${lc} pastFirstDifferent_Index_Store: ${pastFirstDifferent_Index_Store}`); }

            // console.timeLog(timeLogName, 'find where dna diverges complete.');
            // #endregion find where dna diverges

            // regardless of if we found a different dna index, we know we have
            // changes on the store. So go ahead and get do those changes.

            // #region first, populate ibGibsOnlyInStore
            console.timeLog(timeLogName, 'populate ibGibsOnlyInStore starting...');

            // so the new ibgibs will be of three varieties:
            // 1. the new ibgibs in the tjp timeline itself, which can be
            //    gotten from the latestIbGib_Store.rel8ns.past
            // 2. those new ibgibs' corresponding transforms that were used
            //    to produce them.
            // 3. the tricky bit: rel8d ibgib addresses that are added via
            //    `rel8` dna transforms.

            if (!ibGibsOnlyInStore.some(x => h.getIbGibAddr({ibGib: x}) === latestAddr_Store)) {
                if (logalot) { console.log(`${lc} adding latestIbGib_Store to ibGibsOnlyInStore`); }
                ibGibsOnlyInStore.push(latestIbGib_Store);
            } else {
                if (logalot) { console.log(`${lc} ibGibsOnlyInStore already has latestIbGib_Store (${h.getIbGibAddr({ibGib: latestIbGib_Store})})`); }
            }

            // #region get the new ibgibs in timeline itself
            const pastAddrsOnlyInStore = pastAddrs_Store.slice(pastFirstDifferent_Index_Store ?? pastSmallerArray.length);
            pastAddrsOnlyInStore.forEach(addr => ibGibAddrsOnlyInStore.push(addr));
            let pastIbGibsOnlyInStore: IbGib_V1[] = [];
            if (pastAddrsOnlyInStore.length > 0) {
                if (logalot) { console.log(`${lc} pastAddrsOnlyInStore(${pastAddrsOnlyInStore.length}): ${pastAddrsOnlyInStore.join('\n')}`); }
                const pastAddrsNotFound: IbGibAddr[] = [];
                const past_errorsGetIbGibs: string[] = [];
                const past_warningsGetIbGibs: string[] = [];
                console.timeLog(timeLogName, 'getIbGibs pastIbGibsOnlyInStore starting...');
                pastIbGibsOnlyInStore = await this.getIbGibs({
                    client,
                    ibGibAddrs: pastAddrsOnlyInStore,
                    addrsNotFound: pastAddrsNotFound,
                    errors: past_errorsGetIbGibs,
                    warnings: past_warningsGetIbGibs,
                });
                console.timeLog(timeLogName, 'getIbGibs pastIbGibsOnlyInStore complete.');
                if (past_errorsGetIbGibs.length > 0) { throw new Error(`past_errorsGetIbGibs: ${past_errorsGetIbGibs.join('|')} (E: 3f996dcb7c014361b96b8cbb5c53b704)`) }
                if (past_warningsGetIbGibs.length > 0) { console.warn(`${lc} past_warningsGetIbGibs: ${past_warningsGetIbGibs.join('|')} (W: 827dcd97c73e4b7aa1ccbea0f0afc183)`); }
                if (pastAddrsNotFound.length > 0) { throw new Error(`Errors getting past ibgibs. pastAddrsNotFound: ${pastAddrsNotFound.join('\n')} (E: c26d4e963d4f4d3eaf13459648f6e995)`)}
                if (pastIbGibsOnlyInStore.length !== pastAddrsOnlyInStore.length) { throw new Error(`pastIbGibsOnlyInStore.length !== pastAddrsOnlyInStore.length? (E: c6e51fe1606845d78017efb14a98ef4e)`); }
                pastIbGibsOnlyInStore.forEach(x => ibGibsOnlyInStore.push(x));
            } else {
                if (logalot) { console.log(`${lc} pastAddrsOnlyInStore is empty.`); }
            }
            // #endregion get the new ibgibs in timeline itself

            // #region get the corresponding store-only dna transforms
            console.timeLog(timeLogName, 'get the corresponding store-only dna transforms starting...');
            const dnaAddrsOnlyInStore = dnaAddrs_Store.slice(dnaFirstDifferent_Index_Store ?? dnaSmallerArray.length);
            let dnaIbGibsOnlyInStore: IbGib_V1[] = [];
            if (dnaAddrsOnlyInStore.length > 0) {
                if (logalot) { console.log(`${lc} dnaAddrsOnlyInStore(${dnaAddrsOnlyInStore.length}): ${dnaAddrsOnlyInStore.join('\n')}`); }
                dnaAddrsOnlyInStore.forEach(addr => ibGibAddrsOnlyInStore.push(addr));
                const dnaAddrsNotFound: IbGibAddr[] = [];
                const dna_errorsGetIbGibs: string[] = [];
                const dna_warningsGetIbGibs: string[] = [];
                dnaIbGibsOnlyInStore = await this.getIbGibs({
                    client,
                    ibGibAddrs: dnaAddrsOnlyInStore,
                    addrsNotFound: dnaAddrsNotFound,
                    errors: dna_errorsGetIbGibs,
                    warnings: dna_warningsGetIbGibs,
                });
                if (dna_errorsGetIbGibs.length > 0) { throw new Error(`dna_errorsGetIbGibs: ${dna_errorsGetIbGibs.join('|')} (E: bffc52231609462abed1e45a909d275f)`) }
                if (dna_warningsGetIbGibs.length > 0) { console.warn(`${lc} dna_warningsGetIbGibs: ${dna_warningsGetIbGibs.join('|')} (W: 2e954bd2924b4e7eb5aebd36d677e6bf)`); }
                if (dnaAddrsNotFound.length > 0) { throw new Error(`Errors getting dna ibgibs. dnaAddrsNotFound: ${dnaAddrsNotFound.join('\n')} (E: e25b73475b4b4c85b268e2a7b07350bf)`)}
                if (dnaIbGibsOnlyInStore.length !== dnaAddrsOnlyInStore.length) { throw new Error(`dnaIbGibsOnlyInStore.length !== dnaAddrsOnlyInStore.length? (E: f69be0a0d72348989d434aa4878636e1)`); }
                // #region debug delete this
                dnaIbGibsOnlyInStore.forEach(x => {
                    if (x.ib === 'rel8' && x.data?.src) {
                        debugger;
                    }
                });
                // #endregion debug delete this
                dnaIbGibsOnlyInStore.forEach(x => ibGibsOnlyInStore.push(x));
            } else {
                if (logalot) { console.log(`${lc} dnaAddrsOnlyInStore is empty.`); }
            }

            console.timeLog(timeLogName, 'get the corresponding store-only dna transforms complete.');
            // #endregion get the corresponding store-only dna transforms

            // #region newly rel8d/store-only ibgibs (added since divergence)
            console.timeLog(timeLogName, 'newly rel8d/store-only ibgibs (added since divergence) starting...');

            // analyze each dna. Regardless of the transform type, we've
            // already added both the transform ibgib and its subsequently
            // produced ibgib.  And if it's a mut8, then that's all we need.
            // But if it's a rel8 that is _adding_ addresses, then we need
            // to get those addresses in addition to the dna and output
            // ibgib. (It can't be a `fork` atow, because that will always
            // only be the first transform in a tjp timeline.)
            if (dnaIbGibsOnlyInStore.length > 0) {
                const rel8dAddrsOnlyInStore: IbGibAddr[] = [];
                const ibGibsOnlyInStore_addrsSoFar = ibGibsOnlyInStore.map(x => h.getIbGibAddr({ibGib: x}));
                for (let i = 0; i < dnaIbGibsOnlyInStore.length; i++) {
                    const dnaIbGib = dnaIbGibsOnlyInStore[i];
                    if (!dnaIbGib.data?.type) { throw new Error(`(UNEXPECTED) invalid dna. data.type is falsy. (E: aacc09a61f9f4d4fb72d245d14d28545)`); }
                    if ((<TransformOpts>dnaIbGib.data).type === 'rel8') {
                        const rel8Data: TransformOpts_Rel8 = <TransformOpts_Rel8>dnaIbGib.data;
                        // rel8nsToAddByAddr is a map of rel8nName => IbGibAddr[]
                        Object.values(rel8Data.rel8nsToAddByAddr ?? {})
                            .flat()
                            .forEach(addr => {
                                if (!rel8dAddrsOnlyInStore.includes(addr) &&
                                    !ibGibsOnlyInStore_addrsSoFar.includes(addr)) {
                                    rel8dAddrsOnlyInStore.push(addr);
                                }
                            });
                    }
                }
                console.timeLog(timeLogName, 'getDependencyGraph starting...');
                const rel8dGraph = await getDependencyGraph({
                    ibGibAddrs: rel8dAddrsOnlyInStore,
                    live: true,
                    maxRetries: c.DEFAULT_MAX_RETRIES_GET_DEPENDENCY_GRAPH_OUTERSPACE,
                    msBetweenRetries: c.DEFAULT_MS_BETWEEN_RETRIES_GET_DEPENDENCY_GRAPH_OUTERSPACE,
                    skipAddrs: allLocalIbGibs.map(x => h.getIbGibAddr({ibGib: x})),
                    space: this,
                    timeLogName,
                });
                console.timeLog(timeLogName, 'getDependencyGraph complete.');
                const rel8dIbGibsOnlyInStore = Object.values(rel8dGraph);
                if (rel8dIbGibsOnlyInStore.length < rel8dAddrsOnlyInStore.length) { throw new Error(`rel8dIbGibsOnlyInStore.length < rel8dAddrsOnlyInStore.length? We should have at least those ibgibs explicitly rel8d, plus their dependency graphs. (E: 17654562e21f41ef98ff7a8906c2830c)`); }
                if (rel8dIbGibsOnlyInStore.length > 0) {
                    if (logalot) { console.log(`${lc} rel8dIbGibsOnlyInStore(mapped, length: ${rel8dIbGibsOnlyInStore.length}): ${rel8dIbGibsOnlyInStore.map(x => h.getIbGibAddr({ibGib: x})).join('\n')}`); }
                    rel8dIbGibsOnlyInStore.forEach(x => ibGibsOnlyInStore.push(x));
                } else {
                    if (logalot) { console.log(`${lc} rel8dIbGibsOnlyInStore is empty.`); }
                }

                // there are going to be issues here when the rel8d ibgibs
                // include timelines that conflict with local timelines. Those
                // timelines will need to be merged somehow...hmm. perhaps will
                // resolve correctly/well enough when we go to publish those
                // changes...hmm. tough one. I believe there is a proper
                // solution, however, that can be implemented with enough
                // focus/resources.
            }

            console.timeLog(timeLogName, 'newly rel8d/store-only ibgibs (added since divergence) complete.');
            // #endregion newly rel8d/store-only ibgibs (added since divergence)

            if (logalot) { console.log(`${lc} ibGibsOnlyInStore (${ibGibsOnlyInStore.length}) mapped to addrs: ${ibGibsOnlyInStore.map(x => h.getIbGibAddr({ibGib: x})).join('\n')}`); }

            console.timeLog(timeLogName, 'populate ibGibsOnlyInStore complete.');
            // #endregion first, populate ibGibsOnlyInStore

            if (dnaFirstDifferent_Index_Store) {
                if (logalot) { console.log(`${lc} dnaFirstDifferent_Index_Store is truthy, so we need to apply local transforms to store.`); }
                // we have a different index found. This means that we
                // definitely have BOTH store changes to get AND local changes
                // to apply.

                // #region next, merge local changes (if any) into store
                console.timeLog(timeLogName, 'next, merge local changes (if any) into store starting...');

                // get transforms (already in ascending order) that the local ibgib
                // has but the store ibgib does not have.
                const dnaAddrsToApplyToStoreVersion: IbGibAddr[] = [];
                for (let i = 0; i < dnaAddrs_Local.length; i++) {
                    const dnaAddr_Local = dnaAddrs_Local[i];
                    if (!dnaAddrs_Store.includes(dnaAddr_Local)) {
                        dnaAddrsToApplyToStoreVersion.push(dnaAddr_Local);
                    }
                }

                if (dnaAddrsToApplyToStoreVersion.length > 0) {
                    const createdIbGibs_Running: IbGib_V1[] = [];
                    latestIbGib_Store = await this.applyTransforms({
                        src: latestIbGib_Store,
                        createdIbGibs_Running,
                        dnaAddrsToApplyToStoreVersion,
                        allLocalIbGibs,
                    });
                    // debug checking for rel8.data.src/Addr
                    // debug checking for rel8.data.src/Addr
                    console.warn(`${lc} debug checking for rel8.data.src/Addr. take out this code`);
                    console.warn(`${lc} debug checking for rel8.data.src/Addr. take out this code`);
                    console.warn(`${lc} debug checking for rel8.data.src/Addr. take out this code`);
                    console.warn(`${lc} debug checking for rel8.data.src/Addr. take out this code`);
                    createdIbGibs_Running.forEach(x => {
                        if (x.ib === 'rel8' && x.data?.src) {
                            debugger;
                        }
                    })
                    // debug checking for rel8.data.src/Addr
                    // debug checking for rel8.data.src/Addr
                    createdIbGibs_Running.forEach(x => ibGibsCreated.push(x));
                }

                console.timeLog(timeLogName, 'next, merge local changes (if any) into store complete.');
                // #endregion next, merge local changes (if any) into store

            } else {
                if (logalot) { console.log(`${lc} dnaFirstDifferent_Index_Store was falsy, so we dont need to apply local transforms to the store.`); }
                // we do NOT have a different index, so we do NOT have
                // a divergence.

                // if the lengths were equal, then we would not be in this
                // function, since the dna would be exactly the same. So the
                // lengths are NOT equal.

                // If the larger were the local, then we would not get to this
                // function (reconciled via update store with local instead)

                // So, the larger is the store, and we have only store changes
                // and no local changes to apply. We already applied those so
                // we're done.
            }

            ibGibMergeMap[latestAddr_Local] = latestIbGib_Store;

            updates[tjpAddr] = h.getIbGibAddr({ibGib: latestIbGib_Store});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * There have been additional changes in the sync space that originated from
     * some other space. In order to sync these two spaces, we will merge the
     * local with the store (if any changes made locally), and then we will get
     * the latest from the store and any dependencies we don't already have.
     *
     * The local ibgib does NOT have dna, so we will merge via STATE MANUALLY.
     * by this I mean that we are manually generating the entire new merged
     * ibgib fields, using the ibgib in the store as the dominant value.
     * The merged ibgib gets the dominant `ib` as its `ib` and mergers
     * of both `data` and `rel8ns`.
     *
     * ## notes
     *
     * we do not want to have the case where the OLD local version has a higher
     * value of n than the newly generated version. So we will manually change
     * the `n` to be 1 higher than either local or store latest ibgibs.
     */
    protected async reconcile_MergeLocalWithStore_ViaState({
        client,
        tjpAddr,
        latestIbGib_Local,
        latestAddr_Local,
        latestAddr_Store,
        ibGibsCreated,
        ibGibMergeMap,
        updates,
    }: {
        client: DynamoDBClient,
        tjpAddr: IbGibAddr,
        latestIbGib_Local: IbGib_V1,
        latestAddr_Local: IbGibAddr,
        latestAddr_Store: IbGibAddr,
        /**
         * Populated by this function.
         *
         * ibgibs that will be stored in the outer space. With respect to this
         * function, this will be the same as ibGibsCreated, as this will only
         * be a result of merging timelines.
         */
        // ibGibsToStore: IbGib_V1[],
        /**
         * Populated by this function.
         *
         * IbGibs that were created as a result of merging timelines.
         */
        ibGibsCreated: IbGib_V1[],
        /**
         * Populated by this function.
         *
         * Map of old local latest ibgib addr to the latest ibgib in the store
         * after merger.
         *
         * The calling code may choose to orphan these ibgibs, or somehow
         * mark/tag them as being involved in this operation. But if this is
         * done, then it should somehow be noted to stay locally and not be
         * synced, otherwise this would become a neverending cycle of metadata
         * for sync, which then itself gets synced and produces more metadata.
         */
        ibGibMergeMap: { [oldLatestAddr: string]: IbGib_V1 },
        /**
         * This is populated/added to in this function.  Adds the most recent
         * address for this tjpAddr that is reconciled with the store.
         */
        updates: { [tjpAddr: string]: IbGibAddr },
    }): Promise<void> {
        const lc = `${this.lc}[${this.reconcile_MergeLocalWithStore_ViaState.name}]`;
        try {
            let errors: string[] = [];
            let warnings: string[] = [];
            const addrsNotFound: IbGibAddr[] = [];

            console.error(`${lc} not really an error proper, I've just never tested this code before. (E: 4e4f333283624900851946b80d938c4b)`);

            // get the ibGib corresponding to latestAddr_Store
            let resGetStoreIbGib = await this.getIbGibs({
                client,
                ibGibAddrs: [latestAddr_Store],
                warnings,
                errors,
                addrsNotFound,
            });
            if (addrsNotFound.length > 0) { throw new Error(`store ibgib addr not found, but we just got this addr from the store. latestAddr_Store: ${latestAddr_Store}. (E: 96507459fbfd4d078c7e5c6a14cb0408)(UNEXPECTED)`); }
            if (errors.length > 0) { throw new Error(`problem getting full ibgib for latest addr from store. errors: ${errors.join('\n')}. (E: 973b147b5ea6481185a8f1f0a7239066)`); }
            if (warnings.length > 0) { console.warn(`${lc} ${warnings}`); }
            if ((resGetStoreIbGib ?? []).length === 0) { throw new Error(`resGetStoreIbGib empty, but addrsNotFound not populated? (E: 5079555043fa480889c19a696eaba927)(UNEXPECTED)`); }
            if ((resGetStoreIbGib ?? []).length > 1) { throw new Error(`resGetStoreIbGib.length > 1? Expecting just the single ibgib corresponding to latest ibgib addr (${latestAddr_Store}). (E: 2bc23c2661c34da5aa51d372fdccbcc6)(UNEXPECTED)`); }
            let latestIbGib_Store = resGetStoreIbGib[0];

            // #region manually do our best to merge state

            // first things first, we will make sure that our next n will be 1 higher than either local or store
            // ibgib.data.n
            const nHighest = (latestIbGib_Local.data.n ?? -1) > (latestIbGib_Store.data.n ?? -1) ?
                latestIbGib_Local.data.n ?? -1 :
                latestIbGib_Store.data.n ?? -1;
            const nNext = nHighest + 1;

            debugger; // first run check above (still haven't tested this?)
            let d0 = {1: "asdf", 2: "222"};
            let r0 = {1: "fx", c: 'ccccrecessive'};
            let m0 = mergeMapsOrArrays_Naive<{}>({dominant: d0, recessive: r0});
            if (m0[1] !== "asdf") { throw new Error(`doesn't work c7878b8b7d8b4f8b950ce31135e33d6b`); }
            if (m0[2] !== "222") { throw new Error(`doesn't work 1a4f60aae2dc4704ae54cfb95aff7ac3`); }
            if (m0['c'] !== "ccccrecessive") { throw new Error(`doesn't work 1a4f60aae2dc4704ae54cfb95aff7ac3`); }
            debugger; // first run check above (still haven't tested this?)

            const mergedData = mergeMapsOrArrays_Naive<any>({
                dominant: latestIbGib_Store.data ?? {},
                recessive: latestIbGib_Local.data ?? {},
            });
            mergedData.n = nNext;

            let mergedRel8ns: IbGibRel8ns_V1;
            if (latestIbGib_Store.rel8ns) {
                mergedRel8ns = mergeMapsOrArrays_Naive<IbGibRel8ns_V1>({
                    dominant: latestIbGib_Store.rel8ns ?? {},
                    recessive: latestIbGib_Local.rel8ns ?? {},
                });

                // naive guess at linked rel8ns vs accumulating rel8ns.  if it's
                // not a linked rel8n but only has one in 'past' atm of sync,
                // well that's less than ideal. (euphamism)
                mergedRel8ns.past = (latestIbGib_Store.rel8ns.past ?? []).length > 1 ?
                    mergedRel8ns.past.concat([latestAddr_Store]) :
                    [latestAddr_Store];

                mergedRel8ns['ancestor'] = latestIbGib_Store.rel8ns['ancestor'].concat();
                mergedRel8ns['tjp'] = latestIbGib_Store.rel8ns['tjp'].concat();
            }

            const mergedIbGib: IbGib_V1 = {
                ib: latestIbGib_Store.ib,
                data: mergedData
            };
            if (mergedRel8ns) { mergedIbGib.rel8ns = mergedRel8ns; }
            mergedIbGib.gib = await getGib({ibGib: mergedIbGib, hasTjp: true});

            await this.putIbGibs({client, ibGibs: [mergedIbGib], errors, warnings});
            if (warnings.length > 0) { console.warn(`${lc} warnings on storing merged ibgib: ${warnings.join('\n')}`); }
            if (errors.length > 0) { throw new Error(errors.join('\n')); }

            // #endregion manually do our best to merge state

            ibGibsCreated.push(mergedIbGib);
            ibGibMergeMap[latestAddr_Local] = mergedIbGib;
            updates[tjpAddr] = h.getIbGibAddr({ibGib: mergedIbGib});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * iteratively (recursively) apply transforms in
     * `dnaAddrsToApplyToStoreVersion` to the store's version of the ibgib,
     * keeping track of all dependencies used/created.  ibgibs that we create
     * along the way that we'll set to createdIbGibs to include dna,
     * intermediate ibGibs, and newer versions of the source.
     *
     * populates the given `createdibGibs_Running` array, INCLUDING THE MOST
     * RECENT IBGIB THAT WILL BE RETURNED BY THE FUNCTION.
     *
     * @returns the final ibgib produced from the transform applications.
     */
    protected async applyTransforms({
        src,
        createdIbGibs_Running,
        dnaAddrsToApplyToStoreVersion,
        allLocalIbGibs,
    }: {
        /**
         * Most recent src to which we will apply the given
         * `dnaAddrsToApplyToStoreVersion`.
         */
        src: IbGib_V1,
        /**
         * This will be populated through recursive iterations while applying
         * dnas. Everything, including new dnas, new intermediate ibgibs, and
         * new "src" ibgibs will be added to this before the final recursive
         * call returns the final produced (out) ibgib.
         */
        createdIbGibs_Running: IbGib_V1[],
        /**
         * Transform addresses whose ibgib will be applied to the given `src`.
         * This will be reduced by one per each recursive call to this function
         * that is made.
         */
        dnaAddrsToApplyToStoreVersion: IbGibAddr[],
        /**
         * Should contain the dna ibGibs that are given in
         * `dnaAddrsToApplyToStoreVersion`
         */
        allLocalIbGibs: IbGib_V1[],
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.applyTransforms.name}]`;
        try {
            if (dnaAddrsToApplyToStoreVersion.length > 0) {
                const dnaAddrToApply = dnaAddrsToApplyToStoreVersion.splice(0,1)[0];
                // we expect this dna ibgib to supplied to us, but need to check
                const dnaIbGib_IntermediateArray =
                    allLocalIbGibs.filter(x => h.getIbGibAddr({ibGib: x}) === dnaAddrToApply);
                let dnaIbGib: IbGib_V1;
                if (dnaIbGib_IntermediateArray.length === 1) {
                    dnaIbGib = dnaIbGib_IntermediateArray[0];
                } else if (dnaIbGib_IntermediateArray.length === 0) {
                    throw new Error(`dna ibGib not found in supplied allLocalIbGibs. dnaAddr: ${dnaAddrToApply}. (E: 7f56826852cf48a79ab8af16bf27e284)`);
                } else {
                    // more than one ibgib with the dna address?
                    throw new Error(`More than one ibGib in allLocalIbGibs with the dna address of ${dnaAddrToApply}? (E: a726134f4cc14a4fb2ed2d39d22af17c)(UNEXPECTED)`);
                }

                // we have our dna to apply, so do so against the incoming src
                // any transform options is actually the dna.data plus src info.
                let argTransform = <TransformOpts<IbGib_V1>>dnaIbGib.data;
                argTransform.src = src;
                argTransform.srcAddr = h.getIbGibAddr({ibGib: src});
                let resTransform: TransformResult<IbGib_V1>;
                switch (argTransform.type) {
                    case 'mut8':
                        resTransform = await V1.mut8(<TransformOpts_Mut8<IbGib_V1,any>>argTransform);
                        break;
                    case 'rel8':
                        resTransform = await V1.rel8(<TransformOpts_Rel8<IbGib_V1>>argTransform);
                        break;
                    case 'fork':
                        throw new Error(`fork transform not expected. atow only a single fork is expected at the beginning of the lifetime of a tjp ibgib. This fork defines the uniqueness of the tjp ibgib. When merging another tjp ibgib, we would only expect update transforms to be mut8 or rel8. (E: f8ad6996ac5545edad2d58a293d37d94)`);
                    default:
                        throw new Error(`unknown dna argTransform.type (${argTransform.type}) for dna address: ${dnaAddrToApply}.  Expecting either mut8 or rel8. (fork transform is known but not expected either.) (E: 52a98db56e934e4cb42c64e2f45fa552)`);
                }

                // add intermediate ibgibs (including dna) to createdIbGibs_Running
                (resTransform.intermediateIbGibs ?? []).forEach(x => createdIbGibs_Running.push(x));
                (resTransform.dnas ?? []).forEach(x => createdIbGibs_Running.push(x));
                createdIbGibs_Running.push(resTransform.newIbGib);

                // not 100% but I believe the created dna should deep equal our
                // incoming dna that we applied. so we'll warn if it doesn't.
                // (ibgib addresses matching necessitates deep equal)
                if ((resTransform.dnas ?? []).length > 0) {
                    if (!resTransform.dnas.some(x => h.getIbGibAddr(x) === dnaAddrToApply)) {
                        console.warn(`${lc}(UNEXPECTED) Expected to generate exact dna that we applied in transform. dnaAddr: ${dnaAddrToApply} (W: 4a364c0b5d8d46c8af6bd540915fd973)`);
                    }
                } else {
                    console.warn(`${lc}(UNEXPECTED) expected resTransform to include generated dna. dnaAddr: ${dnaAddrToApply}(W: 9648e2d5c40d42b7b9fb7efb09c5b13a)`)
                }


                // call recursively
                return await this.applyTransforms({
                    src: resTransform.newIbGib,
                    createdIbGibs_Running,
                    dnaAddrsToApplyToStoreVersion,
                    allLocalIbGibs,
                });
            } else {
                // no more dna to apply.
                // createdIbGibs_Running should be populated
                if (createdIbGibs_Running.length === 0) {
                    console.warn(`${lc} no dna transforms to apply but createdIbGibs_Running is empty. Dna is expected to start with at least one transform, otherwise don't call this function. (W: 52c7f2f6bd7e4bd0b31f53611b90268b)(UNEXPECTED)`)
                }
                return src;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * There is nothing stored yet, so we're going to store everything.
     */
    protected async reconcile_InsertFirstTimeIntoStore({
        tjpGroupIbGibs_Local_Ascending,
        ibGibsWithoutTjp,
        ibGibsToStore,
    }: {
        tjpGroupIbGibs_Local_Ascending: IbGib_V1[],
        ibGibsWithoutTjp: IbGib_V1[],
        /**
         * Populated by this function
         */
        ibGibsToStore: IbGib_V1[],
    }): Promise<void> {
        const lc = `${this.lc}[${this.reconcile_InsertFirstTimeIntoStore.name}]`;
        try {
            if (!ibGibsToStore) { throw new Error(`ibGibsToStore required. (E: e404ccf67dbd451082315311375befb1)`); }
            tjpGroupIbGibs_Local_Ascending.forEach(x => {
                if (!ibGibsToStore.some(y => y.gib === x.gib)) {
                    ibGibsToStore.push(x);
                }
            });

            // brute forcing here...should do dependency graph
            ibGibsWithoutTjp.forEach(x => ibGibsToStore.push(x));
            if (logalot) { console.log(`${lc} ibGibsToStore.map(x => h.getIbGibAddr({ibGib: x})): ${ibGibsToStore.map(x => h.getIbGibAddr({ibGib: x}))}`); }
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
        sagaId,
        participants,
        ibGibAddrs,
    }: {
        client: DynamoDBClient,
        sagaId: string,
        participants: ParticipantInfo[],
        ibGibAddrs: IbGibAddr[],
    }): Promise<{statusIbGib: SyncStatusIbGib, statusIbGibsGraph: IbGib_V1[]}> {
        const lc = `${this.lc}[${this.getStatusIbGibs_Start.name}]`;
        try {
            if (!client) { throw new Error(`client required. (E: 7e749ecc44f647dc8587c00c334337d4)`); }
            if ((participants ?? []).length === 0) { throw new Error(`participants required. (E: a707efcdd7594a4aa70599e84ffa43c4)`); }

            // 1. parent primitive
            const parentIb = getStatusIb({
                spaceType: 'sync',
                spaceSubtype: 'aws-dynamodb',
                statusCode: StatusCode.undefined,
                sagaId: c.STATUS_UNDEFINED_TX_ID, // "undefined" means '0' atow!!
            });
            const parentIbGib = factory.primitive({ib: parentIb});
            // we don't store primitives, so don't add to allIbGibs

            // 2. start tjp ibGib (has txId)
            const statusCode = StatusCode.started;
            const tjpIb = getStatusIb({
                statusCode,
                spaceType: 'sync',
                spaceSubtype: 'aws-dynamodb',
                sagaId,
            });
            const data = <SyncStatusData>{
                statusCode: statusCode,
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
            let statusIbGibsGraph: IbGib_V1[] = [
                startIbGib,
                ...resTjp.intermediateIbGibs,
            ];

            // return em dude
            return { statusIbGib: startIbGib, statusIbGibsGraph };
        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.error(emsg);
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
        const ibGibs = [arg, result ?? ROOT];
        const argPersist = await this.argy({
            argData: {
                cmd: 'put',
                isMeta: true,
                catchAllErrors: true,
                ibGibAddrs: ibGibs.map(x => h.getIbGibAddr({ibGib: x})),
            },
            ibGibs: ibGibs.concat(),
        });

        const client = createDynamoDBClient({
            accessKeyId: this.data.accessKeyId,
            secretAccessKey: this.data.secretAccessKey,
            region: this.data.region,
        });

        // this is a best effort storage, so we aren't using the result other than logging
        // in the future, we should incorporate what to do if this persistence
        // fails into the larger success requirements of spaces.
        const resPut = await this.putIbGibsImpl({arg: argPersist, client});
        if (!resPut.data.success || resPut.data.errors) {
            console.error(`${lc} Errors persisting arg & result: ${resPut.data.errors.join('\n')}. (E: 65ef314a4f8e445d851dab5b290e9a03)`);
        }
    }

    /**
     * When merging/updating timelines, we don't want this to happen from
     * multiple users at the same time. So we will put a lock on the timeline.
     *
     * If you are acquiring the lock, then it is expected you are going to add
     * to the timeline.
     */
    protected async acquireLockOnTimeline({
        tjpGib,
        secondsValid,
        timeoutSeconds,
    }: {
        /**
         * We will lock based on the timeline's tjp's gib.
         *
         * There is an extremely small chance of accidental gib collision,
         * but since this is a transient lock, that should be okay. (It's
         * really small anyway except on of course the universal size, where it's
         * a dead certainty.)
         */
        tjpGib: Gib,
        secondsValid?: number,
        /**
         * After this amount of time, we error out.
         */
        timeoutSeconds: number,
    }): Promise<boolean> {
        const lc = `${this.lc}[${this.acquireLockOnTimeline.name}]`;
        try {
            return true;
            // if (logalot) { console.log(`${lc} starting...`); }
            // execInSpaceWithLocking({
            //     space: this,
            //     fn
            // })
            // let result = await lockSpace({
            //     space: this,
            //     scope: tjpGib,
            //     secondsValid,

            // });
            // if (result.data.alreadyLocked
            // const lockIbGib = constantIbGib({
            //     parentPrimitiveIb: 'aws_ddb_lock',
            //     ib:
            // })
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}

// export interface SubscriptionInfo {
//     /**
//      * After this time, the subscription will be removed.
//      */
//     expirationUTC: string;
//     /**
//      * Because we're not dealing with identity/gib integrity with this, it is
//      * being optimistic about a non-adversarial context.
//      *
//      * ## future
//      *
//      * This kind of interspatial call (and all of them?) will require identity
//      * with regards to the space. Keystones!
//      */
//     spaceId: string;
// }

// export interface SpaceNotificationSubscriptionsData {
//     // map of
//     subscriptions: SubscriptionInfo[];
// }
