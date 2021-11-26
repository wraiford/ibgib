import { Plugins, FilesystemEncoding, FileReadResult, FilesystemDirectory } from '@capacitor/core';
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

// #region Space related interfaces/constants

/**
 * This is the shape of data about this space itself (not the contained ibgibs' spaces).
 */
export interface IonicSpace_V1_Data {
    baseDir: FilesystemDirectory;
    encoding: FilesystemEncoding;
    baseSubPath: string;
    ibgibsSubPath: string;
    metaSubPath: string;
    binSubPath: string;
    dnaSubPath: string;
}

/** Marker interface atm */
export interface IonicRel8ns_V1 extends IbGibRel8ns_V1 {}

export const DEFAULT_BOOTSTRAP_SPACE_V1_DATA: IonicSpace_V1_Data = {
    baseDir: c.IBGIB_BASE_DIR,
    encoding: c.IBGIB_FILES_ENCODING,
    baseSubPath: c.IBGIB_BASE_SUBPATH,
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
   * If true, will store with metas.
   */
  isMeta?: boolean;
  /**
   * If truthy, will get the underlying raw read/write result.
   *
   * ATOW, in Ionic/Capacitor's case, this would hold the `writeFile` result obj.
   */
  getRawResult?: boolean;
}
interface PutIbGibResult extends FileResult {
  binHash?: string;
}

// #endregion




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
            if (!this._data.baseDir) { this._data.baseDir = c.IBGIB_BASE_DIR; }
            if (!this._data.encoding) { this._data.encoding = c.IBGIB_FILES_ENCODING; }
            if (!this._data.baseSubPath) { this._data.baseSubPath = c.IBGIB_BASE_SUBPATH; }
            if (!this._data.ibgibsSubPath) { this._data.baseSubPath = c.IBGIB_IBGIBS_SUBPATH; }
            if (!this._data.metaSubPath) { this._data.baseSubPath = c.IBGIB_META_SUBPATH; }
            if (!this._data.binSubPath) { this._data.baseSubPath = c.IBGIB_BIN_SUBPATH; }
            if (!this._data.dnaSubPath) { this._data.baseSubPath = c.IBGIB_DNA_SUBPATH; }
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
            return `${data.baseSubPath}/${data.metaSubPath}/${filename}`;
        } else if (isBin) {
            return `${this.data.baseSubPath}/${data.binSubPath}/${filename}`;
        } else if (isDna) {
            return `${this.data.baseSubPath}/${data.dnaSubPath}/${filename}`;
        } else { // regular ibGib
            return `${this.data.baseSubPath}/${data.ibgibsSubPath}/${filename}`;
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
        const resultIbGibs: IbGib_V1[] = [];
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            // const argData = arg.data!;
            const { ibGibAddrs, isMeta, isDna, binExt, binHash } = arg.data!;
            let notFoundIbGibAddrs: IbGibAddr[] = undefined;
            if (ibGibAddrs?.length > 0) {
                // getting ibgibs, not a binary
                for (let i = 0; i < ibGibAddrs.length; i++) {
                    const addr = ibGibAddrs[i];
                    if (Object.keys(this.ibGibs).includes(addr)) {
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
                throw new Error('not implemented yet');
            } else {
                throw new Error(`Either ibGibAddrs or binHash required.`);
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
            if (resultIbGibs.length > 0) { result.ibGibs = resultIbGibs; }
        return result;
    }

    protected async put(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.put.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ibGib: arg}), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            const { isMeta, isDna, binExt, binHash, force } = arg.data!;
            const ibGibs = arg.ibGibs || [];
            const binData = arg.binData;
            const addrsAlreadyHave: IbGibAddr[] = [];

            // iterate through ibGibs, but this may be an empty array if we're doing binData.
            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                const addr = getIbGibAddr({ibGib});
                const getResult = await this.getFile({addr, isMeta, isDna, binHash, binExt});
                if (getResult?.success && getResult.ibGib) {
                    // already exists...
                    if (force) {
                        // ...but save anyway.
                        warnings.push(`Forcing save of already put addr: ${addr}`);
                        const putResult = await this.putFile({ibGib, isMeta, isDna, });
                        if (!putResult.success) {
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
        const result = await getWrapperResultIbGib<IonicSpaceResultData, IonicSpaceResultIbGib>({resultData});
        return result;
    }

    async putFile({
        ibGib,
        binData,
        binExt,
        isMeta,
        isDna,
    }: PutIbGibOpts): Promise<PutIbGibResult> {
        const lc = `${this.lc}[${this.put.name}]`;

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
                data = JSON.stringify(ibGib);
            } else {
                const binHash = await h.hash({s: binData});
                filename = binExt ? binHash + '.' + binExt : binHash;
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

    async ensurePermissions(): Promise<boolean> {
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
     * Check every time app starts if paths exist.
     * But don't check every time do anything whatsoever.
     *
     * for use in `ensureDirs` function.
     */
    private pathExistsMap = {};

    /**
     * Ensure directories are created on filesystem.
     */
    async ensureDirs(): Promise<void> {
        const lc = `${this.lc}[${this.ensureDirs.name}]`;
        const data = this.data!;
        const directory = data.baseDir;

        const permitted = await this.ensurePermissions();
        if (!permitted) { console.error(`${lc} permission not granted.`); return; }

        const paths = [
            data.baseSubPath,// = 'ibgib';
            data.baseSubPath + '/' + data.ibgibsSubPath,
            data.baseSubPath + '/' + data.metaSubPath,
            data.baseSubPath + '/' + data.binSubPath,
            data.baseSubPath + '/' + data.dnaSubPath,
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
            await getWrapperResultIbGib<
                IonicSpaceResultData,
                IonicSpaceResultIbGib
            >({
                resultData
            });
        return result;
    }

    // #region files related

    async getFile({
        addr,
        binHash,
        binExt,
        isMeta,
        isDna,
    }: GetIbGibOpts): Promise<GetIbGibResult> {
        const lc = `${this.lc}[${this.getFile.name}(${addr})]`;

        if (!addr && !binHash) { throw new Error(`${lc} addr or binHash required.`) };

        const data = this.data;
        if (!data) {}

        // const {ib,gib} = getIbAndGib({ibGibAddr: addr});
        const isBin = !addr;
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
            if (addr) {
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
                filename = binExt ? binHash + '.' + binExt : binHash;
                path = this.buildPath({filename, isDna: false, isMeta: false, isBin: true})
                paths = [path];
            }
            let resRead: any = null;
            for (const tryPath of paths) {
                let x = await tryRead(tryPath);
                if (x?.data) { resRead = x; break; }
            }
            if (!resRead) { throw new Error(`paths not found: ${JSON.stringify(paths)}`) }
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
