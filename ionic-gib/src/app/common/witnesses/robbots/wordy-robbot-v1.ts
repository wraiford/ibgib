import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';

import * as h from 'ts-gib/dist/helper';
import {
    IbGib_V1, ROOT, Factory_V1 as factory, Rel8n,
    IbGibRel8ns_V1, isPrimitive, IbGibData_V1, Factory_V1, rel8, mut8,
} from 'ts-gib/dist/V1';
import { Gib, Ib, IbGibAddr, TransformResult } from 'ts-gib';
import { getGib, getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../../constants';
import { IbGibRobbotAny, RobbotBase_V1 } from './robbot-base-v1';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
    RobbotCmdData, RobbotCmdIbGib, RobbotCmdRel8ns,
    RobbotCmd,
    StimulusForRobbot,
    SemanticId, SemanticHandler, RobbotPropsData,
    DEFAULT_ROBBOT_LEX_DATA, DEFAULT_HUMAN_LEX_DATA, SemanticInfo,
    RobbotInteractionData_V1, RobbotInteractionIbGib_V1,
    RobbotInteractionType,
    ROBBOT_SESSION_REL8N_NAME, ROBBOT_INTERACTION_REL8N_NAME, ROBBOT_SESSION_ATOM, ROBBOT_ANALYSIS_ATOM, toLexDatums_Semantics, DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING, AtomicId, DEFAULT_HUMAN_LEX_DATA_ENGLISH_ATOMICS, DEFAULT_HUMAN_LEX_DATA_ENGLISH_SEMANTICS,
} from '../../types/robbot';
import { DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { addTimeToDate, getIdPool, getSaferSubstring, getTimestampInTicks, pickRandom, replaceCharAt, unique } from '../../helper/utils';
import { WitnessFormBuilder } from '../../helper/witness';
import { getInteractionIbGib_V1, getRequestTextFromComment, getRobbotIb, getRobbotSessionIb, isRequestComment, RobbotFormBuilder } from '../../helper/robbot';
import { DynamicFormBuilder } from '../../helper/form';
import { getGraphProjection, GetGraphResult } from '../../helper/graph';
import { CommentIbGib_V1 } from '../../types/comment';
import { getFromSpace, getLatestAddrs } from '../../helper/space';
import { AppSpaceData, AppSpaceRel8ns } from '../../types/app';
import { IonicSpace_V1 } from '../spaces/ionic-space-v1';
import { LexDatum, LexLineConcat, LexResultObj, SpeechBuilder } from '../../helper/lex';
import { getTjpAddr } from '../../helper/ibgib';
import { isComment, parseCommentIb } from '../../helper/comment';
import { Ssml } from '../../helper/ssml';


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
    /**
     * Here and not in rel8ns because an aggregate analysis will have these
     * data.
     */
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

export interface WordyAnalysisData_V1_Text extends IbGibData_V1 {
    /**
     * Breakdown of the text.
     */
    textInfo: WordyTextInfo;
    /**
     * Here duplicates in textInfo.srcAddr.
     */
    srcAddr?: IbGibAddr;
    timestamp_LastInteraction: string;
    timestamp_LastStimulation: string;
    stimulationCount: number;
    /**
     * timestamp after which the source is scheduled to be stimulated.
     */
    timestamp_Scheduled?: string;
    /**
     * Total number of interactions regarding the src ibgib.
     */
    interactionCount: number;
    srcTjpGib: Gib;
}
export interface WordyAnalysisRel8ns_V1_Text extends IbGibRel8ns_V1 {
}
export interface WordyAnalysisIbGib_V1_Text extends IbGib_V1<WordyAnalysisData_V1_Text, WordyAnalysisRel8ns_V1_Text> { }

export interface WordyAnalysisData_V1_Robbot {
    timestamp: string;
    textInfos: WordyTextInfo[];
    aggInfo: WordyTextInfo;
}
export interface WordyAnalysisRel8ns_V1_Robbot extends IbGibRel8ns_V1 {
    /**
     * rel8ns to sub analyses for this robbot that pertain to specific ibgibs.
     *
     * @see {@link getTextIbGibAnalysisIb}
     */
    analysis?: IbGibAddr[];
}
export interface WordyAnalysisIbGib_V1_Robbot extends IbGib_V1<WordyAnalysisData_V1_Robbot, WordyAnalysisRel8ns_V1_Robbot> { }

/**
 * There are various ways to stimulate an ibgib.
 */
export type StimulationType = 'lines' | 'just_show' | 'blank_words'
    // | 'next_line'
    // | 'demand_expand'
    ;
export const StimulationType = {
    /**
     * The user is just shown the source ibgib raw.
     */
    'just_show': 'just_show' as StimulationType,
    /**
     * The user is shown a source comment text/line/paragraph with a single
     * blanked out word.  The user must type in the blanked out word.
     */
    'blank_words': 'blank_words' as StimulationType,
    /**
     * The user is shown one or more lines and a blank. the user must type in
     * the line.
     */
    // 'next_line': 'next_line' as StimulationType,
    /**
     * the user has to say something that will be added to the target ibgib.
     * if the user says "skip" or "no" or "no thanks", etc., then it will be
     * skipped.
     */
    // 'demand_expand': 'demand_expand' as StimulationType,
}
export interface StimulationDetails {
    /**
     * type of stimulation, like is it a fill in the blank or just showing the
     * ibgib.
     */
    stimulationType: StimulationType;
    /**
     * Soft link to the source address of the ibgib being stimulated.
     */
    '@toStimulate': IbGibAddr;
    /**
     * Soft link to the source's tjp address of the ibgib being stimulated.
     */
    '@toStimulateTjp': IbGibAddr;
    /**
     * If we are making a comment ourselves (and not, e.g., just presenting some
     * other ibgib without additional comment), then here is the text for it.
     *
     * This should also be included in the comment.
     */
    commentText?: string;
}
/**
 * We're stimulating the ibgib via blanking out one or more words in the ibgib's
 * text.
 */
export interface StimulationDetails_BlankWords extends StimulationDetails {
    stimulationType: 'blank_words';
    /**
     * List of words that were blanked out in this stimulation
     */
    blankedWords: string[];
}

export const DEFAULT_UUID_WORDY_ROBBOT = undefined;
export const DEFAULT_NAME_WORDY_ROBBOT = 'Wordsworthers';
export const DEFAULT_DESCRIPTION_WORDY_ROBBOT =
    `A wordy robbot does wordy stuff like taking text and scrambling pieces or creating fill-in-the-blanks.`;
/**
 * look rel8n names are those named edges that the robbot can travel along when
 * looking at what it's shown by the user using the :eyes: button.
 *
 * I'm trying out defaulting to empty and defaulting to pics/comments/links
 * and related (e.g. tag targets).
 *
 * The idea is that you could just say look at this one ibgib and the robbot
 * could analyze the entire sub-graph along certain edges, including those we do
 * want to see (e.g. yes look at sub comments & pics) and excluding those we
 * don't (e.g.  don't look at the dna).
 *
 * But then again, this is a more complex scenario and we may want the robbot
 * just to look at the specific ones we say. I'm thinking about this wrt to
 * analysis.
 */
// export const DEFAULT_LOOK_REL8N_NAMES_WORDY_ROBBOT: string = [].join(',');
export const DEFAULT_LOOK_REL8N_NAMES_WORDY_ROBBOT = [
    'pic', 'comment', 'link',
    'result', 'import',
    'tagged',
    c.TAGGED_REL8N_NAME,
    c.DEFAULT_ROOT_REL8N_NAME,
].join(',');
export const WORDY_V1_ANALYSIS_REL8N_NAME = 'analysis';
export const WORDY_V1_DEFAULT_REQUEST_TEXT = 'help';

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
    session?: IbGibAddr[];
}

export type WordySemanticId =
    "semantic_blank_line" | "semantic_lines" |
    "semantic_done" | "semantic_what_next" |
    SemanticId;
export const WordySemanticId = {
    ...SemanticId,
    blank_line: "semantic_blank_line" as WordySemanticId,
    lines: 'semantic_lines' as WordySemanticId,
    done: "semantic_done" as WordySemanticId,
    what_next: "semantic_what_next" as WordySemanticId,
}


export interface WordyRobbotPropsData extends RobbotPropsData<WordySemanticId> {
    /**
     * If reviewing lines, this flag indicates that it's the first line
     */
    isFirstLine?: boolean;
}

// export type WordyLexKeywords =
// 'blankSlate';
// export const WordyLexKeywords = {
// blankSlate: 'blankSlate' as WordyLexKeywords,
// }

type WordyContextFlag = 'all';

/**
 *
 */
export class WordyRobbot_V1 extends RobbotBase_V1<
    // lex props type
    WordyRobbotPropsData,
    // in
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // out
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // this
    WordyRobbotData_V1, WordyRobbotRel8ns_V1
