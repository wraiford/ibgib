/**
 * A Notifier is an ibgib that is an observer that will _politely_ ask to
 * observe another ibgib's interactions (register), with no expectations on
 * guarantees unless explicitly stated between the two (and even then,
 * best-effort always applies).
 *
 * IOW, you create a Notifier, pass it to another ibgib that you're interested
 * in observing via that ibgib's expected interface for registering an observer.
 * And then maybe that ibgib says yes or no, and maybe that ibgib shows you some
 * of its interactions, and maybe it tries to be helpful per your parameters, or
 * maybe it doesn't.
 *
 * Think of an Ambassador being sent to a foreign country.  Or if you're more
 * cynical, think of any representative in a "friendly" place. Basically think
 * of how human beings interact, with all of their byzantine ways.
 *
 * ## what is contained here vs what is in witness base class
 *
 * Observing is so fundamental with witness interactions, the functionality to
 * register/unregister/trigger observers is actually in the witness base class.
 * That code can always be overridden in descending classes.
 *
 * This class, however, should contain code explicitly regarding notification of
 * interested parties, analogous to firing events in the normal event messaging
 * sense.
 *
 * ## notes
 *
 * * I state here that a Notifier is an observer in the sense of the
 *   Observer Pattern in programming, but really it is a witness according
 *   to class hierarchy. A witness, though by its nature, is an observer
 *   but not necessarily one in the Observer Pattern sense.
 */

import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import {
    IbGibAddr, IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns
} from 'ts-gib';
import { Witness } from './witness';
import * as c from '../constants';

export interface IbGibNotifierData {
    /**
     * Name for the notifier.
     *
     * doesn't have to be unique.
     */
    name: string;
    /**
     * Optional description of the notifier.
     */
    description?: string;
    /**
     * "Should" be a unique identifier for the notifier.
     *
     * DEBUG Make this optional after compiler stuff DEBUG
     */
    uuid?: string;
    /**
     * Optional configuration for `witness` call.
     * If true, then this notifier will not catch an error in `witnessImpl`
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
     * Notifier implementations can check this value directly, or if
     * they descend from `WitnessBase`, then there is a property
     * that safely navigates this value.
     */
    trace?: boolean;
    /**
     * DOESNT WORK ATM - NOT IMPLEMENTED - HOOGLEDY BOOGLEDY
     * If true, any calls to `witness` will have the opt and result
     * ibGibs persisted to the notifier, regardless of what the actual
     * opt/result is.
     *
     * This is like providing a logging feature for the notifier itself.
     */
    persistOptsAndResultIbGibs?: boolean;
}

export interface IbGibNotifierRel8ns extends IbGibRel8ns_V1 {
}


/**
 * Cmds for interacting with ibgib notifiers.
 *
 * Not all of these will be implemented for every notifier.
 *
 * ## todo
 *
 * change these commands to better structure, e.g., verb/do/mod, can/get/addrs
 * */
export type IbGibNotifierOptionsCmd = 'get' | 'put' | 'delete';
/** Cmds for interacting with ibgib notifiers.  */
export const IbGibNotifierOptionsCmd = {
    /** Retrieve ibGib(s) out of the notifier (does not remove them). */
    get: 'get' as IbGibNotifierOptionsCmd,
    /** Registers/imports ibGib(s) into the notifier. */
    put: 'put' as IbGibNotifierOptionsCmd,
    /** Delete an ibGib from a notifier */
    delete: 'delete' as IbGibNotifierOptionsCmd,
}

/**
 * Flags to affect the command's interpretation.
 */
export type IbGibNotifierOptionsCmdModifier = 'can' | 'addrs' | 'latest';
/**
 * Flags to affect the command's interpretation.
 */
