/**
 * @module outer-space
 * Outer spaces are spaces connecting local inner spaces.
 * ATOW there is just sync spaces, but definitely just the beginning.
 */

import { ReplaySubject } from 'rxjs/internal/ReplaySubject';

import { GIB, IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, Gib, Ib, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
    IbGibSpaceData, IbGibSpaceRel8ns,
    IbGibSpaceOptionsData, IbGibSpaceOptionsRel8ns, IbGibSpaceOptionsIbGib,
    IbGibSpaceOptionsCmdModifier,
    IbGibSpaceResultData, IbGibSpaceResultRel8ns, IbGibSpaceResultIbGib,
} from './space';

/**
 * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 *
 * ## driving use case
 *
 * I'm adding this for tracking status for longer-running inter-spatial
 * communications. Specifically, I'm working on the first aws dynamo db
 * sync space.
 *
 * ## notes
 *
 * * I think http status codes do a pretty good job of protocol information
 *   exchange.
 * * The only non-standard status code I'm doing ATOW is 0 meaning "undefined".
 * * I'm adding (whitelisting) codes as I use them.
 *   * Note that sections of code check for validation of membership here and
 *     will error if not present.
 */
export type HttpStatusCode = 0 | 100 | 201;
export const HttpStatusCode = {
    /**
     * Using this as the code for the parent primitive.
     */
    0: 0 as HttpStatusCode,
    /**
     * 0
     */
    none: 0 as HttpStatusCode,
    /**
     * 0
     */
    undefined: 0 as HttpStatusCode,
    /**
     * not used atow
     *
     * ## mdn
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#information_responses
     *
     * This interim response indicates that the client should continue the
     * request or ignore the response if the request is already finished.
     *
     * The HTTP 100 Continue informational status response code indicates that
     * everything so far is OK and that the client should continue with the
     * request or ignore it if it is already finished.
     *
     * To have a server check the request's headers, a client must send Expect:
     * 100-continue as a header in its initial request and receive a 100
     * Continue status code in response before sending the body.
     */
    100: 100 as HttpStatusCode,
    /**
     * 100
     */
    continue: 100 as HttpStatusCode,
    /**
     * Using this for the start of the sync process, meaning the ball has begun
     * rolling, a metadata ibgib to track the operation has been created (but
     * not necessarily yet stored), but no data has been exchanged.
     *
     * ## mdn
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status#information_responses
     *
     * This code indicates that the server has received and is processing the
     * request, but no response is available yet.
     */
    102: 102 as HttpStatusCode,
    /**
     * 102
     */
    processing: 102 as HttpStatusCode,
    /**
     * Using this as the code for a successfully completed sync saga.
     *
     * ## mdn
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/201
     *
     *  The HTTP 201 Created success status response code indicates that the
     *  request has succeeded and has led to the creation of a resource. The new
     *  resource is effectively created before this response is sent back and
     *  the new resource is returned in the body of the message, its location
     *  being either the URL of the request, or the content of the Location
     *  header.  The common use case of this status code is as the result of a
     *  POST request.
     */
    201: 201 as HttpStatusCode,
    /**
     * 201
     */
    created: 201 as HttpStatusCode,
}

export type OuterSpaceType = "sync";
export const OuterSpaceType = {
    sync: 'sync' as OuterSpaceType,
}
export const VALID_OUTER_SPACE_TYPES = Object.values(OuterSpaceType).concat();

export type OuterSpaceSubtype = SyncSpaceSubtype;

export type SyncSpaceSubtype = 'aws-dynamodb';
export const SyncSpaceSubtype = {
    aws_dynamodb: 'aws-dynamodb' as SyncSpaceSubtype,
}
export const VALID_OUTER_SPACE_SUBTYPES = Object.values(SyncSpaceSubtype).concat();

export interface OuterSpaceData extends IbGibSpaceData {
    type: OuterSpaceType;
    subtype: OuterSpaceSubtype;
}

export interface OuterSpaceRel8ns extends IbGibSpaceRel8ns {
    [c.CIPHERTEXT_REL8N_NAME]?: IbGibAddr[];
    /**
     * ATOW this will only be c.CONSENSUS_ADDR_SYNC_NAIVE_PUT_MERGE
     */
    [c.CONSENSUS_REL8N_NAME]?: IbGibAddr[];
}

export interface OuterSpaceIbGib
    extends IbGib_V1<OuterSpaceData, OuterSpaceRel8ns> {
}

export interface SyncSpaceData extends OuterSpaceData {
    type: 'sync';
    subtype: SyncSpaceSubtype;
}
export interface SyncSpaceRel8ns extends OuterSpaceRel8ns {
}

export interface ParticipantInfo {
    id: string;
    gib: Gib;
    s_d: 'src' | 'dest';
}

