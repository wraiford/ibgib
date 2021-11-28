import {
    IbGibSpace, IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib as IbGibSpaceOptionsIbGib, IbGibSpaceResultData, IbGibSpaceResultIbGib, IbGibSpaceOptionsCmd,
} from '../types';
import {
    IbGib_V1, IbGibRel8ns_V1, IbGibData_V1, sha256v1, Factory_V1,
} from 'ts-gib/dist/V1';
import { SpaceBase_V1 } from './space-base-v1';
import { resulty_ } from '../witnesses';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';

/**
 * Space residing elsewhere, not on this local machine.
 *
 * ## notes on merging
 *
 * I haven't implemented any merging as yet, but here are my notes (that
 * I wrote on a receipt):
 *
 * * 'merged' rel8n
 *   * notates when we do a merge
 *   * merge info addr has timestamp (via ib)
 * * latest check merge param
 *   * falsy optional
 *   * if existing latest is not in past of greater "n" then we have a divergence
 *     * i.e. it **is** possible to have n be higher and still need a merge
 *   * a "fast-forwared" merge is not necessary to distinguish atm.
 * * naive apply dna to start with
 *   * more advanced will require closer couplin with keystones & identity
 *
 */
export interface OuterSpace_V1_Data {
    /**
     * If true, then the space is associated with a secret key.
     */
    private?: boolean;
    /**
     * if space is private, this will provide the
     */
    secretKey?: string;
    /**
     * urls to associate with the space.
     *
     * ## usage
     *
     * the intended usage is for broadcast urls.
     */
    urls?: string[];

    /**
     * if true, puts/gets default to all or nothing transactional calls.  */
    defaultTransactional?: boolean;

    /**
     * id associated with the SPACE
     */
    id?: string;

    /**
     * optional username associated with this instantiation into the space
     */
    username?: string;
}

/**
 *
 * ## ideas
 *
 * * create a new outer space
 * * sensitive info, so encrypt with password.
 *   * this is what a keystone would be...for a unique secret space.
 *   * so the keystone would be the thing with the password, while the settings
 *     would link to the keystone(s) for various responsibilities.
 * * types of spaces is how they get connected.
 */
