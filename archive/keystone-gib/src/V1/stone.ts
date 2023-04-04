import { IbGibRepo_V1, IbGibData_V1, IbGib_V1, IbGibRel8ns_V1 } from 'ts-gib/dist/V1';
import { UNDEFINED_IB } from './constants';
import { IbGibAddr, TransformOpts_Mut8, V1, TransformResult, TransformOpts_Rel8, TransformOpts_Fork, TransformOpts, Ib, Gib } from 'ts-gib';
import { getIbGibAddr } from 'ts-gib/dist/helper';
import { ReplaySubject, Observable } from 'rxjs';
import { Witness_V1 } from './witness';
import { CanResult } from './types';

export interface LoadStoneOpts {
    /**
     * If given, no need to load from repo.
     */
    ibGib?: IbGib_V1;
    /**
     * If given, will load the address, looking in {@link repos}.
     */
    addr?: IbGibAddr;
    /**
     * Repos where to look for ibgibs.
     */
    repos?: IbGibRepo_V1[],
    /**
     * If true, loads even if the current addr matches the incoming addr.
     */
    force?: boolean;
}

export interface StoneData_V1 extends IbGibData_V1 { }

export interface CanTransformResult extends CanResult { }

export interface StoneTransformOpts<TTransformOpts extends TransformOpts<Stone_V1<StoneData_V1>>> {
    transformOpts: TTransformOpts;
    witnesses: Witness_V1[];
}
export interface StoneTransformOpts_Fork
    extends StoneTransformOpts<TransformOpts_Fork<Stone_V1<StoneData_V1>>> { }
export interface StoneTransformOpts_Mut8<TStoneData extends StoneData_V1>
    extends StoneTransformOpts<TransformOpts_Mut8<Stone_V1<TStoneData>, TStoneData>> { }
export interface StoneTransformOpts_Rel8
    extends StoneTransformOpts<TransformOpts_Rel8<Stone_V1<StoneData_V1>>> { }

export interface StoneTransformResult
    extends TransformResult<Stone_V1<StoneData_V1>> {
}

/**
 * Object representing a default ibGib that only contains data with no
 * additional behavior.
 */
