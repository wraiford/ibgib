import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";
import { TransformResult } from "ts-gib/dist/types";
import { Witness } from "../types/witness";

// import * as c from '../constants';

// const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * The idea is that any model can be injected via this factory provider.
 */
export abstract class WitnessFactoryBase<
    TWitnessData,
    TWitnessRel8ns extends IbGibRel8ns_V1,
    TWitness extends Witness<IbGib_V1, IbGib_V1, TWitnessData, TWitnessRel8ns>
    > {
    protected lc: string = `[${WitnessFactoryBase.name}]`;

    /**
     * override this to provide the name of the class for the factory.
     *
     * ## usage
     *
     * atm I'm using this to return the classname for the witness.
     *
     * @example MyWitnessClass.classname
     */
    abstract getName(): string;

    /**
     * creates a new witness. This should return the transform result with the
     * new ibgib being the witness class itself, not just the ibgib dto.
     *
     * So said in another way, the `result.newIbGib` should include the class
     * instantiation which has the `witness` function on it.
     *
     * @see {@link WitnessB}
     */
    abstract newUp({data, rel8ns}: {data?: TWitnessData, rel8ns?: TWitnessRel8ns}):
        Promise<TransformResult<TWitness>>;

}

export type WitnessFactoryAny = WitnessFactoryBase<any, any, any>;