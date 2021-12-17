import { IbGib_V1, IbGibRel8ns_V1, } from 'ts-gib/dist/V1';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import { SpaceBase_V1 } from './space-base-v1';
// import { resulty_ } from '../witnesses';
import {
    IbGibSpace,
    IbGibSpaceAny,
    IbGibSpaceData,
    IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib,
    IbGibSpaceOptionsRel8ns,
    IbGibSpaceResultData, IbGibSpaceResultIbGib, IbGibSpaceResultRel8ns,
} from '../types';
import * as c from '../constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;;

// #region Space related interfaces/constants

/**
 * This is the shape of data about this space itself (not the contained ibgibs' spaces).
 */
export interface MetaSpaceData_V1 extends IbGibSpaceData {
    encoding: "utf8";
}

/**
 * Used in bootstrapping.
 */
const DEFAULT_META_SPACE_DATA_V1: MetaSpaceData_V1 = {
    name: c.IBGIB_META_SPACE_NAME_DEFAULT,
    encoding: "utf8",
}

/** Marker interface atm */
export interface MetaSpaceRel8ns_V1 extends IbGibRel8ns_V1 {
    ['successReq']?: IbGibAddr[];
}

/**
 * Space options involve whether we're getting/putting ibgibs categorized as
 * meta, bin, dna.
 *
 * We'll leverage the fact that we don't need to get dna very often, and that
 * meta ibgibs act differently and are recorded differently.
 *
 * For example, we don't necessarily want to keep the past of certain meta
 * objects, because it may change (and thus grow) too quickly.
 */
export interface MetaSpaceOptionsData extends IbGibSpaceOptionsData {
    // /**
    //  * If getting binary, this is the hash we're looking for (binId)
    //  */
    // binHash?: string;
    // /**
    //  * If getting binary, this is the extension.
    //  */
    // binExt?: string;
    /**
     * If truthy, will look in the meta subpath first, then the regular if not found.
     */
    isMeta?: boolean;
    /**
     * Are we looking for a DNA ibgib?
     */
    isDna?: boolean;
}

export interface MetaSpaceOptionsRel8ns extends IbGibSpaceOptionsRel8ns { }

/** Marker interface atm */
export interface MetaSpaceOptionsIbGib
    extends IbGibSpaceOptionsIbGib<IbGib_V1, MetaSpaceOptionsData, MetaSpaceOptionsRel8ns> {
}

/** Marker interface atm */
export interface MetaSpaceResultData extends IbGibSpaceResultData {
}

export interface MetaSpaceResultRel8ns extends IbGibSpaceResultRel8ns { }

export interface MetaSpaceResultIbGib
    extends IbGibSpaceResultIbGib<IbGib_V1, MetaSpaceResultData, MetaSpaceResultRel8ns> {
}

// #endregion

/**
 * Base class convenience for a local space with V1 ibgibs.
 *
 * This naively caches ibGibs in memory. When not found there,
 * will looks in files using Meta `FileSystem`.
 */
