import { getIbGibAddr, IbGib, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, IbGibRel8ns_V1, Factory_V1 as factory, sha256v1, } from 'ts-gib/dist/V1';

import { WitnessData_V1, Witness_V1, } from '../types';
import * as c from '../constants';
import { getGib, getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { validateGib, validateIb, validateIbGibIntrinsically } from '../helper';
import { argy_ } from './witness-helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export abstract class WitnessBase_V1<
    TOptionsData extends any,
    TOptionsRel8ns extends IbGibRel8ns_V1,
    TOptionsIbGib extends IbGib_V1<TOptionsData, TOptionsRel8ns>,
    TResultData extends any,
    TResultRel8ns extends IbGibRel8ns_V1,
    TResultIbGib extends IbGib_V1<TResultData, TResultRel8ns>,
    TData extends WitnessData_V1 = any,
    TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
    >
    implements Witness_V1<
        TOptionsData, TOptionsRel8ns, TOptionsIbGib, // options arg
        TResultData, TResultRel8ns, TResultIbGib,    // result
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
    protected set trace(value: boolean) {
        const lc = `${this.lc}[set trace}]`;
        if (value === (this.data?.trace || false)) { return; }
        if (this.data) {
            this.data.trace = value;
            delete this.gib; // gib is invalid now
        } else {
            console.warn(`${lc} data is falsy. Can't set.`);
        }
    }
    protected get trace(): boolean { return this.data?.trace ?? false; }

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
        if (value === this.data?.catchAllErrors) { return; }
        if (this.data) {
            this.data.catchAllErrors = value;
            delete this.gib;
        } else {
            console.error(`${lc} data is falsy. Can't set value.`);
        }
    }
    protected get catchAllErrors(): boolean {
        const lc = `${this.lc}[catchAllErrors]`;
        const result = this.data?.catchAllErrors || false;
        if (logalot || this.trace) { console.log(`${lc} result: ${result}`)}
        return result;
    }

    // #region IbGib interface fields: ib, gib, data, rel8ns

    /**
     * Used per use case in implementing class.
     *
     * This property is a simple property (no getter/setter with backing
     * fields).  This is to simplify usage with DTOs (Data Transfer Objects) for
     * storing in spaces.
     */
    ib: string | undefined;

    /**
     * Used per use case in implementing class.
     *
     * This property is a simple property (no getter/setter with backing
     * fields).  This is to simplify usage with DTOs (Data Transfer Objects) for
     * storing in spaces.
     */
    gib: string | undefined;

    /**
     * Used per use case in implementing class.
     *
     * This property is a simple property (no getter/setter with backing
     * fields).  This is to simplify usage with DTOs (Data Transfer Objects) for
     * storing in spaces.
     */
    data: TData | undefined;

    /**
     * Used per use case in implementing class.
     *
     * This property is a simple property (no getter/setter with backing
     * fields).  This is to simplify usage with DTOs (Data Transfer Objects) for
     * storing in spaces.
     */
    rel8ns: TRel8ns | undefined;

    // #endregion IbGib interface fields: ib, gib, data, rel8ns

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
    async witness(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.witness.name}]`;
        try {
            if (!this.gib) { this.gib = await sha256v1(this.toDto()); }
            const validationErrors_this = await this.validateThis();
            if (validationErrors_this?.length > 0) {
                for (const error of validationErrors_this) { console.error(`${lc} ${error}`); }
                throw new Error(`internal witness validation failed. See \`WitnessBase_V1.validateThis\` (E: 2b5f73cadbfa416ba189346f3c31cd0c)`);
            }
            const validationErrors_arg = await this.validateWitnessArg(arg);
            if (validationErrors_arg?.length > 0) {
                for (const error of validationErrors_arg) { console.error(`${lc} ${error}`); }
                throw new Error(`arg validation failed. See \`WitnessBase_V1.validateWitnessArg\` (E: 51531a1d928a485e8ffc277145ec44e9)`);
            }
            if (logalot || this.trace) { console.log(`${lc} addr: ${getIbGibAddr(arg)}`); }
            if (logalot) { console.log(`${lc} addr: ${getIbGibAddr(arg)} (I: f4cf13a44c4e4fc3903f14018e616c64)`); }
            return await this.witnessImpl(arg);
        } catch (error) {
            console.error(`${lc} ${error.message || 'unknown error (E: 3e22bea4c7fb4668bf13d7146b927869)'}`);
            if (!this.catchAllErrors) {
                throw error;
            } else {
                return; // undefined
            }
        }
    }
    protected abstract witnessImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;

    /**
     * Validate the incoming arg.
     *
     * Override this in descending classes per use case.
     */
    protected async validateWitnessArg(arg: TOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        try {
            const errors: string[] = [];
            if (!arg) { errors.push(`arg required (E: a222db3b668e4bb09cfd82e75c07bfa6)`); }

            const ibErrors = validateIb({ib: arg?.ib});
            if (ibErrors?.length > 0) { errors.push(`invalid arg.ib (E: 2ae362ef274d4c3bb9716800f2106d28) errors: ${ibErrors.join('\n')}`); }

            const gibErrors = validateGib({gib: arg?.gib});
            if (gibErrors?.length > 0) { errors.push(`invalid arg.gib (E: 73be275058084d768a39299337f2ce34) errors: ${gibErrors.join('\n')}`); }

            const intrinsicErrors = await validateIbGibIntrinsically({ibGib: arg});
            if (intrinsicErrors?.length > 0) {
                errors.push(`arg ibgib invalid intrinsically (E: 73be275058084d768a39299337f2ce34) errors: ${intrinsicErrors.join('\n')}`);
            } else if (!this.data?.allowPrimitiveArgs) {
                // further check to see if primitive
                const gibInfo = getGibInfo({gib: arg.gib});
                if (gibInfo.isPrimitive) { errors.push(`arg is primitive (i.e. gib === "gib") and witness.data.allowPrimitiveArgs is falsy. (E: d0aa3d7ad4f54b01bd0023300d15ecd9)`) }
            }

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