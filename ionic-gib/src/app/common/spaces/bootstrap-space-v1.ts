import { Plugins, FilesystemEncoding, FileReadResult } from '@capacitor/core';
const { Filesystem } = Plugins;

import {
    IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib, IbGibSpaceResultData, IbGibSpaceResultIbGib,
} from '../types';
import {
    IbGib_V1, IbGibRel8ns_V1, sha256v1,
} from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';
import { SpaceBase_V1 } from './space-base-v1';
import { getWrapperResultIbGib } from '../witnesses';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';
import * as c from '../constants';

/**
 * This is the shape of data about this space itself (not the contained ibgibs' spaces).
 */
export interface IonicSpace_V1_Data {
    basePath: string;
    ibgibsSubPath: string;
    metaSubPath: string;
    binSubPath: string;
    dnaSubPath: string;
}

/** Marker interface atm */
export interface IonicRel8ns_V1 extends IbGibRel8ns_V1 {}

export const DEFAULT_BOOTSTRAP_SPACE_V1_DATA: IonicSpace_V1_Data = {
    basePath: c.IBGIB_BASE_SUBPATH,
    ibgibsSubPath: c.IBGIB_IBGIBS_SUBPATH,
    metaSubPath: c.IBGIB_META_SUBPATH,
    binSubPath: c.IBGIB_BIN_SUBPATH,
    dnaSubPath: c.IBGIB_DNA_SUBPATH,
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
export interface IonicSpaceOptionsData extends IbGibSpaceOptionsData<IbGib_V1> {
    /**
     * If getting binary, this is the hash we're looking for (binId)
     */
    binHash?: string;
    /**
     * If getting binary, this is the extension.
     */
    binExt?: string;
    /**
     * If truthy, will look in the meta subpath first, then the regular if not found.
     */
    isMeta?: boolean;
    /**
     * Are we looking for a DNA ibgib?
     */
    isDna?: boolean;
}

/** Marker interface atm */
export interface IonicSpaceOptionsIbGib
    extends IbGibSpaceOptionsIbGib<IbGib_V1, IonicSpaceOptionsData> {

}

/** Marker interface atm */
export interface IonicSpaceResultData extends IbGibSpaceResultData {
}

export interface IonicSpaceResultIbGib
    extends IbGibSpaceResultIbGib<IbGib_V1, IonicSpaceResultData> {
    /**
     * This is used when you're getting a pic's binary content.
     *
     * ## notes
     *
     * This is not in the data interface itself, because we don't want
     * to persist this data
     */
    binData?: any;
}

/**
 * Base class convenience for a local space with V1 ibgibs.
 *
 * This naively caches ibGibs in memory. When not found there,
 * will looks in files using Ionic `FileSystem`.
 */
export class IonicSpace_V1 extends SpaceBase_V1<
        IbGib_V1,
        IonicSpaceOptionsData,
        IonicSpaceOptionsIbGib,
        IonicSpaceResultData,
        IonicSpaceResultIbGib,
        IonicSpace_V1_Data
        // TRel8ns defaults to IbGibRel8ns_V1
    > {

    ibGibs: { [key: string]: IbGib_V1 } = {};

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
        initialData: IonicSpace_V1_Data,
        initialRel8ns: IbGibRel8ns_V1,
    ) {
        super(initialData, initialRel8ns);
        const lc = `${this.lc}[ctor]`;

        console.log(`${lc} initializing...`);
        this.initialize().catch(e => {
            console.error(`${lc} ${e.message}`);
        }).finally(() => {
            console.log(`${lc} initializing complete.`);
        })

        this.ib = `witness space ${IonicSpace_V1.name}`;
    }

    getData(): IonicSpace_V1_Data {
        const lc = `${this.lc}[${this.getData.name}]`;
        console.log(`${lc}`);
        return h.clone(this._data);
    }

    /**
     * Check for the bootstrap data at
     */
    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (!this._data) { this.data = h.clone(DEFAULT_BOOTSTRAP_SPACE_V1_DATA); }
            if (!this._data.basePath) { this._data.basePath = c.IBGIB_BASE_SUBPATH; }
            if (!this._data.ibgibsSubPath) { this._data.basePath = c.IBGIB_IBGIBS_SUBPATH; }
            if (!this._data.metaSubPath) { this._data.basePath = c.IBGIB_META_SUBPATH; }
            if (!this._data.binSubPath) { this._data.basePath = c.IBGIB_BIN_SUBPATH; }
            if (!this._data.dnaSubPath) { this._data.basePath = c.IBGIB_DNA_SUBPATH; }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        }
    }

    /**
     * builds the path of a given file, based on params
     * @returns the path of a given file, based on params
     */
    protected buildPath({
        filename,
        isMeta,
        isDna,
        isBin
    }: {
        filename: string,
        isMeta?: boolean,
        isDna: boolean,
        isBin?: boolean
    }): string {
        const { data } = this;
        if (isMeta){
            return `${data.basePath}/${data.metaSubPath}/${filename}`;
        } else if (isBin) {
            return `${this.data.basePath}/${data.binSubPath}/${filename}`;
        } else if (isDna) {
            return `${this.data.basePath}/${data.dnaSubPath}/${filename}`;
        } else { // regular ibGib
            return `${this.data.basePath}/${data.ibgibsSubPath}/${filename}`;
        }
    }

    /**
     * builds the filename based on the given params.
     *
     * @returns filename based on params
     */
    getFilename({
        addr,
        binHash,
        binExt
    }: {
        addr?: string,
        binHash?: string,
        binExt?: string,
    }): string {
        if (addr) {
            return `${addr}.json`;
        } else {
            return binExt ? binHash + '.' + binExt : binHash;
        }
    }

    protected async get(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.get.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            const { ibGibAddrs } = arg.data!;
            const resultIbGibs: IbGib_V1[] = [];
            let notFoundIbGibAddrs: IbGibAddr[] = undefined;
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                if (Object.keys(this.ibGibs).includes(addr)) {
                    resultIbGibs.push(this.ibGibs[addr]);
                } else {
                    // not found in memory, so look in files
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
                IonicSpaceResultData,
                IonicSpaceResultIbGib
            >({
                resultData
            });
        return result;
    }
    protected async put(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
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
                IonicSpaceResultData,
                IonicSpaceResultIbGib
            >({
                resultData
            });
        return result;
    }
    protected async getAddrs(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getAddrs.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
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
                IonicSpaceResultData,
                IonicSpaceResultIbGib
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
    protected async canGet(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canGet.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
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
                IonicSpaceResultData,
                IonicSpaceResultIbGib
            >({
                resultData
            });
        return result;
    }
    protected async canPut(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canPut.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
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
                IonicSpaceResultData,
                IonicSpaceResultIbGib
            >({
                resultData
            });
        return result;
    }

}