export class MetaSpace_V1<
        TData extends MetaSpaceData_V1 = MetaSpaceData_V1,
        TRel8ns extends MetaSpaceRel8ns_V1 = MetaSpaceRel8ns_V1
    > extends SpaceBase_V1<
        IbGib_V1,
        MetaSpaceOptionsData,
        MetaSpaceOptionsRel8ns,
        MetaSpaceOptionsIbGib,
        MetaSpaceResultData,
        MetaSpaceResultRel8ns,
        MetaSpaceResultIbGib,
        TData,
        TRel8ns
    > {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `[${MetaSpace_V1.name}]`;

    /**
     * here's the dudes/dudettes that we need to delegate to depending on
     * what our success requirements are.
     */
    spaces: IbGibSpaceAny[] = [];

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
        const lc = `${this.lc}[ctor]`;

        if (logalot) { console.log(`${lc} initializing...`); }
        this.initialize().catch(e => {
            console.error(`${lc} ${e.message}`);
        }).finally(() => {
            if (logalot) { console.log(`${lc} initializing complete.`); }
        })

        this.ib = this.getSpaceIb(MetaSpace_V1.name);
    }

    /**
     * Factory static method to create the space with the given
     * `dto` param's ibGib properties.
     *
     * We do this because when we persist this space (and its settings
     * located in `data`), we do not save the actual class instantiation
     * but just the ibgib properties. Use this factory method to
     * create a new space instance and rehydrate from that saved dto.
     *
     * ## notes
     *
     * * DTO stands for data transfer object.
     *
     * @param dto space ibGib dto that we're going to load from
     * @returns newly created space built upon `dto`
     */
    static createFromDto<
            TData extends MetaSpaceData_V1 = MetaSpaceData_V1,
            TRel8ns extends MetaSpaceRel8ns_V1  = MetaSpaceRel8ns_V1
        >(dto: IbGib_V1<TData, TRel8ns>): MetaSpace_V1<TData, TRel8ns> {
        const space = new MetaSpace_V1<TData, TRel8ns>(null, null);
        space.loadDto(dto);
        return space;
    }

    protected async validateWitnessArg(arg: MetaSpaceOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg}]`;
        let errors: string[] = [];
        try {
            errors = (await super.validateWitnessArg(arg)) || [];
            if (arg.data?.cmd === 'put' && (arg.ibGibs || []).length === 0) {
                errors.push(`when "put" cmd is called, ibGibs required.`);
            }
            if (arg.data?.cmd === 'get' && (arg.data?.ibGibAddrs || []).length === 0) {
                errors.push(`when "get" cmd is called, ibGibAddrs required.`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (errors?.length > 0) { console.error(`${lc} errors: ${errors}`); }
        }

        return errors;
    }

    /**
     * Initializes this meta space to defaults if `this.data` is not already
     * up to snuff.
     */
    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (!this.data) { this.data = h.clone(DEFAULT_META_SPACE_DATA_V1); }
            if (!this.data.encoding) { this.data.encoding = c.IBGIB_ENCODING; }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async getImpl(arg: MetaSpaceOptionsIbGib):
        Promise<MetaSpaceResultIbGib> {
        const lc = `${this.lc}[${this.get.name}]`;
        const resultIbGibs: IbGib_V1[] = [];
        const resultData: MetaSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        let notFoundIbGibAddrs: IbGibAddr[] = undefined;
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            const { ibGibAddrs, isMeta, isDna, } = arg.data!;

            throw new Error('not implemented');

            if (notFoundIbGibAddrs && notFoundIbGibAddrs.length > 0) {
                resultData.addrsNotFound = notFoundIbGibAddrs;
                resultData.success = false;
            } else {
                resultData.success = true;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        try {
            const result = await this.resulty({resultData});
            if (resultIbGibs.length > 0) {
                result.ibGibs = resultIbGibs;
            }
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async putImpl(arg: MetaSpaceOptionsIbGib): Promise<MetaSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: MetaSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        try {
            throw new Error('not implemented');
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.success = false;
        }
        // only executes if there is an error.
        const result = await this.resulty({resultData});
        return result;
    }

    protected async deleteImpl(arg: MetaSpaceOptionsIbGib):
        Promise<MetaSpaceResultIbGib> {
        const lc = `${this.lc}[${this.delete.name}]`;
        const resultData: MetaSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsDeleted: IbGibAddr[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            const { isMeta, isDna, } = arg.data!;

            throw new Error('not implemented');

            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
                resultData.addrs = addrsDeleted;
            } else {
                resultData.errors = errors;
                resultData.addrsErrored = addrsErrored;
                if (addrsDeleted.length > 0) {
                    const warningMsg =
                        `some addrs (${addrsDeleted.length}) were indeed deleted, but not all. See result addrs and addrsErrored.`;
                    resultData.warnings = (resultData.warnings || []).concat([warningMsg]);
                }
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.addrsErrored = addrsErrored;
            resultData.success = false;
        }
        const result = await this.resulty({resultData});
        return result;
    }

    protected async getAddrsImpl(arg: MetaSpaceOptionsIbGib):
        Promise<MetaSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getAddrs.name}]`;
        const resultData: MetaSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            throw new Error(`${lc} not implemented`);
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
            resultData.success = false;
        }
        const result = await this.resulty({resultData});
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
    protected async canGetImpl(arg: MetaSpaceOptionsIbGib):
        Promise<MetaSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canGet.name}]`;
        const resultData: MetaSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            throw new Error('not implemented');
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({resultData});
        return result;
    }

    protected async canPutImpl(arg: MetaSpaceOptionsIbGib):
        Promise<MetaSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canPut.name}]`;
        const resultData: MetaSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            throw new Error('not implemented');
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({resultData});
        return result;
    }

    protected async persistOptsAndResultIbGibs({
        arg,
        result
    }: {
        arg: MetaSpaceOptionsIbGib,
        result: MetaSpaceResultIbGib,
    }): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
