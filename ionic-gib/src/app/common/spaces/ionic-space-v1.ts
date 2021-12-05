import {
    Plugins, FilesystemEncoding, FileReadResult, FilesystemDirectory
} from '@capacitor/core';
const { Filesystem } = Plugins;

import {
    IbGib_V1, IbGibRel8ns_V1, sha256v1, IBGIB_DELIMITER,
} from 'ts-gib/dist/V1';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';

import { SpaceBase_V1 } from './space-base-v1';
import { resulty_ } from '../witnesses';
import {
    IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib,
    IbGibSpaceResultData, IbGibSpaceResultIbGib,
} from '../types';
import * as c from '../constants';


// #region Space related interfaces/constants

/**
 * This is the shape of data about this space itself (not the contained ibgibs' spaces).
 */
export interface IonicSpaceData_V1 {
    baseDir: FilesystemDirectory;
    encoding: FilesystemEncoding;
    baseSubPath: string;
    spaceSubPath: string;
    ibgibsSubPath: string;
    metaSubPath: string;
    binSubPath: string;
    dnaSubPath: string;
}

/**
 * Used in bootstrapping.
 */
const DEFAULT_IONIC_SPACE_DATA_V1: IonicSpaceData_V1 = {
    baseDir: c.IBGIB_BASE_DIR,
    encoding: c.IBGIB_FILES_ENCODING,
    baseSubPath: c.IBGIB_BASE_SUBPATH,
    spaceSubPath: c.IBGIB_SPACE_SUBPATH_DEFAULT,
    ibgibsSubPath: c.IBGIB_IBGIBS_SUBPATH,
    metaSubPath: c.IBGIB_META_SUBPATH,
    binSubPath: c.IBGIB_BIN_SUBPATH,
    dnaSubPath: c.IBGIB_DNA_SUBPATH,
}