/**
 * Options shape specific to OuterSpaces.
 * Marker interface only atm.
 */
export interface OuterSpaceOptionsData extends IbGibSpaceOptionsData {
    /**
     * Modifying flags for cmd routing for the associated cmd ibGib.
     */
    cmdModifiers?: (OuterSpaceOptionsCmdModifier | string)[];
    /**
     * This id is used when communicating among spaces.
     *
     * ## notes
     *
     * If src/local space is communicating with more than one
     * other space, then this can be used to coordinate among
     * all of them. If there are only two spaces, then the
     * gib of the individual status ibgib is just as uniquely
     * identifying.
     */
    txrxId?: string;
    /**
     * Info of the participating spaces (as endpoints) in the communication.
     */
    participants?: ParticipantInfo[];
}

export interface OuterSpaceOptionsRel8ns extends IbGibSpaceOptionsRel8ns {
}
export interface OuterSpaceOptionsIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TOptsData extends OuterSpaceOptionsData = OuterSpaceOptionsData,
    // TOptsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns
    TOptsRel8ns extends OuterSpaceOptionsRel8ns = OuterSpaceOptionsRel8ns,
    > extends IbGibSpaceOptionsIbGib<TIbGib, TOptsData, TOptsRel8ns> {
}

export interface OuterSpaceResultData extends IbGibSpaceResultData {
}
export interface OuterSpaceResultRel8ns extends IbGibSpaceResultRel8ns {
}
export interface OuterSpaceResultIbGib<
    TIbGib extends IbGib,
    TResultData extends OuterSpaceResultData,
    TResultRel8ns extends OuterSpaceResultRel8ns
> extends IbGibSpaceResultIbGib<TIbGib, TResultData, TResultRel8ns> {
}

/**
 * Marker atm.
 *
 * {@see IbGibSpaceOptionsCmdModifier}
 */
export type OuterSpaceOptionsCmdModifier = IbGibSpaceOptionsCmdModifier;
/**
 * Marker atm.
 *
 * {@see IbGibSpaceOptionsCmdModifier}
 */
export const OuterSpaceOptionsCmdModifier = {
    ...IbGibSpaceOptionsCmdModifier,
}

/**
 * Extends basic ibgib space options cmd modifiers to include sync specific ones.
 *
 * {@see IbGibSpaceOptionsCmdModifier}
 * {@see OuterSpaceOptionsCmdModifier}
 */
export type SyncSpaceOptionsCmdModifier = OuterSpaceOptionsCmdModifier | 'sync';
/**
 * Flags to affect the command's interpretation.
 *
 * {@see IbGibSpaceOptionsCmdModifier}
 * {@see OuterSpaceOptionsCmdModifier}
 */
export const SyncSpaceOptionsCmdModifier = {
    ...OuterSpaceOptionsCmdModifier, // "inherited"
    /**
     * special type of 'put' operation that will start a sync process.
     */
    sync: 'sync' as SyncSpaceOptionsCmdModifier,
}

export interface SyncSpaceOptionsData extends OuterSpaceOptionsData {
    /**
     * Extends inherited
     */
    cmdModifiers?: (SyncSpaceOptionsCmdModifier | string)[];
    /**
     * Each Sync has a status ibGib that tracks the progress of the
     * overall sync operation (saga).
     *
     *
     * If this is specified, then it means the sync cmd is associated with
     * an existing/ongoing operation.
     */
    tjpGib?: Gib;
    // txId?: string;
    ibGibAddrs_All_Tjps?: IbGibAddr[];
    ibGibAddrs_All_NonTjps?: IbGibAddr[];
}
export interface SyncSpaceOptionsRel8ns extends OuterSpaceOptionsRel8ns {
}
export interface SyncSpaceOptionsIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TOptsData extends SyncSpaceOptionsData = SyncSpaceOptionsData,
    TOptsRel8ns extends SyncSpaceOptionsRel8ns = SyncSpaceOptionsRel8ns,
    > extends OuterSpaceOptionsIbGib<TIbGib, TOptsData, TOptsRel8ns> {
    /**
     * Produces status ibgibs or error strings.
     */
    syncStatus$: ReplaySubject<SyncStatusIbGib|string>;
}

export interface SyncSpaceResultData extends OuterSpaceResultData {
    tjpGib?: Gib;
}
export interface SyncSpaceResultRel8ns extends OuterSpaceResultRel8ns {
}
export interface SyncSpaceResultIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TResultData extends SyncSpaceResultData = SyncSpaceResultData,
    TResultRel8ns extends SyncSpaceResultRel8ns = SyncSpaceResultRel8ns
