import * as h from 'ts-gib/dist/helper';
import { Gib, Ib, IbGibAddr, V1 } from 'ts-gib';
import {
    IbGib_V1, IbGibRel8ns_V1, ROOT,
} from 'ts-gib/dist/V1';

import * as c from '../../constants';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
    RobbotCmd,
    RobbotCmdData, RobbotCmdRel8ns, RobbotCmdIbGib,
    RobbotResultData, RobbotResultRel8ns, RobbotResultIbGib, ROBBOT_MY_COMMENTS_REL8N_NAME,
    ROBBOT_CONTEXT_REL8N_NAME,
    SemanticHandler,
    SemanticId,
    SemanticInfo,
    RobbotInteractionIbGib_V1,
    RobbotInteractionData_V1,
    RobbotInteractionType,
    RobbotPropsData,
    DEFAULT_ROBBOT_LEX_DATA,
    DEFAULT_HUMAN_LEX_DATA,
} from '../../types/robbot';
import { WitnessBase_V1, } from '../witness-base-v1';
import { CommentIbGib_V1 } from '../../types/comment';
import { PicIbGib_V1 } from '../../types/pic';
import { getInteractionIbGib_V1, validateCommonRobbotData } from '../../helper/robbot';
import { argy_, isArg, resulty_ } from '../witness-helper';
import { IbgibsService } from '../../../services/ibgibs.service';
import { validateIbGibIntrinsically } from '../../helper/validate';
import { getFromSpace, getLatestAddrs, } from '../../helper/space';
import { ErrorIbGib_V1 } from '../../types/error';
import { errorIbGib } from '../../helper/error';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { createCommentIbGib, parseCommentIb } from '../../helper/comment';
import { Subscription } from 'rxjs';
import { IbGibTimelineUpdateInfo } from '../../types/ux';
import { Lex } from '../../helper/lex';
import { getTjpAddr } from '../../helper/ibgib';
import { filter } from 'rxjs/operators';

