import { IbGibRepo_V1, IbGibData_V1, IbGib_V1 } from "ts-gib/dist/V1";
import { GetIbGibOptions, PutIbGibOptions, IbGib, IbGibAddr } from "ts-gib";
import { getIbGibAddr } from "ts-gib/dist/helper";
import { RepoWitnessBase, RepoWitnessData_V1 } from "../bases/repo-witness-base";

export interface InMemoryRepoData_V1 extends RepoWitnessData_V1 { }

/**
 * Naive in-memory repo that simply uses a JS object backing store
 * for the repo.
 */
export class InMemoryRepo extends RepoWitnessBase<InMemoryRepoData_V1>
    implements IbGibRepo_V1 {
    protected lc: string = `[${InMemoryRepo.name}]`;

    ibGibs: { [key: string]: IbGib_V1<IbGibData_V1> } = {};

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
        super(includeAddrs, optimisticPut);
    }

    getAddrs(): IbGibAddr[] { return Object.keys(this.ibGibs); }

    async get(opts: GetIbGibOptions): Promise<IbGib_V1<IbGibData_V1> | null> {
        const lc = `${this.lc}[${this.get.name}]`;

        const addr = opts.ibGibAddr || getIbGibAddr({ib: opts.ib, gib: opts.gib});

        return this.ibGibs[addr] || null;
    }
    async put(opts: PutIbGibOptions<IbGib>): Promise<boolean> {
        const lc = `${this.lc}[${this.put.name}]`;
        if (!opts.ibGib) { throw new Error(`${lc} opts.ibGib required.`); }
        const addr = getIbGibAddr({ibGib: opts.ibGib});
        this.ibGibs[addr] = opts.ibGib!;
        return true;
    }
}