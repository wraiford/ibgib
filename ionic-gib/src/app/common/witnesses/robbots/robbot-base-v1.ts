import {
    IbGib_V1, IbGibRel8ns_V1,
} from 'ts-gib/dist/V1';

import * as c from '../../constants';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
} from '../../types/robbot';
import { WitnessBase_V1, } from '../witness-base-v1';
import { CommentIbGib_V1 } from '../../types/comment';
import { PicIbGib_V1 } from '../../types/pic';
import { isComment } from '../../helper/comment';
import { isPic } from '../../helper/pic';
import { validateCommonRobbotData } from '../../helper/robbot';
import { argy_, resulty_ } from '../witness-helper';
import { IbGibSpaceAny } from '../spaces/space-base-v1';
import { IbgibsService } from '../../../services/ibgibs.service';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * ## distinguishing characteristics of robbots
 *
 * With any witness ibgib, we are concerned with interpreting an incoming
 * arg ibgib and producing at least one result ibgib. Most often, there will
 * be additional ibgibs created, either creating "new" ibgibs via `fork`
 * transforms, or changing existing ibgibs through `mut8` and `rel8`
 * transforms. And almost always these will be persisted in at least
 * one space.
 *
 * But Robbots in particular are meant to be increasingly adaptable over time.
 *
 * This results in a couple of notes:
 *
 * 1. They should be able to handle any incoming ibgib, including primitives.
 * 2. If they are learning robbots, then they will mutate internally at some rate.
 * 3. Often robbots' output ibgib(s) will be intended for others'
 *    consumption, in service of others - be they humans or other
 *    biologically living organisms, other robbots or even later versions of
 *    themselves.
 *
 * So for example, one of the simplest robbots is one which simply echos the
 * incoming ibgib arg.

 * ## architecture
 *
 * At the base, any robbot should be able to handle any incoming ibgib.  This is
 * in contrast to, e.g., a Space, which is more rigid in design.
 *
 * Certainly there are robbot's who will be more rigid, but this will be an
 * abstract class on top of this one, and all robbots should be able to react to
 * all incoming ibgibs.
 *
 * Output will default to a simple ok^gib or (ROOT) ib^gib primitive...perhaps
 * we'll go with ack^gib, but whatever it is, it's just an acknowledgement of
 * input received.  (I'll put it in the constants file).
 *
 * Side effects should occur in a parallel execution thread, which ideally would
 * work in a completely parallel execution context (like a service worker). But
 * then we have to deal with race conditions and the real solution there is to
 * abstract to the robbot having its own space and the synchronization happening
 * exactly like any other sync space.
 *
 * For now, we'll spin off a promise with some intermittent `await h.delay`
 * calls if they end up called for, effectively the equivalent of the
 * old-fashioned "ProcessMessages/DoEvents" hack.
 */
export abstract class RobbotBase_V1<
        TOptionsData extends any = any,
        TOptionsRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1,
        TOptionsIbGib extends IbGib_V1<TOptionsData, TOptionsRel8ns>
            = IbGib_V1<TOptionsData, TOptionsRel8ns>,
        TResultData extends any = any,
        TResultRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1,
        TResultIbGib extends IbGib_V1<TResultData, TResultRel8ns>
            = IbGib_V1<TResultData, TResultRel8ns>,
        TData extends RobbotData_V1 = RobbotData_V1,
        TRel8ns extends RobbotRel8ns_V1 = RobbotRel8ns_V1,
    >
    extends WitnessBase_V1<
        TOptionsData, TOptionsRel8ns, TOptionsIbGib,
        TResultData, TResultRel8ns, TResultIbGib,
        TData, TRel8ns>
    implements RobbotIbGib_V1 {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `${super.lc}[${RobbotBase_V1.name}]`;
    // protected lc: string = `[${RobbotBase_V1.name}]`;

    // getRobbotIb(classname: string): string {
    //     const lc = `${this.lc}[${this.getRobbotIb.name}]`;
    //     if (!classname) {
    //         classname = this.lc?.replace('[','').replace(']','') || RobbotBase_V1.name+'_descendant';
    //         console.warn(`${lc} classname is falsy. Using ${classname}.`);
    //     }
    //     const name = this.data?.name || c.IBGIB_SPACE_NAME_DEFAULT;
    //     const id = this.data?.uuid || undefined;
    //     return `witness space ${classname} ${name} ${id}`;
    // }

    constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
        super(initialData, initialRel8ns);
    }

    // data?: RobbotData_V1;
    // rel8ns?: RobbotRel8ns_V1;
    // ib: string;
    // gib?: string;

    /**
     * At this point in time, the arg has already been intrinsically validated,
     * as well as the internal state of this robbot. so whatever this robbot's
     * function is, it should be good to go.
     */
    protected witnessImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.witnessImpl.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            debugger;
            return this.routeAndDoArg({arg});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Base routing executes different if incoming is a pic, comment or neither
     * (default).
     *
     * Override this function to create more advanced custom routing.
     */
    protected async routeAndDoArg({
        arg,
    }: {
        arg: TOptionsIbGib,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.routeAndDoArg.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            debugger;
            if (isPic({ibGib: arg})) {
                return this.doPic({ibGib: <PicIbGib_V1><any>arg}); // any cast b/c bad/too advanced TS inference
            } else if (isComment({ibGib: arg})) {
                return this.doComment({ibGib: <CommentIbGib_V1><any>arg}); // any cast b/c bad/too advanced TS inference
            } else {
                return this.doDefault({ibGib: arg});
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected doPic({
        ibGib,
    }: {
        ibGib: PicIbGib_V1,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.doPic.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented in base class (E: 16ba889931644d42ad9e476757dd0617)`);
            // return this.doPicImpl({ibGib: ibGib});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    // abstract doPicImpl({ ibGib }: { ibGib: PicIbGib_V1 }): Promise<TResultIbGib | undefined>;

    protected doComment({
        ibGib,
    }: {
        ibGib: CommentIbGib_V1,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.doComment.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            throw new Error(`not implemented in base class (E: 0486a7864729456d993a1afe246faea4)`);
            // return this.doCommentImpl({ibGib: ibGib});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    // abstract doCommentImpl({ ibGib }: { ibGib: CommentIbGib_V1 }): Promise<TResultIbGib | undefined>;

    protected doDefault({
        ibGib,
    }: {
        ibGib: TOptionsIbGib,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.doDefault.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented in base class (E: 5038662186617aaf1f0cc698fd1f9622)`);
            // return this.doDefaultImpl({ibGib});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Performs the raw {@link rel8} transform to the given `ibGib`.
     *
     *
     * @param param0
     */
    protected async rel8To({
        ibGib,
        rel8nName,
        ibgibsSvc,
        space,
    }: {
        ibGib: IbGib_V1,
        /**
         * If given, will use this as the rel8n name when performing the `rel8`
         * transform.
         *
         * If not given, will use the `robbot.data`'s {@link RobbotData_V1.defaultRel8nName} value.
         */
        rel8nName?: string,
        /**
         * If provided, will register the newly created ibgib.
         */
        ibgibsSvc?: IbgibsService,
        /**
         * If given (which atow is most likely the case), then the {@link TransformResult} will
         * be persisted in this `space`.
         */
        space?: IbGibSpaceAny,
    }): Promise<void> {
        const lc = `${this.lc}[${this.rel8To.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            // perform the raw ibgib rel8 transform
            // if space is given, perform the persistence
            // if ibgibs svc is given, register the new ibgib
              // (in the future, need to revisit the ibgibs service to the idea of locality/ies).
            // update this witness' primary ibGib properties (ib, gib, data, rel8ns).
            // update secondary/derivative properties

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * validates against common robbot qualities.
     *
     * Override this with a call to `super.validateThis` for custom validation
     * for descending robbot classes.
     *
     * @returns validation errors common to all robbots, if any errors exist.
     */
    protected async validateThis(): Promise<string[]> {
        const lc = `${this.lc}[${this.validateThis.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            const errors = [
                // ...await super.validateThis(),
                ...validateCommonRobbotData({robbotData: this.data}),
            ];
            return errors;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * builds an arg ibGib.
     *
     * wrapper convenience to avoid long generic calls.
     */
    protected async argy({
        argData,
        ibMetadata,
        noTimestamp,
        // ibGibs,
    }: {
        argData: TOptionsData,
        ibMetadata?: string,
        noTimestamp?: boolean,
        // ibGibs?: TIbGib[],
    }): Promise<TOptionsIbGib> {
        const arg = await argy_<TOptionsData, TOptionsRel8ns, TOptionsIbGib>({
            argData,
            ibMetadata,
            noTimestamp
        });

        // if (ibGibs) { arg.ibGibs = ibGibs; }

        return arg;
    }

    /**
     * builds a result ibGib, if indeed a result ibgib is required.
     *
     * This is only useful in robbots that have more structured inputs/outputs.
     * For those that simply accept any ibgib incoming and return a
     * primitive like ib^gib or whatever, then this is unnecessary.
     *
     * wrapper convenience to avoid long generic calls.
     */
    protected async resulty({
        resultData,
        // ibGibs,
    }: {
        resultData: TResultData,
        // ibGibs?: TIbGib[],
    }): Promise<TResultIbGib> {
        const result = await resulty_<TResultData, TResultIbGib>({
            // ibMetadata: getRobbotResultMetadata({space: this}),
            resultData,
        });
        // if (ibGibs) { result.ibGibs = ibGibs; }
        return result;
    }

}

export interface IbGibRobbotAny
    extends RobbotBase_V1<any,any,any,any,any,any,any,any> {
}