> {
    protected lc: string = `[${WordyRobbot_V1.name}]`;

    private _analysis: WordyAnalysisIbGib_V1_Robbot;

    protected _brainLookProjection: GetGraphResult;
    /**
     * When we go to get the current working ibgib, if there are none available, then this
     * will be set.
     */
    protected nothingToWorkOnAvailable: boolean;
    protected _brainCommentIbGibs: CommentIbGib_V1[];
    protected _currentWorkingComment: CommentIbGib_V1;
    protected get _currentWorkingCommentTjpAddr(): IbGibAddr {
        return this._currentWorkingComment ?
            getTjpAddr({ ibGib: this._currentWorkingComment }) :
            undefined;
    }
    protected _currentWorkingCommentTextInfo: WordyTextInfo;
    /**
     * map of working comment ibgibs (the things that we're analyzing).
     */
    protected _currentWorkingCommentIbGibsAnalysisMap: { [addr: string]: WordyAnalysisIbGib_V1_Text } = {};

    protected session: WordyRobbotSessionIbGib_V1;
    protected interactions: RobbotInteractionIbGib_V1[];
    /**
     * syntactic sugar for getting the most recent interaction.
     *
     * @returns most recent interaction if there are any, else returns undefined
     */
    protected get prevInteraction(): RobbotInteractionIbGib_V1 | undefined {
        return this.interactions?.length > 0 ?
            this.interactions[this.interactions.length - 1] :
            undefined;
    }
    // protected get stimulations(): WordyRobbotInteractionData_V1_Stimulation[] {
    //     return this.interactions?.filter(x => x.data?.type === 'stimulation')
    //         .map(x => { return <WordyRobbotInteractionData_V1_Stimulation>x.data }) ?? [];
    // }

    protected cachedLatestAddrsMap: { [addr: string]: string }

    protected alreadyHandledContextChildrenAddrs: IbGibAddr[] = [];

    /**
     * If a new child comes down the pipeline, then we should be ready for it.
     */
    private expectingResponse: boolean;

    constructor(initialData?: WordyRobbotData_V1, initialRel8ns?: WordyRobbotRel8ns_V1) {
        super(initialData, initialRel8ns); // calls initialize
        const lc = `${this.lc}[ctor]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
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
    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            await super.initialize();

            if (logalot) { console.log(`${lc} starting...`); }
            if (!this.data) { this.data = h.clone(DEFAULT_WORDY_ROBBOT_DATA_V1); }
            if (!this.rel8ns && DEFAULT_WORDY_ROBBOT_REL8NS_V1) {
                this.rel8ns = h.clone(DEFAULT_WORDY_ROBBOT_REL8NS_V1);
            }

            await this.initialize_loadAnalysisIfExists();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initialize_lex(): Promise<void> {
        const lc = `${this.lc}[${this.initialize_lex.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: a4668a7473027e56df42909c09f70822)`); }
            await super.initialize_lex();

            this._robbotLex.data[SemanticId.hello] = [
                {
                    texts: [
                        `$(hi)!`,
                        `It looks like I haven't seen anything yet.`,
                        `Navigate somewhere and let me look at that ibgib by clicking 👀.`,
                    ],
                    props: {
                        semanticId: SemanticId.hello,
                        blankSlate: true,
                    },
                },
                {
                    texts: [
                        `$(hi).`,
                        `What do we want to do? You can give me requests like 'learn', 'hoogle', 'boogle'.`,
                        `Just prefix it with "${DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING}"`,
                        `For a full list of requests available, try "list" or "ls". Or you can also request 'help'.`,
                    ],
                    props: {
                        semanticId: SemanticId.hello,
                        onlyInSession: true,
                        freshStart: true, // explicit for readability
                    },
                },
                {
                    texts: [
                        `$(hi).`,
                        `$(session_in_progress)`,
                        `$(${SemanticId.ready})`,
                    ],
                    props: {
                        semanticId: SemanticId.hello,
                        onlyInSession: true,
                        freshStart: false, // explicit for readability
                    },
                },
            ];
            this._robbotLex.data['session_in_progress'] = [
                {
                    texts: [
                        'Session is in progress...',
                    ],
                }
            ];
            this._robbotLex.data[SemanticId.help] = [
                {
                    texts: [
                        `$(hi)! I'm $name, a Wordy Robbot here to help you learn words.`,
                        `Want to learn a poem? A song? How about a foreign language without wasting a bunch of time?`,
                        `Maybe you want to learn poems and songs IN foreign languages?`,
                        `That's the kind of thing I can help with.`,
                        ``,
                        `Now unlike most chatbots, I ain't a genie and your wish isn't my command.`,
                        `But I do take requests. I know a request when you start your statement with a '${DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING}', like...`,
                        `$requestExamples`,
                        ``,
                        `For a complete list, just say '${DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING}list' or '${DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING}requests'.`,
                    ],
                    props: {
                        semanticId: SemanticId.help,
                        templateVars: `name,requestExamples`,
                    }
                }
            ];
            this._robbotLex.data[SemanticId.ready] = [
                ...toLexDatums_Semantics(SemanticId.ready, [
                    'I\'m ready.', 'I\'m awake.',
                ])
            ];
            this._robbotLex.data[SemanticId.list] = [
                {
                    texts: [
                        `Here are what requests are available right now:`,
                        `$requests`,
                    ],
                    props: {
                        semanticId: SemanticId.list,
                        templateVars: `requests`,
                    }
                }
            ];
            this._robbotLex.data[WordySemanticId.lines] = [
                {
                    texts: [
                        `next line...`,
                        `---`,
                        `$prevLine`,
                    ],
                    props: {
                        semanticId: WordySemanticId.lines,
                        templateVars: `prevLine`,
                        freshStart: true,
                    }
                },
                {
                    /** proceeding lines only show the previous line */
                    texts: [
                        `$prevLine`,
                    ],
                    props: {
                        semanticId: WordySemanticId.lines,
                        templateVars: `prevLine`,
                        freshStart: false,
                    }
                },
            ];
            this._robbotLex.data[WordySemanticId.blank_line] = [
                {
                    texts: [
                        `$title`,
                        ``,
                        `First line?`,
                    ],
                    props: {
                        semanticId: WordySemanticId.blank_line,
                        templateVars: `title`,
                        isFirstLine: true,
                    }
                },
                {
                    texts: [
                        `$priorText`,
                        `$lineIndex: ___________?`,
                    ],
                    props: {
                        semanticId: WordySemanticId.blank_line,
                        templateVars: `priorText,lineIndex`,
                        isFirstLine: false,
                    }
                },
            ];
            this._robbotLex.data[SemanticId.stop] = [
                {
                    texts: [
                        `$(${WordySemanticId.done})`,
                        ``,
                        `$(${WordySemanticId.what_next})`,
                    ]
                }
            ];
            this._robbotLex.data[WordySemanticId.done] = [
                ...toLexDatums_Semantics(WordySemanticId.done, [
                    `OK we're done with that.`,
                    `Gotcha, that's that.`
                ]),
            ];
            this._robbotLex.data[WordySemanticId.what_next] = [
                ...toLexDatums_Semantics(WordySemanticId.what_next, [
                    `What's up next?`,
                    `What's up now?`,
                    `What would you like to do now?`,
                    `Now what eh?`,
                ]),
            ];

            // this.userLex.data[SemanticId.count] = [
            //     ...[`count`, `how many`].map(text => {
            //         return {
            //             texts: [text],
            //             props: <WordyRobbotPropsData>{
            //                 semanticId: SemanticId.count,
            //                 isRequest: true,
            //             }
            //         };
            //     }),
            // ];
            this._userLex.data[SemanticId.hello] = [
                ...DEFAULT_HUMAN_LEX_DATA_ENGLISH_ATOMICS[AtomicId.hi].flatMap(datum => {
                    return {
                        texts: datum.texts.concat(),
                        props: <WordyRobbotPropsData>{
                            semanticId: SemanticId.hello,
                            isRequest: true,
                        }
                    }
                }),
            ];
            this._userLex.data[SemanticId.help] = [
                ...DEFAULT_HUMAN_LEX_DATA_ENGLISH_SEMANTICS[SemanticId.help].flatMap(datum => {
                    return {
                        texts: datum.texts.concat(),
                        props: <WordyRobbotPropsData>{
                            semanticId: SemanticId.help,
                            isRequest: true,
                        }
                    }
                }),
            ];
            this._userLex.data[SemanticId.list] = [
                ...[`list`, `ls`, `requests`, `reqs`].map(text => {
                    return {
                        texts: [text],
                        props: <WordyRobbotPropsData>{
                            semanticId: SemanticId.list,
                            isRequest: true,
                        }
                    };
                }),
            ];
            this._userLex.data[WordySemanticId.lines] = [
                ...[`lines`, `do lines`, `learn lines`, `lyrics`, `do lyrics`].map(text => {
                    return {
                        texts: [text],
                        props: <WordyRobbotPropsData>{
                            semanticId: WordySemanticId.lines,
                            isRequest: true,
                        }
                    };
                }),
            ];
            this._userLex.data[SemanticId.stop] = [
                ...[`stop`, `cancel`, `abort`].map(text => {
                    return {
                        texts: [text],
                        props: <WordyRobbotPropsData>{
                            semanticId: SemanticId.stop,
                            isRequest: true,
                        }
                    };
                }),
            ];

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initialize_semanticHandlers(): Promise<void> {
        const lc = `${this.lc}[${this.initialize_semanticHandlers.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 8a9f396f796d456e97a7b6ec7cc352d1)`); }

            super.initialize_semanticHandlers();

            this._semanticHandlers = {
                // atow this is just mapping the default to the default handler method
                ...this._semanticHandlers,

                [SemanticId.hello]: [
                    {
                        handlerId: '0f97304634d1446f8b12d62ce9adf8b1',
                        semanticId: SemanticId.hello,
                        fnCanExec: async (info) => !this.nothingToWorkOnAvailable && !this.prevInteraction,
                        fnExec: (info) => this.handleSemantic_hello_freshStart(info),
                    },
                    {
                        handlerId: '31e3378528c74b98913ce766dc978f29',
                        semanticId: SemanticId.hello,
                        fnCanExec: async (info) => !this.nothingToWorkOnAvailable && !!this.prevInteraction,
                        fnExec: (info) => this.handleSemantic_hello_continue(info),
                    },
                    {
                        handlerId: '8b6fbaa737834ce6b43258de4558eafd',
                        semanticId: SemanticId.hello,
                        fnCanExec: async (info) => this.nothingToWorkOnAvailable,
                        fnExec: (info) => this.handleSemantic_NothingToWorkOn(info),
                    },
                ],
                [SemanticId.list]: [
                    {
                        handlerId: '1805d2175d9b4dfdb68b5758213f6a69',
                        semanticId: SemanticId.list,
                        fnCanExec: async (info) => true,
                        fnExec: (info) => this.handleSemantic_list(info),
                    },
                ],
                [SemanticId.help]: [
                    {
                        handlerId: '24bf2a020a4545e185fd9c7f1de95422',
                        semanticId: SemanticId.help,
                        fnCanExec: async (info) => true,
                        fnExec: (info) => this.handleSemantic_help(info),
                    },
                ],
                [WordySemanticId.lines]: [
                    {
                        handlerId: 'b60a4d58d89e4065a16250a0836b4f98',
                        semanticId: WordySemanticId.lines,
                        fnCanExec: (info) => this.canHandleSemantic_lines(info),
                        fnExec: (info) => this.handleSemantic_lines(info),
                    },
                    {
                        handlerId: 'bfa8492a8c354c0e8ca8f48673a24c5b',
                        semanticId: WordySemanticId.lines,
                        fnCanExec: async (info) => this.nothingToWorkOnAvailable,
                        fnExec: (info) => this.handleSemantic_NothingToWorkOn(info),
                    },
                ],
                [SemanticId.stop]: [
                    {
                        handlerId: 'a738b9fa84f44c2ca09b25354b7cf039',
                        semanticId: SemanticId.stop,
                        fnCanExec: (info) => this.canHandleSemantic_stop(info),
                        fnExec: (info) => this.handleSemantic_stop(info),
                    },
                ],
                // more handlers here
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initialize_loadAnalysisIfExists(): Promise<void> {
        const lc = `${this.lc}[${this.initialize_loadAnalysisIfExists.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d7c2eba5e6345cdd3a9939834eb7f522)`); }
            const analysisAddrs = this.rel8ns[WORDY_V1_ANALYSIS_REL8N_NAME] ?? [];
            if (analysisAddrs.length === 0) {
                if (logalot) { console.log(`${lc} no analysis found in this.rel8ns. returning early. (I: 76e8a28c82b93754673d8b8fa84af222)`); }
                return; /* <<<< returns early */
            };

            // get the most recent one
            let analysisAddr = analysisAddrs[analysisAddrs.length - 1];
            analysisAddr = await this.ibgibsSvc.getLatestAddr({ addr: analysisAddr }) ?? analysisAddr;

            let resAnalysis = await this.ibgibsSvc.get({ addr: analysisAddr });
            if (!resAnalysis.success || resAnalysis.ibGibs?.length !== 1) {
                throw new Error(`error getting analysisAddr registered with this robbot. addr: ${analysisAddr}. error: ${resAnalysis.errorMsg ?? 'unknown error'} (E: 622945c064d3b54487b94f871c4a8722)`);
            }

            this._analysis = <WordyAnalysisIbGib_V1_Robbot>resAnalysis.ibGibs[0];
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
            if (logalot) { console.log(`${lc} starting... (I: a645054a23d2ddeebc1cdefd5ca66222)`); }

            await this.completeSessionIfNeeded({ sayBye: false });

            return await super.finalizeContext({ arg });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    // #region semantic handlers

    /**
     * We have started a new session, atow this is only when we click the Gib (chat) button.
     */
    private async handleSemantic_hello_freshStart(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemantic_hello_freshStart.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 5632af01149bc9c3af56346c2fbda622)`); }

            const hello = this._robbotLex.get(SemanticId.hello, {
                props: props =>
                    props.semanticId === SemanticId.hello &&
                    props.onlyInSession === true &&
                    props.freshStart === true,
            });

            // get the first stimulation for the current comment
            const sb = SpeechBuilder.with()
                .text(hello.text)
                // .newParagraph()
                ;

            const data: RobbotInteractionData_V1 = {
                uuid: await h.getUUID(),
                timestamp: h.getTimestamp(),
                type: RobbotInteractionType.greeting,
                commentText: sb.outputSpeech({}).text,
            };

            const ibGib = await getInteractionIbGib_V1({ data });
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    private async handleSemantic_hello_continue(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemantic_hello_continue.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 96001be1ceab4c438469edb00e6d8f41)`); }

            const hello = this._robbotLex.get(SemanticId.hello, {
                props: props =>
                    props.semanticId === SemanticId.hello &&
                    props.onlyInSession === true &&
                    !props.freshStart,
            });

            const data: RobbotInteractionData_V1 = {
                uuid: await h.getUUID(),
                timestamp: h.getTimestamp(),
                type: RobbotInteractionType.clarification,
                commentText: hello.text,
            };

            const ibGib = await getInteractionIbGib_V1({ data });
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Catchall when there is nothing to work on.
     */
    private async handleSemantic_NothingToWorkOn(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemantic_NothingToWorkOn.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 5632af01149bc9c3af56346c2fbda622)`); }

            const hello = this._robbotLex.get(SemanticId.hello, {
                props: props =>
                    props.semanticId === SemanticId.hello &&
                    props.blankSlate === true,
            });

            const data: RobbotInteractionData_V1 = {
                uuid: await h.getUUID(),
                timestamp: h.getTimestamp(),
                type: RobbotInteractionType.clarification,
                commentText: hello.text,
            };

            const ibGib = await getInteractionIbGib_V1({ data });
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     *
     *
     * @returns e.g. ['help: help, help please, help me, ...', 'hi: hi, hello, greetings, ...', ... ]
     */
    private async getUserRequestTexts({
        contextFlags = ['all'],
        examplesOnly = false,
    }: {
        /**
         * NOT IMPL YET - Flags that indicates if only requests that are specific to the current context.
         * For example, if you're in the middle of a lines exercise, it wouldn't make sense to include
         * the 'hi' request, even though this would
         */
        contextFlags?: WordyContextFlag[],
        examplesOnly?: boolean,
    } = {
            contextFlags: ['all'],
            examplesOnly: false,
        }
    ): Promise<string[]> {
        const lc = `${this.lc}[${this.getUserRequestTexts.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 94ae223703b5ff62ce7422549b058722)`); }

            if (contextFlags?.length !== 1 && contextFlags[0] !== 'all') { throw new Error(`only contextFlags === ['all'] implemented atm (E: 8ee8b34c687b92f74855fdba83b7f722)`); }

            /**
             * each entry is a mapping of "bare" semantic id => array of request synonyms
             *
             * @example [ ["list", ["list", "ls", "requests"]], ["hello", "hello", "hi", "greetings"] ]

             */
            let requestEntries: [string, string[]][] =
                Object.values(this._userLex.data)
                    .filter(datas => datas.some(x => x.props?.isRequest && !!x.props.semanticId))
                    .map(x => {
                        let requests = x.filter(datum => datum.props?.isRequest && !!datum.props.semanticId);
                        if (requests.length === 0) { throw new Error(`(UNEXPECTED) my logic is wrong...expected at least one request after filter... ? (E: 384ab52d2c1cf23ed55c47036d361622)`); }
                        const semanticIds = unique(requests.map(x => x.props.semanticId));
                        if (semanticIds.length !== 1) { throw new Error(`inconsistent user lex data. expected all requests to have the same semantic id. semanticIds: ${semanticIds.join(', ')} (E: 4f9063a855de332306fa3ff47a3e2222)`); }
                        const semanticId = semanticIds[0]; // e.g. "semantic_hello"
                        const requestName = semanticId.slice("semantic_".length); // e.g. "hello"
                        const requestAliases = requests.map(x => x.texts[0]);
                        // e.g. ["list", ["list", "ls", "requests"]]
                        return [requestName, requestAliases];
                    });
            let requestsText: string[];
            if (examplesOnly) {
                requestsText = requestEntries
                    .filter(([reqName, reqAliases]) => {
                        return reqAliases.some(reqAlias => ['hello', 'help', 'list'].includes);
                    })
                    .map(([reqName, reqAliases]) => {
                        return `${reqName}: ${reqAliases.join(',')}`; // e.g. "hello: hello, hi, hey, hey there, hi there"
                    });
            } else {
                requestsText = requestEntries.map(([reqName, reqAliases]) => {
                    return `${reqName}: ${reqAliases.join(',')}`; // e.g. "hello: hello, hi, hey, hey there, hi there"
                });
            }
            return requestsText;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async handleSemantic_list(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemantic_list.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 27a9e811a4604c3f814c403ab3de61a0)`); }

            const requestTexts = await this.getUserRequestTexts({ contextFlags: ['all'] });

            // get the list lex and use template var
            const speech = this._robbotLex.get(SemanticId.list, {
                props: props =>
                    props.semanticId === SemanticId.list,
                vars: { requests: requestTexts.join('\n') },
            });

            const data: RobbotInteractionData_V1 = {
                uuid: await h.getUUID(),
                timestamp: h.getTimestamp(),
                type: RobbotInteractionType.clarification,
                commentText: speech.text,
            };

            const ibGib = await getInteractionIbGib_V1({ data });
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    private async handleSemantic_help(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemantic_help.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 17510159283247f6bce7239d71c5bf33)`); }

            let requestTexts = await this.getUserRequestTexts({ contextFlags: ['all'], examplesOnly: true });
            // const requestsText = requestEntries.map(([reqName, reqAliases]) => {
            //     return `${reqName}: ${reqAliases.join(',')}`; // e.g. "hello: hello, hi, hey, hey there, hi there"
            // });
            // get the list lex and use template var
            const speech = this._robbotLex.get(SemanticId.help, {
                props: props =>
                    props.semanticId === SemanticId.help,
                vars: {
                    name: this.data.name,
                    requestExamples: requestTexts.join('\n'),
                },
            });

            const data: RobbotInteractionData_V1 = {
                uuid: await h.getUUID(),
                timestamp: h.getTimestamp(),
                type: RobbotInteractionType.clarification,
                commentText: speech.text,
            };

            const ibGib = await getInteractionIbGib_V1({ data });
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }


    /**
     * We need a full function to make sure that we have at least one coment
     * with multiple lines. If there are no comments with multiple lines, then
     * we can't do lines.
     *
     * Note: In the future, there may be additional constraints, such as if
     * there is a context that requires keeping the current working ibgib, e.g.
     */
    private async canHandleSemantic_lines(info: SemanticInfo): Promise<boolean> {
        const lc = `${this.lc}[${this.canHandleSemantic_lines.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d8444692b2adecc38106c09b7dd57322)`); }
            if (this.nothingToWorkOnAvailable) {
                debugger;
                console.log(`${lc} nothing to work on. returning false. (I: 8bd42da50367466da9e21886ff6a0f8b)`)
                return false;
            }

            if (!this._brainCommentIbGibs) { throw new Error(`(UNEXPECTED) this comment ibgibs falsy? (E: 47e07fe70fa83c9cbd4f883339406622)`); }

            // const hasMultiLineComment = this._brainCommentIbGibs.some(x => x.data?.text?.includes('\n'));
            const hasMultiLineComment = this._brainCommentIbGibs
                .filter(x => !!x.data?.text?.trim())
                .filter(x => {
                    // I'm not sure if this covers all edge cases but good enough for now...
                    const lines = x.data.text.trim().split('\n').filter(x => !!x).map(x => x.trim());
                    return lines.length >= 2;
                }).length > 0;

            if (logalot) { console.log(`${lc} hasMultiLineComment: ${hasMultiLineComment} (I: 457df866bd1ed3dbecad441d5a821822)`); }

            return hasMultiLineComment;
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * loads this._currentWorkingComment for lines stimulation based on info.
     *
     * ## requirements
     *
     * In this case, we are loading a comment to stimulate with lines.
     *
     * ## future todo
     *
     * * check for scheduled comments
     */
    private async loadNextWorkingComment_lines({ info }: { info: SemanticInfo }): Promise<void> {
        const lc = `${this.lc}[${this.loadNextWorkingComment_lines.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 55d6e81101135ac6da3c8a3861a87322)`); }

            // for now, choose among any of the comments having multiple lines
            const multilines = this._brainCommentIbGibs
                .filter(x => !!x.data?.text?.trim())
                .filter(x => {
                    // I'm not sure if this covers all edge cases but good enough for now...
                    const lines = x.data.text.trim().split('\n').filter(x => !!x).map(x => x.trim());
                    return lines.length >= 2;
                });

            const randomComment = pickRandom({ x: multilines });
            if (randomComment) {
                this._currentWorkingComment = randomComment;
                this._currentWorkingCommentTextInfo = this.getTextInfo({ srcIbGib: randomComment })
                if (logalot) { console.log(`${lc} current working comment with multiple lines chosen. ${h.getIbGibAddr({ ibGib: randomComment })} (I: 07fb9c87f35e93f868a88718998cbb22)`); }
            } else {
                delete this._currentWorkingComment;
                delete this._currentWorkingCommentTextInfo;
                throw new Error(`(UNEXPECTED) current working comment not found? it is assumed that we hve at least one multiline comment if we get here. (E: 3ef967e7de91aa9b1ca5567345dbdc22)`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async handleSemantic_lines(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemantic_lines.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 32e7907bf40c4723a0b1a9091c3b7047)`); }

            if (!this._currentWorkingComment) { await this.loadNextWorkingComment_lines({ info }); }
            const toStimulate = this._currentWorkingComment;
            const toStimulateTjpAddr = getTjpAddr({ ibGib: toStimulate });

            debugger;

            // if we're working on a current ibgib, then get the next blank line
            // based on the previous interactions. So look through interactions
            // for lines stimulations that correspond to the current comment.
            const isLinesContinuation = this.interactions && this.interactions.some(x =>
                x.data.type === 'stimulation' &&
                (x.data.details as StimulationDetails)?.stimulationType === 'lines' &&
                (<StimulationDetails>x.data.details)['@toStimulateTjp'] === toStimulateTjpAddr
            );

            let speech: LexResultObj<WordyRobbotPropsData>;
            let lineIndex: number;
            let lineText: string;
            let title: string = toStimulate.ib.substring('comment '.length) + '...';
            if (!isLinesContinuation) {
                // this is the first one, so do the first line (atow)
                // in the future, we should look for previous interactions per the context.
                const lines = this._currentWorkingCommentTextInfo.lines.concat();
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i]?.trim();
                    if (!!line) {
                        if (i === 0 && isATitleHeading({ text: line })) { // indicates a title
                            title = line;
                        } else if (isATitleHeading({ text: line })) {
                            if (logalot) { console.log(`${lc} title heading found. skipping i: ${i}... (I: 7989ae7e3916727e44bc082afc5c9e22)`); }
                        } else {
                            // found non-empty line
                            lineIndex = i;
                            lineText = line;
                            break;
                        }
                    }
                }
                if (!lineText) { throw new Error(`(UNEXPECTED) lineText falsy? expected lines to be valid at this point.\naddr: ${h.getIbGibAddr({ ibGib: toStimulate })}\nlines: ${lines} (E: f35fbc3b9fa3d5185229b1ef24bc3422)`); }
                speech = this._robbotLex.get(WordySemanticId.blank_line, {
                    props: props =>
                        props.semanticId === WordySemanticId.blank_line &&
                        props.isFirstLine === true,
                    vars: { title },
                });
            } else {
                // there exists a previous interaction that was lines for the
                debugger; // todo
            }

            // if no previous interaction, choose a comment with multiple lines
            // and get it.  can check for text based on request text if we want
            // to try to filter it down.

            // get the list lex and use template var
            // const speech = this.robbotLex.get(SemanticId.lines, {
            //     props: props =>
            //         props.semanticId === SemanticId.list,
            //     // vars: { requests: requestsText.join('\n') },
            // });
            // const speech = `${lineIndex}: ${}`
            if (!speech) { throw new Error(`(UNEXPECTED) speech falsy? (E: 941e57036473404c6f1a432e388d6522)`); }

            const data: RobbotInteractionData_V1 = {
                uuid: await h.getUUID(),
                timestamp: h.getTimestamp(),
                type: RobbotInteractionType.stimulation,
                commentText: speech.text,
            };

            this.expectingResponse = true;

            const ibGib = await getInteractionIbGib_V1({ data });
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async canHandleSemantic_stop(info: SemanticInfo): Promise<boolean> {
        const lc = `${this.lc}[${this.canHandleSemantic_stop.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d8444692b2adecc38106c09b7dd57322)`); }
            if (this.nothingToWorkOnAvailable) {
                debugger;
                console.log(`${lc} nothing to work on. returning false. (I: 8bd42da50367466da9e21886ff6a0f8b)`)
                return false;
            }

            return this.expectingResponse;
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async handleSemantic_stop(info: SemanticInfo): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.handleSemantic_stop.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 7786969633e1459c9a6991c7c5a15954)`); }

            // cancel stimulation
            this.expectingResponse = false;
            // what else? todo: extra stimulation cancellation when stop issued

            const speech = this._robbotLex.get(SemanticId.stop, {
                props: props =>
                    props.semanticId === SemanticId.stop,
            });

            const data: RobbotInteractionData_V1 = {
                uuid: await h.getUUID(),
                timestamp: h.getTimestamp(),
                type: RobbotInteractionType.stimulation,
                commentText: speech.text,
            };

            const ibGib = await getInteractionIbGib_V1({ data });
            return ibGib;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    // #endregion semantic handlers

    protected async doCmdActivate({
        arg,
    }: {
        arg: RobbotCmdIbGib,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdActivate.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let result = await super.doCmdActivate({ arg });

            await this.ready;

            await this.completeSessionIfNeeded({ sayBye: false });
            await this.initializeContext({ arg });
            if (!this._brainCommentIbGibs) { await this.initializeBrain(); }
            await this.startSession();

            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    // protected async doCmdDeactivate({
    //     arg,
    // }: {
    // arg: RobbotCmdIbGib,
    // }): Promise<IbGib_V1> {
    //     const lc = `${this.lc}[${this.doCmdDeactivate.name}]`;
    //     try {
    //         if (logalot) { console.log(`${lc} starting...`); }
    //         if (this._currentWorkingContextIbGib) {
    //             await this.completeSessionIfNeeded({ sayBye: false });
    //         }
    //         return ROOT;
    //     } catch (error) {
    //         console.error(`${lc} ${error.message}`);
    //         throw error;
    //     } finally {
    //         if (logalot) { console.log(`${lc} complete.`); }
    //     }
    // }

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

            await this.ready;

            await this.lookAt({ ibGibs: arg.ibGibs });

            await this.initializeBrain(); // shotgun approach here...

            return ROOT;
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

            await this.ready;

            await this.completeSessionIfNeeded({ sayBye: true });
            await this.initializeContext({ arg });
            if (!this._brainCommentIbGibs) { await this.initializeBrain(); }
            await this.startSession();
            await this.promptNextInteraction({ isClick: true });

            // const textInfo = this.getTextInfo({ srcIbGib: this._currentWorkingComment });

            // if (textInfo.lines.length === 1) {
            //     // just a single line comment, do a fill-in-the-blank for now and clear the current ibgib.
            //     let words = textInfo.text
            //         .split(/\b/) // split into words
            //         .map(x => x.trim()) // trim those that are just blank spaces
            //         .filter(x => x.length > 2)
            //         ; // filter out those blank space trimmed, now-empty strings
            //     if (words.length > 0) {
            //         // we have a decent enough word
            //         let aWord = pickRandom({ x: words });
            //         let textWithBlank = textInfo.text.replace(aWord, '______');
            //         await this.createCommentAndRel8ToContextIbGib({ text: textWithBlank, contextIbGib: this._currentWorkingContextIbGib });
            //     } else {
            //         // only short words or just empty space
            //     }

            //     // since it's just a one liner, we're done working this particular comment.
            //     delete this._currentWorkingComment;
            // } else if (textInfo.paragraphs.length === 1) {
            //     // multiple lines, single paragraph
            // } else {
            //     // multiple lines & paragraphs
            // }

            return ROOT;

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

            await this.ready;

            // const space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });
            if (!this._brainCommentIbGibs) { await this.initializeBrain(); }

            // at this point, we should have all of the related ibgibs that we
            // care about loaded into this.cacheIbGibs and this.cachedLatestAddrsMap is populated.
            // we should be able to do any analysis on them that we wish.


            if (!this._analysis) {
                // no existing analysis yet, so create and rel8 to it
                await this.analyze_Robbot({ saveInSpace: true });
                const analysisText = await this.getAnalysisOutputText({ analysisIbGib: this._analysis });

                await this.createCommentAndRel8ToContextIbGib({
                    text: analysisText,
                    contextIbGib: arg.ibGibs[0],
                });
            } else {
                // previous analysis exists,
            }

            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getTextAnalysisForIbGib({
        ibGib,
        createIfNone,
    }: {
        ibGib: IbGib_V1,
        createIfNone?: boolean,
    }): Promise<WordyAnalysisIbGib_V1_Text> {
        const lc = `${this.lc}[${this.getTextAnalysisForIbGib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 783cdaf1b9d5eab059879f3791ed7d22)`); }

            // first check to see if an analysis already exists in local space
            if (!this._analysis) { await this.analyze_Robbot({}) }
            console.dir(ibGib);
            const timestamp = h.getTimestamp();
            const timestampInTicks = getTimestampInTicks(timestamp);

            const analysisIb = getTextIbGibAnalysisIb({
                ibGib,
                robbot: this,
                timestampInTicks,
            });

            let gibInfo = getGibInfo({ gib: ibGib.gib });

            let x: WordyAnalysisData_V1_Text = {
                interactionCount: 0,
                srcTjpGib: gibInfo.tjpGib,
                stimulationCount: 0,
                textInfo: this.getTextInfo({ srcIbGib: <CommentIbGib_V1>ibGib }),
                timestamp_LastInteraction: null,
                timestamp_LastStimulation: null,
                timestamp_Scheduled: addTimeToDate({ days: 1 }).toUTCString(),
            }

            // let existing = null;
            // const tryGet: () => WordyAnalysisIbGib_V1_Text = () => {
            //     const lc = `${tryGet.name}]`;
            //     try {
            //         if (logalot) { console.log(`${lc} starting... (I: 3a51e3da4611caba7b6e0cf9fc108422)`); }

            //         this.ibgibsSvc.get({ addrs: })
            //     } catch (error) {
            //         console.error(`${lc} ${error.message}`);
            //         throw error;
            //     } finally {
            //         if (logalot) { console.log(`${lc} complete.`); }
            //     }

            // }

            // let data: WordyAnalysisData_V1_Text = {

            // };

            throw new Error(`not impl (E: 28fa83fa67cf5055160c5915aeb48d22)`);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * This is like loading a scene in a video game. We are initializing what
     * the robbot knows insofar as ibgibs that it has seen and analyses.
     */
    private async initializeBrain(): Promise<void> {
        const lc = `${this.lc}[${this.initializeBrain.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c3a5aadc40ebcb63da6adbe67dca3a22)`); }

            delete this._brainLookProjection;
            delete this._brainCommentIbGibs;

            const space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });

            if (!this._brainLookProjection) {
                this._brainLookProjection = await this.getAllIbGibsWeCanLookAt({ space });
            }
            if (!this._brainLookProjection) { throw new Error(`(UNEXPECTED) unable to get current working look projection? (E: ef1d13fdc201ceb612f7339578c65622)`); }

            if (!this._brainCommentIbGibs) {
                this._brainCommentIbGibs = await this.getCommentIbGibs({
                    lookProjection: this._brainLookProjection,
                });
            }
            if (!this._brainCommentIbGibs) { throw new Error(`(UNEXPECTED) unable to get current working comment ibgibs? (E: 474bc448ee974f0cb17d85a225d63191)`); }
            if (this._brainCommentIbGibs.length === 0) {
                if (logalot) { console.info(`${lc} nothing available to work on (haven't looked at any ibgibs) (I: 816a82fe9aab41d5905d2933fa8a8682)`); }
                this.nothingToWorkOnAvailable = true;
            } else {
                if (logalot) { console.info(`${lc} we do have comment ibgibs in our brain (that we have looked at). (I: 439c854c030246ccb256b851318e610f)`); }
                this.nothingToWorkOnAvailable = false;
            }

            // check for any currently scheduled

            // when choosing a comment, we should know what comments need choosing...
            // or pick random one at start...hmmm
            // this._currentWorkingComment =
            //     pickRandom({ x: this._brainCommentIbGibs });
            // if (logalot) { console.log(`${lc} current working comment set. addr: ${h.getIbGibAddr({ ibGib: this._currentWorkingComment })} (I: 78a694ba366f1c3871710dbfd9b75122)`); }
            // this._currentWorkingCommentTjpAddr =
            //     getTjpAddr({ ibGib: this._currentWorkingComment, defaultIfNone: 'incomingAddr' });
            // load/create the analysis for the current working comment

            // this._currentWorkingCommentAnalysis =
            //     await this.getTextAnalysisForIbGib({ ibGib: this._currentWorkingComment, createIfNone: true });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * (sketching...)
     * when choosing the next ibgib, we sometimes want to pick ones that are scheduled.
     */
    protected async getScheduledIbGibs(): Promise<IbGib_V1[]> {
        const lc = `${this.lc}[${this.getScheduledIbGibs.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: ff2917d064266a801d6b8886e8873e22)`); }
            const individualIbGibAnalysisAddrs = this._analysis?.rel8ns?.analysis ?? [];
            throw new Error(`not impl. need to somehow get the individual analysis ibgibs and filter for those that are scheduled (E: 6fddd77650ac2ec997105a362a111122)`);
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
            if (logalot) { console.log(`${lc} starting... (I: 6845a434406d716d13b853e71d3a8f22)`); }

            const addr = h.getIbGibAddr({ ibGib: newChild });
            if (this.alreadyHandledContextChildrenAddrs.includes(addr)) {
                if (logalot) { console.log(`${lc} already handled, returning early: ${addr} (I: b706438b6da5744575efa3e2abc3dd22)`); }
                return; /* <<<< returns early */
            } else {
                this.alreadyHandledContextChildrenAddrs.push(addr);
            }

            if (this.isMyComment({ ibGib: newChild })) {
                if (logalot) { console.log(`${lc} my comment, returning early: ${addr} (I: 6c67d24b946f455fafaaf7069d702191)`); }
                return; /* <<<< returns early */
            }

            // if it's not a comment, then we're just going to look at it/remember it,
            // i.e. add it to our rel8d ibgibs. if it IS a comment, then we need to
            // handle it depending on what our state is. Usually it's either a request for
            // us or an answer/response to something we've done.
            if (isRequestComment({ ibGib: newChild, requestEscapeString: this.data.requestEscapeString })) {
                await this.promptNextInteraction({ ibGib: newChild, isRequest: true });
            } else if (isComment({ ibGib: newChild }) && this.session) {
                if (this.expectingResponse) {
                    // in the middle of a session and someone else's comment has come to us
                    // there will be an issue if the robbot chooses to import a request ibgib...hmm
                    await this.promptNextInteraction({ ibGib: newChild, isRequest: false });
                } else {
                    if (logalot) { console.log(`${lc} new nonRequest ibgib detected, but this.expectingResponse is false. ignoring. (I: 2f6d6e826ff44f26faaa4006ca1a5322)`); }
                    return; /* <<<< returns early */
                }
            } else {
                // not a request and not a comment during a session
                debugger;
                console.warn(`${lc} (UNEXPECTED) hmm, i thought this would only trigger while a session is in play... (W: c54c7d472cca423aae01b10ef95785a45)`)
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async handleRequest_FillInTheBlankResponse({ ibGib }: { ibGib: IbGib_V1 }): Promise<void> {
        const lc = `${this.lc}[${this.handleRequest_FillInTheBlankResponse.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: aad32cf70a560e6661887d68679edb22)`); }
            // if it's exactly correct
            // if it's practically correct (ignore case, punctuation)
            // if it's largely correct (includes letters above threshold)
            // if it's wrong
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Performs aggregate analysis across all of given `commentIbGibs`, as well
     * as individual analyses per individual ibgib.
     */
    private async analyze_Robbot({
        saveInSpace,
    }: {
        saveInSpace?: boolean;
    }): Promise<void> {
        const lc = `${this.lc}[${this.analyze_Robbot.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 128d07e8fdc1a1d79a1b54dd83caeb22)`); }

            let commentIbGibs = this._brainCommentIbGibs;

            if (!commentIbGibs) { throw new Error(`commentIbGibs required (E: c6a983bf16cfe2e5aa48934499f53322)`); }
            if (commentIbGibs.length === 0) {
                console.warn(`${lc} (UNEXPECTED) commentIbGibs.length 0? (W: a433761eed37a831378f654ce8bb4422)`);
                return; /* <<<< returns early */
            }

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
            const timestamp = h.getTimestamp();
            const timestampInTicks = getTimestampInTicks(timestamp);
            const ib = getRobbotAnalysisIb({ robbot: this, timestampInTicks });
            const data: WordyAnalysisData_V1_Robbot = {
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

            // at this point, if we already have an analysis we want to mut8 its data.
            // if we don't have an existing analysis, then we want to create a new one.

            // let analysisIbGib: WordyAnalysisIbGib_V1_Robbot;
            debugger;
            let resTransform: TransformResult<IbGib_V1>;
            if (this._analysis) {
                // yes existing analysis, mut8 that
                resTransform = await mut8({
                    type: 'mut8',
                    src: this._analysis,
                    dataToAddOrPatch: data,
                    // linkedRel8ns: [Rel8n.ancestor],
                    dna: false,
                    nCounter: true,
                });

            } else {
                // no existing analysis, create new
                // const rel8ns: WordyAnalysisRel8ns_V1_Robbot = {
                // ancestor: [`robbot_analysis ${this.data.classname}^gib`],
                // };

                resTransform = await factory.firstGen<WordyAnalysisData_V1_Robbot>({
                    parentIbGib: factory.primitive({ ib: `${ROBBOT_ANALYSIS_ATOM} ${this.data.classname}` }),
                    ib, data, // rel8ns,
                    dna: false,
                    nCounter: true,
                    tjp: { timestamp: true, uuid: true },
                });
            }
            this._analysis = <WordyAnalysisIbGib_V1_Robbot>resTransform.newIbGib;

            if (saveInSpace) { await this.ibgibsSvc.persistTransformResult({ resTransform }); }

            await this.rel8To({
                ibGibs: [this._analysis],
                rel8nName: WORDY_V1_ANALYSIS_REL8N_NAME,
                linked: true, // only keep the most recent analysis
            });
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
                const latestCommentIbGib = this._cacheIbGibs[latestAddr];
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

    /**
     * Builds output text that is "spoken" when doing an analysis.
     */
    private async getAnalysisOutputText({ analysisIbGib }: { analysisIbGib: WordyAnalysisIbGib_V1_Robbot }): Promise<string> {
        const lc = `${this.lc}[${this.getAnalysisOutputText.name}]`;
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

        if (commentAddrs.length === 0) { return []; /* <<<< returns early */ }

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
            if (!this._cacheIbGibs[latestAddr] && !latestAddrsToGet.includes(latestAddr)) {
                latestAddrsToGet.push(latestAddr);
            }
        }
        if (latestAddrsToGet.length > 0) {
            const resGetLatestIbGibs = await getFromSpace({ addrs: latestAddrsToGet, space });
            if (resGetLatestIbGibs.success && resGetLatestIbGibs.ibGibs?.length === latestAddrsToGet.length) {
                for (let i = 0; i < resGetLatestIbGibs.ibGibs.length; i++) {
                    const latestIbGib = resGetLatestIbGibs.ibGibs[i];
                    this._cacheIbGibs[h.getIbGibAddr({ ibGib: latestIbGib })] = latestIbGib;
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
            allRel8dIbGibs.forEach(x => { this._cacheIbGibs[h.getIbGibAddr({ ibGib: x })] = x; });

            /**
             * we want to get all of the children of our ibgibs
             */
            const lookProjection = await getGraphProjection({
                ibGibs: allRel8dIbGibs,
                onlyRel8nNames: this.data.lookRel8nNames.split(','),
                space
            });
            Object.values(lookProjection).forEach(x => { this._cacheIbGibs[h.getIbGibAddr({ ibGib: x })] = x; });
            return lookProjection;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    // #region validate

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

    // #endregion validate

    // #region session

    protected async startSession(): Promise<void> {
        const lc = `${this.lc}[${this.startSession.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 78762a22d30c12d23ca01465f2d6ce22)`); }

            if (this.session) {
                console.warn(`${lc} session already in progress. closing... (W: 2ad4b4b4934e84b76f0a85262cdc9622)`);
                await this.completeSessionIfNeeded({ sayBye: false });
            }

            if (!this._currentWorkingContextIbGib) { throw new Error(`current working context should already be initialized (E: 9163e7cc8cc68d63d7d29954b688f222)`); }

            const contextIbGib = this._currentWorkingContextIbGib;

            const timestamp = h.getTimestamp();
            const timestampInTicks = getTimestampInTicks(timestamp);
            const contextTjpAddr = getTjpAddr({ ibGib: contextIbGib });
            const contextTjpGib = h.getIbAndGib({ ibGibAddr: contextTjpAddr }).gib;
            const sessionId = await h.getUUID();

            // build custom ibgib (always remember to calculate the gib!)
            // no dna for sessions, because it doesn't make sense
            const data: WordyRobbotSessionData_V1 = {
                timestamp,
                uuid: sessionId,
                n: 0,
                isTjp: true,
                '@context': h.getIbGibAddr({ ibGib: contextIbGib }),
                '@contextTjp': contextTjpAddr,
            };
            const rel8ns: WordyRobbotSessionRel8ns_V1 = {
                ancestor: [`${ROBBOT_SESSION_ATOM}^gib`],
            }
            const sessionIbGib: WordyRobbotSessionIbGib_V1 = {
                ib: getRobbotSessionIb({ robbot: this, timestampInTicks, contextTjpGib, sessionId }),
                data,
                rel8ns,
            };
            sessionIbGib.gib = await getGib({ ibGib: sessionIbGib, hasTjp: true })

            this.session = sessionIbGib;
            this.interactions = [];

            // rel8 to the session itself
            await this.rel8To({ ibGibs: [sessionIbGib], rel8nName: ROBBOT_SESSION_REL8N_NAME })
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

    protected async updateSessionWithInteraction({
        interaction
    }: {
        interaction: RobbotInteractionIbGib_V1
    }): Promise<void> {
        const lc = `${this.lc}[${this.updateSessionWithInteraction.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: f0035587214223f7eb31d7550be27722)`); }

            const interactionAddr = h.getIbGibAddr({ ibGib: interaction });

            // rel8 interaction to the current session
            const resRel8Interaction = await rel8({
                type: 'rel8',
                src: this.session,
                rel8nsToAddByAddr: { [ROBBOT_INTERACTION_REL8N_NAME]: [interactionAddr], },
                dna: true,
                nCounter: true,
            });

            // save the session (to the current local user space)
            await this.ibgibsSvc.persistTransformResult({ resTransform: resRel8Interaction });

            // update the properties for this robbot
            this.session = <WordyRobbotSessionIbGib_V1>resRel8Interaction.newIbGib;
            this.interactions.push(h.clone(interaction)); // interaction should be state only, no refs
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    // #endregion session

    /**
     * Takes the current robbot's state (e.g. analysis), context state of call
     * (is a click, is a request, what kind of request, etc.) and reacts to this
     * stimulus via an interaction in the Context ibgib (the ibgib within which
     * we're talking with the robbot).
     *
     * "Applying" this interaction to the Context ibgib most likely equates to
     * adding a comment from the robbot to the context ibgib like, e.g., a comment
     * with text "Hi. Your next line is ________" or similar.
     *
     * So the "prompt" in this function name is like "add comment to context".
     */
    protected async promptNextInteraction({
        ibGib,
        isRequest,
        isClick,
    }: StimulusForRobbot): Promise<void> {
        const lc = `${this.lc}[${this.promptNextInteraction.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 5e9f1b368c7a059a3d944b1be153c922)`); }

            // get next interaction per stimulus, but don't execute yet
            const interaction = await this.getNextInteraction({ ibGib, isRequest, isClick });

            // save the interaction, no need to register with local space via
            // `this.ibgibsSvc.registerNewIbGib` call, because we don't need a
            // timeline as we are not intending on updating the interaction
            // going forward.
            await this.ibgibsSvc.put({ ibGib: interaction });

            // create the interaction output and apply it to the current
            // context. atow, this means create a comment with text based on the
            // interaction and relate that comment to the context.
            await this.applyInteractionToContext({ interaction });

            // update the session with the interaction to reflect that we have
            // executed it in the current context
            await this.updateSessionWithInteraction({ interaction });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async applyInteractionToContext({
        interaction,
    }: {
        interaction: RobbotInteractionIbGib_V1,
    }): Promise<void> {
        const lc = `${this.lc}[${this.applyInteractionToContext.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e49db27e155bc20bb360a5bc36269422)`); }
            await this.createCommentAndRel8ToContextIbGib({
                text: await this.getOutputText({ text: interaction.data.commentText }),
                contextIbGib: this._currentWorkingContextIbGib,
            });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getNextStimulation(): Promise<StimulationDetails> {
        const lc = `${this.lc}[${this.getNextStimulation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 3b5112795cebe1d56a9a11c624180322)`); }

            let details: StimulationDetails;
            const toStimulateAddr = h.getIbGibAddr({ ibGib: this._currentWorkingComment });
            const toStimulateTjpAddr = this._currentWorkingCommentTjpAddr;


            // if (!this._currentWorkingCommentIbGibsAnalysisMap) {
            //     this._currentWorkingCommentAnalysis =
            //         await this.getTextAnalysisForIbGib({ ibGib: this._currentWorkingComment, createIfNone: true });
            // }
            // let analysis = this._currentWorkingCommentAnalysis // shorter variable

            // use analysis to get the next stimulation

            let randomStimulationType = pickRandom<StimulationType>({ x: Object.values(StimulationType) });
            switch (randomStimulationType) {
                case 'just_show':
                    // no details
                    details = await this.getNextStimulation_JustShow({ toStimulateAddr, toStimulateTjpAddr });
                    break;
                case 'blank_words':
                    details =
                        await this.getNextStimulation_BlankWords({ toStimulateAddr, toStimulateTjpAddr });
                    break;
                default:
                    throw new Error(`unknown stimulation type: ${randomStimulationType} (E: 19d29e48868ec7cc4b3d2fa9ab5ac622)`);
            }
            return details;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getNextStimulation_JustShow({
        toStimulateAddr,
        toStimulateTjpAddr,
    }: {
        toStimulateAddr: IbGibAddr,
        toStimulateTjpAddr: IbGibAddr,
    }): Promise<StimulationDetails> {
        const lc = `${this.lc}[${this.getNextStimulation_JustShow.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 3e375d090dbb52c5865381c90ee09122)`); }
            const details: StimulationDetails = {
                stimulationType: 'just_show',
                "@toStimulate": toStimulateAddr,
                "@toStimulateTjp": toStimulateTjpAddr,
            };
            return details;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    protected async getNextStimulation_BlankWords({
        toStimulateAddr,
        toStimulateTjpAddr,
    }: {
        toStimulateAddr: IbGibAddr,
        toStimulateTjpAddr: IbGibAddr,
    }): Promise<StimulationDetails> {
        const lc = `${this.lc}[${this.getNextStimulation_BlankWords.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 3e375d090dbb52c5865381c90ee09122)`); }
            const { text } = this._currentWorkingComment.data;
            if (!text) { throw new Error(`currentWorkingComment.data.text required (E: 732341ddc7ba531a1aaf465c95d9a322)`); }

            const regexWords = /[\w\-']+/g;
            const words = text.match(regexWords)
                .filter(x => !!x)
                .filter(x => !x.startsWith('http'))
                .filter(x => !x.startsWith('www'))
                .map(x => x.toLowerCase());

            const uniqueWords = unique(words);

            const blankedWords: string[] = [];

            // to blank out a word, we need at least 2! Otherwise, abort blank out and do a different stimulation,
            // and return early!
            if (uniqueWords.length < 2) {
                /* <<<< returns early */
                return await this.getNextStimulation_JustShow({ toStimulateAddr, toStimulateTjpAddr });
            }

            if (uniqueWords.length <= 5) {
                // arbitrary small-ish number of words so just blank out one
                blankedWords.push(pickRandom({ x: uniqueWords }))
            } else {
                // arbitrary large-ish number of words so blank out more than one
                const numToBlankOut = Math.ceil(uniqueWords.length / 5);
                const maxBlanksPerBlankOut = 3;
                for (let i = 0; i < numToBlankOut; i++) {
                    const uniqueWordPool = uniqueWords.filter(x => !blankedWords.includes(x));
                    blankedWords.push(pickRandom({ x: uniqueWordPool }))
                    if (blankedWords.length === maxBlanksPerBlankOut) { break; }
                }
            }

            // now that we have our blanked words, take the incoming text,
            // replace those words with the blanks, and include this in our
            // details.

            /**
             * output from original text that includes possible uppercases that
             * do not match the unique words (since those are all lowercased).
             */
            let textWithBlanks: string = text.concat();
            /**
             * we will update this for finding the indexes and go by position,
             * because the original text will have uppercases that we want to
             * replace.
             */
            let lowerText = text.toLowerCase();
            /**
             *
             * @param word lowercased word that provides the length
             * @param pos position of the word
             */
            const fnBlankOutWord: (s: string, word: string, pos: number) => string = (s, word, pos) => {
                let res: string = s.concat();
                for (let i = 0; i < word.length; i++) {
                    res = replaceCharAt({ s: res, pos, newChar: '_' });
                }
                return res;
            };

            // execute the blanking out of words
            for (let i = 0; i < blankedWords.length; i++) {
                const wordToBlank = blankedWords[i];
                while (lowerText.includes(wordToBlank)) {
                    let pos = lowerText.indexOf(wordToBlank);
                    // replace in our lowerText so we don't find it again next iteration
                    lowerText = fnBlankOutWord(lowerText, wordToBlank, pos);
                    // mirror in our output text which may have uppercased letters (and not match exactly)
                    textWithBlanks = fnBlankOutWord(textWithBlanks, wordToBlank, pos);
                }
            }

            // at this point, the textWithBlanks should have the same exact text
            // as the incoming text, but with word(s) blanked out.

            const details: StimulationDetails_BlankWords = {
                stimulationType: 'blank_words',
                "@toStimulate": toStimulateAddr,
                "@toStimulateTjp": toStimulateTjpAddr,
                blankedWords,
                commentText: textWithBlanks,
            };

            return details;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getNextInteraction({
        ibGib,
        isRequest,
        isClick,
    }: StimulusForRobbot): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.getNextInteraction.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e12984bfb94e5fa4fff95bdf57a3dd22)`); }
            if (!ibGib && !isClick) { throw new Error(`either ibGib or isClick required. (E: 6d148b641d322ae44f5cd8fe0bda1d22)`); }
            if (ibGib && isClick) { throw new Error(`(UNEXPECTED) ibGib expected to be falsy if isClick is true. (E: 9062f682e9aa40247fdfb7d7eebf6922)`); }

            if (isClick) {
                if (!this.session) { throw new Error(`(unexpected) session expected to exist at this point (E: 15c5cf99f4864942fbc8e6b42da4d922)`); }
                if (this.prevInteraction) {
                    // the user doesn't know there is already a session started? Or
                    // something else? just ping the user that a session is in
                    // progress and ask what's up, give the short help command
                    return await this.getNextInteraction_PerRequest({
                        semanticId: SemanticId.help,
                    });
                } else {
                    // just starting session.
                    return await this.getNextInteraction_PerRequest({
                        semanticId: SemanticId.hello,
                    });
                }
            } else if (isRequest) {
                // someone has issued a request
                return await this.getNextInteraction_PerRequest({ request: ibGib });
            } else {
                // ibgib added to context that may be a response to a
                // question, or is not relevant (but it isn't a request)
                return await this.getNextInteraction_PerNonRequest({ nonRequest: ibGib });
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getNextInteraction_PerRequest({
        request,
        semanticId,
    }: {
        request?: IbGib_V1,
        semanticId?: SemanticId,
    }): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.getNextInteraction_PerRequest.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e12984bfb94e5fa4fff95bdf57a3dd22)`); }

            // validate
            if (!request && !semanticId) { throw new Error(`either request or semanticId required (E: 47bb984a4214c2cde6c7b5ef1c195b22)`); }

            // get the semanticId
            if (!semanticId) { semanticId = this.getSemanticIdFromRequest({ request }); }
            if (!semanticId) { throw new Error(`(UNEXPECTED) semanticId not provided and not able to be gotten? (E: a03c04f2d5b16a05ff05cfcb10b60c22)`); }

            // get our handlers that correspond to this semanticId at this point in time
            const info: SemanticInfo = { semanticId, request, };
            const handlersThatCanExecute =
                await this.getHandlersThatCanExecute({ semanticId, info });
            if (handlersThatCanExecute.length === 0) { throw new Error(`no handlers anywhere and what up with no default handler? (E: e1fc96c2ea63abbe1c02fffff4f41322)`); }

            // get the interaction produced in our pipeline of handlers that can
            // execute. in the future, this can be smarter than simply returning
            // the first truthy interaction, including executing multiple paths
            // concurrently and choosing among them depending on, e.g., an
            // evaluation metric
            const interaction = await this.getInteractionFromHandlerPipeline({
                info,
                handlerPipeline: handlersThatCanExecute,
            });
            if (!interaction) { throw new Error(`no interaction produced. (E: d839ef8709d1793868ce9a2f8558e622)`); }

            // we're done
            return interaction;
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected getSemanticIdFromRequest({
        request,
    }: {
        request: IbGib_V1,
    }): WordySemanticId {
        const lc = `${this.lc}[${this.getSemanticIdFromRequest.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 55f29fba4f37d2749bfc83d51bea4822)`); }

            let semanticId: WordySemanticId;
            const requestText =
                getRequestTextFromComment({ ibGib: request, lowercase: true }) ||
                WORDY_V1_DEFAULT_REQUEST_TEXT.toLowerCase();

            // we're getting naive requestId, but may be unnecessary as we also
            // check matching against the datum starting with the entire request
            const requestPieces = requestText.split(' ');
            if (requestPieces.length === 0) {
                console.error(`${lc} (UNEXPECTED) requestPieces.length === 0? request is truthy but requestText splits to nothing? funky junk. (E: fdd2cc6ce93842e485cd44e15a695c9a)`)
                return SemanticId.unknown; /* <<<< returns early */
            }
            const requestId = requestPieces[0];

            // map from the request text to a semantic id
            // const semanticId: SemanticId = SemanticId.help;
            const resRequestText = this._userLex.find({
                fnDatumPredicate: d => {
                    // paranoid/convenient place to check for malformed lex data
                    if ((d.texts ?? [])?.length === 0) {
                        console.error(`${lc} invalid lex data. datum is empty. d: ${h.pretty(d)} (E: 39dafc29ff934932b4e87cc4b2788baf)`);
                        return false;
                    }

                    // must account for when request is multiple words like
                    // "hello there".  CLIs nowadays think we should have to
                    // surround things with quotes but we should be able to
                    // handle this (synonyms, spaces, ...).  but if the request
                    // text is 'h', then we shouldn't match up with any request
                    // that starts with h.
                    const datumIsRequest = d.props?.isRequest;
                    const datumFirstText = d.texts[0].toLowerCase();
                    const matchesRequestId = datumFirstText === requestId;
                    /** remove non word/keep only spaces, so regexp is guaranteed here */
                    const safeRequestText = getSaferSubstring({ text: requestText, keepLiterals: [' '] });
                    /**
                     * Do the same for datum, so we can include things like
                     * apostrophes for contractions and still match up in the
                     * regular expression
                     */
                    const safeDatumFirstText = getSaferSubstring({ text: datumFirstText, keepLiterals: [' '] });
                    const requestStartsWithDatumText = !!safeRequestText.match(new RegExp(`^${safeDatumFirstText}(\\s|$)`));
                    return datumIsRequest && (matchesRequestId || requestStartsWithDatumText);
                }
            });
            if (resRequestText?.length === 1) {
                const resId = resRequestText[0];
                // id found, but is it semantic id?
                const semanticIds = Object.values(WordySemanticId);
                if (logalot) { console.log(`${lc} semanticIds: ${semanticIds} (I: 1a37a42d7c276ab6f8d0d16f3cb3be22)`); }
                if (semanticIds.includes(<any>resId)) {
                    // semantic id found
                    semanticId = <WordySemanticId>resId;
                } else {
                    // text found but not a semantic id? equate this with not found
                    console.warn(`${lc} id found but not a known semantic id: ${resId} (W: 01729fb7a4e94f20a42436f3c957bb44)`)
                    semanticId = SemanticId.unknown;
                }
            } else if (resRequestText?.length > 1) {
                // multiple found? this is a problem with the data
                debugger;
                throw new Error(`(UNEXPECTED) multiple ids found from user requestText (${requestText})? todo: confirm what user said workflow not implemented yet (E: 8e1f4c7c0e757b5e9126bf4f5213ca22)`);
            } else {
                // not found
                semanticId = SemanticId.unknown;
            }

            return semanticId;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getHandlersThatCanExecute({
        semanticId,
        info,
    }: {
        semanticId: string,
        info: SemanticInfo,
    }): Promise<SemanticHandler[]> {
        const lc = `${this.lc}[${this.getHandlersThatCanExecute.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c272043e6dd6697f0f07367bc4917622)`); }

            let handlers = this._semanticHandlers[semanticId] ?? [];
            if (handlers.length === 0) { handlers = this._semanticHandlers[SemanticId.default] ?? []; }
            if (handlers.length === 0) { throw new Error(`semanticId (${semanticId}) not found and no SemanticId.default handler found either. (E: 39a1cd4803e999df8e26512418ac0f22)`); }

            /** first determine which handlers can execute */
            const handlersThatCanExecute: SemanticHandler[] = [];
            const fnGetHandlers = async () => {
                for (let i = 0; i < handlers.length; i++) {
                    const handler = handlers[i];
                    const canExec = handler.fnCanExec ?
                        await handler.fnCanExec(info) :
                        true;
                    if (canExec) {
                        debugger;
                        handlersThatCanExecute.push(handler);
                    } else {
                        if (logalot) { console.log(`${lc} handler canExec false (${handler.semanticId}, ${handler.handlerId}) (I: 5fd34c847eff556214f098f22b4c3622)`); }
                    }
                }
            };

            await fnGetHandlers();

            if (handlersThatCanExecute.length === 0) {
                // try again with semanticId of default
                handlers = this._semanticHandlers[SemanticId.default] ?? [];
                if (handlers.length === 0) { throw new Error(`found no handlers that could execute and default handler not found (E: d82f110cd447068cbe8b994c5b3a7122)`); }
                await fnGetHandlers();
            }
            return handlersThatCanExecute;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getInteractionFromHandlerPipeline({
        info,
        handlerPipeline,
    }: {
        info: SemanticInfo,
        handlerPipeline: SemanticHandler[],
    }): Promise<RobbotInteractionIbGib_V1 | undefined> {
        const lc = `${this.lc}[${this.getInteractionFromHandlerPipeline.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 32002e238b66cc222d5cf52dce141822)`); }

            let interaction: RobbotInteractionIbGib_V1;
            for (let i = 0; i < handlerPipeline.length; i++) {
                const handler = handlerPipeline[i];
                const lcHandler = `${lc}[handler][${handler.handlerId}]`
                if (logalot) { console.group(lcHandler); } // just trying out the grouping...
                try {
                    if (logalot) { console.log(`${lc} starting... (I: 4e952477f1e1554be6d5c0063a6a8822)`); }
                    interaction = await handler.fnExec(info);
                    if (interaction) {
                        if (logalot) { console.log(`${lcHandler} complete. YES interaction found from handler (${handler.semanticId}, ${handler.handlerId}). breaking for loop... (I: 994337ed6936ad16dddb0c7cec8ec622)`); }
                        break;
                    } else {
                        if (logalot) { console.log(`${lcHandler} complete. NO interaction not found for handler (${handler.semanticId}, ${handler.handlerId}) (I: f76ff3fb1a1b1a0976ac6e53e2d90b22)`); }
                    }
                } catch (error) {
                    console.error(`${lcHandler} ${error.message}`);
                    throw error;
                } finally {
                    if (logalot) { console.groupEnd(); }
                }
            }
            return interaction;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getNextInteraction_PerNonRequest({
        nonRequest,
    }: {
        nonRequest?: IbGib_V1,
    }): Promise<RobbotInteractionIbGib_V1> {
        const lc = `${this.lc}[${this.getNextInteraction_PerNonRequest.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 6bc390410be642518ff0babfc888d220)`); }

            debugger;
            throw new Error(`not impl yet (E: 121714b00e92505321c95e9792fec722)`);

            // if (!this.interactions) { this.interactions = []; } // inits here, maybe should elsewhere?

            // // create an interaction pool to choose from, but avoid using one
            // // we've already done at least one go round
            // const allInteractionTypes: WordyInteractionType[] = Object.values(WordyInteractionType);
            // const unusedInteractionTypes =
            //     allInteractionTypes.filter(x => !this.interactions.some(action => action.data.type === x))
            // const interactionPool = unusedInteractionTypes.length > 0 ?
            //     unusedInteractionTypes :
            //     allInteractionTypes;
            // if (logalot) { console.log(`${lc} interactionPool: ${interactionPool} (I: ba94059a6a80473ca26db7bc340ed4515)`); }

            // // for now, we're just picking a random type from the pool (without more advanced weighting)
            // const interactionType = pickRandom({ x: interactionPool });
            // if (logalot) { console.log(`${lc} chose interactionType ${interactionType} (I: 53eb344bf7e146f6b256b4a0d820f35a)`); }

            // return interactionType;
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

    lookRel8nNames: DEFAULT_LOOK_REL8N_NAMES_WORDY_ROBBOT,

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
            description: `Every ibgib relates to other ibgibs via a "rel8n name". When you add a comment, this adds an ibgib via the "comment" rel8n name. So when you show your robbot an ibgib, do you want him/her/them to see sub-comments "inside" that ibGib? If so, include "comment". What about comments on pics? If so, also include "pic" or it won't see the comment under the pics. Basically, just leave this as-is unless you only want the robbot to look at the ibgib itself and no children, in which case blank this out.`,
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
    timestampInTicks,
}: {
    robbot: WordyRobbot_V1,
    timestampInTicks: string,
}): Ib {
    const lc = `[${getRobbotAnalysisIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 1d5127e648d3b9ff9c0f44a7b978f422)`); }

        if (!robbot) { throw new Error(`robbot required (E: 86c35c658ed247e8a08804dffd4b55c2)`); }
        if (!robbot.data?.name) { throw new Error(`robbot.data.name required (E: 41770e7d9100499ba8e2da7770f241fc)`); }
        if (!robbot.data.classname) { throw new Error(`robbot.data.classname required (E: f9285fff1b0d4270857c9638c3f5c16a)`); }
        if (!robbot.data.uuid) { throw new Error(`robbot.data.uuid required (E: ef4629170e6b4a0a97098fb49c5a9ccf)`); }
        if (!timestampInTicks) { throw new Error(`timestampInTicks required (E: baaab4f1ba124870aeec7f202801274e)`); }

        const { name, classname, uuid } = robbot.data;
        const robbotTjpGib = getGibInfo({ gib: robbot.gib }).tjpGib;

        return `robbot_analysis ${timestampInTicks} ${name} ${classname} ${uuid} ${robbotTjpGib}`;
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
    timestampInTicks: string,
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

        const [_, timestampInTicks, robbotName, robbotClassname, robbotId, robbotTjpGib] = ib.split(' ');
        return { timestampInTicks, robbotName, robbotClassname, robbotId, robbotTjpGib, };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}


