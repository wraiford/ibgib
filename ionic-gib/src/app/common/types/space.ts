import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns } from 'ts-gib';

import * as c from '../constants';
import { Witness, WitnessCmdData, WitnessCmdIbGib, WitnessCmdRel8ns, WitnessData_V1, WitnessResultData, WitnessResultIbGib, WitnessResultRel8ns } from './witness';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { TjpIbGibAddr } from './ibgib';

/**
 * Marker type to show intent that it should be the spaceId, i.e.
 * space.data.uuid.
 */
export type SpaceId = string;

/**
 * Common data among all ibgib spaces.
 */
export interface IbGibSpaceData extends WitnessData_V1 {
    /**
     * redeclaration for the name of the space, to make it required as opposed
     * to the base declaration which is optional.
     *
     * does NOT have to be unique.
     */
    name: string;
    /**
     * Redeclared over {@link WitnessData_V1.uuid} just for code readability,
     * showing the id to be a {@link SpaceId}, as well making it a required
     * field.
     */
    uuid: SpaceId;
    /**
     * If true, when this space receives a command that includes incoming ibGibs
     * and ibGibAddrs, we will ensure the ibGibs have a 1-to-1 correspondence to
     * the addrs we're logging, and that the gib hashes are verified against the
     * ibGibs themselves.
     *
     * Otherwise, someone could pass in a bunch of legitimate addresses and
     * illegitimate ibGibs (that have little to do with the addresses). This
     * could at best be a coding mistake & at worst be malicious.
     */
    validateIbGibAddrsMatchIbGibs?: boolean;
    /**
     * interval between polling calls made to other spaces, e.g. sync spaces,
     * or used within a space to check inside itself for updates.
     *
     * ## notes
     *
     * * use as needed
     * * I want to just have this as a sync space setting, but since they are
     *   enciphered, I don't want to just have them sitting around in plaintext.
     *   * So I'm going to have it in the local app space, which the ibgibs
     *     service will check in order for it to decide on interval.
     *   * definitely a code smell, but I'm still resolving what a local app
     *     space is vs the service that accesses it.
     */
    longPollingIntervalMs?: number;
}

export interface IbGibSpaceRel8ns extends IbGibRel8ns_V1 {
    [c.ENCRYPTION_REL8N_NAME]?: IbGibAddr[];
}


/**
 * Cmds for interacting with ibgib spaces.
 *
 * Not all of these will be implemented for every space.
 *
 * ## todo
 *
 * change these commands to better structure, e.g., verb/do/mod, can/get/addrs
 * */
export type IbGibSpaceOptionsCmd =
    'get' | 'put' | 'delete';
/** Cmds for interacting with ibgib spaces.  */
export const IbGibSpaceOptionsCmd = {
    /** Retrieve ibGib(s) out of the space (does not remove them). */
    get: 'get' as IbGibSpaceOptionsCmd,
    /** Registers/imports ibGib(s) into the space. */
    put: 'put' as IbGibSpaceOptionsCmd,
    /** Delete an ibGib from a space */
    delete: 'delete' as IbGibSpaceOptionsCmd,
}

/**
 * Flags to affect the command's interpretation.
 */
export type IbGibSpaceOptionsCmdModifier =
    'can' | 'addrs' | 'latest' | 'watch' | 'unwatch' | 'tjps';
/**
 * Flags to affect the command's interpretation.
 */
