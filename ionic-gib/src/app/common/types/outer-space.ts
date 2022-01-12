import { GIB, IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, Gib, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import {
    IbGibSpaceData, IbGibSpaceRel8ns,
    IbGibSpaceOptionsData, IbGibSpaceOptionsRel8ns, IbGibSpaceOptionsIbGib,
    IbGibSpaceOptionsCmdModifier,
    IbGibSpaceResultData, IbGibSpaceResultRel8ns, IbGibSpaceResultIbGib,
} from './space';
import { Subject } from 'rxjs/internal/Subject';

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


/**
 * Options shape specific to OuterSpaces.
 * Marker interface only atm.
 */
export interface OuterSpaceOptionsData extends IbGibSpaceOptionsData {
    cmdModifiers?: (OuterSpaceOptionsCmdModifier | string)[];
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
     * Each Sync has a transmission Id (`txId`) associated with it.
     *
     * If this is specified, then it means the sync cmd is associated with
     * an existing/ongoing operation.
     */
    txId?: string;
}
export interface SyncSpaceOptionsRel8ns extends OuterSpaceOptionsRel8ns {
}
export interface SyncSpaceOptionsIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TOptsData extends SyncSpaceOptionsData = SyncSpaceOptionsData,
    TOptsRel8ns extends SyncSpaceOptionsRel8ns = SyncSpaceOptionsRel8ns,
    > extends OuterSpaceOptionsIbGib<TIbGib, TOptsData, TOptsRel8ns> {
    syncStatus$: Subject<SyncStatusIbGib>;
}

export interface SyncSpaceResultData extends OuterSpaceResultData {
}
export interface SyncSpaceResultRel8ns extends OuterSpaceResultRel8ns {
}
export interface SyncSpaceResultIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TResultData extends SyncSpaceResultData = SyncSpaceResultData,
    TResultRel8ns extends SyncSpaceResultRel8ns = SyncSpaceResultRel8ns
> extends OuterSpaceResultIbGib<TIbGib, TResultData, TResultRel8ns> {
    syncStatus$: Subject<SyncStatusIbGib>;
}

export interface SyncStatusData {
    /**
     * Id for the individual transmission
     */
    txId: string;
    code: 'starting',
    /**
     * Explicit declaration
     */
    isTjp?: boolean;
    needs?: IbGibAddr[];

    success?: boolean;
    complete?: boolean;
    warnings?: string[];
    errors?: string[];

    createdIbGibAddrs?: IbGibAddr[];
    createdIbGibs?: IbGib_V1[];
}
export interface SyncStatusRel8ns extends IbGibRel8ns_V1 {
    created?: IbGibAddr[];
    final?: IbGibAddr[];
}

/**
 * IbGib that tracks/logs the entire syncing process.
 *
 * ## stages
 */
export interface SyncStatusIbGib extends IbGib_V1<SyncStatusData, SyncStatusRel8ns> {
    createdIbGibs?: IbGib_V1[];
    finalIbGib?: IbGib_V1;
}

/**
 * AWS-specific outerspace type
 */
export type AWSRegion = 'us-east-1' | string;

export function getStatusIb({
    spaceType,
    spaceSubtype,
    txId,
    delimiter,
    tjpGib,
}: {
    spaceType: OuterSpaceType,
    spaceSubtype: OuterSpaceSubtype,
    txId: string,
    delimiter?: string,
    tjpGib?: Gib,
}): string {
    const lc = `[${getStatusIb.name}]`;
    try {
        if (!spaceType) { throw new Error(`spaceType required. (ERROR: 86e98694a56a4f599e98e50abf0eed43)`); }
        if (!spaceSubtype) { throw new Error(`spaceSubtype required. (ERROR: 4857d4677ee34e95aeb2251dd633909e)`); }
        if (!txId) { throw new Error(`txId required. (ERROR: cfc923bb29ee4aa788e947b6416740e6)`); }
        if (!tjpGib) { throw new Error(`tjpGib required. (ERROR: 98ddf2fa9d514f6daf03a5dc50cd9de7)`); }

        delimiter = delimiter || c.OUTER_SPACE_DEFAULT_IB_DELIMITER;

        return `status ${spaceType} ${spaceSubtype} ${tjpGib} ${txId}`;
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