function getTextIbGibAnalysisIb({
    ibGib,
    timestampInTicks,
    robbot
}: {
    ibGib: IbGib_V1,
    timestampInTicks: string,
    robbot: WordyRobbot_V1
}): Ib {
    const lc = `${getTextIbGibAnalysisIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: d807cf7306def33e0af721868996c122)`); }

        if (!ibGib) { throw new Error(`ibGib required (E: bab0f7a75db440e0b0817c56652026d3)`); }

        if (!timestampInTicks) { throw new Error(`timestampInTicks required (E: fb955ed503a8627f4fb2b318fd09c922)`); }

        if (!robbot) { throw new Error(`robbot required (E: 3b239c80ebf24c919af3001812b28a10)`); }
        if (!robbot.data?.name) { throw new Error(`robbot.data.name required (E: 079741e456684ed6868e32400990ef59)`); }
        if (!robbot.data.classname) { throw new Error(`robbot.data.classname required (E: a87b41dc4c624f3eafa6d8eb8bfa7399)`); }
        if (!robbot.data.uuid) { throw new Error(`robbot.data.uuid required (E: e7e08a54fa2340fd8809830ca39cee2d)`); }

        const { name, classname, uuid } = robbot.data;
        const robbotTjpGib = getGibInfo({ gib: robbot.gib }).tjpGib;

        // const ibGibAddr = h.getIbGibAddr({ ibGib });
        const { gib: ibGibGib } = h.getIbAndGib({ ibGib });

        return `${ROBBOT_ANALYSIS_ATOM} ${name} ${classname} ${uuid} ${robbotTjpGib} ${ibGibGib}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

function parseTextIbGibAnalysisIb({
    ib,
}: {
    ib: Ib,
}): {
    robbotName: string,
    robbotClassname: string,
    robbotId: string,
    robbotTjpGib: Gib,
    ibGibGib: Gib,
} {
    const lc = `[${parseTextIbGibAnalysisIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 4ad8b77670fa46fbae12cda6e1bfd411)`); }
        if (!ib) { throw new Error(`ib required (E: ab11d1b5ba09492eaf240b3ad251c543)`); }

        const pieces = ib.split(' ');
        if (pieces.length !== 6) { throw new Error(`invalid ib. should be space-delimited with 6 pieces, but there were ${pieces.length}. Expected pieces: atom, robbotName, robbotClassname, robbotId, robbotTjpGib, ibGibGib. (E: d6cae479cc0840b2a3e5aff18864664d)`); }

        const [_, robbotName, robbotClassname, robbotId, robbotTjpGib, ibGibGib] = ib.split(' ');
        return {
            robbotName, robbotClassname, robbotId, robbotTjpGib,
            ibGibGib,
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}



const TITLE_HEADING_REGEXP = /^\s*#+\s+.+$/;
/**
 * If text starts with '# ' or '## ', etc., then we'll consider it a heading.
 *
 * # driving use case
 *
 * I want to be able to consider a line in a multiline text (lyrics/poem/whatever)
 * to be the title or some other metadata.
 */
function isATitleHeading({
    text,
    regexp = TITLE_HEADING_REGEXP,
}: {
    text: string
    regexp?: RegExp,
}): boolean {
    const lc = `[${isATitleHeading.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: b3eee62ab59ffae806f45d2448a3de22)`); }

        const isSingleLine = !text.includes('\n');
        if (logalot) { console.log(`${lc} isSingleLine: ${isSingleLine} (I: 1309fbf3267478d54c48edee1f263c22)`); }

        const matchesRegexp = !!text.match(regexp);
        if (logalot) { console.log(`${lc} matchesRegexp: ${matchesRegexp} (I: 8aa44c44a72cb9deb30c64efb1c47c22)`); }

        return isSingleLine && matchesRegexp;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }

}

// function getNextLine({
//     prevLineNumber,
//     ibGib,
// }: {
//     prevLineNumber: number,
//     ibGib: CommentIbGib_V1,
// }): string {
//     const lc = `${getNextLine.name}]`;
//     try {
//         if (logalot) { console.log(`${lc} starting... (I: b5b2daf71f1b06d8fa6a5f03bdd6ae22)`); }
//         prevLineNumber = prevLineNumber ?? 0;
//     } catch (error) {
//         console.error(`${lc} ${error.message}`);
//         throw error;
//     } finally {
//         if (logalot) { console.log(`${lc} complete.`); }
//     }
// }