/** Marker interface atm */
export interface IonicSpaceRel8ns_V1 extends IbGibRel8ns_V1 {}

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
export interface IonicSpaceOptionsData extends IbGibSpaceOptionsData {
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
    /**
     * Binary data from files like pics.
     *
     * ## notes
     *
     * This is not in the data interface itself, because we don't want
     * to persist this data
     */
    binData?: any;
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

// #endregion

// #region get/put files related (re-using from files service)

interface FileResult {
  success?: boolean;
  /**
   * If errored, this will contain the errorMsg.
   */
  errorMsg?: string;
}

/**
 * Options for retrieving data from the file system.
 */
interface GetIbGibOpts {
  /**
   * If getting ibGib object, this is its address.
   */
  addr?: IbGibAddr;
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
/**
 * Result for retrieving an ibGib from the file system.
 */
interface GetIbGibResult extends FileResult {
  /**
   * ibGib if retrieving a "regular" ibGib.
   *
   * This is used when you're not getting a pic, e.g.
   */
  ibGib?: IbGib_V1;
  /**
   * This is used when you're getting a pic's binary content.
   */
  binData?: any;
}

interface PutIbGibOpts {
  ibGib?: IbGib_V1;
  /**
   * if true, will store this data in the bin folder with its hash.
   */
  binData?: string;
  /**
   * If true, will store in a different folder.
   */
  isDna?: boolean;
  /**
   * extension to store the bindata with.
   */
  binExt?: string;
  /**
   * hash of binData if doing bin and already calculated.
   */
  binHash?: string;
  /**
   * If true, will store with metas.
   */
  isMeta?: boolean;
}
interface PutIbGibResult extends FileResult {
  binHash?: string;
}

interface DeleteIbGibOpts extends GetIbGibOpts { }
interface DeleteIbGibResult extends FileResult { }

// #endregion


/**
 * Base class convenience for a local space with V1 ibgibs.
 *
 * This naively caches ibGibs in memory. When not found there,
 * will looks in files using Ionic `FileSystem`.
 */
export class IonicSpace_V1<
        TData extends IonicSpaceData_V1 = IonicSpaceData_V1,
        TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
    > extends SpaceBase_V1<
        IbGib_V1,
        IonicSpaceOptionsData,
        IonicSpaceOptionsIbGib,
        IonicSpaceResultData,
        IonicSpaceResultIbGib,
        TData,
        TRel8ns
    > {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `[${IonicSpace_V1.name}]`;

    /**
     * Naive caching in-memory. Memory leak as it stands right now!
     */
    protected ibGibs: { [key: string]: IbGib_V1 } = {};

    /**
     * Check every time app starts if paths exist.
     * But don't check every time do anything whatsoever.
     *
     * ## notes
     *
     * for use in `ensureDirs` function.
     */
    private pathExistsMap = {};

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

        console.log(`${lc} initializing...`);
        this.initialize().catch(e => {
            console.error(`${lc} ${e.message}`);
        }).finally(() => {
            console.log(`${lc} initializing complete.`);
        })

        this.ib = `witness space ${IonicSpace_V1.name}`;
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
            TData extends IonicSpaceData_V1 = IonicSpaceData_V1,
            TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
        >(dto: IbGib_V1<TData, TRel8ns>): IonicSpace_V1<TData, TRel8ns> {
        const space = new IonicSpace_V1<TData, TRel8ns>(null, null);
        space.loadDto(dto);
        return space;
    }

    protected async validateWitnessArg(arg: IonicSpaceOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg}]`;
        let errors: string[] = [];
        try {
            errors = (await super.validateWitnessArg(arg)) || [];
            if (arg.data?.cmd === 'put' && !arg.binData && (arg.ibGibs?.length === 0)) {
                errors.push(`when "put" cmd is called, either ibGibs or binData required.`);
            }
            if (
                arg.data?.cmd === 'get' &&
                !arg.data?.binExt && !arg.data?.binHash &&
                (arg.data?.ibGibAddrs?.length === 0)
            ) {
                errors.push(`when "get" cmd is called, either ibGibAddrs or binExt+binHash required.`);
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
     * Check for the bootstrap data at
     */
    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (!this.data) { this.data = h.clone(DEFAULT_IONIC_SPACE_DATA_V1); }
            if (!this.data.baseDir) { this.data.baseDir = c.IBGIB_BASE_DIR; }
            if (!this.data.encoding) { this.data.encoding = c.IBGIB_FILES_ENCODING; }
            if (!this.data.baseSubPath) { this.data.baseSubPath = c.IBGIB_BASE_SUBPATH; }
            if (!this.data.spaceSubPath) { this.data.spaceSubPath = c.IBGIB_SPACE_SUBPATH_DEFAULT; }
            if (!this.data.ibgibsSubPath) { this.data.ibgibsSubPath = c.IBGIB_IBGIBS_SUBPATH; }
            if (!this.data.metaSubPath) { this.data.metaSubPath = c.IBGIB_META_SUBPATH; }
            if (!this.data.binSubPath) { this.data.binSubPath = c.IBGIB_BIN_SUBPATH; }
            if (!this.data.dnaSubPath) { this.data.dnaSubPath = c.IBGIB_DNA_SUBPATH; }
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
            return `${data.baseSubPath}/${data.spaceSubPath}/${data.metaSubPath}/${filename}`;
        } else if (isBin) {
            return `${data.baseSubPath}/${data.spaceSubPath}/${data.binSubPath}/${filename}`;
        } else if (isDna) {
            return `${data.baseSubPath}/${data.spaceSubPath}/${data.dnaSubPath}/${filename}`;
        } else { // regular ibGib
            return `${data.baseSubPath}/${data.spaceSubPath}/${data.ibgibsSubPath}/${filename}`;
        }
    }

    /**
     * builds the filename based on the given params.
     *
     * @returns filename based on params
     */
    protected getFilename({
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
            // return binExt ? binHash + '.' + binExt : binHash;
            return `${this.getBinAddr({binHash, binExt})}.${binExt}`;
        }
    }

    getBinAddr({binHash, binExt}: {binHash: string, binExt: string}): IbGibAddr {
        return `bin.${binExt}${IBGIB_DELIMITER}${binHash}`
    }

    protected async get(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.get.name}]`;
        const resultIbGibs: IbGib_V1[] = [];
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        let notFoundIbGibAddrs: IbGibAddr[] = undefined;
        let resultBinData: any | undefined;
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            // const argData = arg.data!;
            const { ibGibAddrs, isMeta, isDna, binExt, binHash } = arg.data!;

