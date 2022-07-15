import {
    Plugins, FilesystemEncoding, FileReadResult, FilesystemDirectory, Capacitor
} from '@capacitor/core';
const { Filesystem } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, IbGibRel8ns_V1, GIB, ROOT, isPrimitive, } from 'ts-gib/dist/V1';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';

import * as c from '../../constants';
import { SpaceBase_V1 } from './space-base-v1';
import {
    IbGibSpaceData, IbGibSpaceOptionsData, IbGibSpaceOptionsRel8ns,
    IbGibSpaceOptionsIbGib, IbGibSpaceResultData, IbGibSpaceResultRel8ns,
    IbGibSpaceResultIbGib
} from '../../types/space';
import { isBinary, getBinHashAndExt } from '../../helper/ibgib';
import { tryRead } from '../../helper/ionic';
import { getSpaceIb, getTjpIbGib, getSpecialIbGib, getInfoFromSpaceIb } from '../../helper/space';
import { argy_ } from '../witness-helper';
import { validateIbGibIntrinsically } from '../../helper/validate';

const logalot = c.GLOBAL_LOG_A_LOT || false;

// #region Space related interfaces/constants

/**
 * This is the shape of data about this space itself (not the contained ibgibs' spaces).
 */
export interface IonicSpaceData_V1 extends IbGibSpaceData {
    /**
     * Redeclared here to make this required (not optional)
     */
    uuid: string;
    baseDir: FilesystemDirectory;
    encoding: FilesystemEncoding;
    baseSubPath: string;
    spaceSubPath: string;
    ibgibsSubPath: string;
    metaSubPath: string;
    binSubPath: string;
    dnaSubPath: string;
    n?: number;
    timestamp?: string;
}

/**
 * Used in bootstrapping.
 *
 * If you change this, please bumpt the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
const DEFAULT_IONIC_SPACE_DATA_V1: IonicSpaceData_V1 = {
    version: '5',
    uuid: c.ZERO_SPACE_ID,
    name: c.IBGIB_SPACE_NAME_DEFAULT,
    baseDir: c.IBGIB_BASE_DIR,
    encoding: c.IBGIB_ENCODING,
    baseSubPath: c.IBGIB_BASE_SUBPATH,
    spaceSubPath: c.IBGIB_SPACE_SUBPATH_DEFAULT,
    ibgibsSubPath: c.IBGIB_IBGIBS_SUBPATH,
    metaSubPath: c.IBGIB_META_SUBPATH,
    binSubPath: c.IBGIB_BIN_SUBPATH,
    dnaSubPath: c.IBGIB_DNA_SUBPATH,
    persistOptsAndResultIbGibs: false,
    validateIbGibAddrsMatchIbGibs: false,
    longPollingIntervalMs: c.DEFAULT_LOCAL_SPACE_POLLING_INTERVAL_MS,
    allowPrimitiveArgs: false,
    catchAllErrors: true,
    description: c.DEFAULT_LOCAL_SPACE_DESCRIPTION,
    trace: false,
}

/** Marker interface atm */
export interface IonicSpaceRel8ns_V1 extends IbGibRel8ns_V1 { }

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
     * If truthy, will look in the meta subpath first, then the regular if not found.
     */
    isMeta?: boolean;
    /**
     * Are we looking for a DNA ibgib?
     */
    isDna?: boolean;
}

export interface IonicSpaceOptionsRel8ns extends IbGibSpaceOptionsRel8ns {
}

/** Marker interface atm */
export interface IonicSpaceOptionsIbGib
    extends IbGibSpaceOptionsIbGib<IbGib_V1, IonicSpaceOptionsData, IonicSpaceOptionsRel8ns> {
}

/** Marker interface atm */
export interface IonicSpaceResultData extends IbGibSpaceResultData {
}

export interface IonicSpaceResultRel8ns extends IbGibSpaceResultRel8ns {
}

