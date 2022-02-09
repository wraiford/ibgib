/**
 * @module outer-space
 * Outer spaces are spaces connecting local inner spaces.
 * ATOW there is just sync spaces, but definitely just the beginning.
 */

import { ReplaySubject } from 'rxjs/internal/ReplaySubject';
import { Subscription } from 'rxjs/internal/Subscription';

import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, Gib, Ib, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
    IbGibSpaceData, IbGibSpaceRel8ns,
    IbGibSpaceOptionsData, IbGibSpaceOptionsRel8ns, IbGibSpaceOptionsIbGib,
    IbGibSpaceOptionsCmdModifier,
    IbGibSpaceResultData, IbGibSpaceResultRel8ns, IbGibSpaceResultIbGib,
} from './space';
import { IbGibSpaceAny } from '../spaces/space-base-v1';

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
export type StatusCode =
    'undefined' | 'started' |
    'inserted' | 'updated' |
    'merged_dna' | 'merged_state' |
    'already_synced' |
    'completed';
export const StatusCode = {
    /**
     * Using this as the code for the parent primitive.
     */
    undefined: 'undefined' as StatusCode,
    /**
     * Communication between spaces has just started, but no evaluation as to
     * intrinsic ibgibs shared has been made.
     *
     * Using this for the start of the sync process, meaning the ball has begun
     * rolling, a metadata ibgib to track the operation has been created (but
     * not necessarily yet stored), but no intrinsic (non-meta) data has been
     * exchanged.
     */
    started: 'started' as StatusCode,
    /**
     * New insertion of ibgib(s) into the outerspace.
     *
     * The outerspace did not have the timeline or ibgib(s) at all, so this is
     * the first time.
     */
    inserted: 'inserted' as StatusCode,
    /**
     * Updated outerspace with local ibgib(s).
     *
     * The outerspace had the same timeline as the local space, just not as
     * recent.
     */
    updated: 'updated' as StatusCode,
    /**
     * When syncing, this means that we've created new ibgib to merge into an
     * existing timeline in the sync space BY APPLYING ALL UN-APPLIED LOCAL
     * TRANSFORMS to the latest ibgib in the store.
     *
     * Note that in this case, we've created new ibgib to fulfill the operation
     * (besides the derivative metadata ibgibs created in the communication).
     */
    merged_dna: 'merged_dna' as StatusCode,
    /**
     * When syncing, this means that we've created new ibgib to merge into an
     * existing timeline in the sync space BY MANUALLY SYNCHRONIZING ALL
     * DATA AND REL8NS with the latest ibgib in the store.
     *
     * Note that in this case, we've created new ibgib to fulfill the operation
     * (besides the derivative metadata ibgibs created in the communication).
     */
    merged_state: 'merged_state' as StatusCode,
    /**
     * The operation has completed, but there were no intrinsic changes.
     *
     * For example, if we were to sync an ibGib but it's already up-to-date in a
     * space, then we have generated metadata ibgibs. But *intrinsically* we have
     * not altered any timeline ibgibs or added any stone ibgibs.
     */
    already_synced: 'already_synced' as StatusCode,
    /**
     * Inter-spatial communication complete.
     *
     * * There should be no more status updates after this.
     * * syncStatus$ observable should be completed just after this.
     * * subscribers should unsubscribe if not already done.
     *   * I think this happens at the publishing end also, but always good
     *     to take care of your own cleanup if possible.
     *
     */
    completed: 'completed' as StatusCode,
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
    sagaId?: string;
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
    /**
     * If the space operation involves a saga, this is the id.
     */
    sagaId?: string;
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
    syncSagaInfo: SyncSagaInfo;
}

export interface SyncSpaceResultData extends OuterSpaceResultData {
    statusTjpAddr?: IbGibAddr;
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
    syncSagaInfo: SyncSagaInfo;
}

export interface SyncStatusData {
    /**
     * Status code for this status update.
     *
     * Note that this is also in the ib, which will be in each of the
     * statuses' `past` rel8n. This way, callers can easily tell which
     * kinds of actions were required.
     */
    statusCode: StatusCode;

    syncGib: string;
    // srcSpaceId: string;
    // srcSpaceGib: string;
    participants: ParticipantInfo[];

