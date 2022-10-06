import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

import * as h from 'ts-gib/dist/helper';
import {
    IbGib_V1, ROOT, Factory_V1 as factory, Rel8n,
    IbGibRel8ns_V1, isPrimitive, IbGibData_V1,
} from 'ts-gib/dist/V1';
import { Gib, Ib, IbGibAddr, TransformResult } from 'ts-gib';
import { getGib, getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../../constants';
import { RobbotBase_V1 } from './robbot-base-v1';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
    RobbotCmdData, RobbotCmdIbGib, RobbotCmdRel8ns, RobbotCmd, SemanticId, DEFAULT_ROBBOT_LEX_DATA, RobbotPropsData,
} from '../../types/robbot';
import { DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { getIdPool, getTimestampInTicks, pickRandom, unique } from '../../helper/utils';
import { WitnessFormBuilder } from '../../helper/witness';
import { getRobbotIb, isRequestComment, RobbotFormBuilder } from '../../helper/robbot';
import { DynamicFormBuilder } from '../../helper/form';
import { getGraphProjection, GetGraphResult } from '../../helper/graph';
import { CommentIbGib_V1 } from '../../types/comment';
import { getFromSpace, getLatestAddrs } from '../../helper/space';
import { AppSpaceData, AppSpaceRel8ns } from '../../types/app';
import { IonicSpace_V1 } from '../spaces/ionic-space-v1';
import { IbGibSpaceAny } from '../spaces/space-base-v1';
import { IbGibTimelineUpdateInfo } from '../../types/ux';
import { Lex, LexData, LexLineConcat } from '../../helper/lex';
import { getTjpAddr } from '../../helper/ibgib';
import { isComment } from '../../helper/comment';


const logalot = c.GLOBAL_LOG_A_LOT || true;

export interface WordyUniqueWordInfo {
    /**
     * total number of times the text contains the word.
     */
    totalIncidence: number;
    /**
     * number of lines in all of the text that contain the word.
     *
     * ## notes
     *
     * Yeah, I'm not doing the sentence thing because it's a tedious thing to
     * get the regexp correct in that case.
     */
    lineIncidence: number;
    /**
     * number of paragraphs in all of the corpus that contain the word.
     */
    paragraphIncidence: number;
    /**
     * number of source ibgibs that contain the word.
     */
    srcIncidence: number;
}
/**
 * in the future, we will extract text from pics or other sources, but for now
 * this will primarily be from comments or aggregate.
 */
export type WordyTextSourceType = 'agg' | 'comment' | 'pic' | 'other';
/**
 * breakdown info of an individual text source (atow a comment ibgib).
 */
export interface WordyTextInfo {
    srcIbGib?: IbGib_V1;
    srcAddr?: IbGibAddr;
    srcType?: WordyTextSourceType;
    /**
     * for comment ibgibs, this is comment.data.text.
     */
    text: string;
    /**
     * copy of text but broken out into paragraphs.
     */
    paragraphs: string[];
    /**
     * copy of text but broken out into lines.
     */
    lines: string[];
    /**
     * breakdown infos of unique words in text
     */
    wordInfos: { [word: string]: WordyUniqueWordInfo };
    /**
     * approximate count of non-unique words in the text.
     */
    wordCount: number;
}

export const ROBBOT_SESSION_ATOM = 'robbot_session';

export interface WordyRobbotSessionData_V1 extends IbGibData_V1 {
    timestamp: string;
    /**
     * Soft link to the context address where the session takes place.
     */
    '@context': IbGibAddr;
    /**
     * Soft link to the context's tjp address where the session takes place.
     */
    '@contextTjp': IbGibAddr;
}
export interface WordyRobbotSessionRel8ns_V1 extends IbGibRel8ns_V1 {
    interaction?: IbGibAddr[];
}
export interface WordyRobbotSessionIbGib_V1 extends IbGib_V1<WordyRobbotSessionData_V1, WordyRobbotSessionRel8ns_V1> { }


export type WordyInteractionType = 'line_blank';
export interface WordyInteraction {
    interactionType: WordyInteractionType;
}
export interface WordyInteraction_LineBlank extends WordyInteraction {
    lineNumBlanked: number;
}

/**
 * There are various ways to stimulate an ibgib.
 */
export type StimulationType = 'just_show' | 'blank_word' | 'next_line' | 'demand_expand';
export const StimulationType = {
    /**
     * The user is just shown the source ibgib raw.
     */
    'just_show': 'just_show' as StimulationType,
    /**
     * The user is shown a source comment text/line/paragraph with a single
     * blanked out word.  The user must type in the blanked out word.
     */
    'blank_word': 'blank_word' as StimulationType,
    /**
     * The user is shown one or more lines and a blank. the user must type in
     * the line.
     */
    'next_line': 'next_line' as StimulationType,
    /**
     * the user has to say something that will be added to the target ibgib.
     * if the user says "skip" or "no" or "no thanks", etc., then it will be
     * skipped.
     */
    'demand_expand': 'demand_expand' as StimulationType,
}

export interface WordyRobbotInteractionData_V1 {
    timestamp: string;
    /**
     * Soft link to the source address of the ibgib being stimulated.
     */
    '@stimulated': IbGibAddr;
    /**
     * Soft link to the source's tjp address of the ibgib being stimulated.
     */
    '@stimluatedTjp': IbGibAddr;
    /**
     * type of stimulation, like is it a fill in the blank or just showing the
     * ibgib.
     */
    type: StimulationType;
}
export interface WordyRobbotInteractionRel8ns_V1 extends IbGibRel8ns_V1 {
}
export interface WordyRobbotInteractionIbGib_V1
    extends IbGib_V1<WordyRobbotInteractionData_V1, WordyRobbotInteractionRel8ns_V1> { }

export interface WordyRobbotAnalysisData_V1 {
    timestamp: string;
    textInfos: WordyTextInfo[];
    aggInfo: WordyTextInfo;
}
export interface WordyRobbotAnalysisRel8ns_V1 extends IbGibRel8ns_V1 { }
export interface WordyRobbotAnalysisIbGib_V1 extends IbGib_V1<WordyRobbotAnalysisData_V1, WordyRobbotAnalysisRel8ns_V1> { }

export const DEFAULT_UUID_WORDY_ROBBOT = undefined;
export const DEFAULT_NAME_WORDY_ROBBOT = 'Wordsworthers';
export const DEFAULT_DESCRIPTION_WORDY_ROBBOT =
    `A wordy robbot does wordy stuff like taking text and scrambling pieces or creating fill-in-the-blanks.`;
export const DEFAULT_SEARCH_REL8N_NAMES_WORDY_ROBBOT = [
    'pic', 'comment', 'link',
    'result', 'import',
    'tagged',
    c.TAGGED_REL8N_NAME,
    c.DEFAULT_ROOT_REL8N_NAME,
].join(',');
export const WORDY_V1_ANALYSIS_REL8N_NAME = 'analysis';


export type WordyChatId = SemanticId;
export const WordyChatId = {
    yes: 'yes' as WordyChatId,
    no: 'no' as WordyChatId,
    cancel: 'cancel' as WordyChatId,
}


export interface WordyRobbotData_V1 extends RobbotData_V1 {
    /**
     * comma-delimited string of rel8n names.
     *
     * These are the rel8n names that the robbot can search through its own
     * ibgibs that it has seen. I'm sure that's worded poorly, so...
     *
     * For example, when you look at a comment ibgib, that ibgib may
     * have other ibgibs "inside" (rel8d) to it via various rel8n names.
     * If you want to search for comments within comments, then include
     * the 'comment' rel8n name. If you want to search for pics also,
     * include 'pic' rel8n name.
     *
     * @see {@link WordyRobbot_V1.getAllIbGibsWeCanLookAt}
     */
    lookRel8nNames: string;
}

export interface WordyRobbotRel8ns_V1 extends RobbotRel8ns_V1 {
    analysis?: IbGibAddr[];
}

/**
 *
 */
export class WordyRobbot_V1 extends RobbotBase_V1<
    // in
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // out
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // this
    WordyRobbotData_V1, WordyRobbotRel8ns_V1
> {
    protected lc: string = `[${WordyRobbot_V1.name}]`;

    private _analysis: WordyRobbotAnalysisIbGib_V1;

    private _currentWorkingContextIbGib: IbGib_V1;
    /**
     * when we get an update to the context, we want to know what the _new_
     * children are in order to interpret comments from the user that may be
     * directed at us.
     *
     * So we will get an initial snapshot of children that we will diff against.
     * We could go via the dna, but ultimately a diff is what is needed.
     */
    protected _currentWorkingContextIbGib_PriorChildrenAddrs: IbGibAddr[] = [];

    private _currentWorkingLookProjection: GetGraphResult;
    private _currentWorkingCommentIbGibs: CommentIbGib_V1[];
    private _currentWorkingComment: CommentIbGib_V1;
    private _currentWorkingCommentInteractions: WordyInteraction[];

    private _subLatestContext: Subscription;
    private _updatingContext: boolean;


    /**
     * If this robbot has asked a question, then this will be the text asked.
     *
     * So if a new ibgib comes to the context, and that ibgib is our asked text, then we're
     * not going to worry about it because we're going to assume it came from us.
     * (There are lots of ways to do this...)
     *
     * If we asked a question and a
     */
    private _askedText: string;
    /**
     * If a new context update comes down the pipeline and we confirm it's equal to our
     * `_askedText`, then we know that our question has been posted.
     */
    private _askedTextPosted: boolean;
    private _expectedResponses: string;

    private _robbotLex: Lex<RobbotPropsData> = new Lex<RobbotPropsData>(DEFAULT_ROBBOT_LEX_DATA, {});

    // protected contextChild$: Subject<IbGib_V1> = new Subject

    constructor(initialData?: WordyRobbotData_V1, initialRel8ns?: WordyRobbotRel8ns_V1) {
        super(initialData, initialRel8ns);
        const lc = `${this.lc}[ctor]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            this.initialize();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Initializes to default space values.
     */
    protected initialize(): void {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!this.data) { this.data = h.clone(DEFAULT_WORDY_ROBBOT_DATA_V1); }
            if (!this.rel8ns && DEFAULT_WORDY_ROBBOT_REL8NS_V1) {
                this.rel8ns = h.clone(DEFAULT_WORDY_ROBBOT_REL8NS_V1);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async doDefault({
        ibGib,
    }: {
        ibGib: IbGib_V1,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doDefault.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            await this.rel8To({ ibGibs: [ibGib] });
            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * In this robbot, the ib command looks at given ibGib(s) and remembers
     * it/them (i.e. the robbot rel8s the ibgibs to itself).
     *
     * @returns ROOT if successful, else throws
     */
    protected async doCmdIb({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdIb.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            await this.lookAt({ ibGibs: arg.ibGibs })

            return ROOT;
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

    private async initializeCurrentWorkingComment(): Promise<void> {
        const lc = `${this.lc}[${this.initializeCurrentWorkingComment.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c3a5aadc40ebcb63da6adbe67dca3a22)`); }

            delete this._currentWorkingLookProjection;
            delete this._currentWorkingCommentIbGibs;
            delete this._currentWorkingComment;

            const space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });

            if (!this._currentWorkingLookProjection) {
                this._currentWorkingLookProjection = await this.getAllIbGibsWeCanLookAt({ space });
            }
            if (!this._currentWorkingLookProjection) { throw new Error(`(UNEXPECTED) unable to get current working look projection? (E: ef1d13fdc201ceb612f7339578c65622)`); }

            if (!this._currentWorkingCommentIbGibs) {
                this._currentWorkingCommentIbGibs = await this.getCommentIbGibs({
                    lookProjection: this._currentWorkingLookProjection
                });
            }
            if (!this._currentWorkingCommentIbGibs) { throw new Error(`(UNEXPECTED) unable to get current working comment ibgibs? (E: 474bc448ee974f0cb17d85a225d63191)`); }

            if (!this._currentWorkingComment) {
                this._currentWorkingComment = pickRandom({ x: this._currentWorkingCommentIbGibs });
                if (logalot) { console.log(`${lc} just set current working comment. addr: ${h.getIbGibAddr({ ibGib: this._currentWorkingComment })} (I: 78a694ba366f1c3871710dbfd9b75122)`); }
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
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

            // if it's not a comment, then we're just going to look at it/remember it,
            // i.e. add it to our rel8d ibgibs. if it IS a comment, then we need to
            // handle it depending on what our state is. Usually it's either a request for
            // us or an answer/response to something we've done.
            if (isRequestComment({ ibGib: newChild, requestEscapeString: this.data.requestEscapeString })) {
                await this.handleRequestIbGib({ ibGib: newChild });
            } else {
                // remember it for future. ()
                await this.lookAt({ ibGibs: [newChild] });
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this._updatingContext = false;
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async handleRequestIbGib({ ibGib }: { ibGib: IbGib_V1 }): Promise<void> {
        const lc = `${this.lc}[${this.handleRequestIbGib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e594c9c637a8be26a669fefd5800d322)`); }
            throw new Error(`not impl (E: c9ac49b454b16b790c9b9f0ac33ec522)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
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

    /**
     * Start speaking...
     *
     * Using our analysis, provide a comment based on what we've said in the past.
     *
     * ## notes
     *
     * there are many possibilities for this.
     *
     * * show individual words
     * * show individual words and a random neighbor of that word
     * * show some % of common words vs % uncommon words within texts
     *   * "common" WRT individual ibgib texts or aggregate corpus
     * * show phrases with blanked out words
     * * show words with blanked out letters
     * * show paragraphs with blanked out lines
     *
     * * show based on a fixed time schedule
     * * show % review vs already shown
     * * somehow hook up NN (just listing here for sngs)
     * * hard code strategy in robbot
     * * configurable strategy but robbot-pervasive
     * * configurable at time of review/speaking.
     *
     * ### cases
     *
     * * comments
     *   * word/phrase/song/poem in english/foreign language
     *   * meaning/translation in same comment
     *   * meaning/translation in subcomment
     *   * word/phrase/song/poem meaning/reverse translation in parent comment
     * * link to url (non-comment link ibgib)
     *
     *
     * ### simplified first run
     *
     * 1. choose a source ibgib
     *   a. keep track of source ibgibs
     *   b. keep track of interpreted metadata per source ibgib
     *   c. choose based on interpreted data and settings of robbot.
     * 2. stimulate ibgib connection
     *   a. choose strategy based on source ibgib and its metadata
     * 3. listen for response
     *   a. if user "spoke", interpret based on state
     *   b. handle if robbot spoke
     * 4. repeat #2 or end conversation with summary
     *
     * @returns ROOT if all goes well, otherwise throws an error.
     */
    protected async doCmdGib({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdGib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 5d820b45337bf51c8d0f3daa3013ae22)`); }

            await this.completeSessionIfNeeded({ sayBye: true });
            await this.closeCurrentWorkingContextIfNeeded();
            await this.initializeContext({ arg });
            await this.startSession();
            await this.initializeCurrentWorkingComment();



            const textInfo = this.getTextInfo({ srcIbGib: this._currentWorkingComment });

            if (textInfo.lines.length === 1) {
                // just a single line comment, do a fill-in-the-blank for now and clear the current ibgib.
                let words = textInfo.text
                    .split(/\b/) // split into words
                    .map(x => x.trim()) // trim those that are just blank spaces
                    .filter(x => x.length > 2)
                    ; // filter out those blank space trimmed, now-empty strings
                if (words.length > 0) {
                    // we have a decent enough word
                    let aWord = pickRandom({ x: words });
                    let textWithBlank = textInfo.text.replace(aWord, '______');
                    await this.createCommentAndRel8ToContextIbGib({ text: textWithBlank, contextIbGib: this._currentWorkingContextIbGib });
                } else {
                    // only short words or just empty space
                }

                // since it's just a one liner, we're done working this particular comment.
                debugger;
                delete this._currentWorkingComment;
            } else if (textInfo.paragraphs.length === 1) {
                // multiple lines, single paragraph
            } else {
                // multiple lines & paragraphs
            }

            return ROOT;

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }

    }

    protected async initializeContext({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<void> {
        const lc = `${this.lc}[${this.initializeContext.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d93429c85b0a494388f66fba3eece922)`); }

            debugger;
            this._currentWorkingContextIbGib = await this.getContextIbGibFromArg({ arg, latest: true });
            this._currentWorkingContextIbGib_PriorChildrenAddrs = [
                ...this._currentWorkingContextIbGib?.rel8ns?.comment ?? [],
                ...this._currentWorkingContextIbGib?.rel8ns?.pic ?? [],
                ...this._currentWorkingContextIbGib?.rel8ns?.link ?? [],
            ];

            // subscribe to receive updates to the context so we can participate
            // in the conversation (i.e. interpret incoming ibgibs like commands
            // if needed)
            let gibInfo = getGibInfo({ gib: this._currentWorkingContextIbGib.gib });
            if (gibInfo.tjpGib) {
                this.ibgibsSvc.latestObs
                    .subscribe(update => {
                        if (!update.tjpAddr) { return; /* <<<< returns early */ }
                        if (h.getIbAndGib({ ibGibAddr: update.tjpAddr }).gib !== gibInfo.tjpGib) { return; /* <<<< returns early */ }
                        if (update.latestAddr === h.getIbGibAddr({ ibGib: this._currentWorkingContextIbGib })) {
                            if (logalot) { console.log(`${lc} already have that context... (I: a6e17ec40d620f0bd5b231db39eaa522)`); }
                            return; /* <<<< returns early */
                        }
                        if (this._updatingContext) {
                            if (logalot) { console.log(`${lc} already updating context (I: f856f9414627ab00418dccd285b55822)`); }
                            return; /* <<<< returns early */
                        }
                        debugger;
                        this.handleContextUpdate({ update });
                    });
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }


    protected async initializeContext_PreexistingChildren(): Promise<void> {
        const lc = `${this.lc}[${this.initializeContext_PreexistingChildren.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 428a267b4da318737a7a832f3fd07c22)`); }
            // this._currentWorkingContextIbGib
            // go through and get the comments/pics/links that the context
            // already has and capture these in a property that we can check
            // against later.
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async closeCurrentWorkingContextIfNeeded(): Promise<void> {
        const lc = `${this.lc}[${this.closeCurrentWorkingContextIfNeeded.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d2b97975687bdc822c4974d153dfde22)`); }
            if (this._subLatestContext) {
                this._subLatestContext.unsubscribe();
                delete this._subLatestContext;
            }
            if (this._currentWorkingContextIbGib) {
                await this.createCommentAndRel8ToContextIbGib({
                    text: 'end of line',
                    contextIbGib: this._currentWorkingContextIbGib,
                });
                delete this._currentWorkingContextIbGib;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async getContextIbGibFromArg({
        arg,
        latest,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
        /**
         * if true, after extracting the context from the arg, will get the
         * latest ibgib (if there is a newer version).
         */
        latest?: boolean,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.getContextIbGibFromArg.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c13f7cb92133984048f606075efb8a22)`); }
            if ((arg.ibGibs ?? []).length === 0) { throw new Error(`(UNEXPECTED) invalid arg? no context ibgib on arg (E: 89997eb4bdeb3885bee9de5d33ee0f22)`); }
            if ((arg.ibGibs ?? []).length !== 1) { throw new Error(`(UNEXPECTED) invalid arg? only expected one ibgib on arg.ibGibs (E: 1a1498af668740fe9439f4953a74ea8a)`); }
            let contextIbGib = arg.ibGibs[0];
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
     * In this robbot, the ibgib command will think (analyze known ibgibs) and
     * prepare what it's going to say next (its future output ibgib(s)).
     *
     * for this, we need
     *   * to create intermediate ibgibs
     *   * track which ibgibs (timelines?) we've analyzed
     *   * track which ibgibs we've chunked
     *   * keep stats
     *     * count internal number of words
     *     * count internal number of unique words
     *     * count internal number of phrases
     *     * ...
     *
     * So we need to analyze, create the stats, reassess, shake things up,...
     * hmm...
     * output the stats and internal state
     */
    protected async doCmdIbgib({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdIbgib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: ae300cb9c18b9014eb9ded1cd5666e22)`); }

            // const space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });

            if (!this._currentWorkingCommentIbGibs) {
                await this.initializeCurrentWorkingComment();
            }

            // at this point, we should have all of the related ibgibs that we
            // care about loaded into this.cacheIbGibs and this.cachedLatestAddrsMap is populated.
            // we should be able to do any analysis on them that we wish.

            const analysisIbGib = await this.getAnalysis({ commentIbGibs: this._currentWorkingCommentIbGibs, saveInSpace: true });
            await this.rel8To({
                ibGibs: [analysisIbGib],
                rel8nName: WORDY_V1_ANALYSIS_REL8N_NAME,
                linked: true, // only keep the most recent analysis
            });
            this._analysis = analysisIbGib;
            const analysisText = await this.getAnalysisText({ analysisIbGib });

            await this.createCommentAndRel8ToContextIbGib({
                text: analysisText,
                contextIbGib: arg.ibGibs[0],
            });

            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    protected cachedLatestAddrsMap: { [addr: string]: string }

    /**
     *
     */
    private async getAnalysis({
        commentIbGibs,
        saveInSpace,
        // space,
    }: {
        commentIbGibs: CommentIbGib_V1[],
        saveInSpace?: boolean;
        // space?: IbGibSpaceAny,
    }): Promise<WordyRobbotAnalysisIbGib_V1> {
        const lc = `${this.lc}[${this.getAnalysis.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 128d07e8fdc1a1d79a1b54dd83caeb22)`); }
            if (!commentIbGibs) { throw new Error(`commentIbGibs required (E: c6a983bf16cfe2e5aa48934499f53322)`); }
            if (commentIbGibs.length === 0) { throw new Error(`${lc} (UNEXPECTED) commentIbGibs.length 0? (E: a433761eed37a831378f654ce8bb4422)`); }
            // if (saveInSpace && !space) { throw new Error(`space required to saveInSpace (E: 5466baf5559bfe582358d0490b4b5422)`); }

            /**
             * text info per individual text extraction from a source (comment ibgibs only atow)
             */
            const textInfos: WordyTextInfo[] = [];

            for (let i = 0; i < commentIbGibs.length; i++) {
                let srcIbGib = commentIbGibs[i];
                let info = this.getTextInfo({ srcIbGib });
                textInfos.push(info);
            }

            // easiest way in code to get most of the info is just combine the text of
            // the sources and get the aggregate info.
            const aggText = textInfos.map(x => x.text).join('\n\n');
            const aggInfo = this.getTextInfo({ srcText: aggText });
            aggInfo.srcType = 'agg';

            // modify corpusInfo.wordInfos to accurately reflect sourceIncidence
            const uniqueWords = Object.keys(aggInfo.wordInfos);
            for (let i = 0; i < uniqueWords.length; i++) {
                const word = uniqueWords[i];
                const srcIncidence = textInfos.filter(x => Object.keys(x.wordInfos).includes(word)).length;
                aggInfo.wordInfos[word].srcIncidence = srcIncidence;
            }

            // don't need dna or any intermediate ibgibs
            // these analyses ibgibs are just snapshots.
            const timestamp = getTimestampInTicks();
            const ib = getRobbotAnalysisIb({ robbot: this, timestamp });
            const data: WordyRobbotAnalysisData_V1 = {
                timestamp,
                textInfos: textInfos.map(x => {
                    // exclude the x.srcIbGib
                    return {
                        srcType: x.srcType, srcAddr: x.srcAddr,
                        text: x.text, paragraphs: x.paragraphs, lines: x.lines,
                        wordInfos: x.wordInfos, wordCount: x.wordCount,
                    };
                }),
                aggInfo,
            }
            const rel8ns: WordyRobbotAnalysisRel8ns_V1 = {
                ancestor: [`robbot_analysis ${this.data.classname}^gib`],
            }

            const analysisIbGib: WordyRobbotAnalysisIbGib_V1 = { ib, data, rel8ns };
            analysisIbGib.gib = await getGib({ ibGib: analysisIbGib, hasTjp: false });

            if (saveInSpace) { await this.ibgibsSvc.put({ ibGib: analysisIbGib }); }

            return analysisIbGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private getTextInfo({
        srcIbGib,
        srcText,
    }: {
        srcIbGib?: CommentIbGib_V1,
        srcText?: string,
    }): WordyTextInfo | null {
        const lc = `${this.lc}[${this.getTextInfo.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 58f636c57127c87d3cbfbeae4e5acb22)`); }

            if (srcIbGib && srcText) { throw new Error(`provide only srcIbGib or srcText (E: df2863d438f90e49a1fa4cb96d2bdc22)`); }

            let srcAddr = srcIbGib ? h.getIbGibAddr({ ibGib: srcIbGib }) : undefined;

            if (srcIbGib) {
                let latestAddr = this.cachedLatestAddrsMap[srcAddr];
                if (!latestAddr) {
                    console.error(`${lc} comment ibgib doesn't have a latestAddr entry? will use the (possibly non-latest) comment ibgib itself (E: a474e5d0d0c4428ca1f01f260820a3fe)`);
                    latestAddr = srcAddr;
                }
                const latestCommentIbGib = this.cacheIbGibs[latestAddr];
                if (!latestCommentIbGib) { throw new Error(`(UNEXPECTED) expected latestCommentIbGib to exist at this point. (E: 369cfa38bd7527f71ea6962c3d037c22)`); }
                srcIbGib = <CommentIbGib_V1>latestCommentIbGib;
                srcAddr = h.getIbGibAddr({ ibGib: srcIbGib });
            }

            const text = srcIbGib ? srcIbGib.data.text : srcText;

            if (!text) {
                console.error(`${lc} text required. either provide srcIbGib or srcText (E: 1958b5ac00c5482ab9b1c059e8d923fb)`);
                return null;
            }

            const paragraphs = text.split(/\n\n+/g).map(x => x.trim());
            const lines = text.trim().split('\n').filter(x => !!x).map(x => x.trim());
            const wordInfos: { [word: string]: WordyUniqueWordInfo } = {};
            const sortedWords = text.match(/\b(\w+)['\-]?(\w+)?\b/g).map(x => x.toLowerCase()).sort();
            const wordCount = sortedWords.length;
            const uniqueWords = unique(sortedWords);
            for (let j = 0; j < uniqueWords.length; j++) {
                const word = uniqueWords[j];
                const wordInfo: WordyUniqueWordInfo = {
                    paragraphIncidence: paragraphs.filter(x => x.toLowerCase().includes(word)).length,
                    lineIncidence: lines.filter(x => x.toLowerCase().includes(word)).length,
                    srcIncidence: 1,
                    totalIncidence: (text.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'gm')) ?? []).length,
                };
                wordInfos[word] = wordInfo;
            }

            const info: WordyTextInfo = {
                srcType: srcIbGib ? 'comment' : undefined,
                srcIbGib, srcAddr,
                text, paragraphs, lines,
                wordInfos, wordCount,
            };

            if (logalot) {
                console.log(`${lc} commentInfo: ${h.pretty(info)} (I: 3a36a4f8650efbd4d42d376e24fd0322)`);
                console.table(info);
            }

            return info;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async getAnalysisText({ analysisIbGib }: { analysisIbGib: WordyRobbotAnalysisIbGib_V1 }): Promise<string> {
        const lc = `${this.lc}[${this.getAnalysisText.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 29368d76e897c905e4c8bcbbe53d2f22)`); }
            const analysisText = h.pretty(analysisIbGib.data);
            return await this.getOutputText({ text: `analysis:\n\n${analysisText}` });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async getCommentIbGibs({
        lookProjection,
    }: {
        lookProjection: GetGraphResult,
    }): Promise<CommentIbGib_V1[]> {
        const lc = `${this.lc}[${this.getCommentIbGibs.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 7c9a3a210d64a292bafc69d3192f6922)`); }

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
        const commentIbGibs = Object.keys(lookProjection)
            .filter(addr => addr.startsWith('comment '))
            .map(addr => <CommentIbGib_V1>lookProjection[addr]);
        const commentAddrs = commentIbGibs.map(ibGib => h.getIbGibAddr({ ibGib }));

        let space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });


        let resGetLatestAddrs = await getLatestAddrs({ ibGibs: commentIbGibs, space });
        const { latestAddrsMap } = resGetLatestAddrs.data;
        this.cachedLatestAddrsMap = {
            ...this.cachedLatestAddrsMap,
            ...latestAddrsMap,
        };
        const latestAddrsToGet: IbGibAddr[] = [];
        for (let i = 0; i < commentAddrs.length; i++) {
            const commentAddr = commentAddrs[i];
            let latestAddr = latestAddrsMap[commentAddr];
            if (!latestAddr) {
                console.warn(`${lc} (UNEXPECTED) commentAddr falsy in latestAddrsMap? (W: 614c8de84f74490cb9780b20a746db5d)`);
                latestAddr = commentAddr;
            }
            if (!this.cacheIbGibs[latestAddr] && !latestAddrsToGet.includes(latestAddr)) {
                latestAddrsToGet.push(latestAddr);
            }
        }
        if (latestAddrsToGet.length > 0) {
            const resGetLatestIbGibs = await getFromSpace({ addrs: latestAddrsToGet, space });
            if (resGetLatestIbGibs.success && resGetLatestIbGibs.ibGibs?.length === latestAddrsToGet.length) {
                for (let i = 0; i < resGetLatestIbGibs.ibGibs.length; i++) {
                    const latestIbGib = resGetLatestIbGibs.ibGibs[i];
                    this.cacheIbGibs[h.getIbGibAddr({ ibGib: latestIbGib })] = latestIbGib;
                }
            } else {
                console.error(`${lc} full result: `);
                console.dir(resGetLatestIbGibs);
                throw new Error(`problem with getting latest ibgibs (E: 9c3ece44132580def2aec55c8da0ae22)`);
            }
        }
        return commentIbGibs;
    }

    /**
     *
     * builds a projection of ibgibs we can look, starting with the ibgibs we
     * immediately look at via user interaction. From those ibgibs as the sources, we then look along
     * their rel8ns via `this.data.lookRel8nNames`.
     *
     * @returns graph of ibgibs we can look at, i.e., a map of ibgibs indexed by their addrs.
     */
    private async getAllIbGibsWeCanLookAt({
        space
    }: {
        space: IonicSpace_V1<AppSpaceData, AppSpaceRel8ns>
    }): Promise<GetGraphResult> {
        const lc = `${this.lc}[${this.getAllIbGibsWeCanLookAt.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 57c97de4c513f5007f0a6e0ec8f35922)`); }
            const rel8dIbGibsMap = await this.getRel8dIbGibs({ rel8nNames: [this.data.defaultRel8nName] });
            const allRel8dIbGibs = Object.values(rel8dIbGibsMap).flatMap(x => x);
            allRel8dIbGibs.forEach(x => { this.cacheIbGibs[h.getIbGibAddr({ ibGib: x })] = x; });

            /**
             * we want to get all of the children of our ibgibs
             */
            const lookProjection = await getGraphProjection({
                ibGibs: allRel8dIbGibs,
                onlyRel8nNames: this.data.lookRel8nNames.split(','),
                space
            });
            Object.values(lookProjection).forEach(x => { this.cacheIbGibs[h.getIbGibAddr({ ibGib: x })] = x; });
            return lookProjection;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async validateWitnessArg(arg: RobbotCmdIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            const errors = await super.validateWitnessArg(arg) ?? [];
            if (!this.ibgibsSvc) {
                errors.push(`this.ibgibsSvc required (E: 5d151df473dd4401ac88931da493db46)`);
            }
            if ((<any>arg.data).cmd) {
                // perform extra validation for cmds
                if ((arg.ibGibs ?? []).length === 0) {
                    errors.push(`ibGibs required. (E: da6b1ba12073401eaae0b66a9acb18f3)`);
                }
            }
            return errors;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async validateThis(): Promise<string[]> {
        const lc = `${this.lc}[${this.validateThis.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            const errors = [
                ...await super.validateThis(),
            ];
            const { data } = this;
            //
            return errors;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected session: WordyRobbotSessionIbGib_V1;
    protected interactions: WordyRobbotInteractionIbGib_V1[];

    protected async startSession(): Promise<void> {
        const lc = `${this.lc}[${this.startSession.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 78762a22d30c12d23ca01465f2d6ce22)`); }

            if (!this._currentWorkingContextIbGib) { throw new Error(`current working context should already be initialized (E: 9163e7cc8cc68d63d7d29954b688f222)`); }

            const contextIbGib = this._currentWorkingContextIbGib;

            const timestamp = getTimestampInTicks();
            const contextTjpAddr = getTjpAddr({ ibGib: contextIbGib });
            const contextTjpGib = h.getIbAndGib({ ibGibAddr: contextTjpAddr }).gib;
            const sessionId = await h.getUUID();

            // build custom ibgib (always remember to calculate the gib!)
            // no dna for sessions, because it doesn't make sense
            let data: WordyRobbotSessionData_V1 = {
                timestamp,
                uuid: sessionId,
                n: 0,
                isTjp: true,
                '@context': h.getIbGibAddr({ ibGib: contextIbGib }),
                '@contextTjp': contextTjpAddr,
            };
            let rel8ns: WordyRobbotSessionRel8ns_V1 = {
                ancestor: [`${ROBBOT_SESSION_ATOM}^gib`],
            }
            let sessionIbGib: WordyRobbotSessionIbGib_V1 = {
                ib: getRobbotSessionIb({ robbot: this, timestamp, contextTjpGib, sessionId }),
                data,
                rel8ns,
            };
            sessionIbGib.gib = await getGib({ ibGib: sessionIbGib, hasTjp: true })

            this.session = sessionIbGib;

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * save the current session if there are any interactions. if not, then warn
     * and just delete it. (there should be interactions unless there were
     * intermediate exceptions thrown)
     *
     * adds to the context
     *
     * this function will delete this.session and this.interactions, even if it throws.
     */
    protected async completeSessionIfNeeded({ sayBye }: { sayBye: boolean }): Promise<void> {
        const lc = `${this.lc}[${this.completeSessionIfNeeded.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c87e977729f64268bcc400934dce64c6)`); }
            if (!this.session) {
                if (logalot) { console.log(`${lc} no session active. returning early... (I: 15e9224f49fabda9da212e123ba3e922)`); }
                if (this.interactions) { throw new Error(`(UNEXPECTED) this.session falsy but this.interactions truthy? (E: cfd11408e779b3797fb8519b267a8522)`); }
                return; /* <<<< returns early */
            }

            if ((this.interactions ?? []).length === 0) {
                if (logalot) { console.log(`${lc} this.session is truthy but no interactions, so deleting without saving. (I: 66788b63af12ad2095992c56a3668122)`); }
                return; /* <<<< returns early */
            }

            // we have a session and at least one interaction.
            // so save the interactions, and then save the entire session.
            let resPut = await this.ibgibsSvc.put({
                ibGibs: [
                    ...this.interactions,
                    this.session,
                ]
            });
            if (!resPut.success) { throw new Error(`put session/interactions failed: ${resPut.errorMsg ?? 'unknown error 101ee5e794bf49788664d280d17c30f0'} (E: 3b9ab24eade77938c213f888949eac22)`); }

            if (sayBye) {
                if (logalot) { console.log(`${lc} saying bye... (I: fc02b62d8fa9a5498fbffafecac75522)`); }
                let { text } = this._robbotLex.get(SemanticId.bye);
                if (!text) {
                    console.error(`${lc} (UNEXPECTED) lex didn't work? tried to get 'bye' and text is falsy. (E: 3e77e1f771caad72cc52c881cb46da22)`);
                    text = 'bye';
                }
                await this.createCommentAndRel8ToContextIbGib({ text, contextIbGib: this._currentWorkingContextIbGib })
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} deleting session/interactions (I: d863ced4302ba54933177ba908983322)`); }
            delete this.session;
            delete this.interactions;
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async addInteraction(): Promise<void> {
        const lc = `${this.lc}[${this.addInteraction.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 37ba4f1dfd8fa4f7bcd814f2ab159222)`); }

            // create an interaction and rel8 it to the current session.

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}

/**
 * Default data values for a WORDY robbot.
 *
 * If you change this, please bump the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
const DEFAULT_WORDY_ROBBOT_DATA_V1: WordyRobbotData_V1 = {
    version: '1',
    uuid: DEFAULT_UUID_WORDY_ROBBOT,
    name: DEFAULT_NAME_WORDY_ROBBOT,
    description: DEFAULT_DESCRIPTION_WORDY_ROBBOT,
    classname: WordyRobbot_V1.name,
    defaultRel8nName: c.DEFAULT_ROBBOT_TARGET_REL8N_NAME,
    allRel8nNames: [
        c.DEFAULT_ROBBOT_TARGET_REL8N_NAME,
        'comment',
        'analysis',
    ],

    lookRel8nNames: DEFAULT_SEARCH_REL8N_NAMES_WORDY_ROBBOT,

    // tagOutput: false,
    outputPrefix: '👀: ',
    outputSuffix: '-🤖 W',
    requestEscapeString: '?',

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}
const DEFAULT_WORDY_ROBBOT_REL8NS_V1: WordyRobbotRel8ns_V1 = undefined;

/**
 * factory for Wordy robbot.
 *
 * @see {@link DynamicFormFactoryBase}
 */
@Injectable({ providedIn: 'root' })
export class WordyRobbot_V1_Factory
    extends DynamicFormFactoryBase<WordyRobbotData_V1, WordyRobbotRel8ns_V1, WordyRobbot_V1> {

    protected lc: string = `[${WordyRobbot_V1_Factory.name}]`;

    getName(): string { return WordyRobbot_V1.name; }

    async newUp({
        data,
        rel8ns,
    }: {
        data?: WordyRobbotData_V1,
        rel8ns?: WordyRobbotRel8ns_V1,
    }): Promise<TransformResult<WordyRobbot_V1>> {
        const lc = `${this.lc}[${this.newUp.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            data = data ?? h.clone(DEFAULT_WORDY_ROBBOT_DATA_V1);
            rel8ns = rel8ns ?? DEFAULT_WORDY_ROBBOT_REL8NS_V1 ? h.clone(DEFAULT_WORDY_ROBBOT_REL8NS_V1) : undefined;
            data.uuid = data.uuid ?? await h.getUUID();
            let { classname } = data;

            const ib = getRobbotIb({ robbotData: data, classname });

            const resRobbot = <TransformResult<WordyRobbot_V1>>await factory.firstGen({
                ib,
                parentIbGib: factory.primitive({ ib: `robbot ${classname}` }),
                data: data,
                rel8ns,
                dna: true,
                linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
                nCounter: true,
                tjp: { timestamp: true },
            });

            // replace the newIbGib which is just ib,gib,data,rel8ns with loaded
            // witness class
            const robbotDto = resRobbot.newIbGib;
            let robbotIbGib = new WordyRobbot_V1(null, null);
            await robbotIbGib.loadIbGibDto(robbotDto);
            resRobbot.newIbGib = robbotIbGib;
            if (logalot) { console.log(`${lc} robbotDto: ${h.pretty(robbotDto)} (I: 1b70af6b397842c58b2fd011e43cdbe9)`); }

            return <TransformResult<WordyRobbot_V1>>resRobbot;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async witnessToForm({ witness }: { witness: WordyRobbot_V1; }): Promise<DynamicForm> {
        const lc = `${this.lc}[${this.witnessToForm.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let { data } = witness;
            // We do the RobbotFormBuilder specific functions first, because of
            if (logalot) { console.log(`${lc} data: ${h.pretty(data)} (I: 27b23a8ca6e54e06b3d66936c2322443)`); }
            const idPool = await getIdPool({ n: 100 });
            // type inference in TS! eesh...
            let form = new WordyRobbotFormBuilder()
                .with({ idPool })
                .name({ of: data.name, required: true })
                .description({ of: data.description })
                .and<WordyRobbotFormBuilder>()
                .lookRel8nNames({ of: data.lookRel8nNames })
                .and<RobbotFormBuilder>()
                .outputPrefix({ of: data.outputPrefix })
                .outputSuffix({ of: data.outputSuffix })
                .and<DynamicFormBuilder>()
                .uuid({ of: data.uuid, required: true })
                .classname({ of: data.classname })
                .and<WitnessFormBuilder>()
                .commonWitnessFields({ data })
                .outputForm({
                    formName: 'form',
                    label: 'Wordy Robbot',
                });
            return Promise.resolve(form);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async formToWitness({ form }: { form: DynamicForm; }): Promise<TransformResult<WordyRobbot_V1>> {
        // let robbot = new WordyRobbot_V1(null, null);
        let data: WordyRobbotData_V1 = h.clone(DEFAULT_WORDY_ROBBOT_DATA_V1);
        this.patchDataFromItems({ data, items: form.items, pathDelimiter: c.DEFAULT_DATA_PATH_DELIMITER });
        let resRobbot = await this.newUp({ data });
        return resRobbot;
    }

}

export class WordyRobbotFormBuilder extends RobbotFormBuilder {
    protected lc: string = `${super.lc}[${WordyRobbotFormBuilder.name}]`;

    constructor() {
        super();
        this.what = 'robbot';
    }

    lookRel8nNames({
        of,
    }: {
        of: string,
    }): WordyRobbotFormBuilder {
        this.addItem({
            // witness.data.outputPrefix
            name: "lookRel8nNames",
            description: `Every ibgib relates to other ibgibs via a "rel8n name". When you add a comment, this adds an ibgib via the "comment" rel8n name. So when you show your robbot an ibgib, do you want him to see sub-comments "inside" that ibGib? If so, include "comment". What about comments on pics? If so, also include "pic" or it won't see the comment under the pics. Basically, just leave this as-is unless you only want the robbot to look at the ibgib itself and no children, in which case blank this out.`,
            label: "Rel8n Names Visible",
            regexp: c.COMMA_DELIMITED_SIMPLE_STRINGS_REGEXP,
            regexpErrorMsg: c.COMMA_DELIMITED_SIMPLE_STRINGS_REGEXP_DESCRIPTION,
            dataType: 'text',
            value: of,
            required: false,
        });
        return this;
    }

}

function getRobbotAnalysisIb({
    robbot,
    timestamp,
}: {
    robbot: WordyRobbot_V1,
    timestamp: string,
}): Ib {
    const lc = `[${getRobbotAnalysisIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 1d5127e648d3b9ff9c0f44a7b978f422)`); }

        if (!robbot) { throw new Error(`robbot required (E: 86c35c658ed247e8a08804dffd4b55c2)`); }
        if (!robbot.data?.name) { throw new Error(`robbot.data.name required (E: 41770e7d9100499ba8e2da7770f241fc)`); }
        if (!robbot.data.classname) { throw new Error(`robbot.data.classname required (E: f9285fff1b0d4270857c9638c3f5c16a)`); }
        if (!robbot.data.uuid) { throw new Error(`robbot.data.uuid required (E: ef4629170e6b4a0a97098fb49c5a9ccf)`); }
        if (!timestamp) { throw new Error(`timestamp required (E: baaab4f1ba124870aeec7f202801274e)`); }

        const { name, classname, uuid } = robbot.data;
        const robbotTjpGib = getGibInfo({ gib: robbot.gib }).tjpGib;

        return `robbot_analysis ${timestamp} ${name} ${classname} ${uuid} ${robbotTjpGib}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function parseRobbotAnalysisIb({
    ib,
}: {
    ib: Ib,
}): {
    timestamp: string,
    robbotName: string,
    robbotClassname: string,
    robbotId: string,
    robbotTjpGib: Gib,
} {
    const lc = `[${parseRobbotAnalysisIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 510f894a603f4f998e82cb8c9236cd15)`); }
        if (!ib) { throw new Error(`ib required (E: 0635525070dd4f07b1a4f439151d9fab)`); }

        const pieces = ib.split(' ');
        if (pieces.length !== 6) { throw new Error(`invalid ib. should be space-delimited with 6 pieces, but there were ${pieces.length}. Expected pieces: atom, timestamp, robbotName, robbotClassname, robbotId, robbotTjpGib, sessionId, contextTjpGib. (E: b3f44a263c8540f7a9eacd1cecd0e93d)`); }

        const [_, timestamp, robbotName, robbotClassname, robbotId, robbotTjpGib] = ib;
        return { timestamp, robbotName, robbotClassname, robbotId, robbotTjpGib, };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}


function getRobbotSessionIb({
    robbot,
    timestamp,
    sessionId,
    contextTjpGib,
}: {
    robbot: WordyRobbot_V1,
    timestamp: string,
    sessionId: string,
    contextTjpGib: Gib,
}): string {
    const lc = `[${getRobbotSessionIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 21206e0defe4bf23db96979fb456e822)`); }
        if (!robbot) { throw new Error(`robbot required (E: 200b32bbc4cac516e56d9561a9ffae22)`); }
        if (!robbot.data?.name) { throw new Error(`robbot.data.name required (E: d6470d5a146a1794811b9577ce881522)`); }
        if (!robbot.data.classname) { throw new Error(`robbot.data.classname required (E: 42077779c80889f1079e582d45932e22)`); }
        if (!robbot.data.uuid) { throw new Error(`robbot.data.uuid required (E: 34222f5639c329c99a2007ba6789bb22)`); }
        if (!timestamp) { throw new Error(`timestamp required (E: 17447cb30277af2beea8f2b13266c722)`); }
        if (!sessionId) { throw new Error(`sessionId required (E: 37a1737920996a55f311e79efe558422)`); }
        if (!contextTjpGib) { throw new Error(`contextTjpGib required (E: ad967964b764b077f448121e8b63c822)`); }

        const { name, classname, uuid } = robbot.data;
        const robbotTjpGib = getGibInfo({ gib: robbot.gib }).tjpGib;

        return `${ROBBOT_SESSION_ATOM} ${timestamp} ${name} ${classname} ${uuid} ${robbotTjpGib} ${sessionId} ${contextTjpGib}`;

    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function parseRobbotSessionIb({
    ib,
}: {
    ib: Ib,
}): {
    timestamp: string,
    robbotName: string,
    robbotClassname: string,
    robbotId: string,
    robbotTjpGib: Gib,
    sessionId: string,
    contextTjpGib: Gib,
} {
    const lc = `[${parseRobbotSessionIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 21206e0defe4bf23db96979fb456e822)`); }
        if (!ib) { throw new Error(`ib required (E: c99627d871dbada4745474d9b63d4822)`); }

        const pieces = ib.split(' ');
        if (pieces.length !== 8) { throw new Error(`invalid ib. should be space-delimited with 8 pieces, but there were ${pieces.length}. Expected pieces: atom, timestamp, robbotName, robbotClassname, robbotId, robbotTjpGib, sessionId, contextTjpGib. (E: 239ba7f599ce02a20271dd288c187d22)`); }

        const [_, timestamp, robbotName, robbotClassname, robbotId, robbotTjpGib, sessionId, contextTjpGib] = ib;
        return {
            timestamp,
            robbotName, robbotClassname, robbotId, robbotTjpGib,
            sessionId,
            contextTjpGib,
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
