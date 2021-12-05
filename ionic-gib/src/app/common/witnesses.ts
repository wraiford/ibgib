import {
    Witness_V1,
} from './types';
import {
    getIbGibAddr,
} from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, IbGibRel8ns_V1, Factory_V1 as factory, } from 'ts-gib/dist/V1';
import * as c from './constants';

export abstract class WitnessBase_V1<
    TIbGibIn extends IbGib_V1 = IbGib_V1,
    TIbGibOut extends IbGib_V1 = IbGib_V1,
    TData = any,
    TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1
    >
    implements Witness_V1<TIbGibIn, TIbGibOut, TData, TRel8ns> {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `[${WitnessBase_V1.name}]`;

    /** not implemented yet */
    protected set trace(value: string[]) {
        const lc = `${this.lc}[set trace}]`;
        if (this.data) {
            (<any>this.data).trace = value;
        } else {
            console.warn(`${lc} data is falsy. Can't set.`);
        }
    }
    /** not implemented yet */
    protected get trace(): string[] {
        return (<any>this.data)?.trace;
    }
    /** not implemented yet */
    protected set throwOnError(value: boolean) {
        const lc = `${this.lc}[set throwOnError}]`;
        if (this.data) {
            (<any>this.data).throwOnError = value;
        } else {
            console.warn(`${lc} data is falsy. Can't set.`);
        }
    }
    /** not implemented yet */
    protected get throwOnError(): boolean {
        return (<any>this.data)?.throwOnError || true;
    }

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
        if (!this.ib) { console.warn(`${lc} this.ib is falsy.`); }
        if (!this.gib) { console.warn(`${lc} this.gib is falsy.`); }

        const dtoIbGib: IbGib_V1<TData, TRel8ns> = {ib: h.clone(this.ib), gib: h.clone(this.gib)};
        if (this.data) { dtoIbGib.data = h.clone(this.data); }
        if (this.rel8ns) { dtoIbGib.data = h.clone(this.rel8ns); }
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
        if (dto.data) { this.data = dto.data; } else { delete this.data; }
        if (dto.rel8ns) { this.rel8ns = dto.rel8ns; } else { delete this.rel8ns; }
    }

    async witness(arg: TIbGibIn): Promise<TIbGibOut | undefined> {
        const lc = `${this.lc}[${this.witness.name}]`;
        try {
            const validationErrors = await this.validateWitnessArg(arg);
            if (validationErrors?.length > 0) {
                for (const validationError of validationErrors) { console.error(validationError); }
                throw new Error(`validation failed.`);
            }
            if (this.trace?.includes(this.witness.name)) { console.log(`${lc} addr: ${getIbGibAddr(arg)}`); }
            return await this.witnessImpl(arg);
        } catch (error) {
            console.error(`${lc} ${error.message || 'unknown error'}`);
            if (this.throwOnError) { throw error; }
            return;
        }
    }
    protected abstract witnessImpl(arg: TIbGibIn): Promise<TIbGibOut | undefined>;

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

}

/**
 * Builds the ib for the witness arg ibgib.
 *
 * @returns ib that we'll use when creating a witness arg.
 */
export function getArgIb(ibMetadata: string): string {
    const lc = `[${getArgIb.name}]`;
    try {
        return ibMetadata ?
            `${c.WITNESS_ARG_METADATA_STRING} ${ibMetadata}` :
            c.WITNESS_ARG_METADATA_STRING;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Builds the ib for the witness result ibgib.
 *
 * @returns ib that we'll use when creating a witness result.
 */
export function getResultIb(ibMetadata: string): string {
    const lc = `[${getResultIb.name}]`;
    try {
        return ibMetadata ?
            `${c.WITNESS_RESULT_METADATA_STRING} ${ibMetadata}` :
            c.WITNESS_RESULT_METADATA_STRING;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * This builds the arg ibGib for a witness function.
 *
 * By default, this is considered a one-off ibGib. As such,
 * there is no dna and no uuid. The timestamp will be included, which
 * adds some metadata (and makes for a most-often unique tjp). If there
 * is something that needs to reference this result, it can use the
 * the ibgib's address.
 *
 * @returns Result (wrapper) ibGib for a `witness` function.
 */
export async function argy_<TArgData, TArgIbGib extends IbGib_V1<TArgData> = IbGib_V1<TArgData>>({
    argData,
    ibMetadata,
    noTimestamp,
}: {
    argData: TArgData,
    ibMetadata?: string,
    noTimestamp?: boolean,
}): Promise<TArgIbGib> {
    const lc = `[${argy_.name}]`;
    try {
        const resArgIbGib = await factory.firstGen<TArgData>({
            ib: getArgIb(ibMetadata),
            parentIbGib: factory.primitive({ ib: c.WITNESS_ARG_METADATA_STRING }),
            data: argData,
            dna: false,
            noTimestamp,
        });
        if (resArgIbGib.newIbGib) {
            const {newIbGib: resultIbGib} = resArgIbGib;

            // clear out past, disregard any intermediate ibgibs.
            resultIbGib.rel8ns!.past = [];

            return <TArgIbGib>resultIbGib;
        } else {
            throw new Error(`create ibGib failed`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * This builds the result ibGib for a witness function.
 *
 * By default, the result is considered a one-off ibGib. As such,
 * there is no dna and no uuid. The timestamp will be included, which
 * adds some metadata (and makes for a most-often unique tjp). If there
 * is something that needs to reference this result, it can use the
 * the ibgib's address.
 *
 * @returns Result (wrapper) ibGib for a `witness` function.
 */
export async function resulty_<TResultData, TResultIbGib extends IbGib_V1<TResultData> = IbGib_V1<TResultData>>({
    resultData,
    ibMetadata,
    noTimestamp,
}: {
    resultData: TResultData,
    ibMetadata?: string,
    noTimestamp?: boolean,
}): Promise<TResultIbGib> {
    const lc = `[${resulty_.name}]`;
    try {
        const resResultIbGib = await factory.firstGen<TResultData>({
            ib: getResultIb(ibMetadata),
            parentIbGib: factory.primitive({ ib: c.WITNESS_RESULT_METADATA_STRING }),
            data: resultData,
            dna: false,
            noTimestamp,
        });
        if (resResultIbGib?.newIbGib) {
            const {newIbGib: resultIbGib} = resResultIbGib;

            // clear out past, disregard any intermediate ibgibs.
            resultIbGib.rel8ns!.past = [];

            return <TResultIbGib>resultIbGib;
        } else {
            throw new Error(`create ibGib failed`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}