const logalot = c.GLOBAL_LOG_A_LOT || true;

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
    TLexPropsData extends RobbotPropsData = RobbotPropsData,
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
     *
     * Often used in conjunction with `logalot`.
     */
    protected lc: string = `${super.lc}[${RobbotBase_V1.name}]`;

    /**
     * Reference to the local ibgibs service, which is one way at getting at the
     * local user space.
     */
    public ibgibsSvc: IbgibsService;

    /**
     * When the robbot has to get some ibgibs, might as well store them here so
     * we don't have to get them again from storage.
     */
    protected _cacheIbGibs: { [addr: string]: IbGib_V1 } = {};


    protected _contextChangesSubscription: Subscription;
    protected _currentWorkingContextIbGib: IbGib_V1;
    /**
     * when we get an update to the context, we want to know what the _new_
     * children are in order to interpret comments from the user that may be
     * directed at us.
     *
     * So we will get an initial snapshot of children that we will diff against.
     * We could go via the dna, but ultimately a diff is what is needed.
     */
    protected _currentWorkingContextIbGib_PriorChildrenAddrs: IbGibAddr[] = [];

    protected _updatingContext: boolean;

    protected _semanticHandlers: { [semanticId: string]: SemanticHandler[] };

    protected async handleSemanticDefault(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemanticDefault.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 01a2d1781851cc36b674f44b4fb69522)`); }

            const speech = this._robbotLex.get(SemanticId.unknown, {
                props: props =>
                    props.semanticId === SemanticId.unknown,
            });

            const data = await this.getRobbotInteractionData({
                type: RobbotInteractionType.info,
                commentText: speech.text,
            });

            const interaction = await getInteractionIbGib_V1({ data });
            return interaction;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * lex that the robbot uses to speak.
     */
    protected _robbotLex: Lex<TLexPropsData>;
    /**
     * lex that the robbot uses to interpret humans.
     */
    protected _userLex: Lex<TLexPropsData>;

    /**
     * This should be awaited before dealing with the robbot.
     *
     * I'm keeping this named `ready` as a shout out to
     * https://stackoverflow.com/a/45070748/3897838
     * (https://stackoverflow.com/questions/35743426/async-constructor-functions-in-typescript).
     *
     * ## comments
     *
     * I've been considering going forward whether or not to have robbots'
     * properties all be observables to allow for subscribing to events or
     * similar in the future. But this may fight against the single `witness`
     * point of contact, which of course itself is somewhat experimental. One
     * grand experiment.
     *
     * I do have an observable as a property for the aws sync space saga
     * updates.  This kind of observable can be passed around while still using
     * the single `witness` access point, but of course these runtime aspects
     * won't be memoized if storing the ibgib.
     */
    public ready: Promise<void>;

    constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
        super(initialData, initialRel8ns);
        this.ready = this.initialize();
    }

    // #region initialize

    /**
     * Initializes to default space values.
     */
    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: f0e65ab0f80046a59668ddfbf9f47a4a5)`); }

            await this.initialize_semanticHandlers();
            await this.initialize_lex();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initialize_semanticHandlers(): Promise<void> {
        const lc = `${this.lc}[${this.initialize_semanticHandlers.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: a0f2a11688963b0156e337e7f8604f22)`); }
            this._semanticHandlers = {
                [SemanticId.default]: [
                    {
                        handlerId: "c8054c0b77fb4b37bff693e54e1f66bd",
                        semanticId: SemanticId.default,
                        fnCanExec: (info) => Promise.resolve(true),
                        fnExec: (info) => { return this.handleSemanticDefault(info); },
                    }
                ],
                [SemanticId.unknown]: [
                    {
                        handlerId: "9eb4c537cddb40d4927c2aa58e4e6f4b",
                        semanticId: SemanticId.default,
                        fnCanExec: (info) => Promise.resolve(true),
                        fnExec: (info) => { return this.handleSemanticDefault(info); },
                    }
                ],
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initialize_lex(): Promise<void> {
        const lc = `${this.lc}[${this.initialize_lex.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: a4668a7473027e56df42909c09f70822)`); }
            this._robbotLex = new Lex<TLexPropsData>(h.clone(DEFAULT_ROBBOT_LEX_DATA), {
                defaultPropsMode: 'props',
                defaultKeywordMode: 'all',
                defaultLineConcat: 'paragraph', // outgoing robbot defaults to multiple paragraphs.
            });

            this._robbotLex.data[SemanticId.unknown] = [
                {
                    texts: [
                        `huh?`, // silly
                    ],
                    props: <TLexPropsData>{
                        semanticId: SemanticId.unknown,
                    }
                }
            ];

            this._userLex = new Lex<TLexPropsData>(h.clone(DEFAULT_HUMAN_LEX_DATA), {
                defaultPropsMode: 'props',
                defaultKeywordMode: 'all',
                defaultLineConcat: 'sentence', // incoming user lex defaults to combining sentences.
            });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    // #endregion initialize

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
            } else if (arg.data.cmd === RobbotCmd.activate) {
                return this.doCmdActivate({ arg: arg });
            } else if (arg.data.cmd === RobbotCmd.deactivate) {
                return this.doCmdDeactivate({ arg: arg });
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
    protected async doCmdActivate({
        arg,
    }: {
        arg: RobbotCmdIbGib,
    }): Promise<TResultIbGib> {
        const lc = `${this.lc}[${this.doCmdActivate.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d453593a295d4cdbae2acb71d9f6de35)`); }
            await this.ready;

            if (arg.ibGibs?.length > 0) {
                await this.initializeContext({ arg });
            }

            const result = await this.resulty({
                resultData: {
                    optsAddr: h.getIbGibAddr({ ibGib: arg }),
                    success: true,
                },
            })
            return <TResultIbGib>result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    protected async doCmdDeactivate({
        arg,
    }: {
        arg: RobbotCmdIbGib,
    }): Promise<TResultIbGib> {
        const lc = `${this.lc}[${this.doCmdDeactivate.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d453593a295d4cdbae2acb71d9f6de35)`); }
            await this.ready;

            await this.finalizeContext({ arg });

            const result = await this.resulty({
                resultData: {
                    optsAddr: h.getIbGibAddr({ ibGib: arg }),
                    success: true,
                },
            })
            return <TResultIbGib>result;
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
        linked,
        ibgibsSvc,
        // space,
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
         * If true, will include the `rel8nName` as a linked rel8n in the `rel8`
         * transform.
         */
        linked?: boolean,
        /**
         * If provided, will register the newly created ibgib.
         */
        ibgibsSvc?: IbgibsService,
        // /**
        //  * If given (which atow is most likely the case), then the {@link TransformResult} will
        //  * be persisted in this `space`.
        //  */
        // space?: IbGibSpaceAny,
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

            ibgibsSvc = ibgibsSvc ?? this.ibgibsSvc;

            if (!ibgibsSvc) {
                // if (this.ibgibsSvc) {
                //     if (logalot) { console.log(`${lc} ibgibsSvc arg falsy, but we have a reference on this object, which we will use. (I: ee0d39a47ee8aee8ffd797721fea4322)`); }
                //     ibgibsSvc = this.ibgibsSvc;
                // }
                throw new Error(`either ibgibsSvc or this.ibgibsSvc required (E: b5f9453ddb394a2b76dec74c7304df22)`);
            }

            // if (!space) {
            //     if (ibgibsSvc) {
            //         if (logalot) { console.log(`${lc} space arg falsy, but ibgibsSvc truthy, so we'll use ibgibsSvc's local user space for persistence. (I: 37a4b4c1406556cb23831671755b0d22)`); }
            //         space = await ibgibsSvc.getLocalUserSpace({ lock: true });
            //     }
            // }

            // if (!space) { throw new Error(`(UNEXPECTED) space required and ibgibsSvc couldn't get it? (E: a3b9f9b72f6f6f18883199a19d38c622)`); }

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
                linkedRel8ns: linked ? ["past", "ancestor", rel8nName] : ["past", "ancestor"],
                dna: true,
                nCounter: true,
            });
            const newRobbotIbGib = <IbGib_V1<TData, TRel8ns>>resNewRobbot.newIbGib;
            const newRobbotValidationErrors =
                await validateIbGibIntrinsically({ ibGib: newRobbotIbGib });
            if (newRobbotValidationErrors?.length > 0) { throw new Error(`new robbot would have validation errors. aborting. newRobbotValidationErrors: ${newRobbotValidationErrors.join('|')} (E: eb816a27156c246c121ef55e37d59322)`); }

            // if space is given, perform the persistence
            // if (space) {
            await ibgibsSvc.persistTransformResult({ resTransform: resNewRobbot });
            // } else {
            //     if (logalot) { console.log(`${lc} space falsy, skipping persistence (I: 90aa3553e92ad1d02bce61f83648ea22)`); }
            // }

            // if ibgibs svc is given, register the new ibgib
            // (in the future, need to revisit the ibgibs service to the idea of locality/ies).
            // if (ibgibsSvc) {
            await ibgibsSvc.registerNewIbGib({ ibGib: newRobbotIbGib });
            // } else {
            //     if (logalot) { console.log(`${lc} ibgibsSvc falsy so skipping registerNewIbGib for new robbot (I: eda4f68fffaf2435eba25cd39d4f2922)`); }
            // }

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

    protected async rel8ToContextIbGib({
        ibGibToRel8,
        ibGibAddrToRel8,
        contextIbGib,
        rel8nNames,
        // space,
    }: {
        ibGibToRel8?: IbGib_V1,
        ibGibAddrToRel8?: IbGibAddr,
        contextIbGib: IbGib_V1,
        rel8nNames: string[],
        // space?: IbGibSpaceAny,
    }): Promise<void> {
        const lc = `${this.lc}[${this.rel8ToContextIbGib.name}]`;
        try {
            if (!ibGibToRel8 && !ibGibAddrToRel8) { throw new Error(`ibGibToRel8 or ibGibAddrToRel8 required (E: 3ee14659fd22355a5ba0e537a477be22)`); }
            if (!contextIbGib) { throw new Error(`contextIbGib required (E: 85f27c7cbf713704c21084c141cd8822)`); }
            if (!this.ibgibsSvc) { throw new Error(`this.ibgibsSvc required (E: 6a38c4274bdefc8d44cafd2d6faaa222)`); }

            // space = space ?? await this.ibgibsSvc.getLocalUserSpace({ lock: true });
            // if (!space) { throw new Error(`space required (E: 267ad87c148942cda641349df0bbbd22)`); }

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

    protected async createCommentAndRel8ToContextIbGib({
        text,
        contextIbGib,
    }: {
        text: string,
        contextIbGib: IbGib_V1,
        ibgibsSvc?: IbgibsService,
    }): Promise<void> {
        const lc = `${this.lc}[${this.createCommentAndRel8ToContextIbGib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c3a005f7d323468a5b4e1b2710901d22)`); }

            if (!this.ibgibsSvc) { throw new Error(`this.ibgibsSvc required (E: 5dbb1a7f0ff5469b8ce3cb1be175e521)`); }

            // space = space ?? await this.ibgibsSvc.getLocalUserSpace({ lock: true });
            // if (!space) { throw new Error(`(UNEXPECTED) space required and wasn't able to get it from ibgibsSvc? (E: 7159f9893a66c28a7e09b61384545622)`); }
            let space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });

            /** tag this comment with metadata to show it came from this robbot */
            let resComment = await createCommentIbGib({ text, addlMetadataText: this.getAddlMetadata(), saveInSpace: true, space });

            // get again to be sure it's the latest space.
            space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });

            const commentIbGib = <CommentIbGib_V1>resComment.newIbGib;
            if (!commentIbGib) { throw new Error(`(UNEXPECTED) failed to create comment? (E: 6d668f4e55198e654324622eabaac922)`); }
            await this.ibgibsSvc.registerNewIbGib({ ibGib: commentIbGib });

            await this.rel8ToContextIbGib({ ibGibToRel8: commentIbGib, contextIbGib, rel8nNames: ['comment'] });
            await this.rel8To({
                ibGibs: [commentIbGib],
                rel8nName: ROBBOT_MY_COMMENTS_REL8N_NAME,
            });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * used to identify when comments are made by these robbots.
     *
     * atow this is `robbot_${this.data.classname}_${this.data.name}_${this.data.uuid.slice(0, 8)}`;
     *
     * @returns addlmetadata string to be used in comment ib's
     */
    protected getAddlMetadata(): string {
        const lc = `${this.lc}[${this.getAddlMetadata.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 7800732facf3783943fdf1b2423b0c22)`); }
            const classnameIsh = this.data.classname.replace(/[_]/mg, '');
            const robbotNameIsh = this.data.name.slice(0, 8).replace(/[__]/mg, '');
            const robbotIdIsh = this.data.uuid.slice(0, 8);
            const addlMetadataText = `robbot_${classnameIsh}_${robbotNameIsh}_${robbotIdIsh}`;
            if (logalot) { console.log(`${lc} addlMetadataText: ${addlMetadataText} (I: 53c0044671dc99fb75635367d2e63c22)`); }
            return addlMetadataText;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected parseAddlMetadataString({ ib }: { ib: Ib }): {
        robbotClassnameIsh: string;
        robbotNameIsh: string;
        robbotIdIsh: string;
    } {
        const lc = `${this.lc}[${this.parseAddlMetadataString.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d0cf162bc5f4cbf65bf1f7e29e3bd922)`); }
            const { safeIbCommentMetadataText } = parseCommentIb({ ib });
            const [_, robbotClassnameIsh, robbotNameIsh, robbotIdIsh] = safeIbCommentMetadataText.split('__');
            return { robbotClassnameIsh, robbotNameIsh, robbotIdIsh };
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * by default in base class, this compares exactly the metadata string in a comment
     * with this robbot.getaddlmetadata result.
     */
    protected isMyComment({ ibGib }: { ibGib: IbGib_V1 }): boolean {
        const lc = `${this.lc}[${this.isMyComment.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 18fc0c7132e2b5297a9c00df7f79e622)`); }
            const { safeIbCommentMetadataText } = parseCommentIb({ ib: ibGib.ib });
            const isMine = safeIbCommentMetadataText === this.getAddlMetadata();
            if (logalot) { console.log(`${lc} metadata (${safeIbCommentMetadataText ?? 'undefined'}) isMine: ${isMine} (I: 1915fc7fd20e0ee8a2f8b554741b6622)`); }
            return isMine;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * gets ibgibs to which this robbot is directly rel8d WRT rel8nNames.
     *
     * @returns map of rel8nName -> ibgibs that this robbot is related to.
     */
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

            // todo: adjust to use the cacheIbGibs (not get them if already have in cache, but still return them in this fn's result)
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

    /**
     * helper function to wrap text in outputPrefix/Suffix
     *
     * @returns wrapped text, depending on param values.
     */
    protected async getOutputText({
        text,
        skipPrefix,
        skipSuffix,
        prefixOverride,
        suffixOverride,
    }: {
        text: string,
        skipPrefix?: boolean,
        skipSuffix?: boolean,
        prefixOverride?: string,
        suffixOverride?: string,
    }): Promise<string> {
        const lc = `${this.lc}[${this.getOutputText.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 7107ae1bcbee485e96123ea1733cc191)`); }
            if (!text) {
                console.error(`${lc} text required. (E: e1f5716c2a5744b5b5ca22dee6af8a85)`);
                text = 'urmm, something went awry...the text is empty at this point.';
            }

            let resText = skipPrefix || !this.data.outputPrefix ? text : `${prefixOverride ?? this.data.outputPrefix}\n\n${text}`;
            if (!skipSuffix && this.data.outputSuffix) {
                resText += `\n\n${suffixOverride ?? this.data.outputSuffix}`;
            }

            return resText;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * By default, this rel8s to the given ibgibs via this.data.defaultRel8nName
     */
    protected async lookAt({
        ibGibs
    }: {
        ibGibs: IbGib_V1[]
    }): Promise<void> {
        const lc = `${this.lc}[${this.lookAt.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: ea0e0ed92756ca339b8c03b700599722)`); }
            await this.rel8To({ ibGibs });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }

    }

    /**
     * I originally created this just to extract the context from the arg, but
     * I'm reusing it to get the latest context from the addr alone.
     */
    protected async getContextIbGibFromArgOrAddr({
        arg,
        addr,
        latest,
    }: {
        arg?: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
        addr?: IbGibAddr,
        /**
         * if true, after extracting the context from the arg, will get the
         * latest ibgib (if there is a newer version).
         */
        latest?: boolean,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.getContextIbGibFromArgOrAddr.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c13f7cb92133984048f606075efb8a22)`); }
            let contextIbGib: IbGib_V1;
            if (!arg && !addr) { throw new Error(`either arg or addr required. (E: 3f647b65742242fd9ba878521acf7c22)`); }
            if (arg) {
                if ((arg.ibGibs ?? []).length === 0) { throw new Error(`(UNEXPECTED) invalid arg? no context ibgib on arg (E: 89997eb4bdeb3885bee9de5d33ee0f22)`); }
                if ((arg.ibGibs ?? []).length !== 1) { throw new Error(`(UNEXPECTED) invalid arg? only expected one ibgib on arg.ibGibs (E: 1a1498af668740fe9439f4953a74ea8a)`); }
                contextIbGib = arg.ibGibs[0];
            } else {
                // addr provided
                const resGet = await this.ibgibsSvc.get({ addr });
                if (!resGet.success || resGet.ibGibs?.length !== 1) { throw new Error(`could not get context addr (${addr}) (E: 834492313512a45b23a7bebacdc48122)`); }
                contextIbGib = resGet.ibGibs[0];
            }

            if (latest) {
                const resLatestAddr = await this.ibgibsSvc.getLatestAddr({ ibGib: contextIbGib });
                if (resLatestAddr !== h.getIbGibAddr({ ibGib: contextIbGib })) {
                    const resGet = await this.ibgibsSvc.get({ addr: resLatestAddr });
                    if (resGet.success && resGet.ibGibs?.length === 1) {
                        contextIbGib = resGet.ibGibs[0];
                    } else {
                        throw new Error(`unable to get resLatestAddr (${resLatestAddr}) (E: ce1e1297743e9a16c8f082321e52a122)`);
                    }
                }
            }
            return contextIbGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * The context is the ibgib where we are interacting with the user(s) (only
     * singlular atow).
     *
     * When we initialize, we are setting state on this robbot as well as subscribing
     * to the context ibgib's updates in `this.ibgibsSvc`.
     *
     * if we already have a context, then this will check the new incoming
     * context against it.  If it's the same timeline, then this won't do
     * anything. Otherwise, it will finalize the previous context.
     */
    protected async initializeContext({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<void> {
        const lc = `${this.lc}[${this.initializeContext.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d93429c85b0a494388f66fba3eece922)`); }

            // get context from arg just to compare the tjp's so we don't need
            // the latest at this point
            const incomingContext_NotLatest = await this.getContextIbGibFromArgOrAddr({ arg, latest: false });
            if (this._currentWorkingContextIbGib) {
                let currentTjpAddr = getTjpAddr({ ibGib: this._currentWorkingContextIbGib });
                const incomingTjpAddr = getTjpAddr({ ibGib: incomingContext_NotLatest })
                if (currentTjpAddr === incomingTjpAddr) {
                    console.warn(`${lc} initializing context but it's the same timeline (${currentTjpAddr}). (W: 7609f8f51172443183e0c93ad52bfe56)`);
                    return;
                } else {
                    await this.finalizeContext({ arg });
                }
            }

            /** used both now and when context ibgib is updated via observable */
            const updatePriorChildren = () => {
                this._currentWorkingContextIbGib_PriorChildrenAddrs = [
                    ...this._currentWorkingContextIbGib?.rel8ns?.comment ?? [],
                    ...this._currentWorkingContextIbGib?.rel8ns?.pic ?? [],
                    ...this._currentWorkingContextIbGib?.rel8ns?.link ?? [],
                ];
            };

            // set the props
            this._currentWorkingContextIbGib = await this.getContextIbGibFromArgOrAddr({ arg, latest: true });
            updatePriorChildren();

            // subscribe to context ibgib updates
            const contextTjpAddr = getTjpAddr({ ibGib: this._currentWorkingContextIbGib });
            this._contextChangesSubscription =
                this.ibgibsSvc.latestObs.pipe(filter(x => x.tjpAddr === contextTjpAddr)).subscribe(async update => {
                    const currentAddr = h.getIbGibAddr({ ibGib: this._currentWorkingContextIbGib });
                    if (update.latestAddr !== currentAddr) {
                        if (logalot) { console.warn(`${lc} checking if new context is actually new...damn getLatestAddr maybe not working in ionic space... argh (W: 3d1a12154dfafb9c96d07e6f75f7a322)`); }
                        if (update.latestIbGib) {
                            let latestN_Supposedly = update.latestIbGib.data?.n ?? -1;
                            let currentN = this._currentWorkingContextIbGib?.data?.n ?? -2;
                            if (latestN_Supposedly <= currentN) {
                                console.warn(`${lc} latestN is not really the latest. latestN_Supposedly: ${latestN_Supposedly}, currentN: ${currentN} (W: 6792c9a596c44c03b262614ae79a715e)`)
                                return; /* <<<< returns early */
                            }
                        }
                        if (logalot) { console.log(`${lc} update to context.\ncurrentAddr: ${currentAddr}\nlatestAddr: ${update.latestAddr} (I: d0adcc392e6e974c9917730ebad51322)`); }
                        this._currentWorkingContextIbGib =
                            update.latestIbGib ??
                            await this.getContextIbGibFromArgOrAddr({ addr: update.latestAddr, latest: false }); // already latest
                        if (!this._updatingContext) {
                            await this.handleContextUpdate({ update });
                            updatePriorChildren();
                        } else {
                            if (logalot) { console.log(`${lc} already updating context (I: f856f9414627ab00418dccd285b55822)`); }
                        }
                    }
                });

            // rel8 to the context (conversation)
            await this.rel8To({
                ibGibs: [this._currentWorkingContextIbGib],
                rel8nName: ROBBOT_CONTEXT_REL8N_NAME,
            });

            // subscribe to receive updates to the context so we can participate
            // in the conversation (i.e. interpret incoming ibgibs like commands
            // if needed)
            // let gibInfo = getGibInfo({ gib: this._currentWorkingContextIbGib.gib });
            // if (gibInfo.tjpGib) {
            //     this.ibgibsSvc.latestObs
            //         .subscribe(update => {
            //             if (!update.tjpAddr) { return; /* <<<< returns early */ }
            //             if (h.getIbAndGib({ ibGibAddr: update.tjpAddr }).gib !== gibInfo.tjpGib) { return; /* <<<< returns early */ }
            //             if (update.latestAddr === h.getIbGibAddr({ ibGib: this._currentWorkingContextIbGib })) {
            //                 if (logalot) { console.log(`${lc} already have that context... (I: a6e17ec40d620f0bd5b231db39eaa522)`); }
            //                 return; /* <<<< returns early */
            //             }
            //             if (this._updatingContext) {
            //                 if (logalot) { console.log(`${lc} already updating context (I: f856f9414627ab00418dccd285b55822)`); }
            //                 return; /* <<<< returns early */
            //             }
            //             this.handleContextUpdate({ update });
            //         });
            // }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async finalizeContext({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<void> {
        const lc = `${this.lc}[${this.finalizeContext.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: dd53dfc745864dd19fde5f209ceb82c8)`); }


            let tries = 0;
            const maxTries = 100;
            while (this._updatingContext && tries < maxTries) {
                await h.delay(100);
                tries++;
                if (tries % 10 === 0) {
                    console.log(`${lc} already updating context and taking a litle while... waiting still. tries: ${tries}/${maxTries} (I: d45ab59af9ea43518432e34ddad95c19)`)
                }
            }
            if (this._updatingContext) {
                console.error(`${lc} previous call to updatingContext took too long. Ignoring flag and finalizing context. (E: 9a2dc4e1923442fa90fbeae72f358acd)`);
            }

            this._updatingContext = true;
            if (this._contextChangesSubscription) {
                this._contextChangesSubscription.unsubscribe();
                delete this._contextChangesSubscription;
            }
            delete this._currentWorkingContextIbGib;

            if (this._currentWorkingContextIbGib) {
                await this.createCommentAndRel8ToContextIbGib({
                    text: await this.getOutputText({ text: 'end of line' }),
                    contextIbGib: this._currentWorkingContextIbGib,
                });
                delete this._currentWorkingContextIbGib;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this._updatingContext = false;
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Handles a new ibgib in the current working context.
     *
     * If it originated from the robbot him/herself, then we will ignore it.
     * Otherwise this is interpreted either as a "command" or something to remember.
     *
     * ## notes
     *
     * If the user says something and we're listening (this is triggered), then
     * it should be either interpreted as a "command" or ignored. I put
     * "command" in quotes because the word is a very short-sighted
     * understanding of the conversational aspect. Or perhaps I speak to the
     * connotations to current belief's regarding robbots and commands.
     *
     * This is complicated by the possibility in the future of multiple robbots
     * being engaged in a conversation within the same context.
     */
    private async handleContextUpdate({ update }: { update: IbGibTimelineUpdateInfo }): Promise<void> {
        const lc = `${this.lc}[${this.handleContextUpdate.name}]`;
        // I don't see this as really being very likely in the near future,
        // but putting in a wait delay in case there are multiple updates
        while (this._updatingContext) {
            console.warn(`${lc} already updating context? delaying... (W: 19d2ebeaaf2340fb91a7d6c717e9cb41)`);
            await h.delay(1000);
        }
        this._updatingContext = true;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 3eeaa40cad49094f125f9f5cd6ff6e22)`); }

            // if it's caused by this robbot speaking, then we don't really need
            // it. but if it's from the user, then we want to respond.
            if (logalot) {
                console.log(`${lc} update: (I: ad0abae7de472e3b4d3891ea0b937322)`);
                console.table(update);
            }
            if (!update.latestIbGib) {
                debugger;
                throw new Error(`(UNEXPECTED) update.latestIbGib falsy? (E: e18a048d7e95757238396ddd84748f22)`);
            }

            const newContext = update.latestIbGib;
            const newChildrenIbGibs = await this.getNewChildrenIbGibs({ newContext });
            // should normally be just one (would be very edge casey if not atow)
            let newChild: IbGib_V1;
            if (newChildrenIbGibs.length === 1) {
                newChild = newChildrenIbGibs[0];
            } else if (newChildrenIbGibs.length > 1) {
                console.warn(`${lc} (UNEXPECTED) found multiple new children in conversation? Using only the last. (W: 02d82a8f755f418d95fa30f0f52ad58e)`);
                newChild = newChildrenIbGibs[newChildrenIbGibs.length - 1];
            } else {
                // no new children, so maybe the user deleted something or who knows.
                if (logalot) { console.log(`${lc} no new children in context update. returning early... (I: 31397b04965351ab29bb3f78cb709122)`); }
                return; /* <<<< returns early */
            }

            // we have a new chidl inthe context.
            await this.handleNewContextChild({ newChild });

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this._updatingContext = false;
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async getNewChildrenIbGibs({ newContext }: { newContext: IbGib_V1 }): Promise<IbGib_V1[]> {
        const lc = `${this.lc}[${this.getNewChildrenIbGibs.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 1b3d1cf908489087fa3b281f55b9a522)`); }
            // get a diff of the new addrs vs. the old addrs.
            /** all of the children addrs of the new context */
            const newContextChildrenAddrs = [
                ...newContext.rel8ns?.comment ?? [],
                ...newContext.rel8ns?.pic ?? [],
                ...newContext.rel8ns?.link ?? [],
            ];
            /** just the new addrs from the context  */
            const newChildrenAddrs = newContextChildrenAddrs.filter(x =>
                !this._currentWorkingContextIbGib_PriorChildrenAddrs.includes(x)
            );
            if (newChildrenAddrs.length === 0) {
                // no new children
                if (logalot) { console.log(`${lc} no new children addrs in newContext. returning early... (I: 8f9c3658c194c472cb1e2bc19d847b22)`); }
                return []; /* <<<< returns early */
            }

            // get the latest addrs for those children
            const space = await this.ibgibsSvc.getLocalUserSpace({});
            const resLatestAddrs = await getLatestAddrs({ addrs: newChildrenAddrs, space, });
            const latestAddrs = Object.values(resLatestAddrs?.data?.latestAddrsMap ?? {});
            if (!resLatestAddrs?.data?.success || latestAddrs.length !== newChildrenAddrs.length) { throw new Error(`could not get latest addrs. (E: 2e1619e7e2e166696fe8ff78cb02cc22)`); }

            // get the addrs' corresponding ibgibs
            const resGet = await this.ibgibsSvc.get({ addrs: latestAddrs });
            if (!resGet.success || resGet.ibGibs?.length !== newChildrenAddrs.length) {
                throw new Error(`failed to get newChildren with addrs: ${newChildrenAddrs.join('|')}. Error: ${resGet.errorMsg ?? 'unknown error 5737bd0996d5445b8bd80975bedc0d57'} (E: 05722e11350ec6ffffdb5c7d0caa2922)`);
            }

            return resGet.ibGibs;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async handleNewContextChild({ newChild }: { newChild: IbGib_V1 }): Promise<void> {
        const lc = `${this.lc}[${this.handleNewContextChild.name}]`;
        try {
            throw new Error(`not implemented in base class (E: 833038a17d04e38b9b97be19ed010922)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected async getRobbotInteractionData({
        type,
        commentText,
        details,
        uuid,
        timestamp,
    }: {
        /**
         * the tyep of interaction.
         *
         * @see {@link RobbotInteractionType}
         */
        type: RobbotInteractionType,
        /**
         * the comment text of the interaction.
         *
         * Does not include any prefix/suffix of the robbot.
         */
        commentText: string,
        /**
         * interaction details.
         */
        details?: any,
        /**
         * If provided, will be the id of the interaction.
         */
        uuid?: string,
        /**
         * if provided, will be the timestamp of the interaction data.
         */
        timestamp?: string,
    }): Promise<RobbotInteractionData_V1> {
        const lc = `${this.lc}[${this.getRobbotInteractionData.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: b05837a91c6973326fde8cf51aac1922)`); }

            if (!type) { throw new Error(`type required (E: 737f8ecc21c519d1d61bce2a91fe2d22)`); }
            if (!this._currentWorkingContextIbGib?.gib) { throw new Error(`this._currentWorkingContextIbGib?.gib is falsy (E: 6489a36ab0c797f1b5d52db709ea0322)`); }

            uuid = uuid || await h.getUUID();
            timestamp = timestamp || h.getTimestamp();

            let contextTjpGib: Gib = getGibInfo({ gib: this._currentWorkingContextIbGib.gib }).tjpGib;
            if (!contextTjpGib) {
                contextTjpGib = this._currentWorkingContextIbGib.gib;
                if (!contextTjpGib) { throw new Error(`(UNEXPECTED) this._currentWorkingContextIbGib.gib falsy?  (E: 50cddb787f1a0af19567531b30bd5522)`); }
                console.warn(`${lc} contextTjpGib is falsy? This means that the robbot context does not have a timeline. This might be ok, but not expected. contextTjp will be considered the gib of the context (${contextTjpGib}) (W: f2a6f91ef5e44170a5e3d5456f2fb2f2)`);
            }

            const data: RobbotInteractionData_V1 = {
                uuid,
                timestamp,
                type,
                contextTjpGib,
                commentText,
            };

            if (details) { data.details = details; }

            return data;
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