    /**
     * Explicit re-declaration from base data, just to remind us...I guess...
     *
     * This indicates if this status ibgib is the tjp for the status line.
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
     * When putting, this is the list of ibGibs we don't need/want (or refuse)
     * to send.
     *
     * IGNORED ATOW
     *
     * ## notes
     *
     * Not really sure about this atow, since the aws-dynamo space is not a true
     * communication between two separate nodes. Just figure someone will have a
     * reason for it in the future.
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
     * A receiving space can set this to indicate to the transmitter that it
     * does not need/want these, possibly because they already have them or just
     * are not interested in them.
     *
     * ## notes
     *
     * ATOW this will only be because the receiver already has these addresses.
     */
    notToRx?: IbGibAddr[];

    /**
     * Flag to indicate that THIS STEP in communication (part of a saga) had no
     * errors.
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
     *
     * ## notes
     *
     * atow my error workflow is pretty minimal. So I think if any error happens
     * the entire saga gets nixed...
     *
     * But it should be that this type of behavior should be determined by
     * on-chain ibgibs that correspond to consensus behavior contracts (with a
     * default behavior ultimately existing hard-coded in source).
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
    didMergeMap?: {[oldAddr: string]: IbGibAddr };
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
    /**
     * List of ibgibs that were actively transmitted from the receiving
     * space to the sending space.
     *
     * ## notes
     *
     * * During a sync operation, any ibgibs that start in the sync space
     *   and are "sent" to the local space during the sync operation that
     *   did not originate from the local space will be here.
     */
    didTx?: IbGibAddr[];
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
    statusIbGibGraph: IbGib_V1[],
    /**
     * Ibgibs that were created as side effects from a merge.
     *
     * ## notes
     *
     * This happens when you apply one or more local transforms to
     * a timeline in the store that has already been changed by some
     * other space (other than local that is).
     */
    createdIbGibs?: IbGib_V1[];
    /**
     * Ibgibs that are only found in the store and not locally.
     *
     * ## notes
     *
     * This happens when ibgibs were created in some other space.
     */
    storeOnlyIbGibs?: IbGib_V1[];
    /**
     * This is a map of the local space "oldAddr" to the ultimately
     * most recent ibgib address in the outer/sync space.
     *
     * ## notes
     *
     * You will need to also download the createdIbGibs and/or storeOnlyIbGibs
     * which will contain the dependency graph between these two endpoints in
     * each map entry here from old addr -> new addr.
     *
     * It is assumed that the local address already has all of the rest of the
     * dependencies for `oldAddr`.
     */
    ibGibsMergeMap?: { [oldAddr: string]: IbGib_V1 };
}

export interface SagaInfo<
    TIbGib extends IbGib_V1,
    TSpaceOptionsData extends OuterSpaceOptionsData,
    TSpaceOptionsRel8ns extends OuterSpaceOptionsRel8ns,
    TSpaceOptionsIbGib extends OuterSpaceOptionsIbGib<TIbGib, TSpaceOptionsData, TSpaceOptionsRel8ns>,
    TSpaceResultData extends OuterSpaceResultData,
    TSpaceResultRel8ns extends OuterSpaceResultRel8ns,
    TSpaceResultIbGib extends OuterSpaceResultIbGib<TIbGib, TSpaceResultData, TSpaceResultRel8ns>,
    TStatusIbGib extends TIbGib,
    > {
    /**
     * UUID generated at the beginning of a sync Id generated
     */
    sagaId: string;
    syncSpace: IbGibSpaceAny;
    //   spaceGib: string;
    spaceId: string;
    participants: ParticipantInfo[];

    complete?: boolean;

    /**
     * Only publishes values after subscribed.
     */
    syncStatus$: ReplaySubject<TStatusIbGib>;
    syncStatusSubscriptions: Subscription[];

    /**
     * For each communication saga, there will be one or more calls to
     * each space's `witness` function. This will produce arg & result
     * ibgibs. This is the observable stream/subject of those witness
     * calls.
     */
    witnessFnArgsAndResults$: ReplaySubject<TSpaceOptionsIbGib|TSpaceResultIbGib>;

    // /**
    //  * ORDERED list of status ibGibs in the order that they are
    //  * published to syncStatus$.
    //  */
    // syncStatusIbGibs: SyncStatusIbGib[];

    syncIbGibs_All: IbGib_V1[];
    syncAddrs_All: IbGibAddr[];
    syncAddrs_All_Tjps: IbGibAddr[];
    syncAddrs_All_NonTjps: IbGibAddr[];
    syncAddrs_Skipped: IbGibAddr[];
    syncAddrs_ToDo: IbGibAddr[];
    syncAddrs_InProgress: IbGibAddr[];
    syncAddrs_Failed: IbGibAddr[];

}