export const IbGibNotifierOptionsCmdModifier = {
    /**
     * Only interested if possibility to do command.
     *
     * This can be due to authorization or other.
     */
    can: 'can' as IbGibNotifierOptionsCmdModifier,
    /**
     * Only return the addresses of ibgibs
     */
    addrs: 'addrs' as IbGibNotifierOptionsCmdModifier,
    /**
     * Only interested in the latest one(s).
     *
     * The incoming addr(s) should be the tjp(s), since "latest"
     * only makes sense with unique timelines which are referenced by
     * their tjps.
     *
     * ## notes
     *
     * ATOW I'm actually using this in the aws dynamodb ibgib notifier to
     * get "newer" ibgibs, not just the latest.
     */
    latest: 'latest' as IbGibNotifierOptionsCmdModifier,
}

/** Information for interacting with notifiers. */
export interface IbGibNotifierOptionsData {
    /**
     * Not really in use atm, but will use in the future.
     */
    version?: string;
    cmd: IbGibNotifierOptionsCmd | string;
    /**
     * Optional modifier flag(s) to the command.
     *
     * ## notes
     *
     * An implementing class can always use/extend these or extend the interface
     * of the options data.
     */
    cmdModifiers?: (IbGibNotifierOptionsCmdModifier | string)[];
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

export interface IbGibNotifierOptionsRel8ns extends IbGibRel8ns_V1 {
}

export interface IbGibNotifierOptionsIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TOptsData extends IbGibNotifierOptionsData = IbGibNotifierOptionsData,
    // TOptsRel8ns extends IbGibNotifierOptionsRel8ns = IbGibNotifierOptionsRel8ns
    TOptsRel8ns extends IbGibNotifierOptionsRel8ns = IbGibNotifierOptionsRel8ns,
    > extends IbGibWithDataAndRel8ns<TOptsData, TOptsRel8ns> {
    /**
     * When putting ibGibs, we don't want to persist the entire graph in the
     * data object. So these ibGibs live on the ibGib arg object itself.
     */
    ibGibs?: TIbGib[];
}

export interface IbGibNotifierResultData {
    /**
     * The address of the options ibGib that corresponds this notifier result.
     *
     * So if you called `notifier.witness(opts)` which produced this result, this is
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
     * Addresses that are already in the notifier when requesting `put` or `canPut`.
     */
    addrsAlreadyHave?: IbGibAddr[];
    /**
     * Addresses for ibGibs which had errors.
     */
    addrsErrored?: IbGibAddr[];
}

export interface IbGibNotifierResultRel8ns extends IbGibRel8ns_V1 { }

export interface IbGibNotifierResultIbGib<
    TIbGib extends IbGib,
    TResultData extends IbGibNotifierResultData,
    TResultRel8ns extends IbGibNotifierResultRel8ns
    >
    extends IbGibWithDataAndRel8ns<TResultData, TResultRel8ns> {

    /**
     * When getting ibGibs, we don't want to persist the entire graph in the
     * data object. So these ibGibs live on the result ibGib object itself.
     */
    ibGibs?: TIbGib[];
}

/**
* Data notifier adapter/provider, such that a notifier should only have one type of...
*   * ibGib shape
*   * witness arg shape (which brings in external ibGibs)
*   * witness result shape
*
* So this interface facilitates that belief.
*/
export interface IbGibNotifier<
    TIbGib extends IbGib,
    TOptionsData extends IbGibNotifierOptionsData,
    TOptionsRel8ns extends IbGibNotifierOptionsRel8ns,
    TOptionsIbGib extends IbGibNotifierOptionsIbGib<TIbGib, TOptionsData, TOptionsRel8ns>,
    TResultData extends IbGibNotifierResultData,
    TResultRel8ns extends IbGibNotifierResultRel8ns,
    TResultIbGib extends IbGibNotifierResultIbGib<TIbGib, TResultData, TResultRel8ns>,
    TData extends IbGibNotifierData = IbGibNotifierData,
    TRel8ns extends IbGibNotifierRel8ns = IbGibRel8ns,
    >
    extends Witness<TOptionsIbGib, TResultIbGib, TData, TRel8ns> {
    witness(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;
}
