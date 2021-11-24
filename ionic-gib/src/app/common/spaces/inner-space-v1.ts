import {
    IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib as IbGibSpaceOptionsIbGib, IbGibSpaceResultData, IbGibSpaceResultIbGib,
} from '../types';
import {
    IbGib_V1, IbGibRel8ns_V1, IbGibData_V1, sha256v1, Factory_V1,
} from 'ts-gib/dist/V1';
import { SpaceBase_V1 } from './space-base-v1';
import { getWrapperResultIbGib } from '../witnesses';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';

export interface InnerSpace_V1_Data {
    /**
     * If true, then this will include this repo's ibGib's addrs (i.e. index)
     * in its {@link data} property.
     */
    trackAddrs: boolean;

}

/**
 * Base class convenience for a "local" space
 * (i.e. analogous to residing on the same computer as the app).
 *
 * Base implementation defaults to a naive in-memory internal object that
 * tracks ibgibs.
 */
export class InnerSpace_V1<
        TIbGib extends IbGib_V1 = IbGib_V1,
        TData extends InnerSpace_V1_Data = InnerSpace_V1_Data,
        TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
    > extends SpaceBase_V1<
        TIbGib,
        IbGibSpaceOptionsData<TIbGib>,
        IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData<TIbGib>>,
        IbGibSpaceResultData,
        IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>,
        TData,
        TRel8ns
    > {

    ibGibs: { [key: string]: TIbGib } = {};

    constructor(
        // I have this following commented out. I copied over some of this behavior from the keystone lib
        // and I'm not sure what I'm keeping here.
        // NOTE: (I refactored the name "repo" to "space" because it seemed to fit better.)
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

        this.ib = `witness space ${InnerSpace_V1.name}`;
    }

    protected async get(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData<TIbGib>>):
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
            await getWrapperResultIbGib<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }
    protected async put(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData<TIbGib>>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const { ibGibs } = arg.data!;
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
            await getWrapperResultIbGib<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }
    protected async getAddrs(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData<TIbGib>>):
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
            await getWrapperResultIbGib<
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
     * This does not take authorization into account in any way. it's a simple, naive in-memory
     * storage ibGib witness.
     *
     * @returns result ibGib whose primary value is `can`
     */
    protected async canGet(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData<TIbGib>>):
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
            await getWrapperResultIbGib<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }
    protected async canPut(arg: IbGibSpaceOptionsIbGib<TIbGib, IbGibSpaceOptionsData<TIbGib>>):
        Promise<IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>> {
        const lc = `${this.lc}[${this.canPut.name}]`;
        const resultData: IbGibSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const { ibGibs } = arg.data!;
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
            await getWrapperResultIbGib<
                IbGibSpaceResultData,
                IbGibSpaceResultIbGib<TIbGib, IbGibSpaceResultData>
            >({
                resultData
            });
        return result;
    }

}