export class OuterSpace_V1<
        TIbGib extends IbGib_V1 = IbGib_V1,
        TData extends OuterSpace_V1_Data = OuterSpace_V1_Data,
        TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
    > extends SpaceBase_V1<
        TIbGib,
        IbGibSpaceOptionsData,
        IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData>,
        IbGibSpaceResultData,
        IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>,
        TData,
        TRel8ns
    > {

    /**
     * A naive cache to start with.
     */
    ibGibs: { [key: string]: TIbGib } = {};
    /**
     * Addrs that may exist in outer space but not populated locally.
     */
    addrs: IbGibAddr[] = [];

    constructor(
        // /**
        //  * Default predicate value when putting an unknown ibGib.
        //  *
        //  * ## notes
        //  *
        //  * So when a repo witnesses another ibGib, it either defaults to
        //  * storing that ibGib or not storing that ibGib. This is what that
        //  * is referring to. If it's optimistic, then it stores any ibGib by
        //  * default and it passes its put predicate.
        //  */
        // public optimisticPut: boolean = true,
        initialData: TData,
        initialRel8ns: TRel8ns,
    ) {
        super(initialData, initialRel8ns);

        this.ib = `witness space ${OuterSpace_V1.name}`;
    }

    protected async get(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.get.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const { ibGibAddrs } = arg.data!;
            const resultIbGibs: TIbGib[] = [];
            let notFoundIbGibAddrs: IbGibAddr[] = undefined;
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                if (Object.keys(this.ibGibs).includes(addr)) {
                    resultIbGibs.push(this.ibGibs[addr]);
                } else {
                    if (!notFoundIbGibAddrs) { notFoundIbGibAddrs = []; }
                    notFoundIbGibAddrs.push(addr);
                }
            }
            if (notFoundIbGibAddrs && notFoundIbGibAddrs.length > 0) {
                resultData.addrsNotFound = notFoundIbGibAddrs;
                resultData.success = false;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result =
            await resulty_<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }
    protected async put(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const ibGibs = arg.ibGibs || [];
            const addrsAlreadyHave: IbGibAddr[] = [];
            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                const addr = getIbGibAddr({ibGib});
                if (!Object.keys(this.ibGibs).includes(addr)) {
                    this.ibGibs[addr] = ibGib;
                } else {
                    addrsAlreadyHave.push(addr);
                }
            }
            if (addrsAlreadyHave.length > 0) {
                resultData.addrsAlreadyHave = addrsAlreadyHave;
                resultData.warnings = (resultData.warnings || []).concat([`${lc} already had addr(s).`]);
            }
            resultData.success = true;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
            resultData.success = false;
        }
        const result =
            await resulty_<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }
    protected async delete(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.delete.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            throw new Error(`not implemented`);
            const addrsNotFound: IbGibAddr[] = [];
            const addrsDeleted: IbGibAddr[] = [];
            const ibGibAddrs = arg.data!.ibGibAddrs || [];
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                const addrsIndex = this.addrs.indexOf(addr);
                if (Object.keys(this.ibGibs).includes(addr)) {
                    delete this.ibGibs[addr];
                    if (addrsIndex >= 0) { this.addrs.splice(addrsIndex, 1); }
                    addrsDeleted.push(addr);
                } else if (addrsIndex >= 0) {
                    // delete remotely
                } else {
                    addrsNotFound.push(addr);
                }
            }
            if (addrsNotFound.length > 0) {
                resultData.addrsNotFound = addrsNotFound.concat();
                const warningMsg = `${lc} some addrs (${addrsNotFound.length}) not found: ${addrsNotFound}`;
                resultData.warnings = (resultData.warnings || []).concat([warningMsg]);
            }
            resultData.success = true;
            resultData.addrs = addrsDeleted.concat();
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
            resultData.success = false;
        }
        try {
            const result =
                await resulty_<IbGibSpaceResultData, IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>>({
                    resultData
                });
            return result;
        } catch (error) {
            console.error(`${lc} error forming result ibGib. error: ${error.message}`);
            throw error;
        }
    }
    protected async getAddrs(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.getAddrs.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            resultData.addrs = Object.keys(this.ibGibs).concat();
            resultData.success = true;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
            resultData.success = false;
        }
        const result =
            await resulty_<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }
    /**
     * Performs a naive `exists: boolean` or `includes: boolean` analog.
     *
     * If all of the addresses are found, will result in `success` and `can` being `true`.
     *
     * Else, `can` will be falsy, and `addrsNotFound` will be populated with all/some of
     * the queried addresses.
     *
     * ## notes
     *
     * This does not take authorization into account in any way. it's a simple, naive external
     * storage ibGib witness.
     *
     * @returns result ibGib whose primary value is `can`
     */
    protected async canGet(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.canGet.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const { ibGibAddrs } = arg.data!;
            let notFoundIbGibAddrs: IbGibAddr[] = undefined;
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                if (!Object.keys(this.ibGibs).includes(addr)) {
                    if (!notFoundIbGibAddrs) { notFoundIbGibAddrs = []; }
                    notFoundIbGibAddrs.push(addr);
                }
            }
            resultData.success = true;
            if (notFoundIbGibAddrs && notFoundIbGibAddrs.length > 0) {
                resultData.addrsNotFound = notFoundIbGibAddrs;
                resultData.can = false;
            } else {
                resultData.can = true;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result =
            await resulty_<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }
    protected async canPut(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.canPut.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const ibGibs = arg.ibGibs || [];
            const addrsAlreadyHave: IbGibAddr[] = [];
            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                const addr = getIbGibAddr({ibGib});
                if (Object.keys(this.ibGibs).includes(addr)) {
                    addrsAlreadyHave.push(addr);
                }
            }
            resultData.success = true;
            if (addrsAlreadyHave.length > 0) {
                resultData.addrsAlreadyHave = addrsAlreadyHave;
                resultData.warnings = (resultData.warnings || []).concat([`${lc} already have addr(s).`]);
            }
            resultData.can = ibGibs.length > addrsAlreadyHave.length;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result =
            await resulty_<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }

}
