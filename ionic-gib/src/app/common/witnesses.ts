import {
    Witness_V1,
} from './types';
import {
    getIbGibAddr,
} from 'ts-gib';
import { IbGib_V1, IbGibRel8ns_V1, Factory_V1, } from 'ts-gib/dist/V1';
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

    protected set trace(value: string[]) {
        const lc = `${this.lc}[set trace}]`;
        if (this.data) {
            (<any>this.data).trace = value;
        } else {
            console.warn(`${lc} data is falsy. Can't set.`);
        }
    }
    protected get trace(): string[] {
        return (<any>this.data)?.trace;
    }
    protected set throwOnError(value: boolean) {
        const lc = `${this.lc}[set throwOnError}]`;
        if (this.data) {
            (<any>this.data).throwOnError = value;
        } else {
            console.warn(`${lc} data is falsy. Can't set.`);
        }
    }
    protected get throwOnError(): boolean {
        return (<any>this.data)?.throwOnError || true;
    }

    protected _ib: string = '';
    protected getIb(): string { return this._ib; }
    protected setIb(value: string): void { this._ib = value; }
    get ib(): string { return this.getIb(); }
    set ib(value: string) { this.setIb(value); }

    protected _gib: string | undefined = 'gib';
    protected getGib(): string | undefined { return this._gib; }
    protected setGib(value: string | undefined): void {
        const lc = `${this.lc}[${this.setGib.name}]`;
        console.error(`${lc} in base class, this function defaults to doing nothing.`)
    }
    get gib(): string | undefined { return this.getGib(); }
    set gib(value: string | undefined) { this.setGib(value); }

    protected _data: TData | undefined;
    get data(): TData | undefined { return this.getData(); }
    set data(value: TData | undefined) { this.setData(value); }
    protected getData(): TData | undefined { return undefined; }
    protected setData(value: TData | undefined): void {
        const lc = `${this.lc}[${this.setData.name}]`;
        console.warn(`${lc} not implemented in base class, so I'm not sure why this is being called.`);
    }

    protected _rel8ns: TRel8ns | undefined;
    get rel8ns(): TRel8ns | undefined { return this.getRel8ns(); }
    set rel8ns(value: TRel8ns | undefined) { this.setRel8ns(value); }
    protected getRel8ns(): TRel8ns | undefined { return undefined; }
    protected setRel8ns(value: TRel8ns | undefined): void {
        const lc = `${this.lc}[${this.setRel8ns.name}]`;
        console.warn(`${lc} not implemented in base class, so I'm not sure why this is being called.`);
    }

    constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
        if (initialData) { this._data = initialData; }
        if (initialRel8ns) { this._rel8ns = initialRel8ns; }
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
export function getArgIb(): string { return `${c.WITNESS_ARG_METADATA_STRING} ${this.ib}`; }

/**
 * Builds the ib for the witness result ibgib.
 *
 * @returns ib that we'll use when creating a witness result.
 */
export function getResultIb(): string { return `${c.WITNESS_RESULT_METADATA_STRING} ${this.ib}`; }

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
    timestamp,
    uuid,
}: {
    argData: TArgData,
    timestamp?: boolean,
    uuid?: boolean,
}): Promise<TArgIbGib> {
    const lc = `[${argy_.name}]`;
    try {
        const resArgIbGib = await Factory_V1.firstGen<TArgData>({
            ib: getArgIb(),
            parentIbGib: Factory_V1.primitive({ ib: c.WITNESS_ARG_METADATA_STRING }),
            data: argData,
            dna: false,
            tjp: { timestamp, uuid },
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
    timestamp,
    uuid,
}: {
    resultData: TResultData,
    timestamp?: boolean,
    uuid?: boolean,
}): Promise<TResultIbGib> {
    const lc = `${this.lc}[${this.getResult.name}]`;
    try {
        const resResultIbGib = await Factory_V1.firstGen<TResultData>({
            ib: getResultIb(),
            parentIbGib: Factory_V1.primitive({ ib: c.WITNESS_RESULT_METADATA_STRING }),
            data: resultData,
            dna: false,
            tjp: { timestamp, uuid },
        });
        if (resResultIbGib.newIbGib) {
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
