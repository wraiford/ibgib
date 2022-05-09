import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns, IbGibAddr } from 'ts-gib';

/**
 * A witness is a lot like an ibGib analog for a function.
 * Now remember in FP, a function takes a single arg, and
 * multiple args are actually reified single-arg functions
 * that are curried.
 *
 * So an ibGib witness is an ibGib that has a single function: `witness`.
 * What can it witness? Another ibGib. What does it return? An ibGib.
 *
 * ## notes
 *
 * I'm not smart enough to descend this from just IbGib, so I'm doing
 * IbGibwithDataAndRel8ns. This is more of a convenience anyway.
 */
export interface Witness<
    TIbGibIn extends IbGib,
    TIbGibOut extends IbGib,
    TData = any,
    TRel8ns extends IbGibRel8ns = IbGibRel8ns,
    >
    extends IbGibWithDataAndRel8ns<TData, TRel8ns> {
    witness(arg: TIbGibIn): Promise<TIbGibOut | undefined>;
}

/**
 * Data that corresponds to all witnesses being implemented in V1.
 *
 * This should be expanded only sparingly, and all properties should be optional.
 */
export interface WitnessData_V1 {
    /**
     * @optional string for tracking version control of witness.
     */
    version?: string;
    /**
     * @optional Name for the witness.
     */
    name?: string;
    /**
     * @optional classname of the witness.
     */
    classname?: string;
    /**
     * @optional description of the witness.
     */
    description?: string;
    /**
     * @optional
     *
     * If true, then this will allow primitive args when validating incoming
     * args.
     *
     * so if you want a witness to be able to witness, e.g., "16816^gib", then
     * set this to truthy. Otherwise, this will flag this as a validation error.
     */
    allowPrimitiveArgs?: boolean;
    /**
     * If true, any calls to `witness` should have the opt and result ibGibs
     * persisted, regardless of what the actual opt/result is. This is
     * ultimately up to the witness itself though.
     *
     * This is like providing a persistent logging feature for the witness
     * itself, as opposed to ephemeral logging via {@link trace}.
     *
     * ## implementation
     *
     * In the case of V1, WitnessBase_V1<...> has an empty function
     */
    persistOptsAndResultIbGibs?: boolean;
    /**
     * @optional
     *
     * "Should" be a unique identifier for the witness.
     */
    uuid?: string;
    /**
     * @optional configuration for `witness` call.
     *
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
     * @optional arg for verbose logging.
     *
     * Space implementations can check this value directly, or if
     * they descend from `WitnessBase`, then there is a property
     * that safely navigates this value.
     */
    trace?: boolean;
}

/**
 * marker interface atm
 */
export interface WitnessRel8ns_V1 extends IbGibRel8ns_V1 {

}

/**
 * This interface simply types our data and rel8ns to V1 style.
 */
export interface Witness_V1<
    TDataIn extends any,
    TRel8nsIn extends IbGibRel8ns_V1,
    TIbGibIn extends IbGib_V1<TDataIn, TRel8nsIn>,
    TDataOut extends any,
    TRel8nsOut extends IbGibRel8ns_V1,
    TIbGibOut extends IbGib_V1<TDataOut, TRel8nsOut>,
    TData extends WitnessData_V1 = any,
    TRel8ns extends WitnessRel8ns_V1 = WitnessRel8ns_V1,
    >
    extends Witness<TIbGibIn, TIbGibOut, TData, TRel8ns> {
}


/**
 * Base information for cmd with optional modifiers to interact with a witness.
 *
 * Note that it is not necessary for a witness to listen to these types of
 * ibgibs, this is just convenient plumbing for those who wish to listen to
 * command-style ibgibs.
 */
export interface WitnessCmdOptionsData<TCmds, TCmdModifiers> {
    /**
     * Not really in use atm, but will use in the future.
     */
    version?: string;
    /**
     * The `cmd` property is the name of the command, analogous to a function
     * name.
     */
    cmd: TCmds | string;
    /**
     * Optional modifier flag(s) to the command.
     *
     * ## notes
     *
     * An implementing class can always use/extend these or extend the interface
     * of the options data.
     */
    cmdModifiers?: (TCmdModifiers | string)[];
    /**
     * Addrs of ibgibs to get/delete
     */
    ibGibAddrs?: IbGibAddr[];
}

export interface WitnessCmdOptionsRel8ns extends IbGibRel8ns_V1 {
}

export interface WitnessCmdOptionsIbGib<
    TIbGib extends IbGib,
    TCmds, TCmdModifiers,
    TOptsData extends WitnessCmdOptionsData<TCmds,TCmdModifiers>,
    TOptsRel8ns extends WitnessCmdOptionsRel8ns,
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


export interface WitnessResultData {
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
     * Addresses for ibGibs which had errors.
     */
    addrsErrored?: IbGibAddr[];
}

export interface WitnessResultRel8ns extends IbGibRel8ns_V1 { }

/**
 * Optional witness result ibgib interface.
 *
 * You do NOT have to use this class when returning results for witness ibgibs.
 * This is provided as convenience plumbing for when you do want a standard-ish
 * special result ibgib.
 */
export interface WitnessResultIbGib<
    TIbGib extends IbGib,
    TResultData extends WitnessResultData,
    TResultRel8ns extends WitnessResultRel8ns
    >
    extends IbGibWithDataAndRel8ns<TResultData, TResultRel8ns> {

    /**
     * When expecting ibGibs back, we don't want to persist the graph. So this property of
     * ibGibs lives on the ibGib result object, but not in the `data` property.
     */
    ibGibs?: TIbGib[];
}
