
import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns } from 'ts-gib';
import { Witness, WitnessData_V1 } from './witness';
import * as c from '../constants';

export interface IbGibSpaceData extends WitnessData_V1 {
    version?: string;
    /**
     * Name for the space.
     *
     * doesn't have to be unique.
     */
    name: string;
    /**
     * Optional description of the space.
     */
    description?: string;
    /**
     * "Should" be a unique identifier for the space.
     *
     * DEBUG Make this optional after compiler stuff DEBUG
     */
    uuid?: string;
    /**
     * Optional configuration for `witness` call.
     * If true, then this space will not catch an error in `witnessImpl`
     * function.
     *
     * ## notes
     *
     * Descendants of Witness who don't override the base `witness` function
     * (but rather override `witnessImpl` as expected) don't need to check
     * for this explicitly, since it is referenced in the base `witness`
     * function implementation.
     */
    catchAllErrors?: boolean;
    /**
     * Optional arg for verbose logging.
     *
     * Space implementations can check this value directly, or if
     * they descend from `WitnessBase`, then there is a property
     * that safely navigates this value.
     */
    trace?: boolean;
    /**
     * DOESNT WORK ATM - NOT IMPLEMENTED - HOOGLEDY BOOGLEDY
     * If true, any calls to `witness` will have the opt and result
     * ibGibs persisted to the space, regardless of what the actual
     * opt/result is.
     *
     * This is like providing a logging feature for the space itself.
     */
    persistOptsAndResultIbGibs?: boolean;
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
    'can' | 'addrs' | 'latest' | 'watch' | 'unwatch';
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
}

/** Information for interacting with spaces. */
export interface IbGibSpaceOptionsData {
    /**
     * Not really in use atm, but will use in the future.
     */
    version?: string;
    /**
     * Spaces use the command pattern. The `cmd` property is the name of the
     * command, analogous to a function name.
     */
    cmd: IbGibSpaceOptionsCmd | string;
    /**
     * Optional modifier flag(s) to the command.
     *
     * ## notes
     *
     * An implementing class can always use/extend these or extend the interface
     * of the options data.
     */
    cmdModifiers?: (IbGibSpaceOptionsCmdModifier | string)[];
    /**
     * Addrs of ibgibs to get/delete
     */
    ibGibAddrs?: IbGibAddr[];
    /**
     * If putting, this will force replacing the file.
     *
     * ## intent
     * atow this is just for `put` commands.
     */
    force?: boolean;
    /**
     * {@see WitnessBase_V1.trace}
     */
    catchAllErrors?: boolean;
    /**
     * {@see WitnessBase_V1.trace}
     */
    trace?: boolean;
}

export interface IbGibSpaceOptionsRel8ns extends IbGibRel8ns_V1 {
}

export interface IbGibSpaceOptionsIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TOptsData extends IbGibSpaceOptionsData = IbGibSpaceOptionsData,
    // TOptsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns
    TOptsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns,
    > extends IbGibWithDataAndRel8ns<TOptsData, TOptsRel8ns> {
    /**
     * When putting ibGibs, we don't want to persist the entire graph in the
     * data object. So these ibGibs live on the ibGib arg object itself.
     *
     * If only ibGibs are passed in, and not their corresponding ibGibAddrs in
     * the `TOptsData`, then you can't confirm cryptographically if the ibGibs
     * are legit.  But if you include their corresponding ibGibAddrs in that
     * data, then the space can confirm that the ibGibs have not been altered
     * from the expected cryptographic audit trail.
     *
     * This doesn't mean that the ibGibs are kosher completely, but at least
     * there is internal agreement and an audit trail.
     *
     * ## example
     *
     * For an example, check out sync space saga
     */
    ibGibs?: TIbGib[];
}

/**
 * Shape of result data common to all (most) space interactions.
 */
export interface IbGibSpaceResultData {
    /**
     * The address of the options ibGib that corresponds this space result.
     *
     * So if you called `space.witness(opts)` which produced this result, this is
     * `getIbGibAddr({ibGib: opts})`.
     *
     * Perhaps I should have this as a rel8n on the actual result ibGib instead of here
     * in the data.
     */
    optsAddr: IbGibAddr;
    /**
     * true if the operation executed successfully.
     *
     * If this is a `canGet` or `canPut` `cmd`, this does NOT indicate if you
     * can or can't. For that, see the `can` property of this interface.
     */
    success?: boolean;
    /**
     * If the `cmd` is `canGet` or `canPut`, this holds the result that indicates
     * if you can or can't.
     */
    can?: boolean;
    /**
     * Any error messages go here. If this is populated, then the `success`
     * *should* be false (but obvious the interface can't guarantee implementation).
     */
    errors?: string[];
    /**
     * Any warnings that don't cause this operation to explicitly fail, i.e. `errors`
     * is falsy/empty.
     */
    warnings?: string[];
    /**
     * If getting address(es), they will be here.
     */
    addrs?: IbGibAddr[];
    /**
     * Addresses not found in a get.
     */
    addrsNotFound?: IbGibAddr[];
    /**
     * Addresses that are already in the space when requesting `put` or `canPut`.
     */
    addrsAlreadyHave?: IbGibAddr[];
    /**
     * Addresses for ibGibs which had errors.
     */
    addrsErrored?: IbGibAddr[];
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

export interface IbGibSpaceResultRel8ns extends IbGibRel8ns_V1 { }

export interface IbGibSpaceResultIbGib<
    TIbGib extends IbGib,
    TResultData extends IbGibSpaceResultData,
    TResultRel8ns extends IbGibSpaceResultRel8ns
    >
    extends IbGibWithDataAndRel8ns<TResultData, TResultRel8ns> {

    /**
     * When getting ibGibs, we don't want to persist the entire graph in the
     * data object. So these ibGibs live on the result ibGib object itself.
     */
    ibGibs?: TIbGib[];
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