/**
 * Information about a sync operation over its entirety.
 *
 * ## notes
 *
 * This will be attached to each space arg/result ibgib, but
 * this info object WILL NOT be part of the internal `data`
 * of either arg or result ibGib.
 */
export interface SyncSagaInfo
    extends SagaInfo<
        IbGib_V1,
        SyncSpaceOptionsData,
        SyncSpaceOptionsRel8ns,
        SyncSpaceOptionsIbGib,
        SyncSpaceResultData,
        SyncSpaceResultRel8ns,
        SyncSpaceResultIbGib,
        SyncStatusIbGib> {
}

// export interface SyncCycleInfo {
//     arg: SyncSpaceOptionsIbGib;
//     result?: SyncSpaceResultIbGib;
// }

/**
 * AWS-specific outerspace type
 */
export type AWSRegion = 'us-east-1' | string;

export interface StatusIbInfo {
    /**
     * Code for the given status.
     *
     */
    statusCode: StatusCode,
    spaceType: OuterSpaceType,
    spaceSubtype: OuterSpaceSubtype,
    sagaId: string,
    delimiter?: string,
}

/**
 * Composes ib with given params info.
 *
 * @returns ib string with given info encoded
 */
export function getStatusIb({
    sagaId,
    statusCode,
    spaceType,
    spaceSubtype,
    delimiter,
}: StatusIbInfo): string {
    const lc = `[${getStatusIb.name}]`;
    try {
        if (!sagaId) { throw new Error(`sagaId required. (E: cfc923bb29ee4aa788e947b6416740e6)`); }
        if (statusCode === null || statusCode === undefined) { throw new Error(`status code required. (E: 4e0d232a9955496695012623c2e17ca2)`); }
        if (!Object.values(StatusCode).includes(statusCode)) { throw new Error(`invalid status code (${statusCode}) (E: 91d7655424c44d9680fff099ee2b54d2)`); }
        if (!spaceType) { throw new Error(`spaceType required. (E: 86e98694a56a4f599e98e50abf0eed43)`); }
        if (!spaceSubtype) { throw new Error(`spaceSubtype required. (E: 4857d4677ee34e95aeb2251dd633909e)`); }

        delimiter = delimiter || c.OUTER_SPACE_DEFAULT_IB_DELIMITER;

        return `status ${sagaId} ${statusCode} ${spaceType} ${spaceSubtype}`;
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
        if (!statusIb) { throw new Error(`statusIb required. (E: 09e23e8622cf456cadb0c3d0aadc3be9)`); }

        delimiter = delimiter || c.OUTER_SPACE_DEFAULT_IB_DELIMITER;

        // atow `status ${sagaId} ${statusCode} ${spaceType} ${spaceSubtype}`;
        const pieces = statusIb.split(delimiter);

        const sagaId = pieces[1];
        if (sagaId === null || sagaId === undefined) { throw new Error(`sagaId is null/undefined. (E: 5de2861a6afb48e1a1c89d0402a4ea63)`); }

        const statusCode = <StatusCode>pieces[2]; // tenatively cast as StatusCode
        if (!Object.values(StatusCode).includes(statusCode)) { throw new Error(`invalid/unknown status code (${statusCode}) (E: 7580860df7b344b3992148552e80a85e)`); }

        const spaceType = <OuterSpaceType>pieces[3];
        if (spaceType === null || spaceType === undefined) { throw new Error(`spaceType is null/undefined. (E: 12473d35e77b451bb59bb05c03cb8b64)`); }
        if (!VALID_OUTER_SPACE_TYPES.includes(spaceType)) { throw new Error(`invalid/unknown spaceType (${spaceType}) (E: d3ba9add427f49dda34f265f3225d9db)`); }

        const spaceSubtype = <OuterSpaceSubtype>pieces[4];
        if (spaceSubtype === null || spaceSubtype === undefined) { throw new Error(`spaceSubtype is null/undefined. (E: 6da7ae919d0b4a22b4ee685520b6c946)`); }
        if (!VALID_OUTER_SPACE_SUBTYPES.includes(spaceSubtype)) { throw new Error(`invalid/unknown spaceSubtype (${spaceSubtype}) (E: 703ed1aee44447a294b3e1cf0984baba)`); }

        return {statusCode, spaceType, spaceSubtype, sagaId, delimiter};
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