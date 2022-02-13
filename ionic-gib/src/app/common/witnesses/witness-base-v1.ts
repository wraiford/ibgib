import { getIbGibAddr, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, IbGibRel8ns_V1, Factory_V1 as factory, sha256v1, } from 'ts-gib/dist/V1';

import { Witness_V1, } from '../types';
import * as c from '../constants';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

export abstract class WitnessBase_V1<
    TDataIn extends any,
    TRel8nsIn extends IbGibRel8ns_V1,
    TIbGibIn extends IbGib_V1<TDataIn, TRel8nsIn>,
    TDataOut extends any,
    TRel8nsOut extends IbGibRel8ns_V1,
    TIbGibOut extends IbGib_V1<TDataOut, TRel8nsOut>,
    TData = any,
    TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
    >
    implements Witness_V1<
        TDataIn, TRel8nsIn, TIbGibIn,    // arg
        TDataOut, TRel8nsOut, TIbGibOut, // result
        TData, TRel8ns                   // this witness itself
        > {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `[${WitnessBase_V1.name}]`;

    /**
     * Optional arg for verbose logging.
     *
     *
     */
    protected set trace(value: string[]) {
        const lc = `${this.lc}[set trace}]`;
        if (value === (<any>this.data)?.trace) { return; }
        if (this.data) {
            (<any>this.data).trace = value;
            delete this.gib; // gib is invalid now
        } else {
            console.warn(`${lc} data is falsy. Can't set.`);
        }
    }
    protected get trace(): string[] { return (<any>this.data)?.trace; }

    /**
     * Optional configuration for `witness` call.
     * If true, then this space will catch any error that propagates up
     * from the `witnessImpl` function.
     *
     * ## notes
     *
     * Descendants of Witness who don't override the base `witness` function
     * (but rather override `witnessImpl` as expected) don't need to check
     * for this explicitly, since it is referenced in the base `witness`
     * function implementation.
     */
    protected set catchAllErrors(value: boolean) {
        const lc = `${this.lc}[set catchAllErrors}]`;
        if (value === (<any>this.data)?.catchAllErrors) { return; }
        if (this.data) {
            (<any>this.data).catchAllErrors = value;
            delete this.gib;
        } else {
            console.error(`${lc} data is falsy. Can't set value.`);
        }
    }
    protected get catchAllErrors(): boolean {
        const lc = `${this.lc}[catchAllErrors]`;
        const result = (<any>this.data)?.catchAllErrors;
        if (logalot || this.trace) { console.log(`${lc} result: ${result}`)}
        return result;
    }

    // These properties are straight properties for ease of implementing
    // IbGib interface and dealing with DTOs (Data Transfer Objects)

    ib: string | undefined;
    // protected _ib: string = '';
    // protected getIb(): string { return this._ib; }
    // protected setIb(value: string): void { this._ib = value; }
    // get ib(): string { return this.getIb(); }
    // set ib(value: string) { this.setIb(value); }

    gib: string | undefined;
    // protected _gib: string | undefined = 'gib';
    // protected getGib(): string | undefined { return this._gib; }
    // protected setGib(value: string | undefined): void { this._gib = value; }
    // get gib(): string | undefined { return this.getGib(); }
    // set gib(value: string | undefined) { this.setGib(value); }

    data: TData | undefined;
    // protected _data: TData | undefined;
    // get data(): TData | undefined { return this.getData(); }
    // set data(value: TData | undefined) { this.setData(value); }
    // protected getData(): TData | undefined { return this._data; }
    // protected setData(value: TData | undefined): void { this._data = value; }

    rel8ns: TRel8ns | undefined;
    // protected _rel8ns: TRel8ns | undefined;
    // get rel8ns(): TRel8ns | undefined { return this.getRel8ns(); }
    // set rel8ns(value: TRel8ns | undefined) { this.setRel8ns(value); }
    // protected getRel8ns(): TRel8ns | undefined { return this._rel8ns; }
    // protected setRel8ns(value: TRel8ns | undefined): void { this._rel8ns = value; }

    constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
        if (initialData) { this.data = initialData; }
        if (initialRel8ns) { this.rel8ns = initialRel8ns; }
    }

    /**
     * Creates a data transfer object (dto) snapshot out of this
     * witness' `ib`, `gib`, `data` and `rel8ns` properties.
     *
     * I say "snapshot" because this copies each property
     * (`ib`, `gib`, `data`, `rel8ns`).
     *
     * ## thoughts
     *
     * Witness classes need to be able to persist their ibgib
     * just as regular data. But witnesses have the additional
     * layer of behavior (e.g. the `witness` function) that
     * will not persist (until we get more integrated version control
     * types of functionality in ibgib).
     *
     * @returns dto ibgib object with just clones of this.ib/gib/data/rel8ns props.
     *
     * @see {loadDto}
     */
    toDto(): IbGib_V1<TData, TRel8ns> {
        const lc = `${this.lc}[${this.toDto.name}]`;
        if (!this.ib) { console.warn(`${lc} this.ib is falsy. (W: 60162e3ab42941e9a68cd6adc8d23387)`); }
        if (!this.gib) { debugger; console.warn(`${lc} this.gib is falsy. (W: 61dc535639dc410d874635013fce5b8a)`); }

        let dtoIbGib: IbGib_V1<TData, TRel8ns> = { ib: (this.ib || '').slice() };
        if (this.gib) { dtoIbGib.gib = this.gib.slice(); };
        if (this.data) { dtoIbGib.data = h.clone(this.data); }
        if (this.rel8ns) { dtoIbGib.rel8ns = h.clone(this.rel8ns); }

        return dtoIbGib;
    }

    /**
     * Rehydrates this witness class with the ibgib information from the dto.
     *
     * @param dto ib, gib, data & rel8ns to load for this witness ibgib instance.
     *
     * @see {toDto}
     */
    loadDto(dto: IbGib_V1<TData, TRel8ns>): void {
        const lc = `${this.lc}[${this.loadDto.name}]`;
        if (!dto.ib) { console.warn(`${lc} dto.ib is falsy.`); }
        if (!dto.gib) { console.warn(`${lc} dto.gib is falsy.`); }

        this.ib = h.clone(dto.ib);
        this.gib = h.clone(dto.gib);
        if (dto.data) {
            this.data = h.clone(dto.data);
        } else {
            delete this.data;
        }
        if (dto.rel8ns) { this.rel8ns = h.clone(dto.rel8ns); } else { delete this.rel8ns; }
    }

    /**
     * The primary function of a witness is...well... to witness things.
     *
     * So this is the base implementation that includes validation
     * plumbing, tracing, error checking/catching - all depending
     * on witness configuration.
     *
     *
     * ## usage
     *
     * Only override this function if you really want custom handling of
     * the plumbing.  Instead override `witnessImpl`.
     *
     * {@see validateThis}
     * {@see validateWitnessArg}
     *
     * @param arg
     * @returns
     */
    async witness(arg: TIbGibIn): Promise<TIbGibOut | undefined> {
        const lc = `${this.lc}[${this.witness.name}]`;
        try {
            if (!this.gib) { this.gib = await sha256v1(this.toDto()); }
            const validationErrors_this = await this.validateThis();
            if (validationErrors_this?.length > 0) {
                for (const error of validationErrors_this) { console.error(`${lc} ${error}`); }
                throw new Error(`validation failed.`);
            }
            const validationErrors_arg = await this.validateWitnessArg(arg);
            if (validationErrors_arg?.length > 0) {
                for (const error of validationErrors_arg) { console.error(`${lc} ${error}`); }
                throw new Error(`validation failed.`);
            }
            if (this.trace?.includes(this.witness.name)) { console.log(`${lc} addr: ${getIbGibAddr(arg)}`); }
            return await this.witnessImpl(arg);
        } catch (error) {
            console.error(`${lc} ${error.message || 'unknown error'}`);
            if (!this.catchAllErrors && !(<any>arg?.data)?.catchAllErrors) {
                throw error;
            }
            return; // undefined
        }
    }
    protected abstract witnessImpl(arg: TIbGibIn): Promise<TIbGibOut | undefined>;

    /**
     * Validate the incoming arg.
     *
     * Override this in descending classes per use case.
     */
    protected async validateWitnessArg(arg: TIbGibIn): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        try {
            const errors: string[] = [];
            if (!arg) { errors.push(`arg required`); }
            if (!arg.ib) { errors.push(`arg.ib required`); }
            if (!arg.gib) { errors.push(`arg.gib required`); }
            return errors;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate this witness object, checking its own `data` and `rel8ns`, and
     * possibly other state.
     *
     * ## notes
     *
     * ATOW base implementation of this just checks for non-falsy
     * `this.ib` and `this.gib`
     */
    protected async validateThis(): Promise<string[]> {
        const lc = `${this.lc}[${this.validateThis.name}]`;
        const errors: string[] = [];
        try {
            if (!this.ib) { errors.push(`this.ib is falsy.`); }
            if (!this.gib) { errors.push(`this.gib is falsy.`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
        return errors;
    }
}