export class Stone_V1<TStoneData_V1 extends IbGibData_V1>
    implements IbGib_V1<TStoneData_V1> {
    protected lc: string = `[${this.constructor.name}]`;

    get addr(): IbGibAddr | undefined {
        return this.ib && this.gib ?
            getIbGibAddr({ib: this.ib, gib: this.gib}) :
            undefined;
    }

    protected _ib: Ib = UNDEFINED_IB;
    get ib(): Ib { return this._ib; }
    set ib(value: Ib) { this._ib = value; }
    protected _gib: Gib | undefined;
    get gib(): Gib | undefined { return this._gib; }
    set gib(value: Gib | undefined) { this._gib = value; }
    protected _data: TStoneData_V1 | undefined;
    get data(): TStoneData_V1 | undefined { return this._data; }
    set data(value: TStoneData_V1 | undefined) { this._data = value; }
    protected _rel8ns: IbGibRel8ns_V1 | undefined;
    get rel8ns(): IbGibRel8ns_V1 | undefined { return this._rel8ns; }
    set rel8ns(value: IbGibRel8ns_V1 | undefined) { this.rel8ns = value; }

    /**
     * If true, then this witness should have all of its ib, gib, data, and rel8ns
     * fields. If false, then this would only have the ib and gib.
     */
    isLoaded: boolean = false;

    changingRefCount = 0;

    protected readonly _changedSubj = new ReplaySubject<any>();
    readonly changed: Observable<any> = this._changedSubj.asObservable();

    /**
     * Unloads the {@link ibGib}, i.e., the {@link data} and {@link rel8ns},
     * AND deletes the {@link ib} and {@link gib}.
     *
     * Override this for additional
     *
     * @returns true if changed, i.e. actively unloaded.
     *
     * @see {@link clear} and {@link load}
     */
    async clear(): Promise<boolean> {
        const lc = `${this.lc}[${this.clear.name}]`;
        if (this.ib === UNDEFINED_IB) { /* already cleared */ return false; }
        this.changingRefCount++;
        try {
            await this.unload();
            this.ib = UNDEFINED_IB;
            delete this.gib;
            return true;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this.changingRefCount--;
            if (this.changingRefCount === 0) { this._changedSubj.next(this); }
        }
    }

    /**
     * Unloads the {@link ibGib}, i.e., the {@link data} and {@link rel8ns}
     * but does not delete the {@link ib} and {@link gib}.
     *
     * @returns true if changed, i.e. actively unloaded.
     *
     * @see {@link clear} and {@link load}
     */
    async unload(): Promise<boolean> {
        const lc = `${this.lc}[${this.unload.name}]`;
        if (!this.data && !this.rel8ns && !this.isLoaded) {
            /* already unloaded */
            return false;
        }
        this.changingRefCount++;
        try {
            delete this.data;
            delete this.rel8ns;
            this.isLoaded = false;
            return true;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this.changingRefCount--;
            if (this.changingRefCount === 0) { this._changedSubj.next(this); }
        }
    }

    /**
     * Ask this ibgib to load itself, using its own repo(s) and/or the given one(s).
     */
    async load(opts?: LoadStoneOpts): Promise<boolean> {
        const lc = `${this.lc}[${this.load.name}]`;
        if (!opts) { throw new Error(`${lc}`) };
        this.changingRefCount++;
        let changed = true; // assuming we're going to do something
        try {
            let { addr, repos, force, ibGib } = opts;
            const hasRepo = repos && repos.length > 0;
            const thisAddr = this.addr;
            if (!ibGib && !addr) { throw new Error(`${lc} ibGib or addr required.`) };

            if (ibGib) { addr = getIbGibAddr({ibGib}); }

            // check if address/undefined already loaded
            if (addr === thisAddr && !force) { changed = false; return true; }

            if (thisAddr) {
                // changing. need to unload old address.
                await this.clear();
            }

            const doLoad = (x: IbGib_V1) => {
                this.ib = x.ib;
                this.gib = x.gib;
                this.data = <TStoneData_V1>x.data;
                this.rel8ns = x.rel8ns;
            }

            if (ibGib) {
                // ibGib provided, so load from that.
                doLoad(ibGib);
                return true;
            } else if (addr) {
                if (!hasRepo) { throw new Error(`${lc} either provide ibGib or repo(s) to look for addr.`); }

                for (let repo of repos!) {
                    let gotten = await repo.get({ibGibAddr: addr });
                    if (gotten) { ibGib = gotten; break; }
                }

                if (ibGib) {
                    doLoad(ibGib);
                    return true;
                } else {
                    // couldn't load
                    return false;
                }
            } else {
                // incoming addr undefined. we have already unloaded. do nothing more.
                    return true;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this.changingRefCount--;
            if (this.changingRefCount === 0 && changed) { this._changedSubj.next(this); }
        }
    }

    /**
     * Guard on underlying transform.
     *
     * Defaults to always allowing transform.
     *
     * Override this in descendent classes for custom
     * checking, e.g., validation, authorization, other contextual state, etc.
     *
     * @param opts state for requested transform
     */
    async canFork(opts: StoneTransformOpts_Fork): Promise<CanTransformResult> {
        const lc = `${this.lc}[${this.canFork.name}]`;
        return { proceed: true };
    }

    /**
     * Executes the transform using _this_ stone as the source,
     * creates a _new_ stone and loads the new ibgib into _that_ new stone.
     *
     * Does NOT do any authorization against keystones.
     *
     * @param opts for transform
     */
    async fork(
        opts: StoneTransformOpts_Fork
    ): Promise<StoneTransformResult> {
        const lc = `${this.lc}[${this.fork.name}]`;
        try {
            if (!this.addr) { throw new Error(`This stone has no address.`); }
            if (!this.isLoaded) { throw new Error(`stone not loaded. must load stone before attempting to transform it.`); }

            let resCanTransform = await this.canFork(opts);
            if (!resCanTransform.proceed) {
                const { errors } = resCanTransform;
                if (errors && errors.length === 1) {
                    throw new Error(`Nope. Can't transform. ${errors[0]}`);
                } else if (errors && errors.length > 1) {
                    throw new Error(`Nope. Can't transform. Multiple errors: ${errors.join(' \n')}`);
                } else {
                    throw new Error(`Can't proceed with transform. No specific errors given.(?...not sure why hmm...)` );
                }
            }

            const { transformOpts } = opts;
            transformOpts.src = this;
            transformOpts.srcAddr = this.addr;

            let result = await V1.fork(transformOpts);
            if (result.newIbGib) {
                const newStone = new Stone_V1<TStoneData_V1>();
                // load the new ibGib. This will trigger any changed event handlers.
                await newStone.load({ ibGib: result.newIbGib });
                return {
                    newIbGib: newStone,
                    intermediateIbGibs: <any>result.intermediateIbGibs,
                    dnas: <any>result.dnas,
                };
            } else {
                throw new Error(`could not transform. (transform result.newIbGib falsy)`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Guard on underlying transform.
     *
     * Defaults to always allowing transform.
     *
     * Override this in descendent classes for custom
     * checking, e.g., validation, authorization, other contextual state, etc.
     *
     * @param opts state for requested transform
     */
    async canMut8(opts: StoneTransformOpts_Mut8<TStoneData_V1>): Promise<CanTransformResult> {
        const lc = `${this.lc}[${this.canMut8.name}]`;
        return { proceed: true };
    }

    /**
     * Executes the transform on _this_ stone and loads the new ibgib into _this_ stone.
     *
     * Does NOT do any authorization against keystones.
     *
     * @param opts for transform
     */
    async mut8(
        opts: StoneTransformOpts_Mut8<TStoneData_V1>,
    ): Promise<StoneTransformResult> {
        const lc = `${this.lc}[${this.mut8.name}]`;
        try {
            if (!this.isLoaded) { throw new Error(`stone not loaded. must load stone before attempting to transform it.`); }

            let resCanTransform = await this.canMut8(opts);
            if (!resCanTransform.proceed) {
                const { errors } = resCanTransform;
                if (errors && errors.length === 1) {
                    throw new Error(`Nope. Can't transform. ${errors[0]}`);
                } else if (errors && errors.length > 1) {
                    throw new Error(`Nope. Can't transform. Multiple errors: ${errors.join(' \n')}`);
                } else {
                    throw new Error(`Can't proceed with transform. No specific errors given.(?...not sure why hmm...)` );
                }
            }

            const { transformOpts } = opts;

            let result = await V1.mut8(transformOpts);
            if (result.newIbGib) {
                // load the new ibGib. This will trigger any changed event handlers.
                await this.load({ ibGib: result.newIbGib });
                return {
                    newIbGib: this,
                    intermediateIbGibs: <any>result.intermediateIbGibs,
                    dnas: <any>result.dnas,
                };
            } else {
                throw new Error(`could not transform. (transform result.newIbGib falsy)`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Guard on underlying transform.
     *
     * Defaults to always allowing transform.
     *
     * Override this in descendent classes for custom
     * checking, e.g., validation, authorization, other contextual state, etc.
     *
     * @param opts state for requested transform
     */
    async canRel8(opts: StoneTransformOpts_Rel8): Promise<CanTransformResult> {
        const lc = `${this.lc}[${this.canRel8.name}]`;
        return { proceed: true };
    }

    /**
     * Executes the transform on _this_ stone and loads the new ibgib into _this_ stone.
     *
     * Does NOT do any authorization against keystones.
     *
     * @param opts for transform
     */
    async rel8(
        // also need to add to fork. also need to consider in memory repo for result.
        opts: StoneTransformOpts_Rel8
    ): Promise<StoneTransformResult> {
        const lc = `${this.lc}[${this.rel8.name}]`;
        try {
            if (!this.isLoaded) { throw new Error(`stone not loaded. must load stone before attempting to transform it.`); }

            let resCanTransform = await this.canRel8(opts);
            if (!resCanTransform.proceed) {
                const { errors } = resCanTransform;
                if (errors && errors.length === 1) {
                    throw new Error(`Nope. Can't transform. ${errors[0]}`);
                } else if (errors && errors.length > 1) {
                    throw new Error(`Nope. Can't transform. Multiple errors: ${errors.join(' \n')}`);
                } else {
                    throw new Error(`Can't proceed with transform. No specific errors given.(?...not sure why hmm...)` );
                }
            }

            const { transformOpts } = opts;

            let result = await V1.rel8(transformOpts);
            if (result.newIbGib) {
                // load the new ibGib. This will trigger any changed event handlers.
                await this.load({ ibGib: result.newIbGib });
                return <any>result;
            } else {
                throw new Error(`could not transform. (transform result.newIbGib falsy)`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }
}