> extends OuterSpaceResultIbGib<TIbGib, TResultData, TResultRel8ns> {
    /**
     * Produces status ibgibs or error strings.
     */
    syncStatus$: ReplaySubject<SyncStatusIbGib|string>;
}

export interface SyncStatusData {
    statusCode: HttpStatusCode;

    syncGib: string;
    // srcSpaceId: string;
    // srcSpaceGib: string;
    participants: ParticipantInfo[];

    /**
     * Explicit re-declaration from base data, just to remind us...I guess...
     */
    isTjp?: boolean;

    /**
     * When putting, this is the list of ibGibs to send.
     *
     * ## notes
     *
     * Maybe the receiver needs all of these, maybe it doesn't.
     */
    toTx?: IbGibAddr[];
    /**
     * When putting, this is the list of ibGibs we're not sending.
     *
     * IGNORED ATOW
     *
     * ## notes
     *
     * Not really sure about this atm. Just figure someone will have
     * a reason for it in the future.
     */
    notToTx?: IbGibAddr[];
    /**
     * When communicating, the receiver is asking the sender for
     * these ibGibs.
     *
     * ## notes
     *
     * ATOW this indicates only that the receiver does not have
     * these addresses.
     */
    toRx?: IbGibAddr[];
    /**
     * When communicating, the receiver is saying that it doesn't
     * need these addresses, for whatever reason.
     *
     * ## notes
     *
     * ATOW this will only be because the receiver already has
     * these addresses.
     */
    notToRx?: IbGibAddr[];

    /**
     * Wakka doodle doo. (i.e. I'm still working through feedback
     * cycles.)
     *
     * ## as a question
     *
     * Was the individual communication tx/rx a success...hmmm...
     */
    success?: boolean;

    /**
     * If this is true, then the tx/rx inter-space saga is marked
     * as complete and this status ibgib should be the last one.
     */
    complete?: boolean;
    /**
     * List of warnings for THIS STEP in the inter-spatial communication.
     *
     * Should NOT be an accumulating list of warnings, i.e., if a warning
     * happens early on in a tx/rx, then it stays on that ibGib.
     */
    warnings?: string[];
    /**
     * List of errors for THIS STEP in the inter-spatial communication.
     *
     * Should NOT be an accumulating list of errors, i.e., if an error happens
     * early on in a tx/rx, then it stays on that ibGib.
     */
    errors?: string[];

    /**
     * List of ibgib addrs that were newly created specifically for this
     * space operation.
     *
     * ATOW, this means that there was a merged timeline event and
     * the receiving space dynamically applied dna to its existing
     * timeline.
     *
     * ## notes
     *
     * * This should not include status metadata ibgibs, as this is
     *   already captured in the `past` rel8n.
     */
    didCreate?: IbGibAddr[];

    /**
     * List of ibgib addrs that were merged in the rx space instead of stored
     * directly.
     *
     * Tx space may choose to somehow mark these as orphaned or whatever seems
     * best per use case. (i.e. I haven't coded that yet even in this naive
     * first implementation)
     */
    didMerge?: IbGibAddr[];
    /**
     * List of ibgibs that were actively transmitted to the receiving
     * space.
     *
     * ## notes
     *
     * * It could be that the receiving space received the ibgib,
     *   but that it already had it. It may have been unsure if it
     *   had it based on the algorithms in play.
     * * An empty array upon completion of a communication saga
     *   indicates that the receiving space already had all of the
     *   ibgibs attempted to be sent, i.e., it was already up-to-date.
     *
     */
    didRx?: IbGibAddr[];
}
export interface SyncStatusRel8ns extends IbGibRel8ns_V1 {
    created?: IbGibAddr[];
    final?: IbGibAddr[];
}

/**
 * IbGib that tracks/logs the entire syncing process.
 *
 * Since this is created with a tjp, it includes the tjp.gib in
 * each status frame ibgib.gib. This tjp.gib acts as the "saga id"
 * or "status stream id".
 *
 * ## stages
 *
 * ### starting - (code 102)
 *
 * Gets the ball rolling with creating the first status ibgib.
 *
 * ###
 *
 */
export interface SyncStatusIbGib extends IbGib_V1<SyncStatusData, SyncStatusRel8ns> {
    createdIbGibs?: IbGib_V1[];
    finalIbGib?: IbGib_V1;
}

export interface SyncCycleInfo {
    arg: SyncSpaceOptionsIbGib;
    result?: SyncSpaceResultIbGib;
}

/**
 * AWS-specific outerspace type
 */
export type AWSRegion = 'us-east-1' | string;

export interface StatusIbInfo {
    /**
     * Code for the given status.
     *
     */
    statusCode: HttpStatusCode,
    spaceType: OuterSpaceType,
    spaceSubtype: OuterSpaceSubtype,
    txrxId: string,
    delimiter?: string,
}

