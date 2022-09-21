import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, V1 } from 'ts-gib';
import {
    IbGib_V1, IbGibRel8ns_V1, ROOT,
} from 'ts-gib/dist/V1';

import * as c from '../../constants';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
    RobbotCmd,
    RobbotCmdData, RobbotCmdRel8ns, RobbotCmdIbGib,
    RobbotResultData, RobbotResultRel8ns, RobbotResultIbGib,
} from '../../types/robbot';
import { WitnessBase_V1, } from '../witness-base-v1';
import { CommentIbGib_V1 } from '../../types/comment';
import { PicIbGib_V1 } from '../../types/pic';
import { validateCommonRobbotData } from '../../helper/robbot';
import { argy_, isArg, resulty_ } from '../witness-helper';
import { IbGibSpaceAny } from '../spaces/space-base-v1';
import { IbgibsService } from '../../../services/ibgibs.service';
import { validateIbGibIntrinsically } from '../../helper/validate';
import { getFromSpace, persistTransformResult } from '../../helper/space';
import { ErrorIbGib_V1 } from '../../types/error';
import { errorIbGib } from '../../helper/error';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

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
    TResultIbGib extends IbGib_V1<TResultData, TResultRel8ns> | ErrorIbGib_V1
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

    protected async loadNewerSelfIfAvailable(): Promise<void> {
        const lc = `${this.lc}[${this.loadNewerSelfIfAvailable.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 94755c3131f4dfa12d20fa38e2926522)`); }
            if (this.ibgibsSvc) {
                // check for newer version of self locally before executing
                const robbotAddr = h.getIbGibAddr({ ibGib: this });
                const latestAddr = await this.ibgibsSvc.getLatestAddr({ ibGib: this });
                if (latestAddr && latestAddr !== robbotAddr) {
                    // robbot has a newer ibgib in its timeline
                    let resGet = await this.ibgibsSvc.get({ addr: latestAddr });
                    if (!resGet || !resGet?.success || (resGet?.ibGibs ?? []).length === 0) {
                        throw new Error(`could not get newer robbot ibgib (E: 15fa346c8ac17edb96e4b0870104c122)`);
                    }
                    await this.loadIbGibDto(<IbGib_V1<TData, TRel8ns>>resGet.ibGibs[0]);
                    const validationErrors = await this.validateThis();
                    if (validationErrors?.length > 0) { throw new Error(`validationErrors when loading newer version: ${h.pretty(validationErrors)} (E: 0d9f0684a1ff6af44e20a57130e3ac22)`); }
                }
            }

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    /**
     * At this point in time, the arg has already been intrinsically validated,
     * as well as the internal state of this robbot. so whatever this robbot's
     * function is, it should be good to go.
     *
     * In the base class, this just returns {@link routeAndDoArg}. If you don't
     * want to route, then override this.
     */
    protected async witnessImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.witnessImpl.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            await this.loadNewerSelfIfAvailable();

            return this.routeAndDoArg({ arg });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Base routing executes different if incoming is a cmd options arg, i.e.,
     * if the `data.cmd` is truthy (atow). If {@link isArg} is true, then routes
     * to {@link doCmdArg}; else routes to {@link doDefault}.
     *
     * Override this function to create more advanced custom routing.
     *
     * ## notes
     *
     * I'm not overly thrilled with this, but it's a watered down version of
     * what I've implemented in the space witness hierarchy.
     *
     * @see {@link isArg}
     * @see {@link doCmdArg}
     * @see {@link doDefault}.
     */
    protected async routeAndDoArg({
        arg,
    }: {
        arg: TOptionsIbGib,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.routeAndDoArg.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (isArg({ ibGib: arg })) {
                if ((<any>arg.data).cmd) {
                    return this.doCmdArg({ arg: <RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>>arg });
                } else {
                    return this.doDefault({ ibGib: arg });
                }
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            if (this.data?.catchAllErrors) {
                return <TResultIbGib>(await errorIbGib({ rawMsg: error.message }));
            } else {
                throw error;
            }
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    // #region do cmd args

    /**
     * By default, this routes to {@link doCmdIb}, {@link doCmdGib} & {@link doCmdIbgib}.
     * Override this and route to other commands before calling this with `super.doCmdArg`
     * (if you still want to use this function.)
     *
     * You can also override the routing
     */
    protected doCmdArg({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<TResultIbGib> {
        const lc = `${this.lc}[${this.doCmdArg.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!arg.data?.cmd) { throw new Error(`invalid cmd arg. arg.data.cmd required. (E: aec4dd5bd967fbf36f9c4fad22210222)`); }
            if (arg.data.cmd === RobbotCmd.ib) {
                return this.doCmdIb({ arg: arg });
            } else if (arg.data.cmd === RobbotCmd.gib) {
                return this.doCmdGib({ arg: arg });
            } else if (arg.data.cmd === RobbotCmd.ibgib) {
                return this.doCmdIbgib({ arg: arg });
            } else {
                throw new Error(`unknown arg.data.cmd: ${arg.data.cmd} (E: 721fa6a5166327134f9504c1caa3e422)`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected doCmdIb({
        arg,
    }: {
        arg: IbGib_V1,
    }): Promise<TResultIbGib> {
        const lc = `${this.lc}[${this.doCmdIb.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented in base class (E: 7298662a2b8f67611d16a8af0e499422)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    protected doCmdGib({
        arg,
    }: {
        arg: IbGib_V1,
    }): Promise<TResultIbGib> {
        const lc = `${this.lc}[${this.doCmdGib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented in base class (E: b6bf2c788c734051956481be7283d006)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    protected doCmdIbgib({
        arg,
    }: {
        arg: IbGib_V1,
    }): Promise<TResultIbGib> {
        const lc = `${this.lc}[${this.doCmdIbgib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented in base class (E: 4fee11f05315467abd036cd8555d27db)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    // #endregion do cmd args

    // #region other stubbed do functions (doPic, doComment, doDefault)

    /**
     * Stubbed in base class for convenience. Doesn't have to be implemented.
     */
    protected doPic({
        ibGib,
    }: {
        ibGib: PicIbGib_V1,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.doPic.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented in base class (E: 16ba889931644d42ad9e476757dd0617)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Stubbed in base class for convenience. Doesn't have to be implemented.
     */
    protected doComment({
        ibGib,
    }: {
        ibGib: CommentIbGib_V1,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.doComment.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            throw new Error(`not implemented in base class (E: 0486a7864729456d993a1afe246faea4)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Stubbed in base class for convenience. Doesn't have to be implemented.
     */
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

    // #endregion other stubbed do functions (doPic, doComment, doDefault)

    /**
     * By default, this...
     *
     * * performs the raw {@link rel8} transform to the given `ibGib`.
     * * persists the new ibgib's transform result in the given space.
     * * registers the newer version of this robbot ibgib with the ibgibs svc.
     *
     * @see {@link ibGibs}
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
        ibGibs,
        rel8nName,
        ibgibsSvc,
        space,
    }: {
        /**
         * The ibgib to which we are relating.
         */
        ibGibs: IbGib_V1[],
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

            if ((ibGibs ?? []).length === 0) { throw new Error(`ibGibs required (E: 2fd13de0f025b170885bede4d7a50922)`); }

            rel8nName = rel8nName || this.data?.defaultRel8nName;
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
                    space = await ibgibsSvc.getLocalUserSpace({ lock: true });
                }
            }

            // #endregion initialize, validate args and this



            // we want to rel8 only to the ibGibs whose timelines we're not
            // already related to. So we look to see if we already have the tjpGib
            // per our rel8nName.
            const alreadyRel8dAddrs = this.rel8ns[rel8nName] ?? [];
            const alreadyRel8dTjpGibs = alreadyRel8dAddrs.map(x => getGibInfo({ ibGibAddr: x }).tjpGib);
            const ibGibsNotYetRel8dByTjp = ibGibs.filter(x => {
                const tjpGib = getGibInfo({ ibGibAddr: h.getIbGibAddr({ ibGib: x }) }).tjpGib;
                return !alreadyRel8dTjpGibs.includes(tjpGib);
            });

            if (ibGibsNotYetRel8dByTjp.length === 0) {
                if (logalot) { console.log(`${lc} already rel8d to all incoming ibGib(s) via tjp. (I: 5e9d94a98ba262f146c0c0b765157922)`); }
                return; /* <<<< returns early */
            }

            // perform the raw ibgib rel8 transform
            const addrs = ibGibsNotYetRel8dByTjp.map(x => h.getIbGibAddr({ ibGib: x }));
            const resNewRobbot = await V1.rel8({
                src: this.toIbGibDto(),
                rel8nsToAddByAddr: { [rel8nName]: addrs },
                linkedRel8ns: ["past", "ancestor"], // we only want the most recent key address
                dna: true,
                nCounter: true,
            });
            const newRobbotIbGib = <IbGib_V1<TData, TRel8ns>>resNewRobbot.newIbGib;
            const newRobbotValidationErrors =
                await validateIbGibIntrinsically({ ibGib: newRobbotIbGib });
            if (newRobbotValidationErrors?.length > 0) { throw new Error(`new robbot would have validation errors. aborting. newRobbotValidationErrors: ${newRobbotValidationErrors.join('|')} (E: eb816a27156c246c121ef55e37d59322)`); }

            // if space is given, perform the persistence
            if (space) {
                await persistTransformResult({ resTransform: resNewRobbot, space });
            } else {
                if (logalot) { console.log(`${lc} space falsy, skipping persistence (I: 90aa3553e92ad1d02bce61f83648ea22)`); }
            }

            // if ibgibs svc is given, register the new ibgib
            // (in the future, need to revisit the ibgibs service to the idea of locality/ies).
            if (ibgibsSvc) {
                await ibgibsSvc.registerNewIbGib({ ibGib: newRobbotIbGib, space });
            } else {
                if (logalot) { console.log(`${lc} ibgibsSvc falsy so skipping registerNewIbGib for new robbot (I: eda4f68fffaf2435eba25cd39d4f2922)`); }
            }

            // update this witness' primary ibGib properties (ib, gib, data, rel8ns).
            //   override `loadIbGibDto` to update secondary/derivative properties
            await this.loadIbGibDto(newRobbotIbGib);
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
                ...validateCommonRobbotData({ robbotData: this.data }),
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
    async argy<
        TCmdOptionsData extends RobbotCmdData = RobbotCmdData,
        TCmdOptionsRel8ns extends RobbotCmdRel8ns = RobbotCmdRel8ns,
        TCmdOptionsIbGib extends RobbotCmdIbGib<IbGib_V1, TCmdOptionsData, TCmdOptionsRel8ns> =
        RobbotCmdIbGib<IbGib_V1, TCmdOptionsData, TCmdOptionsRel8ns>
    >({
        argData,
        ibMetadata,
        noTimestamp,
        ibGibs,
    }: {
        argData: TCmdOptionsData,
        ibMetadata?: string,
        noTimestamp?: boolean,
        ibGibs?: IbGib_V1[],
    }): Promise<TCmdOptionsIbGib> {
        const arg = await argy_<TCmdOptionsData, TCmdOptionsRel8ns, TCmdOptionsIbGib>({
            argData,
            ibMetadata,
            noTimestamp
        });

        if (ibGibs) { arg.ibGibs = ibGibs; }

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
    async resulty<
        TResultData extends RobbotResultData = RobbotResultData,
        TResultRel8ns extends RobbotResultRel8ns = RobbotResultRel8ns,
        TResultIbGib extends RobbotResultIbGib<IbGib_V1, TResultData, TResultRel8ns> =
        RobbotResultIbGib<IbGib_V1, TResultData, TResultRel8ns>
    >({
        resultData,
        ibGibs,
    }: {
        resultData: TResultData,
        ibGibs?: IbGib_V1[],
    }): Promise<TResultIbGib> {
        const result = await resulty_<TResultData, TResultIbGib>({
            // ibMetadata: getRobbotResultMetadata({space: this}),
            resultData,
        });
        if (ibGibs) { result.ibGibs = ibGibs; }
        return result;
    }

    protected async rel8ToIbGib({
        ibGibToRel8,
        ibGibAddrToRel8,
        contextIbGib,
        rel8nNames,
    }: {
        ibGibToRel8?: IbGib_V1,
        ibGibAddrToRel8?: IbGibAddr,
        contextIbGib: IbGib_V1,
        rel8nNames: string[],
    }): Promise<void> {
        const lc = `${this.lc}[${this.rel8ToIbGib.name}]`;
        try {
            if (!ibGibToRel8 && !ibGibAddrToRel8) { throw new Error(`ibGibToRel8 or ibGibAddrToRel8 required (E: 3ee14659fd22355a5ba0e537a477be22)`); }
            if (!contextIbGib) { throw new Error(`contextIbGib required (E: 85f27c7cbf713704c21084c141cd8822)`); }

            if ((rel8nNames ?? []).length === 0) {
                if (!this.data?.defaultRel8nName) { throw new Error(`either rel8nNames or this.data.defaultRel8nName required (E: a14ab4b3e479d9274c61bc5a30bc2222)`); }
                rel8nNames = [this.data.defaultRel8nName];
            }

            // set up the rel8ns to add
            const rel8nsToAddByAddr: IbGibRel8ns_V1 = {};
            ibGibAddrToRel8 = ibGibAddrToRel8 || h.getIbGibAddr({ ibGib: ibGibToRel8 });
            rel8nNames.forEach((rel8nName) => { rel8nsToAddByAddr[rel8nName] = [ibGibAddrToRel8]; });

            // perform the rel8 transform and...
            const resRel8ToContext =
                await V1.rel8({
                    src: contextIbGib,
                    rel8nsToAddByAddr,
                    dna: true,
                    nCounter: true
                });

            // ...persist it...
            await this.ibgibsSvc.persistTransformResult({ resTransform: resRel8ToContext });

            // ...register the context.
            const { newIbGib: newContext } = resRel8ToContext;
            await this.ibgibsSvc.registerNewIbGib({ ibGib: newContext });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }


    protected async getRel8dIbGibs({
        rel8nNames,
    }: {
        rel8nNames?: string[],
    }): Promise<{ [rel8nName: string]: IbGib_V1[] }> {
        const lc = `${this.lc}[${this.getRel8dIbGibs.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: f183ca9d23e8f67721b614cf01327b22)`); }
            if (!rel8nNames) { rel8nNames = this.data?.allRel8nNames ?? []; }
            if (this.data.defaultRel8nName && !rel8nNames.includes(this.data.defaultRel8nName)) {
                rel8nNames.push(this.data.defaultRel8nName);
            }
            if (rel8nNames.length === 0) { throw new Error(`rel8nNames arg required or this.data.allRel8nNames must have at least one rel8nName. (E: 32380232f04f6cb01e0791a754672722)`); }

            await this.loadNewerSelfIfAvailable();

            const space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });

            const rel8dIbGibs: { [rel8nName: string]: IbGib_V1[] } = {};

            for (let i = 0; i < rel8nNames.length; i++) {
                const rel8nName = rel8nNames[i];
                const rel8dAddrs = this.rel8ns[rel8nName] ?? [];

                if (rel8dAddrs.length > 0) {
                    const resGet = await getFromSpace({ addrs: rel8dAddrs, space });
                    if (resGet.success && resGet.ibGibs?.length === rel8dAddrs.length) {
                        rel8dIbGibs[rel8nName] = resGet.ibGibs.concat();
                    } else {
                        throw new Error(`there was a problem getting this robbot's rel8d ibgibs. ${resGet.errorMsg ?? 'some kinda problem...hmm..'} (E: 81e26309422ab87e5bd6bcf152059622)`);
                    }
                } else {
                    rel8dIbGibs[rel8nName] = [];
                }
            }

            return rel8dIbGibs;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}

export interface IbGibRobbotAny
    extends RobbotBase_V1<any, any, any, any, any, any, any, any> {
}
