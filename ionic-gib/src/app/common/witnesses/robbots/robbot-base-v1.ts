import * as h from 'ts-gib/dist/helper';
import { V1 } from 'ts-gib';
import {
    IbGib_V1, IbGibRel8ns_V1,
} from 'ts-gib/dist/V1';

import * as c from '../../constants';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1, RobbotOptionsData,
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
import { validateIbGibIntrinsically } from '../../helper/validate';
import { persistTransformResult } from '../../helper/space';

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

    /**
     * Reference to the local ibgibs service, which is one way at getting at the
     * local user space.
     */
    ibgibsSvc: IbgibsService;

    constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
        super(initialData, initialRel8ns);
    }

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
     *
     * ## notes
     *
     * I'm not overly thrilled with this, but it's a watered down version of
     * what I've implemented in the space witness hierarchy.
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
     * By default, this...
     *
     * * performs the raw {@link rel8} transform to the given `ibGib`.
     * * persists the new ibgib's transform result in the given space.
     * * registers the newer version of this robbot ibgib with the ibgibs svc.
     *
     * @see {@link ibGib}
     * @see {@link rel8nName}
     * @see {@link ibgibsSvc}
     * @see {@link space}
     *
     * ## notes
     *
     * * If there is no given `space`, then we will use the `ibgibsSvc` to get
     *   the local user space. If none, then we skip persistence.
     * * If there is no `ibgibsSvc`, we won't register the new ibgibs locally.
     */
    protected async rel8To({
        ibGib,
        rel8nName,
        ibgibsSvc,
        space,
    }: {
        /**
         * The ibgib to which we are relating.
         */
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

            // #region initialize, validate args and this
            rel8nName = rel8nName || this.data?.defaultRel8nName;

            if (!ibGib) { throw new Error(`ibGib required (E: 2fd13de0f025b170885bede4d7a50922)`); }
            if (!rel8nName) { throw new Error(`rel8nName required either as an arg or in this.data.defaultRel8nName (E: 43ab8ae63694a2a82cd8a70ed6b6b522)`); }

            const thisValidationErrors = await this.validateThis();
            if (thisValidationErrors?.length > 0) { throw new Error(`this is an invalid ibGib. thisValidationErrors: ${thisValidationErrors.join('|')} (E: 8f08716866cd13bf254222ee9e6a6722)`); }

            if (!ibgibsSvc) {
                if (this.ibgibsSvc) {
                    if (logalot) { console.log(`${lc} ibgibsSvc arg falsy, but we have a reference on this object, which we will use. (I: ee0d39a47ee8aee8ffd797721fea4322)`); }
                    ibgibsSvc = this.ibgibsSvc;
                }
            }

            if (!space) {
                if (ibgibsSvc) {
                    if (logalot) { console.log(`${lc} space arg falsy, but ibgibsSvc truthy, so we'll use ibgibsSvc's local user space for persistence. (I: 37a4b4c1406556cb23831671755b0d22)`); }
                    space = await ibgibsSvc.getLocalUserSpace({lock: true});
                }
            }

            // #endregion initialize, validate args and this

            // perform the raw ibgib rel8 transform
            const addr = h.getIbGibAddr({ibGib});
            const resNewRobbot = await V1.rel8({
                src: this.toIbGibDto(),
                rel8nsToAddByAddr: { [rel8nName]: [addr] },
                linkedRel8ns: ["past", "ancestor"], // we only want the most recent key address
                dna: true,
                nCounter: true,
            });
            const newRobbotIbGib = <IbGib_V1<TData,TRel8ns>>resNewRobbot.newIbGib;
            const newRobbotValidationErrors =
                await validateIbGibIntrinsically({ibGib: newRobbotIbGib});
            if (newRobbotValidationErrors?.length > 0) { throw new Error(`new robbot would have validation errors. aborting. newRobbotValidationErrors: ${newRobbotValidationErrors.join('|')} (E: eb816a27156c246c121ef55e37d59322)`); }

            // if space is given, perform the persistence
            if (space) {
                await persistTransformResult({resTransform: resNewRobbot, space});
            } else {
                if (logalot) { console.log(`${lc} space falsy, skipping persistence (I: 90aa3553e92ad1d02bce61f83648ea22)`); }
            }

            // if ibgibs svc is given, register the new ibgib
              // (in the future, need to revisit the ibgibs service to the idea of locality/ies).
            if (ibgibsSvc) {
                await ibgibsSvc.registerNewIbGib({ibGib: newRobbotIbGib, space});
            } else {
                if (logalot) { console.log(`${lc} ibgibsSvc falsy so skipping registerNewIbGib for new robbot (I: eda4f68fffaf2435eba25cd39d4f2922)`); }
            }

            // update this witness' primary ibGib properties (ib, gib, data, rel8ns).
            //   override `loadIbGibDto` to update secondary/derivative properties
            this.loadIbGibDto(newRobbotIbGib);
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