/**
 * Composes ib with given params info.
 *
 * @returns ib string with given info encoded
 */
export function getStatusIb({
    statusCode,
    spaceType,
    spaceSubtype,
    txrxId,
    delimiter,
}: StatusIbInfo): string {
    const lc = `[${getStatusIb.name}]`;
    try {
        if (statusCode === null || statusCode === undefined) { throw new Error(`status code required. (ERROR: 4e0d232a9955496695012623c2e17ca2)`); }
        if (!Object.values(HttpStatusCode).includes(statusCode)) { throw new Error(`invalid status code (${statusCode}) (ERROR: 91d7655424c44d9680fff099ee2b54d2)`); }
        if (!spaceType) { throw new Error(`spaceType required. (ERROR: 86e98694a56a4f599e98e50abf0eed43)`); }
        if (!spaceSubtype) { throw new Error(`spaceSubtype required. (ERROR: 4857d4677ee34e95aeb2251dd633909e)`); }
        if (!txrxId) { throw new Error(`txrxId required. (ERROR: cfc923bb29ee4aa788e947b6416740e6)`); }

        delimiter = delimiter || c.OUTER_SPACE_DEFAULT_IB_DELIMITER;

        return `status ${statusCode} ${spaceType} ${spaceSubtype} ${txrxId}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Parses the given `statusIb` and returns the info object.
 *
 * @returns info from parsing the status ib
 */
export function getStatusIbInfo({
    statusIb,
    delimiter,
}: {
    statusIb: Ib,
    delimiter?: string,
}): StatusIbInfo {
    const lc = `[${getStatusIb.name}]`;
    try {
        if (!statusIb) { throw new Error(`statusIb required. (ERROR: 09e23e8622cf456cadb0c3d0aadc3be9)`); }

        delimiter = delimiter || c.OUTER_SPACE_DEFAULT_IB_DELIMITER;

        // atow `status ${statusCode} ${spaceType} ${spaceSubtype} ${txrxId}`;
        const pieces = statusIb.split(delimiter);

        const statusCode: HttpStatusCode = <HttpStatusCode>Number.parseInt(pieces[1]);
        if (statusCode === null || statusCode === undefined) { throw new Error(`status code is null/undefined. (ERROR: f2f1d88d3ee14303a13582d6f7019063)`); }
        if (!Object.values(HttpStatusCode).includes(statusCode)) { throw new Error(`invalid/unknown status code (${statusCode}) (ERROR: 7580860df7b344b3992148552e80a85e)`); }

        let spaceType = <OuterSpaceType>pieces[2];
        if (spaceType === null || spaceType === undefined) { throw new Error(`spaceType is null/undefined. (ERROR: 12473d35e77b451bb59bb05c03cb8b64)`); }
        if (!VALID_OUTER_SPACE_TYPES.includes(spaceType)) { throw new Error(`invalid/unknown spaceType (${spaceType}) (ERROR: d3ba9add427f49dda34f265f3225d9db)`); }

        let spaceSubtype = <OuterSpaceSubtype>pieces[3];
        if (spaceSubtype === null || spaceSubtype === undefined) { throw new Error(`spaceSubtype is null/undefined. (ERROR: 6da7ae919d0b4a22b4ee685520b6c946)`); }
        if (!VALID_OUTER_SPACE_SUBTYPES.includes(spaceSubtype)) { throw new Error(`invalid/unknown spaceSubtype (${spaceSubtype}) (ERROR: 703ed1aee44447a294b3e1cf0984baba)`); }

        let txrxId = pieces[4];
        if (txrxId === null || txrxId === undefined) { throw new Error(`txrxId is null/undefined. (ERROR: 5de2861a6afb48e1a1c89d0402a4ea63)`); }

        return {statusCode, spaceType, spaceSubtype, txrxId, delimiter};
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Helper function that generates a unique-ish id.
 *
 * atow this is just `return (await h.getUUID()).slice(0, c.DEFAULT_TX_ID_LENGTH);`
 *
 * ## notes
 *
 * The thinking is that it only has to be a couple characters in length
 * because this is supposed to only be a unique id within the scope of
 * a tx which has its own tjp (gib) used as the id for the entire communication
 * saga.
 *
 * @returns txId
 */
export async function getNewTxId({
    length,
}: {
    /**
     * length of txId
     *
     * @default c.DEFAULT_TX_ID_LENGTH
     */
    length?: number,
} = { length: c.DEFAULT_TX_ID_LENGTH }): Promise<string> {
    const lc = `[${getNewTxId.name}]`;
    try {
        length = length || c.DEFAULT_TX_ID_LENGTH;
        return (await h.getUUID()).slice(0, length);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}