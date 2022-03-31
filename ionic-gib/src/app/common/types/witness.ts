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
 * This should be expanded only sparingly.
 */
export interface WitnessData_V1 {
    /**
     * If true, then this will allow primitive args when validating incoming
     * args.
     *
     * so if you want a witness to be able to witness, e.g., "16816^gib", then
     * set this to truthy. Otherwise, this will flag this as a validation error.
     */
    allowPrimitiveArgs?: boolean;
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