export const IbGibSpaceOptionsCmdModifier = {
    /**
     * Only interested if possibility to do command.
     *
     * This can be due to authorization or other.
     */
    can: 'can' as IbGibSpaceOptionsCmdModifier,
    /**
     * Only return the addresses of ibgibs
     */
    addrs: 'addrs' as IbGibSpaceOptionsCmdModifier,
    /**
     * Only interested in the latest one(s).
     *
     * The incoming addr(s) should be the tjp(s), since "latest"
     * only makes sense with unique timelines which are referenced by
     * their tjps.
     *
     * ## notes
     *
     * ATOW I'm actually using this in the aws dynamodb ibgib space to
     * get "newer" ibgibs, not just the latest.
     */
    latest: 'latest' as IbGibSpaceOptionsCmdModifier,
    /**
     * Ask to get updates on tjps in ibGibAddrs.
     */
    watch: 'watch' as IbGibSpaceOptionsCmdModifier,
    /*
     * Ask to stop getting updates on tjps in ibGibAddrs.
     */
    unwatch: 'unwatch' as IbGibSpaceOptionsCmdModifier,
    /**
     * Get the tjp ibgibs/addrs for given ibgib(s)
     */
    tjps: 'tjps' as IbGibSpaceOptionsCmdModifier,
}

/** Information for interacting with spaces. */
export interface IbGibSpaceOptionsData
    extends WitnessCmdData<IbGibSpaceOptionsCmd, IbGibSpaceOptionsCmdModifier> {
    /**
     * If putting, this will force replacing the file.
     *
     * ## intent
     * atow this is just for `put` commands.
     */
    force?: boolean;
    /**
     */
    catchAllErrors?: boolean;
    /**
     */
    trace?: boolean;
}

export interface IbGibSpaceOptionsRel8ns extends WitnessCmdRel8ns {
}

export interface IbGibSpaceOptionsIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TOptsData extends IbGibSpaceOptionsData = IbGibSpaceOptionsData,
    // TOptsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns
    TOptsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns,
    > extends WitnessCmdIbGib<TIbGib, IbGibSpaceOptionsCmd, IbGibSpaceOptionsCmdModifier, TOptsData, TOptsRel8ns> {
}

/**
 * Shape of result data common to all (most) space interactions.
 *
 * This is in addition of course to {@link WitnessResultData}.
 */
export interface IbGibSpaceResultData extends WitnessResultData {
    /**
     * If the `cmd` is `canGet` or `canPut`, this holds the result that indicates
     * if you can or can't.
     */
    can?: boolean;
    /**
     * Addresses not found in a get.
     */
    addrsNotFound?: IbGibAddr[];
    /**
     * Addresses that are already in the space when requesting `put` or `canPut`.
     */
    addrsAlreadyHave?: IbGibAddr[];
    /**
     * Result map used when
     *
     * Mapping of incoming ibGibAddr -> latestAddr | null
     *
     * If there is a tjp/timeline -> maps to the latest in the store.
     * If there is no tjp -> maps to the incoming addr.
     * If the incoming addr is not found in the store -> maps to null.
     */
    latestAddrsMap?: { [addr: string]: IbGibAddr | null }
    /**
     * Map of TjpAddr -> newer LatestIbGibAddr notification.
     *
     * ## about
     *
     * When using the `watch` command modifier, a caller can subscribe to
     * updates/notifications to a timeline. When an update occurs in the space
     * via a `put` cmd that ends up creating/storing a newer ibgib address than
     * the one the receiving space knows the caller is aware of, it will try to
     * make the caller aware of the update.
     *
     * There are two ways to do this:
     * 1. Store the notification info locally until the next interaction between
     *    the space and the caller.
     * 2. Send the notification actively to the caller.
     *
     * For the first implementation of notifications, only the first will be
     * implemented. Local notifications will be implemented, but active
     * internodal notification in the general sense will be implemented at a
     * later time.
     *
     * ## notes
     *
     * * may also implement a dedicated command to watch subscriptions.
     */
    watchTjpUpdateMap?: { [tjpAddr: string]: IbGibAddr; }
}

export interface IbGibSpaceResultRel8ns extends WitnessResultRel8ns { }

export interface IbGibSpaceResultIbGib<
    TIbGib extends IbGib,
    TResultData extends IbGibSpaceResultData,
    TResultRel8ns extends IbGibSpaceResultRel8ns
    >
    extends WitnessResultIbGib<TIbGib, TResultData, TResultRel8ns> {
}

