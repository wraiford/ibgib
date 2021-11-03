import { Witness_V1, WitnessOpts } from "../witness";
import { WitnessBase_V1, WitnessData_V1 } from "../bases/witness-base";
import { IbGibRepo_V1, IbGib_V1 } from "ts-gib/dist/V1";
import { getIbGibAddr } from "ts-gib/dist/helper";
import { CanResult } from "../types";

export interface SchedulerData_V1 extends WitnessData_V1 {
    optimisticAllowWitness: boolean;
    processLoopInParallel: boolean;
    parallelWitnessesCount: number;
}

/**
 * When adding to a scheduler's identity space for that scheduler to witness,
 * the scheduler's job is to examine the ibgib and its meta ibGibs, e.g., keystone(s),
 * and introduce the incoming ibgib to some subset of ibgibs already in the scheduler's
 * space.
 *
 * That is the entire event loop.
 *
 * Ibgibs who get that ibGib in their space can indeed spur new ibgibs that then
 * get introduced to the scheduler.
 *
 * NOTE: I see no mechanism in v1 for a pre-emptive loop.
 *
 * The interesting bit for the witness scheduler is the keystone mechanism and how
 * this integrates into the process, and how it affects the overall architecture.
 *
 * The scheduler is not meant to be the "one scheduler of the entire app forever".
 * IOW, it's not just a scheduler class that has instances in memory that are
 * assumed to be the same from one to the next. Scheduler's are witnesses themselves,
 * and the idea is that individual _instances_ of schedulers can be different
 * even within the same class.
 *
 * Another thing, is that _any ibGib_ that witnesses an ibGib and conveys this
 * to another ibGib acts as a scheduler. We're just coding an initial bootstrapping
 * scheduler with that as original intent and focus.
 *
 */
export class IbGibWitnessScheduler extends WitnessBase_V1<SchedulerData_V1> {
    protected lc = `[${IbGibWitnessScheduler.name}]`;

    /**
     * Internal, in-memory list of witnesses.
     *
     * In the future, should be able to provide factory getters (maybe including repos).
     * Or perhaps, just a factory getter can be a witness.
     */
    protected _witnesses: Witness_V1[] = [];

    /**
     * Queue of ibgibs to witness.
     *
     * These are kind of like the history of args passed to the scheduler.
     */
    readonly _queue: IbGib_V1[] = [];

    /**
     * True if in the middle of processing ibgib(s) to witness among the
     * scheduler's witnesses.
     */
    _executing = false;

    /**
     * If true, then a target defaults to allowing itself to be witnessed
     * if the `target.allowWitness` lambda is falsy.
     *
     * This does not however override the result of the `target.allowWitness` lambda if
     * it's truthy - only if the lambda itself is not given.
     */
    optimisticAllowWitness = true;

    get data(): SchedulerData_V1 | undefined {
        const data = super.data!;
        data.optimisticAllowWitness = this.optimisticAllowWitness;
        return data;
    }
    set data(_: SchedulerData_V1 | undefined) {
        super.data = _;
    }

    protected getCode(): string {
        return super.getCode() + '\n' + IbGibWitnessScheduler.toString();
    }

    constructor(
        /** Internal default repo */
        protected _repo: IbGibRepo_V1,
    ) {
        super();
    }

    async witnessImpl({other}: WitnessOpts): Promise<void> {
        let lc = `${this.lc}[${this.witnessImpl.name}]`;
        try {
            // queue the other if it isnt already queued
            const otherAddr = getIbGibAddr({ibGib: other});
            // console.log(`${lc} otherAddr: ${otherAddr}`);
            const alreadyQueued =
                this._queue.some(x => getIbGibAddr({ibGib: x}) === otherAddr);
            if (!alreadyQueued) {
                // not already in the queue, so queue and execute.
                this._queue.push(other);

                await this.executeProcessLoop();

                // if the scheduler has never seen this witness, then add it to the
                // queue of witnesses
                if (other.data?.isWitness && typeof((<any>other).witness === 'function')) {
                    if (!this._witnesses.some(w => getIbGibAddr({ibGib: w}) === otherAddr)) {
                        this._witnesses.push(<Witness_V1>other);
                    }
                }
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Relatively naive process loop for {@link _witnesses}.
     *
     * Looks at the {@link toWitnessQueue} and if not empty, splices off
     * the first one (index of 0). It then calls {@link execWitnessStep}
     * for each of the witnesses in {@link _witnesses}.
     *
     * Note that witnesses may change during the loop execution, but
     * that a single iteration for the loop works off of a copy of the
     * list of witnesses, i.e. a snapshot before the loop's execution.
     * Upon the next ibGib to witness, though, new witnesses WRT this
     * previous iteration will be included.
     *
     * This continues until the {@link toWitnessQueue} is empty.
     *
     * Also note that {@link execWitnessStep} does not necessarily mean
     * that the witness will indeed see the ibGib toWitness.
     * @see {@link execWitnessStep} for details on this.
     */
    async executeProcessLoop(): Promise<void> {
        const lc = `${this.lc}[${this.executeProcessLoop.name}]`;
        // already executing
        if (this._executing) { return; }

        // nothing to process if queue is empty
        if (this._queue.length === 0) { return; }

        this._executing = true;
        let keepChugging = true;
        try {
            do {
                // witnesses may change during execution. But for this
                // iteration, the witnesses are fixed via a snapshot.
                const witnessesForThisIteration = this._witnesses.concat();
                const other = this._queue.splice(0,1)[0];

                for (let w of witnessesForThisIteration) {
                    await this.execWitnessStep({w, other});
                }
                keepChugging = this._queue.length > 0;
            } while (keepChugging);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this._executing = false;
        }
    }

    async execWitnessStep({ w, other }: {
        w: Witness_V1,
        other: IbGib_V1
    }): Promise<void> {
        const lc = `${this.lc}[${this.execWitnessStep.name}]`;
        try {
            let allow = await this.allowWitness({w, other});
            if (allow) { await w.witness({other}); }
        } catch (error) {
            console.error(`${lc}[trapping error] ${error.message}`);
            // do not rethrow error, which would allow a witness to
            // crash the process loop.
        }
    }

    /**
     * Stubbed mechanism to control at the scheduler level for ability for any
     * given witness `w` to witness (i.e. be perturbed by) an "incoming" ibGib
     * `other`.
     *
     * Defaults in base implementation to first check to make sure other is not
     * the witness w itself (can't witness yourself). Assuming they are two different
     * ibGibs, then this returns the value of {@link optimisticAllowWitness}.
     */
    async allowWitness({ w, other }: {
        /**
         * witness in this scheduler's queue of witnesses
         */
        w: Witness_V1,
        /**
         * current other ibGib that we're determining if we want to allow `w` to witness.
         */
        other: IbGib_V1
    }): Promise<boolean> {
        const lc = `${this.lc}[${this.allowWitness.name}]`;
        const witnessAddr = getIbGibAddr({ibGib: w});
        const otherAddr = getIbGibAddr({ibGib: other});

        // A witness does not witness itself.
        if (witnessAddr === otherAddr || w === other) { return false; }

        // check to see other config to see its preferences on
        // allowing witnesses.

        // stubbed
        return this.optimisticAllowWitness;
    }

}