export interface IonicSpaceResultIbGib
    extends IbGibSpaceResultIbGib<IbGib_V1, IonicSpaceResultData, IonicSpaceResultRel8ns> {
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
interface GetIbGibFileOpts {
    /**
     * If getting ibGib object, this is its address.
     */
    addr?: IbGibAddr;
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
interface GetIbGibFileResult extends FileResult {
    /**
     * ibGib if retrieving a "regular" ibGib.
     *
     * This is used when you're not getting a pic, e.g.
     */
    ibGib?: IbGib_V1;
}

interface PutIbGibFileOpts {
    ibGib?: IbGib_V1;
    /**
     * If true, will store with metas.
     */
    isMeta?: boolean;
    /**
     * If true, will store in a different folder.
     */
    isDna?: boolean;
}
interface PutIbGibFileResult extends FileResult { }

interface DeleteIbGibFileOpts extends GetIbGibFileOpts { }
interface DeleteIbGibFilesResult extends FileResult { }

// #endregion


/**
 * basic validation for an ionic space
 */
export async function validateIonicSpace_V1Intrinsically({ space }: { space: IonicSpace_V1 }): Promise<string[] | null> {
    const lc = `${this.lc}[${validateIonicSpace_V1Intrinsically.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: fcfe57145426ab4a5a0e961e87001922)`); }
        const errors: string[] = (await validateIbGibIntrinsically({ ibGib: this })) ?? [];

        const { ib, gib, data, rel8ns } = space;

        if (!ib) { errors.push('ib required.'); }
        if (!gib) { errors.push('gib required.'); }
        if (gib === GIB) { errors.push('gib cannot be primitive.'); }
        if (!data) { errors.push('data required.'); }

        if (!data.name) { errors.push('space name required.') }
        if (!data.classname) { errors.push('classname required.') }
        if (data.classname !== IonicSpace_V1.name) {
            errors.push(`unknown classname (${data.classname}). data.classname !== IonicSpace_V1.name`);
        }
        if (!data.baseDir) { errors.push(`data.baseDir required.`) }
        if (!data.baseSubPath) { errors.push(`data.baseSubPath required.`) }
        if (!data.binSubPath) { errors.push(`data.binSubPath required.`) }
        if (!data.dnaSubPath) { errors.push(`data.dnaSubPath required.`) }
        if (!data.ibgibsSubPath) { errors.push(`data.ibgibsSubPath required.`) }
        if (!data.metaSubPath) { errors.push(`data.metaSubPath required.`) }
        if (typeof data.n !== 'number') { errors.push(`data.n required and must be a number.`) }
        if (!data.spaceSubPath) { errors.push(`data.spaceSubPath required.`) }
        if (!data.uuid) { errors.push(`data.uuid required.`) }
        if (!data.encoding) { errors.push(`data.encoding required.`) }
        /** should probably get this from Capacitor... */
        const validEncodings = ["utf8", "ascii", "utf16"];
        if (!validEncodings.includes(data.encoding)) {
            errors.push(`invalid encoding: ${data.encoding}. validEncodings: ${validEncodings.join(', ')}`);
        }

        // ensure ib matches up with internal data
        const { spaceClassname, spaceId, spaceName } = getInfoFromSpaceIb({ spaceIb: ib });
        if (spaceClassname !== data.classname) {
            errors.push(`ib's spaceClassname (${spaceClassname}) must match data.classname (${data.classname})`);
        }
        if (spaceId !== data.uuid) {
            errors.push(`ib's spaceId (${spaceId}) must match data.uuid (${data.uuid})`);
        }
        if (spaceName !== data.name) {
            errors.push(`ib's spaceName (${spaceName}) must match data.name (${data.name})`);
        }

        // ensure rel8ns make sense
        if (data.n !== 0 && (rel8ns.past ?? []).length === 0) {
            errors.push(`"past" rel8n required when data.n > 0`);
        }
        if (data.n === 0 && (rel8ns.past ?? []).length > 0) {
            errors.push(`"past" rel8n cannot be populated if data.n === 0`);
        }
        if (rel8ns?.past?.length > 0) {
            const pastAddrs = <IbGibAddr[]>rel8ns.past;
            pastAddrs.forEach(x => {
                const { ib: pastIb } = h.getIbAndGib({ ibGibAddr: x });
                const pastIbInfo = getInfoFromSpaceIb({ spaceIb: pastIb });
                if (pastIbInfo.spaceClassname !== spaceClassname) {
                    errors.push(`rel8ns.past address classname (${pastIbInfo.spaceClassname}) must match current spaceClassname (${spaceClassname})`);
                }
                if (pastIbInfo.spaceId !== spaceId) {
                    errors.push(`rel8ns.past address spaceId (${pastIbInfo.spaceId}) must match current spaceId (${spaceId})`);
                }
                // i want to allow this, but for now we're going to require not changing the name...
                if (pastIbInfo.spaceName !== spaceName) {
                    errors.push(`rel8ns.past address spaceName (${pastIbInfo.spaceName}) must match current spaceName (${spaceName})`);
                }
            });
        }

        return errors;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

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
    IonicSpaceOptionsRel8ns,
    IonicSpaceOptionsIbGib,
    IonicSpaceResultData,
    IonicSpaceResultRel8ns,
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
        super(initialData ?? h.clone(DEFAULT_IONIC_SPACE_DATA_V1), initialRel8ns);
        const lc = `${this.lc}[ctor]`;

        try {
            if (logalot) { console.log(`${lc} starting...`); }
            this.initialize();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
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
    static async createFromDto<
        TData extends IonicSpaceData_V1 = IonicSpaceData_V1,
        TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
    >(dto: IbGib_V1<TData, TRel8ns>): Promise<IonicSpace_V1<TData, TRel8ns>> {
        const lc = `[${IonicSpace_V1.name}][${this.createFromDto.name}]`;
        if (logalot) { console.log(`${lc}`); }
        const space = new IonicSpace_V1<TData, TRel8ns>(null, null);
        await space.loadIbGibDto(dto);
        return space;
    }

    protected async validateWitnessArg(arg: IonicSpaceOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
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
     * Initializes to default space values.
     */
    protected initialize(): void {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!this.data) { this.data = h.clone(DEFAULT_IONIC_SPACE_DATA_V1); }
            if (!this.data.baseDir) { this.data.baseDir = c.IBGIB_BASE_DIR; }
            if (!this.data.encoding) { this.data.encoding = c.IBGIB_ENCODING; }
            if (!this.data.baseSubPath) { this.data.baseSubPath = c.IBGIB_BASE_SUBPATH; }
            if (!this.data.spaceSubPath) { this.data.spaceSubPath = c.IBGIB_SPACE_SUBPATH_DEFAULT; }
            if (!this.data.ibgibsSubPath) { this.data.ibgibsSubPath = c.IBGIB_IBGIBS_SUBPATH; }
            if (!this.data.metaSubPath) { this.data.metaSubPath = c.IBGIB_META_SUBPATH; }
            if (!this.data.binSubPath) { this.data.binSubPath = c.IBGIB_BIN_SUBPATH; }
            if (!this.data.dnaSubPath) { this.data.dnaSubPath = c.IBGIB_DNA_SUBPATH; }

            this.ib = getSpaceIb({ space: this, classname: IonicSpace_V1.name });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private hasInCache({ addr }: { addr: IbGibAddr }): Promise<boolean> {
        if (isPrimitive({ gib: h.getIbAndGib({ ibGibAddr: addr }).gib })) {
            // primitives never cached
            return Promise.resolve(false);
        } else if (Object.keys(this.ibGibs).includes(addr)) {
            // has in local instance cache
            return Promise.resolve(true);
        } else if (this.cacheSvc) {
            // not local so delegate to cache svc
            return this.cacheSvc.has({ addr });
        } else {
            // no external cache svc and not in local instance cache
            return Promise.resolve(false);
        }
    }
    private async putInCache({ addr, ibGib }: { addr: IbGibAddr, ibGib: IbGib_V1 }): Promise<void> {
        const lc = `${this.lc}[${this.putInCache.name}][${addr}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!ibGib) { throw new Error(`ibGib required (E: 993e26fe40894bab9feccac3938f37df)`); }

            if (isPrimitive({ ibGib })) {
                if (logalot) { console.log(`${lc} skipping caching primitive (I: a04dfb691582a4db8a0bfecfefe5e622)`); }
                return;
            } else {
                if (logalot) { console.log(`${lc} caching addr (I: b996a306f256ee5f39db1e2f5d515c22)`); }
            }

            // instance cache
            this.ibGibs[addr] = ibGib;

            // cache svc
            if (this.cacheSvc) { await this.cacheSvc.put({ addr, ibGib }); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    private async getFromCache({ addr }: { addr: IbGibAddr }): Promise<IbGib_V1 | undefined> {
        const lc = `${this.lc}[${this.getFromCache.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let cached = this.ibGibs[addr];
            if (!cached && this.cacheSvc) {
                const info = await this.cacheSvc.get({ addr });
                cached = info.ibGib;
            }
            return cached;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private deleteFromCache({ addr }: { addr: IbGibAddr }): Promise<void> {
        const lc = `${this.lc}[${this.getFromCache.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            delete this.ibGibs[addr];
            return Promise.resolve();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getImpl(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getImpl.name}]`;
        const resultIbGibs: IbGib_V1[] = [];
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ ibGib: arg }), }
        let notFoundIbGibAddrs: IbGibAddr[] = undefined;
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            const { ibGibAddrs, isMeta, isDna, } = arg.data!;

            const binAddrs = (ibGibAddrs || []).filter(addr => isBinary({ addr }));

            let ibGibAddrsNonBin = ibGibAddrs.filter(addr => !binAddrs.includes(addr));

            if (logalot) { console.log(`${lc} getting non-bin ibgibs. ibGibAddrsNonBin: ${ibGibAddrsNonBin}`); }
            for (let i = 0; i < ibGibAddrsNonBin.length; i++) {
                const addr = ibGibAddrsNonBin[i];
                if (!arg.data.force && await this.hasInCache({ addr })) {
                    if (logalot) { console.log(`${lc} YES found in naive cache. (I: 0b23f394fd944c2a96df3543dd0a59c5)`); }
                    // console.log(`${lc} YES found in naive cache.  ${addr} TESTING REMOVE THIS YO (I: 55344e9fa3984bc9bf3f7a8aa3b4cbf5)`);
                    // console.log(`${lc} YES found in naive cache. TESTING REMOVE THIS YO (I: 55344e9fa3984bc9bf3f7a8aa3b4cbf5)`);
                    const cached = await this.getFromCache({ addr });
                    if (!cached) { throw new Error(`(UNEXPECTED) we had in cache but failed to retrieve? (E: 4af334f7a90cb22ffa3b549d0db19a22)`); }
                    resultIbGibs.push(cached);
                } else {
                    // not found in memory, so look in files
                    if (!isPrimitive({ gib: h.getIbAndGib({ ibGibAddr: addr }).gib }) && this.cacheSvc) {
                        if (logalot) { console.log(`${lc} NOT found in naive cache. Expensive(r) loading of file... TESTING REMOVE THIS YO (I: 7983e6afb9bf440a83b90de64c487be3)`); }
                    }
                    const getResult = await this.getFile({ addr, isMeta, isDna, });
                    if (getResult?.success && getResult.ibGib) {
                        if (logalot) { console.log(`${lc} ${addr} PUTTING IN in naive cache. Expensive(r) loading of file... TESTING REMOVE THIS YO (I: fe0612406c334aa88bcc51bb35150de3)`); }
                        await this.putInCache({ addr, ibGib: getResult.ibGib })
                        resultIbGibs.push(getResult.ibGib!);
                    } else {
                        // not found in memory or in files
                        if (!notFoundIbGibAddrs) { notFoundIbGibAddrs = []; }
                        notFoundIbGibAddrs.push(addr);
                    }
                }
            }

            for (let i = 0; i < binAddrs.length; i++) {
                const addr = binAddrs[i];
                const { binHash, binExt } = getBinHashAndExt({ addr });

                // getting binary, not a regular ibGib via addr
                if (logalot) { console.log(`${lc} getting binHash.binExt: ${binHash}.${binExt}`); }
                const getResult = await this.getFile({ addr });
                if (getResult?.success && getResult.ibGib?.data) {
                    if (logalot) { console.log(`${lc} getResult.success. ibGib.data.length: ${getResult.ibGib!.data!.length}`); }
                    resultIbGibs.push(getResult.ibGib);
                } else {
                    if (logalot) { console.log(`${lc} not found in files. (binData is not cached atm)`) }
                    // not found in files. (binData is not cached atm)
                    notFoundIbGibAddrs.push(addr);
                }
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
            const result = await this.resulty({ resultData });
            if (resultIbGibs.length > 0) {
                result.ibGibs = resultIbGibs;
            }
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async putImpl(arg: IonicSpaceOptionsIbGib): Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.putImpl.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ ibGib: arg }), }
        const errors: string[] = [];
        try {

            if (logalot) { console.log(`validating arg and internal state...`); }
            if (!arg.data) { throw new Error('arg.data required. (E: d64a46e5efab4b09b57850ecf0854386)'); }
            if (arg.ibGibs?.length === 0) { throw new Error(`arg.ibGibs required. (E: b4930d564b284fb9b26b542f14143a28)`); }

            // removing this because adding keys blows it up on older spaces.
            // it's a klugy hack anyway.
            // const reqKeys = Object.keys(DEFAULT_IONIC_SPACE_DATA_V1);
            // const thisDataKeys = Object.keys(this.data || {});
            // const nonInitializedKeys: string[] = [];
            // reqKeys.forEach(key => {
            //     if (!thisDataKeys.includes(key)) { nonInitializedKeys.push(key); }
            // });
            // if (nonInitializedKeys.length > 0) {
            //     console.warn(`${lc} this.data: ${h.pretty(this.data ?? {})}`);
            //     throw new Error(`not initialized yet. data keys not found: ${nonInitializedKeys}. (E: 32f7273516a0457ba2e2bbda69c5aae6)`);
            // }

            if (logalot) { console.log(`arg and internal state validated...calling impl func`); }
            return await this.putIbGibsImpl(arg); // <<<< returns early
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = errors.concat([error.message]);
            resultData.success = false;
        }
        // only executes if there is an error.
        const result = await this.resulty({ resultData });
        return result;
    }

    protected async putIbGibsImpl(arg: IonicSpaceOptionsIbGib): Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.putIbGibsImpl.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ ibGib: arg }), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy (E: aae5757c158d4a799deb7fca9d6245f0)'); }
            const { isMeta, isDna, force } = arg.data!;
            const ibGibs = arg.ibGibs || [];
            const addrsAlreadyHave: IbGibAddr[] = [];

            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                const addr = getIbGibAddr({ ibGib });
                if (logalot) { console.log(`${lc} checking to see if already exists...`); }
                const getResult = await this.getFile({ addr, isMeta, isDna });
                // const getResult: any = null; // testing performance
                if (getResult?.success && getResult.ibGib) {
                    // already exists...
                    if (logalot) { console.log(`${lc} already exists...`); }
                    if (force) {
                        // ...but save anyway.
                        if (logalot) { console.log(`${lc} Forcing save of already put addr: ${addr} (I: 325f363e5d438b43c24b810c150e4e22)`); }
                        const putResult = await this.putFile({ ibGib, isMeta, isDna });
                        if (putResult.success) {
                            if (!isDna) {
                                // naive cache will cause "memory leak" eventually
                                await this.putInCache({ addr, ibGib });
                            }
                        } else {
                            errors.push(putResult.errorMsg || `${lc} error putting ${addr}`);
                            addrsErrored.push(addr);
                        }
                    } else {
                        // ...so annotate
                        // deb ugger;
                        warnings.push(`${lc} skipping (non-force) of already exists addr: ${addr} (W: b7fbe22473014dd090db88aee631fecb)`);
                        addrsAlreadyHave.push(addr);
                    }
                } else {
                    // does not already exist.
                    if (logalot) { console.log(`${lc} does NOT already exist...`); }
                    const putResult = await this.putFile({ ibGib, isMeta, isDna, });
                    if (putResult.success) {
                        if (!isDna) { await this.putInCache({ addr, ibGib }); }
                    } else {
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
        const result = await this.resulty({ resultData });
        return result;
    }

    protected async deleteImpl(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.deleteImpl.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ ibGib: arg }), }
        const errors: string[] = [];
        const warnings: string[] = [];
        const addrsDeleted: IbGibAddr[] = [];
        const addrsErrored: IbGibAddr[] = [];
        try {
            if (!arg.data) { throw new Error('arg.data is falsy'); }
            const { isMeta, isDna, } = arg.data!;
            const ibGibAddrs = arg.data!.ibGibAddrs || [];

            // delete cached entries first
            // const cachedAddrs = Object.entries(this.ibGibs)
            //     .filter(([x,y]) => ibGibAddrs.includes(x))
            //     .map(([x,y]) => x);
            // cachedAddrs.forEach(addr => { delete this.ibGibs[addr]; });

            // iterate through ibGibs, but this may be an empty array if we're doing binData.
            for (let i = 0; i < ibGibAddrs.length; i++) {
                const addr = ibGibAddrs[i];
                await this.deleteFromCache({ addr });
                const deleteResult = await this.deleteFile({ addr, isMeta, isDna, });
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
        const result = await this.resulty({ resultData });
        return result;
    }

    protected async getAddrsImpl(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getAddrsImpl.name}]`;
        throw new Error(`${lc} not implemented. (E: 74dd50ce4b564559bc44d6c08d446cb3)`);
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
    protected async canGetImpl(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canGetImpl.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ ibGib: arg }), }
        try {
            throw new Error(`not implemented (E: 2a45977c584c6bbbc4f164c16106bd22)`);
            // const { ibGibAddrs } = arg.data!;
            // let notFoundIbGibAddrs: IbGibAddr[] = undefined;
            // for (let i = 0; i < ibGibAddrs.length; i++) {
            //     const addr = ibGibAddrs[i];
            //     if (!Object.keys(this.ibGibs).includes(addr)) {
            //         if (!notFoundIbGibAddrs) { notFoundIbGibAddrs = []; }
            //         notFoundIbGibAddrs.push(addr);
            //     }
            // }
            // resultData.success = true;
            // if (notFoundIbGibAddrs && notFoundIbGibAddrs.length > 0) {
            //     resultData.addrsNotFound = notFoundIbGibAddrs;
            //     resultData.can = false;
            // } else {
            //     resultData.can = true;
            // }
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({ resultData });
        return result;
    }
    protected async canPutImpl(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canPutImpl.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ ibGib: arg }), }
        try {
            throw new Error(`not implemented (E: 25a005d496efc69faefdec155ffb4a22)`);
            // const ibGibs = arg.ibGibs || [];
            // const addrsAlreadyHave: IbGibAddr[] = [];
            // for (let i = 0; i < ibGibs?.length; i++) {
            //     const ibGib = ibGibs[i];
            //     const addr = getIbGibAddr({ibGib});
            //     if (Object.keys(this.ibGibs).includes(addr)) {
            //         addrsAlreadyHave.push(addr);
            //     }
            // }
            // resultData.success = true;
            // if (addrsAlreadyHave.length > 0) {
            //     resultData.addrsAlreadyHave = addrsAlreadyHave;
            //     resultData.warnings = (resultData.warnings || []).concat([`${lc} already have addr(s).`]);
            // }
            // resultData.can = ibGibs.length > addrsAlreadyHave.length;
        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            resultData.errors = [error.message];
        }
        const result = await this.resulty({ resultData });
        return result;
    }

    protected async canDeleteImpl(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.canDeleteImpl.name}]`;
        throw new Error(`${lc} not implemented (E: a3306138b4ac429ba5f8f293ad7dd07b)`);
    }

    protected async getLatestAddrsImpl(arg: IonicSpaceOptionsIbGib):
        Promise<IonicSpaceResultIbGib> {
        const lc = `${this.lc}[${this.getLatestAddrsImpl.name}]`;
        const resultData: IonicSpaceResultData = { optsAddr: getIbGibAddr({ ibGib: arg }), }
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            const latestAddrs = new Set<IbGibAddr>();
            const addrsNotFound = new Set<IbGibAddr>();
            const addrsErrored = new Set<IbGibAddr>();
            resultData.latestAddrsMap = {};

            // iterate through incoming ibGibAddrs, get their corresponding
            // ibgib from ionic ("file") storage, and use our existing
            // `getLatestAddr` function
            for (let i = 0; i < arg.data.ibGibAddrs.length; i++) {
                const addr = arg.data.ibGibAddrs[i];
                const getResult = await this.getFile({ addr });
                if (getResult?.success && getResult.ibGib) {
                    const ibGib = getResult.ibGib!;
                    const latestAddr = await this.getLatestAddr_Yo({ ibGib });
                    if (latestAddr) {
                        latestAddrs.add(latestAddr);
                        resultData.latestAddrsMap[addr] = latestAddr;
                    } else {
                        console.warn(`expecting latestAddr to either be assigned or throw. Adding addr (${addr}) to addrsErrored. (W: 35c3712b1a1e579ccf28c389eb2ecc22)`);
                        addrsErrored.add(addr);
                    }
                } else if (getResult?.success) {
                    addrsNotFound.add(addr);
                    resultData.latestAddrsMap[addr] = null;
                } else if (getResult.errorMsg) {
                    addrsErrored.add(addr);
                } else {
                    throw new Error(`unknown (invalid) getResult: ${h.pretty(getResult)} (E: 2674ad5d30294be29a3d3fdcf54ef6d9)`);
                }
            }

            resultData.addrs = latestAddrs.size > 0 ? [...latestAddrs] : undefined;
            resultData.addrsErrored = addrsErrored.size > 0 ? [...addrsErrored] : undefined;
            resultData.addrsNotFound = addrsNotFound.size > 0 ? [...addrsNotFound] : undefined;

            // we didn't throw, so that's a success
            resultData.success = true;
        } catch (error) {
            const emsg = `${lc} ${error.message}`;
            console.error(emsg);
            resultData.errors = [emsg];
        }
        try {
            let result = await this.resulty({ resultData });
            return result;
        } catch (error) {
            console.error(`${lc}[resulty] ${error.message}`);
            throw error;
        }
    }

    /**
     * Ionic space uses a special ibgib "latest" to track the latest ibgibs in
     * timelines locally.
     *
     * @returns latest addr in this space according to the "latest" special ibgib index
     */
    private async getLatestAddr_Yo({
        ibGib,
    }: {
        ibGib: IbGib_V1,
    }): Promise<IbGibAddr> {
        let lc = `${this.lc}[${this.getLatestAddr_Yo.name}]`;
        if (logalot) { console.log(`${lc} starting...`); }
        try {
            if (!ibGib) { throw new Error(`ibGib required (E: 1f8f0cb61d1b4c708b06762048735c22)`); }

            // latest addr is indexed by tjpAddr, so we need to get this first...
            let ibGibAddr = h.getIbGibAddr({ ibGib });
            if (ibGib.gib === GIB) { return ibGibAddr; }

            // get the tjp for the rel8nName mapping, and also for some checking logic
            let tjp = await getTjpIbGib({ ibGib, space: this });
            if (!tjp) {
                console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself. (W: 860bdcaaf80548feb6b61b4cde21a722)`);
                tjp = ibGib;
            }
            const tjpAddr = h.getIbGibAddr({ ibGib: tjp });
            if (logalot) { console.log(`${lc} tjp (${tjpAddr}) (I: 5245a2ec85a943f98479e93a32d67f22)`); }

            const specialLatest = await getSpecialIbGib({ type: "latest", space: this });
            if (!specialLatest) { throw new Error(`(UNEXPECTED) specialLatest falsy. Not initialized? (E: 3f475efb6b1b4447a0b002461304bbce)`); }
            if (!specialLatest.rel8ns) { specialLatest.rel8ns = {}; }
            if (logalot) { console.log(`${lc} specialLatest addr: ${h.getIbGibAddr({ ibGib: specialLatest })}`); }

            const latestAddr = specialLatest.rel8ns[tjpAddr]?.length > 0 ?
                specialLatest.rel8ns[tjpAddr][0] :
                ibGibAddr;

            return latestAddr;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Extremely crude implementation that just
     * saves the ibgibs alongside existing data.
     *
     * ## future
     *
     * * At the very least, this could be changed similar to dna to have
     *   its own folder.
     */
    protected async persistOptsAndResultIbGibs({
        arg,
        result,
    }: {
        arg: IonicSpaceOptionsIbGib,
        result: IonicSpaceResultIbGib,
    }): Promise<void> {
        const lc = `${this.lc}[${this.persistOptsAndResultIbGibs.name}]`;
        if (logalot || this.data?.trace) {
            console.log(`${lc} doing arg?.data?.cmd: ${arg?.data?.cmd}, result?.data?.success: ${result?.data?.success}`);
        }
        const ibGibs = [arg, result ?? ROOT];
        let argPersist = await argy_<IonicSpaceOptionsData, IonicSpaceOptionsRel8ns, IonicSpaceOptionsIbGib>({
            argData: {
                cmd: 'put',
                isMeta: true,
                catchAllErrors: true,
                ibGibAddrs: ibGibs.map(x => h.getIbGibAddr({ ibGib: x })),
            },
        });
        argPersist.ibGibs = ibGibs;
        // this is a best effort storage, so we aren't using the result
        // in the future, we should incorporate what to do if this persistence
        // fails into the larger success requirements of spaces.
        const resPut = await this.putIbGibsImpl(argPersist);
        if (!resPut.data.success || resPut.data.errors) {
            console.error(`${lc} Errors persisting arg & result: ${resPut.data.errors.join('\n')}. (E: 65ef314a4f8e445d851dab5b290e9a03)`);
        }
    }

    // #region files related

    protected async putFile({
        ibGib,
        isMeta,
        isDna,
    }: PutIbGibFileOpts): Promise<PutIbGibFileResult> {
        const lc = `${this.lc}[${this.putFile.name}]`;

        let result: PutIbGibFileResult = {};

        try {
            if (!ibGib) { throw new Error(`ibGib required.`) };

            const thisData = this.data!;
            await this.ensureDirs();
            let path: string = "";
            let filename: string = "";
            let data: any = "";
            if (ibGib) {
                const addr = getIbGibAddr({ ibGib });
                filename = this.getFilename({ addr });
                const isBin = isBinary({ addr });
                path = this.buildPath({ filename, isMeta, isDna, isBin });

                if (!isBin) {
                    // we only want to persist the ibGib protocol
                    const bareIbGib: IbGib_V1 = { ib: ibGib.ib, gib: ibGib.gib };
                    if (ibGib.data) { bareIbGib.data = ibGib.data!; }
                    if (ibGib.rel8ns) { bareIbGib.rel8ns = ibGib.rel8ns!; }
                    data = JSON.stringify(bareIbGib);
                } else {
                    data = ibGib.data!;
                }
            }

            // if (Capacitor.getPlatform() === 'android') {
            //     try {
            //         if (logalot) { console.log(`${lc} android detected. trying to delete first.`); }
            //         let resDelete = await this.deleteFile({addr: h.getIbGibAddr({ibGib}), isMeta, isDna});
            //         if (resDelete.success) {
            //             if (logalot) { console.log(`${lc} delete succeeded.`); }
            //         } else {
            //             if (logalot) { console.log(`${lc} delete failed but maybe it didn't exist.`); }
            //         }
            //     } catch (error) {
            //         if (logalot) { console.log(`${lc} tried to delete file first for android, but failed`); }
            //     }
            // }
            if (logalot) { console.log(`${lc} path: ${path}, directory: ${thisData.baseDir}, encoding: ${thisData.encoding} (I: d4440ececbe6c859f8fcf6d7ece12522)`); }
            const resWrite = await Filesystem.writeFile({
                path,
                data,
                directory: thisData.baseDir,
                encoding: thisData.encoding,
            });
            if (logalot) { console.log(`${lc} resWrite.uri: ${resWrite.uri}`); }

            result.success = true;
        } catch (error) {
            const errorMsg = `${lc} ${error.message}`;
            console.error(errorMsg);
            result.errorMsg = errorMsg;
        }

        return result;
    }

    protected async deleteFile({
        addr,
        isMeta,
        isDna,
    }: DeleteIbGibFileOpts): Promise<DeleteIbGibFilesResult> {
        const lc = `${this.lc}[${this.deleteFile.name}]`;

        const result: DeleteIbGibFilesResult = {};

        try {
            if (!addr) { throw new Error(`addr required.`) };

            const data = this.data;
            let path: string = "";
            let filename: string = "";
            if (!isBinary({ addr })) {
                filename = this.getFilename({ addr });
                path = this.buildPath({ filename, isMeta, isDna });
            } else {
                filename = this.getFilename({ addr });
                path = this.buildPath({ filename, isMeta: false, isDna: false, isBin: true });
            }
            if (logalot) { console.log(`${lc} path: ${path}, directory: ${data.baseDir}`); }
            const _ = await Filesystem.deleteFile({
                path,
                directory: data.baseDir,
            });
            if (logalot) { console.log(`${lc} deleted. path: ${path}`); }
            result.success = true;
        } catch (error) {
            const errorMsg = `${lc} ${error.message}`;
            if (!errorMsg.includes('File does not exist')) {
                console.error(errorMsg);
            } else {
                if (logalot) { console.log(`${lc} attempted to delete non-existent file. ${errorMsg} (I: 8953b51a5f14960e5ea2e86f6c6a7622)`); }
            }
            result.errorMsg = errorMsg;
        }

        return result;
    }

    protected async getFile({
        addr,
        isMeta,
        isDna,
    }: GetIbGibFileOpts): Promise<GetIbGibFileResult> {
        let lc = `${this.lc}[${this.getFile.name}(${addr})]`;

        const result: GetIbGibFileResult = {};
        try {
            if (!addr) { throw new Error(`addr required`) };

            const data = this.data!;

            const addrIsBin = isBinary({ addr });
            let path: string = "";
            let filename: string = "";
            let paths: string[] = [];
            if (!addrIsBin) {
                filename = this.getFilename({ addr });

                if (isMeta) {
                    // explicitly stating meta, so only look in meta
                    paths = [this.buildPath({ filename, isMeta: true, isDna: false }),];
                } else if (isDna) {
                    // explicitly stating dna, so only look in dna
                    paths = [this.buildPath({ filename, isMeta: false, isDna: true }),];
                } else {
                    // could be regular, meta or dna, so we'll search everywhere, but first regular.
                    paths = [
                        this.buildPath({ filename, isMeta: false, isDna: false }),
                        this.buildPath({ filename, isMeta: true, isDna: false }),
                        this.buildPath({ filename, isMeta: false, isDna: true }),
                    ];
                }
            } else {
                // const addr = getBinAddr({binHash, binExt});
                filename = this.getFilename({ addr });
                // filename = this.getFilename({binHash, binExt});
                path = this.buildPath({ filename, isDna: false, isMeta: false, isBin: true })
                paths = [path];
            }
            let resRead: any = null;
            for (const tryPath of paths) {
                let x = await tryRead({ path: tryPath, directory: data.baseDir, encoding: data.encoding });
                if (x?.data) { resRead = x; break; }
            }
            if (resRead) {
                if (!addrIsBin) {
                    // ibGib(s) retrieved
                    result.ibGib = <IbGib_V1>JSON.parse(resRead.data);
                } else {
                    // bin
                    const { ib, gib } = h.getIbAndGib({ ibGibAddr: addr });
                    result.ibGib = { ib, gib, data: resRead.data, };
                }
            } else {
                if (logalot) { console.log(`${lc} paths not found: ${JSON.stringify(paths)} (I: 6a3bd3b125619da7a944200b14e7e922)`); }
                // will return success since it's not really an error, but ibgib
                // will not be populated, indicating the addr was not found.
            }

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
        const keyPermissionRequested: string = 'ibgib_permissionRequested_ensurePermissions';
        try {
            const requested = localStorage.getItem(keyPermissionRequested);
            if (!requested && Filesystem.requestPermissions) {
                const resPermissions = await Filesystem.requestPermissions();
                localStorage.setItem(keyPermissionRequested, 'true');
                if (resPermissions?.results) {
                    if (logalot) { console.log(`${lc} resPermissions: ${JSON.stringify(resPermissions.results)} falsy`); }
                    return true;
                } else {
                    console.warn(`${lc} resPermissions?.results falsy but that's ok, didn't throw.`);
                    return true;
                }
            } else {
                localStorage.setItem(keyPermissionRequested, 'true');
                console.warn(`${lc} Filesystem.requestPermissions falsy but that's ok, didn't throw.`);
                return true;
            }
        } catch (error) {
            console.error(`${lc} Dont have permissions... error: ${error.message}`);
            localStorage.removeItem(keyPermissionRequested);
            return false;
        }
    }

    /**
     * Ensure directories are created on filesystem.
     */
    protected async ensureDirs(): Promise<void> {
        const lc = `${this.lc}[${this.ensureDirs.name}]`;
        const keyPermissionRequested: string = `ibgib_permissionRequested_ensureDirs_${this.data.uuid}`;
        if (logalot) { console.log(`${lc} keyPermissionRequested: ${keyPermissionRequested} (I: 11f32ea3170b11a0c70e1ae3e3395922)`); }

        // return immediately if we've already done this
        const alreadyEnsured = localStorage.getItem(keyPermissionRequested);
        if (alreadyEnsured === 'true') {
            if (logalot) { console.log(`${lc} alreadyEnsured via localStorage (I: 374cabd8be6c2f163402b33b211aa222)`); }
            return;
        }

        const data = this.data!;
        const directory = data.baseDir;

        /** these are the paths we're ensuring exist. all ibgibs are stored here. */
        const paths = [
            data.baseSubPath, // = 'ibgib';
            data.baseSubPath + '/' + data.spaceSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.ibgibsSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.metaSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.binSubPath,
            data.baseSubPath + '/' + data.spaceSubPath + '/' + data.dnaSubPath,
        ];

        const getPathKey = (p: string) => { return directory.toString() + '/' + p; }

        let allExist = paths.every(path => this.pathExistsMap[getPathKey(path)]);
        if (allExist) {
            if (logalot) { console.log(`${lc} allExist (I: f14ad6db1d29e368c37c3117fee1cb22)`); }
            return; /* <<<< returns early */
        }

        const permitted = await this.ensurePermissions();
        if (!permitted) {
            console.error(`${lc} permission not granted.`);
            return; /* <<<< returns early */
        }

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const lc2 = `${lc}[(path: ${path}, directory: ${directory})]`;

            // check if we've already ensured for this path
            const pathExistsKey = getPathKey(path);
            let exists = this.pathExistsMap[pathExistsKey] || false;

            if (!exists) {
                // we've not checked this path (or it didn't exist)
                try {
                    await Filesystem.readdir({ path, directory });
                    exists = true;
                    this.pathExistsMap[pathExistsKey] = true;
                } catch (error) {
                    if (logalot) { console.log(`${lc2} Did not exist`); }
                }
            }

            if (!exists) {
                // try full path
                if (logalot) { console.log(`${lc2} creating...`); }
                try {
                    await Filesystem.mkdir({ path, directory, recursive: true });
                    this.pathExistsMap[pathExistsKey] = true;
                } catch (error) {
                    if (logalot) { console.log(`${lc2} Error creating. Trying next`); }
                } finally {
                    if (logalot) { console.log(`${lc2} complete.`); }
                }
            }
        }

        allExist = paths.every(path => this.pathExistsMap[getPathKey(path)]);
        if (allExist) {
            localStorage.setItem(keyPermissionRequested, 'true');
        } else {
            localStorage.remove(keyPermissionRequested);
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
        if (isMeta) {
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
    }: {
        addr: string,
    }): string {
        if (isBinary({ addr })) {
            const { binExt } = getBinHashAndExt({ addr });
            return `${addr}.${binExt}`;
        } else {
            return `${addr}.json`;
        }
    }

    // #endregion
}

