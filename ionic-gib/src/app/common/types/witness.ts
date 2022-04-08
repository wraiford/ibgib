import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns } from 'ts-gib';

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
    // /**
    //  * DOESNT WORK ATM - NOT IMPLEMENTED - HOOGLEDY BOOGLEDY
    //  * If true, any calls to `witness` will have the opt and result
    //  * ibGibs persisted to the space, regardless of what the actual
    //  * opt/result is.
    //  *
    //  * This is like providing a logging feature for the space itself.
    //  */
    // persistOptsAndResultIbGibs?: boolean;
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