            if (ibGibAddrs?.length > 0 && !binHash) {
                console.log(`${lc} getting non-bin ibgibs. ibGibAddrs: ${ibGibAddrs}`);
                // getting ibgibs, not a binary
                for (let i = 0; i < ibGibAddrs.length; i++) {
                    const addr = ibGibAddrs[i];
                    if (Object.keys(this.ibGibs).includes(addr)) {
                        console.log(`${lc} found in naive cache.`);
                        resultIbGibs.push(this.ibGibs[addr]);
                    } else {
                        // not found in memory, so look in files
                        const getResult = await this.getFile({addr, isMeta, isDna, binHash, binExt});
                        if (getResult?.success && getResult.ibGib) {
                            resultIbGibs.push(getResult.ibGib);
                        } else {
                            // not found in memory or in files
                            if (!notFoundIbGibAddrs) { notFoundIbGibAddrs = []; }
                            notFoundIbGibAddrs.push(addr);
                        }
                    }
                }
            } else if (binHash) {
                // getting binary, not a regular ibGib via addr
                console.log(`${lc} getting binHash: ${binHash}`);
                const getResult = await this.getFile({binHash, binExt});
                if (getResult?.success && getResult.binData) {
                    console.log(`${lc} getResult.success. binData.length: ${getResult.binData!.length}`);
                    // console.log(`${lc} getResult.success.`);
                    resultBinData = getResult.binData!;
                } else {
                    console.log(`${lc} not found in files. (binData is not cached atm)`)
                    // not found in files. (binData is not cached atm)
                    notFoundIbGibAddrs.push(this.getBinAddr({binHash, binExt}));
                }
            } else {
                throw new Error(`Either ibGibAddrs or binHash required.`);
            }
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
            const result = await resulty_<IonicSpaceResultData, IonicSpaceResultIbGib>({
                resultData,
            });
            if (resultIbGibs.length > 0) {
                result.ibGibs = resultIbGibs;
            } else if (resultBinData) {
                result.binData = resultBinData;
            }
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async put(arg: IonicSpaceOptionsIbGib): Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }

