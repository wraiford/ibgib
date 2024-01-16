import { IbGibRepo_V1, IbGibData_V1, IbGib_V1 } from "ts-gib/dist/V1";
import { GetIbGibOptions, CanGetIbGibOptions, CanPutIbGibOptions, PutIbGibOptions, IbGib, IbGibAddr } from "ts-gib";
import { getIbGibAddr, getUUID } from "ts-gib/dist/helper";
import { WitnessOpts } from "../witness";
import { WitnessBase_V1, WitnessData_V1 } from "./witness-base";
import { CanResult } from "../types";

export interface RepoWitnessData_V1 extends WitnessData_V1 {
    /**
     * If true, then the {@link RepoWitness.data} property should return
     * the addrs for the repo.
     */
    includeAddrs?: boolean;
    /**
     * @see {@link RepoWitnessBase.optimisticPut}
     */
    optimisticPut?: boolean;
    /**
     * List of addrs in this memory repo store at this time.
     *
     * The idea is that any important state for a witness should go here.
     * But it is possible it should only be pure behavior state...hmm...
     */
    addrs?: IbGibAddr[],
}

/**
 */
export abstract class RepoWitnessBase<TData extends RepoWitnessData_V1>
    extends WitnessBase_V1<RepoWitnessData_V1>
    implements IbGibRepo_V1 {
    protected lc: string = `[${RepoWitnessBase.name}]`;
    protected instanceId: string | undefined;

    constructor(
        /**
         * If true, then this will include this repo's ibGib's addrs (i.e. index)
         * in its {@link data} property.
         */
        public includeAddrs: boolean = false,
        /**
         * Default predicate value when putting an unknown ibGib.
         *
         * ## notes
         *
         * So when a repo witnesses another ibGib, it either defaults to
         * storing that ibGib or not storing that ibGib. This is what that
         * is referring to. If it's optimistic, then it stores any ibGib by
         * default and it passes its put predicate.
         */
        public optimisticPut: boolean = true,
    ) {
        super();
    }

    canGet(_: CanGetIbGibOptions): boolean { return true; }
    abstract get(opts: GetIbGibOptions): Promise<IbGib_V1<any> | null>;
    canPut(opts: CanPutIbGibOptions): boolean { return true; }
    abstract put(opts: PutIbGibOptions<IbGib>): Promise<boolean>;

    /**
     * Stubbed method to get the list of ibgib addresses that this repo has (or
     * some subset thereof). This is included in {@link data} if {@link includeAddrs}
     * is true.
     *
     * ## notes
     *
     * Base implementation throws an exception! You must implement this in your
     * descendant class per whatever your repo's storage mechanism is.
     *
     * Also remember that the {@link data} property is synchronous, so this call is
     * synchronous as well. You must anticipate this if you wish to include up-to-date
     * addrs in this call.
     *
     * @see {@link includeAddrs}
     */
    getAddrs(): IbGibAddr[] {
        const lc = `${this.lc}[${this.getAddrs.name}]`;
        throw new Error(`${lc} not implemented in base class. You must override this in your implementing class.`);
    }

    get data(): TData | undefined {
        const data = super.data!;
        if (this.optimisticPut) { data.optimisticPut = true; }
        if (this.includeAddrs) {
            data.includeAddrs = true;
            data.addrs = this.getAddrs();
        }
        return <TData>data;
    }
    set data(_: TData  | undefined) {
        const lc = `${this.lc}[set data()]`;
        if (_) { console.log(`${lc} ignored`); }
    }

    protected getCode(): string {
        return super.getCode() + '\n' + RepoWitnessBase.toString();
    }

    async canWitness({other}: WitnessOpts): Promise<CanResult> {
        let lc = `${this.lc}[${this.canWitness.name}]`;
        try {
            let can = await super.canWitness({other});
            if (!can.proceed) { return can; }

            // implementation only cares about optimisticPut for now
            return { proceed: this.optimisticPut };
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * This repo always stores whatever it witnesses.
     *
     * May change to only store dna, non-dna, etc. in the future
     * based on properties/ctor
     *
     * @param other
     */
    async witnessImpl({other}: WitnessOpts): Promise<void> {
        let lc = `${this.lc}[${this.witnessImpl.name}]`;
        try {
            // if we already have it, don't need to store it again
            const otherAddr = getIbGibAddr({ibGib: other});
            const gotten = await this.get({ibGibAddr: otherAddr});
            if (gotten) {
                // already have it
                return;
            }

            // we're allowed to store it, and we don't already have it, so get on with it...
            const resPut = await this.put({ibGib: other});
            if (!resPut) { throw new Error('Attempted to put, but this failed.'); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }
}