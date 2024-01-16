import { Witness_V1, WitnessOpts } from "../witness";
import { WitnessBase_V1, WitnessData_V1 } from "../bases/witness-base";
import { IbGibRepo_V1, IbGib_V1 } from "ts-gib/dist/V1";
import { isDna } from "ts-gib/dist/V1/transforms/transform-helper";
import { getIbGibAddr } from "ts-gib/dist/helper";
import { CanResult } from "../types";

export interface LatestData_V1 extends WitnessData_V1 {

}

/**
 * Keeping track of the "latest" version of an ibGib is a non-trivial task.
 * So much so that it is inevitable to get things out of sync, i.e., have ibgibs
 * with multiple timelines.
 *
 * The job of the latest is to witness ibgibs, analyze them and do its best
 * to keep track of the latest versionof that ibgib.
 *
 * First this witness "registers" with the scheduler, putting itself in position to
 * witness any ibgibs coming through the scheduler. Once it is registered, it listens
 * for any incoming ibgibs and examines its tjp. If it has that tjp and not that ibGib,
 * then it checks to see if its newer. If it is newer, then it records that ibgib's
 * address as the latest in that ibgib's lifetime.
 *
 * It does not care about some ibgibs, e.g., dna.
 *
 */
export class IbGibWitnessLatest extends WitnessBase_V1<LatestData_V1> {
    protected lc = `[${IbGibWitnessLatest.name}]`;

    get data(): LatestData_V1 | undefined {
        const data = super.data!;
        return data;
    }
    set data(_: LatestData_V1 | undefined) {
        super.data = _;
    }

    protected getCode(): string {
        return super.getCode() + '\n' + IbGibWitnessLatest.toString();
    }

    constructor(
        /** Internal default repo */
        protected _repo: IbGibRepo_V1,
    ) {
        super();
    }

    /**
     * Determines if it cares about witnessing other ibgib.
     *
     * By default, this does not care about dna.
     *
     * @param param0
     */
    async canWitness({other}: WitnessOpts): Promise<CanResult> {
        let lc = `${this.lc}[${this.canWitness.name}]`;
        try {
            let can: CanResult = await super.canWitness({other});
            if (!can.proceed) { return can; }

            // not interested in dna
            const otherIsDna = isDna({ibGib: other});
            if (otherIsDna) { return { proceed: false }; }

            return { proceed: true };
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }
    async witnessImpl({other}: WitnessOpts): Promise<void> {
        let lc = `${this.lc}[${this.witnessImpl.name}]`;
        try {
            // queue the other if it isnt already queued
            const otherAddr = getIbGibAddr({ibGib: other});
            throw new Error('not implemented');
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

}