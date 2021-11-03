import { IbGib_V1, IbGibRel8ns_V1, sha256v1 } from "ts-gib/dist/V1";
import { IbGibAddr, Gib, Ib } from "ts-gib";
import {
    StoneData_V1,
    Stone_V1,
    StoneTransformOpts_Fork,
    CanTransformResult,
    StoneTransformOpts_Mut8,
    StoneTransformOpts_Rel8
} from "../stone";
import { UNDEFINED_IB } from "../constants";
import { Witness_V1, WitnessOpts } from "../witness";
import { getUUID } from "ts-gib/dist/helper";
import { CanResult } from "../types";

export interface WitnessData_V1 extends StoneData_V1 {
    /**
     * marker data to show that this is a witness ibGib.
     */
    isWitness: true;
    /**
     * @see {@link WitnessBase_V1.v}
     */
    v: string;
    /**
     * Code for the witness.
     *
     * This can be just for the witness function, i.e. this.witness.toString()
     * Or this could be for the entire class, or whatever.
     *
     * @see {@link WitnessBase_V1.code}
     */
    code: string;
}

/**
 * Base implementation for {@link Witness_V1}.
 */
export abstract class WitnessBase_V1<TData extends WitnessData_V1 = WitnessData_V1>
    extends Stone_V1<TData>
    implements Witness_V1 {

    protected lc = `[${WitnessBase_V1.name}]`;
    /**
     * Convenience property, not to be included in this witness's ibgib `data`
     * property by default.
     */
    protected instanceId: string | undefined;

    /**
     * Convenience function where descending classes can place predicate logic
     * for the {@link witness} function.
     *
     * Base implementation doesn't allow witnessing self, checked via {@link instanceId}
     * property (if exists).
     *
     * @throws base implementation will throw an error if `other`, `other.ib` or `other.gib` is falsy
     */
    async canWitness({other}: WitnessOpts): Promise<CanResult> {
        let lc = `${this.lc}[${this.canWitness.name}]`;
        try {
            if (!other) { throw new Error(`other required.`); }
            if (!other.ib) { throw new Error(`other.ib required.`); }
            if (!other.gib) { throw new Error(`other.gib required.`); }

            // initializes instanceId if it's not already set.
            // in general, I think `witness` is the place for this initialization.
            this.instanceId = this.instanceId || await getUUID();
            if ((<any>other).instanceId &&
                (<any>other).instanceId === this.instanceId) {
                return {proceed: false, errors: [`can't witness self`]};
            }

            return { proceed: true };
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Primary, single-responsibility function of a witness.
     *
     * Base implementation contains boilerplate that first calls
     * {@link canWitness} before calling {@link witnessImpl}.
     *
     * If you don't want to use that boilerplate, override this function
     * and stub {@link witnessImpl} with an empty function.
     */
    async witness({other}: WitnessOpts): Promise<void> {
        let lc = `${this.lc}[${this.witness.name}]`;
        try {
            let can = await this.canWitness({other});
            if (can.proceed) { await this.witnessImpl({other}); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Override this in descending classes for the main witness functionality
     * for convenience.
     *
     * @see {@link WitnessBase_V1.witness}
     */
    protected abstract witnessImpl({other}: WitnessOpts): Promise<void>;

    /**
     * In v1, this is 'v1'.
     *
     * The actual instance version should be more precise when determined
     * by this class's {@link getGib} function.
     */
    get v(): string { return 'v1'; }

    /**
     * @see {@link getCode}
     */
    get code(): string { return this.getCode(); }

    /**
     * Override this in descending classes as one avenue to keep track of code on-chain.
     *
     * @example
     *
     * In this class, this returns
     *   `return WitnessBase_V1.toString();`
     *
     * In descending classes, do
     *   `return super.code + '\n' + MyClass.toString()`
     *
     * (or whatever you feel is right for your code at the time)
     */
    protected getCode(): string {
        return WitnessBase_V1.toString();
        // return super.getCode() + '\n' + WitnessBase_V1.toString();
    }

    /**
     * Classes in general will use linked rel8ns for ancestor, past.
     */
    get ancestorAddr(): IbGibAddr | null { return null; }

    /**
     * Classes in general will use linked rel8ns for ancestor, past.
     */
    get pastAddr(): IbGibAddr | null { return null; }

    /**
     * Returns the ibGib associated with this witness object.
     */
    toString(): string {
        const lc = `${this.lc}[${this.toString.name}]`;
        // if (!this.isLoaded) { return "[not loaded]"; }
        try {
            const ibGib: IbGib_V1 | undefined = this.ibGib;
            return ibGib ? JSON.stringify(ibGib) : '[not loaded]';
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * Syntax canon for a class's ib is "code class [classname] [v]".
     */
    get ib(): Ib {
        return `code class ${this.constructor.name} ${this.v}`;
    }
    set ib(_: Ib) {
        const lc = `${this.lc}[set ib(${_})]`;
        if (_ && _ !== UNDEFINED_IB) { console.log(`${lc} ignored`); }
    }

    protected _gib: Gib | undefined;
    get gib(): Gib | undefined { return this._gib; }
    set gib(_: Gib | undefined) {
        const lc = `${this.lc}[set gib(${_})]`;
        if (_) { console.log(`${lc} ignored`); }
    }

    async updateGib(): Promise<void> {
        const lc = `${this.lc}[${this.updateGib.name}]`;
        try {
            const args: IbGib_V1 = { ib: this.ib };
            if (this.data) { args.data = this.data; }
            if (this.rel8ns) { args.rel8ns = this.rel8ns; }
            this._gib = await sha256v1(args);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            delete this._gib;
        }
    }

    get data(): TData | undefined {
        return <TData>{
            v: this.v,
            isWitness: true,
            code: this.witness.toString(),
        };
    }
    set data(_: TData | undefined) {
        const lc = `${this.lc}[set data()]`;
        if (_) { console.log(`${lc} ignored`); }
    }

    get rel8ns(): IbGibRel8ns_V1 | undefined {
        let rel8ns: IbGibRel8ns_V1 | undefined;

        const pastAddr = this.pastAddr;
        if (this.pastAddr) {
            rel8ns = { past: [this.pastAddr] }
        }
        if (this.ancestorAddr) {
            rel8ns = rel8ns || {};
            rel8ns.ancestor = [this.ancestorAddr!];
        }

        return rel8ns;
    }
    set rel8ns(_: IbGibRel8ns_V1 | undefined) {
        const lc = `${this.lc}[set rel8ns()]`;
        if (_) { console.log(`${lc} ignored`); }
    }

    get ibGib(): IbGib_V1 | undefined {
        const lc = `${this.lc}[get ibGib()]`;
        if (!this.isLoaded) { return undefined; }

        try {
            const ibGib: IbGib_V1 = { ib: this.ib };
            if (this._gib) { ibGib.gib = this._gib; }
            if (this.data) { ibGib.data = this.data; }
            if (this.rel8ns) { ibGib.rel8ns = this.rel8ns; }
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }
    set ibGib(_: IbGib_V1 | undefined) {
        const lc = `${this.lc}[set ibGib()]`;
        if (_) { console.log(`${lc} ignored`); }
    }

    async canFork(opts: StoneTransformOpts_Fork): Promise<CanTransformResult> {
        const lc = `${this.lc}[${this.canFork.name}]`;
        return { proceed: false };
    }
    async canMut8(opts: StoneTransformOpts_Mut8<TData>): Promise<CanTransformResult> {
        const lc = `${this.lc}[${this.canMut8.name}]`;
        return { proceed: false };
    }
    async canRel8(opts: StoneTransformOpts_Rel8): Promise<CanTransformResult> {
        const lc = `${this.lc}[${this.canRel8.name}]`;
        return { proceed: false };
    }

}