            if (arg.ibGibs?.length > 0) {
                return await this.putIbGibs(arg); // returns
            } else if (arg.binData && arg.data.binHash && arg.data.binExt) {
                return await this.putBin(arg); // returns
            } else {
                throw new Error(`either ibGibs or binData/binHash/binExt required.`);
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.success = false;
        }
        // only executes if there is an error.
        const result = await resulty_<IonicSpaceResultData, IonicSpaceResultIbGib>({resultData});
        return result;
    }

    protected async putIbGibs(arg: IonicSpaceOptionsIbGib): Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            const { isMeta, isDna, force } = arg.data!;
            const ibGibs = arg.ibGibs || [];
            const addrsAlreadyHave: IbGibAddr[] = [];

            // iterate through ibGibs, but this may be an empty array if we're doing binData.
            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                const addr = getIbGibAddr({ibGib});
                const getResult = await this.getFile({addr, isMeta, isDna});
                if (getResult?.success && getResult.ibGib) {
                    // already exists...
                    if (force) {
                        // ...but save anyway.
                        warnings.push(`Forcing save of already put addr: ${addr}`);
                        const putResult = await this.putFile({ibGib, isMeta, isDna});
                        if (putResult.success) {
                            if (!isDna) {
                                // naive cache will cause "memory leak" eventually
                                this.ibGibs[addr] = ibGib;
                            }
                        } else {
                            errors.push(putResult.errorMsg || `${lc} error putting ${addr}`);
                            addrsErrored.push(addr);
                        }
                    } else {
                        // ...so just annotate
                        warnings.push(`skipping (non-force) of already put addr: ${addr}`);
                        addrsAlreadyHave.push(addr);
                    }
                } else {
                    // does not already exist.
                    const putResult = await this.putFile({ibGib, isMeta, isDna, });
                    if (!putResult.success) {
                        errors.push(putResult.errorMsg || `${lc} error putting ${addr}`);
                        addrsErrored.push(addr);
                    }
                }
            }
            if (addrsAlreadyHave.length > 0) { resultData.addrsAlreadyHave = addrsAlreadyHave; }
            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
                resultData.addrsErrored = addrsErrored;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.addrsErrored = addrsErrored;
            resultData.success = false;
        }
        const result = await resulty_<IonicSpaceResultData, IonicSpaceResultIbGib>({resultData});
        return result;
    }

    protected async putBin(arg: IonicSpaceOptionsIbGib): Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            const { binExt, binHash, force } = arg.data!;
            const binData = arg.binData!;
            const addr = this.getBinAddr({binHash, binExt});
            const addrsAlreadyHave: IbGibAddr[] = [];

            // iterate through ibGibs, but this may be an empty array if we're doing binData.
            const getResult = await this.getFile({binHash, binExt});
            if (getResult?.success && getResult.ibGib) {
                // already exists...
                if (force) {
                    // ...but save anyway.
                    warnings.push(`Forcing save of already put binHash: ${binHash}`);
                    const putResult = await this.putFile({binData, binExt, binHash});
                    if (putResult.success) {
                        console.log(`${lc} binHash successful: ${binHash}`)
                    } else {
                        errors.push(putResult.errorMsg || `${lc} error putting binHash ${binHash}`);
                        addrsErrored.push(addr);
                    }
                } else {
                    // ...so just annotate
                    warnings.push(`skipping (non-force) of already put binHash: ${binHash}`);
                    addrsAlreadyHave.push(addr);
                }
            } else {
                // does not already exist.
                const putResult = await this.putFile({binData, binExt, binHash});
                if (!putResult.success) {
                    errors.push(putResult.errorMsg || `${lc} error putting ${addr}`);
                    addrsErrored.push(addr);
                }
            }

            if (warnings.length > 0) { resultData.warnings = warnings; }
            if (errors.length === 0) {
                resultData.success = true;
            } else {
                resultData.errors = errors;
                resultData.addrsErrored = addrsErrored;
            }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.addrsErrored = addrsErrored;
            resultData.success = false;
        }
        const result = await resulty_<IonicSpaceResultData, IonicSpaceResultIbGib>({resultData});
        return result;
    }
    protected async delete(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.delete.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsDeleted: IbGibAddr[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            const { isMeta, isDna, binExt, binHash, } = arg.data!;
            const ibGibAddrs = arg.data!.ibGibAddrs || [];
            const binData = arg.binData;

            // iterate through ibGibs, but this may be an empty array if we're doing binData.
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                const deleteResult = await this.deleteFile({addr, isMeta, isDna, binHash, binExt});
                if (deleteResult?.success) {
                    addrsDeleted.push(addr);
                } else {
                    errors.push(deleteResult.errorMsg || `delete failed: addr (${addr})`);
                    addrsErrored.push(addr);
                }
            }
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
        const result = await resulty_<IonicSpaceResultData, IonicSpaceResultIbGib>({resultData});
        return result;
    }

    async deleteFile({
        addr,
        binHash,
        binExt,
        isMeta,
        isDna,
    }: DeleteIbGibOpts): Promise<DeleteIbGibResult> {
        const lc = `${this.lc}[${this.deleteFile.name}]`;

        const result: DeleteIbGibResult = {};

        try {
            if (!addr && !binHash) { throw new Error(`addr or binHash required.`) };

            const data = this.data;
            let path: string = "";
            let filename: string = "";
            if (addr) {
                filename = this.getFilename({addr});
                path = this.buildPath({filename, isMeta, isDna});
            } else {
                filename = binExt ? binHash + '.' + binExt : binHash;
                path = this.buildPath({filename, isMeta: false, isDna: false, isBin: true});
            }
            console.log(`${lc} path: ${path}, directory: ${data.baseDir}`);
            const _ = await Filesystem.deleteFile({
                path,
                directory: data.baseDir,
            });
            console.log(`${lc} deleted. path: ${path}`);
            result.success = true;
        } catch (error) {
            const errorMsg = `${lc} ${error.message}`;
            console.error(errorMsg);
            result.errorMsg = errorMsg;
        }

        return result;
    }

    protected async getAddrs(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getAddrs.name}]`;
        throw new Error(`${lc} not implemented`);
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
            await resulty_<
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
            await resulty_<
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
            const ibGibs = arg.ibGibs || [];
            const addrsAlreadyHave: IbGibAddr[] = [];
            for (let i = 0; i < ibGibs?.length; i++) {
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
                IonicSpaceResultData,
                IonicSpaceResultIbGib
            >({
                resultData
            });
        return result;
    }

    /**
     * Calculates the hash of the given `binData`.
     *
     * ## notes
     *
     * I've pulled this out into its own method because I'm sure this is going
     * to adapt to multiple hashing algorithms in the future depending on the
     * version.
     *
     * @returns hash string of the given `binData`
     */
    protected getBinHash({binData, version}: {binData: any, version?: string}): Promise<string> {
        const lc = `${this.lc}[${this.getBinHash.name}]`;
        try {
            return h.hash({s: binData});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async putFile({
        ibGib,
        binData,
        binHash,
        binExt,
        isMeta,
        isDna,
    }: PutIbGibOpts): Promise<PutIbGibResult> {
        const lc = `${this.lc}[${this.putFile.name}]`;

        if (!ibGib && !binData) { throw new Error(`${lc} ibGib or binData required.`) };

        let result: PutIbGibResult = {};

        try {
            const thisData = this.data!;
            await this.ensureDirs();
            let path: string = "";
            let filename: string = "";
            let data: string = "";
            if (ibGib) {
                const addr = getIbGibAddr({ibGib});
                filename = `${addr}.json`;
                path = this.buildPath({filename, isMeta, isDna});

                // we only want to persist the ibGib protocol
                const bareIbGib: IbGib_V1 = { ib: ibGib.ib, gib: ibGib.gib };
                if (ibGib.data) { bareIbGib.data = ibGib.data!; }
                if (ibGib.rel8ns) { bareIbGib.rel8ns = ibGib.rel8ns!; }
                data = JSON.stringify(bareIbGib);
            } else {
                binHash = binHash || await this.getBinHash({binData});
                filename = this.getFilename({binHash, binExt}); //binExt ? binHash + '.' + binExt : binHash;
                path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true})
                data = binData;
                result.binHash = binHash;
            }

            const resWrite = await Filesystem.writeFile({
                path,
                data,
                directory: thisData.baseDir,
                encoding: thisData.encoding,
            });
            console.log(`${lc} resWrite.uri: ${resWrite.uri}`);

            result.success = true;
        } catch (error) {
            const errorMsg = `${lc} ${error.message}`;
            console.error(errorMsg);
            result.errorMsg = errorMsg;
        }

        return result;
    }

    protected async ensurePermissions(): Promise<boolean> {
        const lc = `${this.lc}[${this.ensurePermissions.name}]`;
        try {
            if (Filesystem.requestPermissions) {
                const resPermissions = await Filesystem.requestPermissions();
                if (resPermissions?.results) {
                    console.warn(`${lc} resPermissions: ${JSON.stringify(resPermissions.results)} falsy`);
                    return true;
                } else {
                    console.warn(`${lc} resPermissions?.results falsy`);
                    return true;
                }
            } else {
                console.warn(`${lc} Filesystem.requestPermissions falsy`);
                return true;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            return false;
        }
    }

    /**
     * Ensure directories are created on filesystem.
     */
    protected async ensureDirs(): Promise<void> {
        const lc = `${this.lc}[${this.ensureDirs.name}]`;
        const data = this.data!;
        const directory = data.baseDir;

        const permitted = await this.ensurePermissions();
        if (!permitted) { console.error(`${lc} permission not granted.`); return; }

        const paths = [
            data.baseSubPath, // = 'ibgib';
            data.baseSubPath + '/' + data.spaceSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.ibgibsSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.metaSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.binSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.dnaSubPath,
        ];

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const lc2 = `${lc}[(path: ${path}, directory: ${directory})]`;

            // check if we've already ensured for this path
            const pathExistsKey = directory.toString() + '/' + path;
            let exists = this.pathExistsMap[pathExistsKey] || false;

            if (!exists) {
                // we've not checked this path (or it didn't exist)
                try {
                    await Filesystem.readdir({ path, directory });
                    exists = true;
                    this.pathExistsMap[pathExistsKey] = true;
                } catch (error) {
                    console.log(`${lc2} Did not exist`);
                }
            }

            if (!exists) {
                // try full path
                console.log(`${lc2} creating...`);
                try {
                    await Filesystem.mkdir({ path, directory, recursive: true });
                    this.pathExistsMap[pathExistsKey] = true;
                } catch (error) {
                    console.log(`${lc2} Error creating. Trying next`);
                } finally {
                    console.log(`${lc2} complete.`);
                }
            }
        }
    }

    // #region files related

    protected async getFile({
        addr,
        binHash,
        binExt,
        isMeta,
        isDna,
    }: GetIbGibOpts): Promise<GetIbGibResult> {
        let lc = `${this.lc}[${this.getFile.name}]`;

        if (!addr && !binHash) { throw new Error(`${lc} addr or binHash required.`) };
        if (!addr && binHash) { addr = this.getBinAddr({binHash, binExt}); }

        lc = `${lc}(${addr})]`;

        const data = this.data;
        if (!data) {}

        // const {ib,gib} = getIbAndGib({ibGibAddr: addr});
        const isBin: boolean = !!binHash;
        const result: GetIbGibResult = {};

        const tryRead: (p:string) => Promise<FileReadResult> = async (p: string) => {
            const lcTry = `${lc}[${tryRead.name}]`;
            try {
                const resRead = await Filesystem.readFile({
                    path: p,
                    directory: data.baseDir,
                    encoding: data.encoding,
                });
                console.log(`${lcTry} path found: ${p}`);
                return resRead;
            } catch (error) {
                console.log(`${lcTry} path not found: ${p}`);
                return null;
            }
        }
        try {
            let path: string = "";
            let filename: string = "";
            let paths: string[] = [];
            if (!isBin) {
                filename = this.getFilename({addr});

                if (isMeta) {
                    // explicitly stating meta, so only look in meta
                    paths = [ this.buildPath({filename, isMeta: true, isDna: false}), ];
                } else if (isDna) {
                    // explicitly stating dna, so only look in dna
                    paths = [ this.buildPath({filename, isMeta: false, isDna: true}), ];
                } else {
                    // could be regular, meta or dna, so we'll search everywhere, but first regular.
                    paths = [
                        this.buildPath({filename, isMeta: false, isDna: false}),
                        this.buildPath({filename, isMeta: true, isDna: false}),
                        this.buildPath({filename, isMeta: false, isDna: true}),
                    ];
                }
            } else {
                filename = this.getFilename({binHash, binExt});
                path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true})
                paths = [path];
            }
            let resRead: any = null;
            for (const tryPath of paths) {
                let x = await tryRead(tryPath);
                if (x?.data) { resRead = x; break; }
            }
            if (!resRead) {
                // throw new Error(`paths not found: ${JSON.stringify(paths)}`)
                console.warn(`${lc} paths not found: ${JSON.stringify(paths)}`)
                return;
            }
            if (!isBin) {
                // ibGib retrieved
                result.ibGib = <IbGib_V1>JSON.parse(resRead.data);
            } else {
                // bin
                result.binData = resRead.data;
            }

            result.success = true;
        } catch (error) {
            const errorMsg = `${lc} ${error.message}`;
            console.error(errorMsg);
            result.errorMsg = errorMsg;
        }

        return result;
    }

  // #endregion
}