/**
* Data space adapter/provider, such that a space should only have one type of...
*   * ibGib shape
*   * witness arg shape (which brings in external ibGibs)
*   * witness result shape
*
* So this interface facilitates that belief.
*/
export interface IbGibSpace<
    TIbGib extends IbGib,
    TOptionsData extends IbGibSpaceOptionsData,
    TOptionsRel8ns extends IbGibSpaceOptionsRel8ns,
    TOptionsIbGib extends IbGibSpaceOptionsIbGib<TIbGib, TOptionsData, TOptionsRel8ns>,
    TResultData extends IbGibSpaceResultData,
    TResultRel8ns extends IbGibSpaceResultRel8ns,
    TResultIbGib extends IbGibSpaceResultIbGib<TIbGib, TResultData, TResultRel8ns>,
    TData extends IbGibSpaceData = IbGibSpaceData,
    TRel8ns extends IbGibSpaceRel8ns = IbGibRel8ns,
    >
    extends Witness<TOptionsIbGib, TResultIbGib, TData, TRel8ns> {
    witness(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;
}

export type SpaceLockAction = 'lock' | 'unlock';
export type SpaceLockScope = 'all' | TjpIbGibAddr;

/**
 * Data shape for {@link IbGibSpaceLockIbGib}.
 *
 * This includes the options passed in and contains any result data of the lock
 * as well.
 */
export interface IbGibSpaceLockData {
    /**
     * In-memory unique identifier associated with the lock.
     *
     * ## intent
     *
     * I intend this mainly as a device for differentiating among multiple
     * tabs open on the same browser. These share the same IndexedDB instance
     * (and thus the same space bucket), but they have different caching
     * mechanisms and interfaces to this bucket.
     */
    instanceId?: string;
    /**
     * self-explanatory
     */
    // action?: SpaceLockAction;
    /**
     * When setting the lock, this was the maximum amount of time the lock is
     * valid.
     *
     * {@link expirationUTC}
     */
    secondsValid?: number;
    /**
     * When setting the lock, this was the calculated expiration string based on
     * {@link secondsValid}.
     *
     * If the lock is not manually released, this will determine if the lock is
     * adhered to.
     */
    expirationUTC?: string;
    /**
     * The scope to which the lock applies.
     */
    scope: SpaceLockScope;
    /**
     * True if space was already locked.
     */
    alreadyLocked?: boolean;
    /**
     * True if caller's request to lock the space was executed.
     */
    success?: boolean;
    /**
     * If errored, this is the message.
     */
    errorMsg?: string;
}

/**
 * Options for the function that locks a space.

 * {@link IbGibSpaceLockData}
 * {@link IbGibSpaceLockIbGib}
 */
export interface IbGibSpaceLockOptions extends IbGibSpaceLockData {
    /**
     * the space to lock/unlock
     */
    space: IbGibSpaceAny;
}

/**
 * Rel8ns shape for {@link IbGibSpaceLockIbGib}
 *
 * marker interface atm
 */
export interface IbGibSpaceLockRel8ns extends IbGibRel8ns_V1 { }

/**
 * When locking a space, this is the ibGib that contains informatino regarding
 * the process. This includes if the lock was successful, how long the lock is
 * good for, etc.
 *
 * ## notes
 *
 * * This is meant to be completely ephemeral and there will be no gib. There
 *   may be many calls to lock/release in tight loops and atow it wouldn't seem
 *   provide us with much benefit to store this kind of metadata.
 */
export interface IbGibSpaceLockIbGib
    extends IbGib_V1<IbGibSpaceLockData, IbGibSpaceLockRel8ns> {

}


/**
 * Data of a {@link BootstrapIbGib}
 */
export interface BootstrapData {
    /**
     * this id will be the default space of the bootstrap (meta space).
     *
     * The `bootstrapIbGib.rel8ns` will contain links to the space addresses,
     * with `rel8nName === spaceId`.
     *
     * So to get the default space, you need the default space address. To get
     * that address, you first read this data value, then index into
     * `bootstrap.rel8ns[spaceId]`.
     */
    [c.BOOTSTRAP_DATA_DEFAULT_SPACE_ID_KEY]: SpaceId;
    /**
     * List of known spaces in this bootstrap. These should be rel8n names in
     * the bootstrap's `rel8ns` map.
     */
    [c.BOOTSTRAP_DATA_KNOWN_SPACE_IDS_KEY]: SpaceId[];
}

/**
 * Rel8ns of a {@link BootstrapIbGib}
 *
 * atow, these will have rel8nNames of [spaceId] that point to the corresponding
 * latest spaceAddr, such that the length is always === 1.
 */
export interface BootstrapRel8ns extends IbGibRel8ns_V1 {
    // [c.BOOTSTRAP_REL8N_NAME_SPACE]: IbGibAddr[];
}

/**
 * When the application first starts, it looks to bootstrap itself.  So it will
 * look for an ibgib with this "primitive" address, i.e. where the gib is the
 * string literal 'gib'. It looks for this address inside what is called the
 * "zero space". This is a default space with default parameters that always
 * points to the same location, relative to the context (app in our current case,
 * but in the future the context could be e.g. an IoT device or AI microservice).
 *
 * So the context execution starts, creating a default zero space ibgib in
 * memory, which itself has a default location/parameters that the space looks
 * in in storage. Here it looks for the bootstrap ibgib with a known address
 * "bootstrap^gib" (atow). Inside that bootstrap ibgib, there should be at least
 * one local space referenced, or a new one must be created and then stored here
 * for future app/context startups.
 *
 * Spaces are rel8d by their `spaceId`'s in `ibgib.rel8ns`, and the `ibgib.data`
 * key (`ibgib.data.defaultSpaceId` atow) contains the default `spaceId`.  If
 * there are multiple local spaces that the bootstrap ibgib knows about, there
 * will be only one "default" set.
 *
 * ## first run
 *
 * @see {@link IbgibsService.createNewLocalSpaceAndBootstrapGib}
 * @see {@link getLocalSpace} in `helper/space.ts`
 *
 * A new local space will be created, whose parameters (including its `uuid`
 * which is its `spaceId`) contribute to its reiffied gib hash. A new bootstrap
 * ibgib is created, and in its `bootstrapIbGib.data.defaultSpaceId` we set the
 * newly created local space's id. We then rel8 the space to the bootstrap also
 * via this spaceId as the rel8nName.
 *
 * Note that when the local space is updated, its most recent address must
 * replace the address that the bootstrap ibgib is pointing to.
 *
 * @example
 *
 * Here is a copy of a bootstrap^gib.json file on March 30, 2022:
 * ```
 * {
 *   "ib":"bootstrap",
 *   "gib":"gib",
 *   "data":{
 *     "defaultSpaceId":"72af3bba9c6da224829de86982346e283469823e49862398a56510c238bad869",
 *     "spaceIds":["72af3bba9c6da224829de86982346e283469823e49862398a56510c238bad869"]
 *   },
 *   "rel8ns":{
 *     "72af3bba9c6da224829de86982346e283469823e49862398a56510c238bad869": [
 *       "witness space IonicSpace_V1 test_space_name 72af3bba9c6da224829de86982346e283469823e49862398a56510c238bad869^62879B18C2726D27262626552672868923477EE09171626A386C1982F392AC26"
 *     ]
 *   }
 * }
 * ```
 *
 * ## notes
 *
 * Usually primitives are not stored/persisted. This is because the `gib`
 * indicates that there is no hash corroboration ("guarantee") to the internal
 * data or rel8ns. However, a newly started app has to start somewhere. This
 * offers an alternative to using app storage and streamlines the app overall,
 * since instead of working with two stores (in Ionic: `Storage` and
 * `FileSystem`) we will just be working with one (`FileSystem`).
 *
 * In the future, we'll want to do a workflow here where the user
 * can start from an existing space, but for now it's just located
 * here.
 */
export interface BootstrapIbGib
    extends IbGib_V1<BootstrapData, BootstrapRel8ns> {

}

/**
 * Marker type to indicate that a string is meant to be a transmission id.
 */
export type TxId = 'string';
