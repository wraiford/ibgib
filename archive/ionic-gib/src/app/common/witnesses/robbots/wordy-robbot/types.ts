import * as h from 'ts-gib/dist/helper';
import { Gib, Ib, IbGibAddr, TransformResult } from 'ts-gib';
import {
    IbGib_V1, ROOT, Factory_V1 as factory, Rel8n,
    IbGibRel8ns_V1, isPrimitive, IbGibData_V1, Factory_V1, rel8, mut8,
} from 'ts-gib/dist/V1';

import * as c from '../../../constants';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
    SemanticId, SemanticHandler,
    RobbotPropsData,
    RobbotInteractionIbGib_V1,
    SemanticInfo,
} from '../../../types/robbot';
import { CommentIbGib_V1 } from '../../../types/comment';
// import { Stimulation, StimulationDetails, StimulationDetails_Blank, StimulationScope, StimulationTarget, StimulationType, WORDY_STIMULATORS } from './stimulators';

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
    "semantic_learn" |
    "semantic_blank" |
    // "semantic_lines" |
    "semantic_done" | "semantic_what_next" |
    "semantic_change_up" |
    SemanticId;
export const WordySemanticId = {
    ...SemanticId,
    learn: 'semantic_learn' as WordySemanticId,
    blank: "semantic_blank" as WordySemanticId,
    // lines: 'semantic_lines' as WordySemanticId,
    done: "semantic_done" as WordySemanticId,
    what_next: "semantic_what_next" as WordySemanticId,
    change_up: "semantic_change_up" as WordySemanticId,
}


export interface WordyRobbotPropsData extends RobbotPropsData<WordySemanticId> {
    /**
     * If reviewing lines, this flag indicates that it's the first line.
     * If doing a single line, this would indicate first word.
     * If a single word, first letter. etc
     */
    isFirst?: boolean;
    /**
     * If the lex entry is restricted to a specific stimulationType
     */
    stimulationScope?: StimulationScope;
}

// export type WordyLexKeywords =
// 'blankSlate';
// export const WordyLexKeywords = {
// blankSlate: 'blankSlate' as WordyLexKeywords,
// }

export type WordyContextFlag = 'all' | 'stimulators';

export interface CurrentWorkingInfo {
    ibGib: CommentIbGib_V1;
    addr: IbGibAddr;
    tjpAddr: IbGibAddr;
    textInfo?: WordyTextInfo;
    /**
     * interactions created prior to the current session that have info's ibgib
     * as a subject.
     *
     * @see {@link prevStimulations}
     */
    prevInteractions?: RobbotInteractionIbGib_V1[];
    /**
     * stimulations created prior to the current session that have info's ibgib
     * as a subject. this is a convenience projections of
     * {@link prevInteractions}.
     */
    prevStimulations?: Stimulation[];
}

export type StimulationScope =
    'all' | 'paragraph' | 'line' | 'word' | 'letter';
export const StimulationScope = {
    /**
     * the entirety of the ibgib/text.
     */
    'all': 'all' as StimulationScope,
    'paragraph': 'paragraph' as StimulationScope,
    'line': 'line' as StimulationScope,
    'word': 'word' as StimulationScope,
    'letter': 'letter' as StimulationScope,
    // pic
}
export type StimulationMetaType = 'elevating' | 'none';
export const StimulationMetaType = {
    elevating: 'elevating' as StimulationMetaType,
    none: 'none' as StimulationMetaType,
}
/**
 * There are various ways to stimulate an ibgib.
 */
export type StimulationType =
    'read' |
    'say' |
    'echo' |
    'blank' |
    'seed'
    ;
export const StimulationType = {
    /**
     * The user is just shown the source ibgib raw and asked to read it.
     */
    'read': 'read' as StimulationType,
    /**
     * The user is just shown the source ibgib raw and asked to say it aloud.
     */
    'say': 'say' as StimulationType,
    /**
     * The user is asked to echo (i.e. type) the given unit of type {@link StimulationScope}
     */
    'echo': 'echo' as StimulationType,
    /**
     * A unit of type {@link StimulationScope} is blanked out.
     *
     * The user is asked to provide the missing blank.
     */
    'blank': 'blank' as StimulationType,
    /**
     * The ibgib has been stimulated to full potential according to the robbot and
     * his/her/their strategy/opinion. Ask the user how to proceed with the ibgib, giving options
     * such as
     * * "renew"/"clone" for doing something very similar
     * * "split" for chunking the source as a reductionist
     * * "select" for condensing to loci
     * * "expound" for growing the ibgib.
     *
     * I'm not quite sure how this will look, but the idea is definitely
     * transition/transform after some amount of stimulation, possibly keeping
     * track of generations or "simply" using the ibgib forking mechanism.
     */
    'seed': 'seed' as StimulationType,
}
// export type StimulationPhase = 'prompt' | 'feedback';
// export const StimulationPhase = {
//     prompt: 'prompt' as StimulationPhase,
//     feedback: 'feedback' as StimulationPhase,
// }

export function getExpectsResponse({ stimulationType }: { stimulationType: StimulationType }): boolean {
    const lc = `[${getExpectsResponse.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 416b47d45164ab2194ebbdca893eec22)`); }
        switch (stimulationType) {
            case 'read': return false;
            case 'echo': return true;
            case 'blank': return true;
            case 'seed': return true;
            default: throw new Error(`unknown stimulationType: ${stimulationType} (E: 08200b453d891734bf5fd76cb0f98522)`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
export interface StimulationTarget {
    /**
     * Soft link to the tjp address (timeline) of the ibgib being stimulated.
     */
    '@toStimulateTjp': IbGibAddr;
    /**
     * Soft link to punctiliar address of the exact ibgib stimulated
     */
    '@toStimulate'?: IbGibAddr;
}
/**
 * Fundamental shape that describes stimulating ibgibs.
 *
 * In my driving use case, with Wordy Robbot especially, this
 * is for "learning" the material, i.e., creating, nurturing and
 * maintaining brain traces.
 */
export interface Stimulation {
    /**
     * Name of the stimulator who produced the stimulation.
     */
    stimulatorName: string;
    /**
     * The version of the stimulator who produced the stimulation.
     */
    stimulatorVersion: string;
    /**
     * UTC timestamp of the stimulation.
     */
    actualTimestampUTC: string;
    /**
     * UTC timestamp of when the stimulation had been scheduled for.
     */
    scheduledTimestampUTC?: string;
    /**
     * UTC timestamp of the next stimulation for the target(s).
     */
    nextScheduledTimestampUTC?: string;
    /**
     * type of stimulation, like is it a fill in the blank or just showing the
     * ibgib.
     * @see {@link StimulationType}
     */
    stimulationType: StimulationType;
    stimulationMetaType?: StimulationMetaType;
    // stimulationPhrase: StimulationPhase;
    /**
     * The scope of the stimulation, like 'paragraph' or 'line'.
     * @see {@link StimulationScope}
     */
    stimulationScope: StimulationScope;
    /**
     * soft links to target ibgibs being stimulated
     */
    targets: StimulationTarget[];
    /**
     * If true, the stimulation expects the user to add an ibgib to the current
     * context ibgib. For starters, this will be a comment ibgib with, e.g.,
     * the blanked out text.
     *
     * This could also be feedback or just a "grunt", like a "." or "ok", used
     * to indicate the robbot should continue.
     */
    expectsResponse?: boolean;
    /**
     * The text possibilities which we expect in the user's response or
     * feedback.
     *
     * So if we blanked out certain strings in a text, then these will be the
     * blanked out texts. Same goes for user echoed string(s) and the like.
     */
    expectedTexts?: string[];
    /**
     * When providing at least one response, these are the soft link addresses.
     */
    '@responseList'?: IbGibAddr[];
    /**
     * Indicates that this stimulation is complete and nothing further is
     * expected regarding it.
     *
     * If {@link expectsFeedback} and {@link expectsResponse} are both falsy,
     * then this should be set to true.
     */
    isComplete?: boolean;
    /**
     * If we are making a comment ourselves (and not, e.g., just presenting some
     * other ibgib without additional comment), then here is the text for it.
     *
     * This should also be included in the comment.
     */
    commentText?: string;
    /**
     * If we are stimulating an ibgib multiple times, i.e. a "saga", this tracks
     * the 0-indexed number of times in a given stimulation sequence.
     */
    saga_n?: number;
    /**
     * If we are stimulating an ibgib multiple times, i.e. a "saga", this tracks
     * the remaining number of stimulations planned.
     */
    saga_remaining?: number;
    /**
     * If the stimulation requires extra parameters, they should be put here.
     *
     * For example, a blank stimulation will atow include which text was blanked out.
     */
    details?: any;
    /**
     * If the stimulation is composite, then this can be used for more focused
     * stimulation steps.
     *
     * For example, atow the evelating stimulator is a meta-stimulator that
     * leverages individual sub stimulators to provide concrete stimulations.
     * One of those could in the future also delegate the actual stimulation to
     * some lower stimulator as well.
     */
    subStimulation?: Stimulation;
}

/**
 * Stimulation.details is not typed (i.e. is typed `any`), but this is my base
 * interface for my stimulation details at this time.
 *
 * ATOW this is just a marker interface.
 */
export interface StimulationDetails {

}

/**
 * We're stimulating the ibgib via blanking out one or more words in the ibgib's
 * text.
 */
export interface StimulationDetails_Blank extends StimulationDetails {
    /**
     * Groups of contiguous strings that we've blanked out, in order of
     * presentation.
     *
     * If the scope is 'letter' and we blank out adjacent letters, then we would
     * represent those adjacent letters as a single blankedText entry.
     *
     * @example, if we start with "abcdef" and present this as "ab__e_", then the blankedTexts should be ["cd", "f"].
     */
    blankedTexts: string[];
}

export interface StimulateArgs {
    /**
     * Original driving ibGib(s) information that contains, among other things,
     * the raw comment text that is driving the stimulation.
     *
     * This is like the raw prompt text in a CLI. So the raw text may be
     *
     *     ?learn lines
     *
     * or it may contain parameter-like specifications:
     *
     *     ?learn lines from volare
     */
    semanticInfo: SemanticInfo;
    /**
     * This is the target ibGib(s) that we're working on.
     *
     * @example
     *     { ib: comment nelbludipintodiblu, gib: ABC123, data: {...}, rel8ns: {...} }
     */
    ibGibs: IbGib_V1[];
    // /**
    //  * Type of stimulation that we're narrowed down to use for stimulation.
    //  */
    // stimulationType?: StimulationType;
    /**
     * list of previous stimulations for the given ibGibs.
     *
     * Note that each `prevStimulations[x].targets` noly has to intersect at least once with
     * any of the given `ibGibs`.
     */
    prevStimulations: Stimulation[];
    /**
     * word analysis of the given `ibGibs`.
     */
    textInfo: WordyTextInfo;
    /**
     * If the stimulator is being fed this ibGib as a response candidate.
     *
     * This should only be true when the stimulator has previously flagged that
     * it expects a response.
     */
    isResponseCandidate?: boolean;
}

export interface Stimulator {
    /**
     * Should be idempotent indicator of initialization for the Stimulator.
     */
    readonly initialized: Promise<void>;
    readonly instanceId: string;
    readonly name: string;
    readonly version: string;
    /**
     * Which type(s) does this stimulator produce?
     */
    readonly types: StimulationType[];
    initialize(): Promise<void>;
    canStimulate(opts: StimulateArgs): Promise<boolean>;
    getStimulation(opts: StimulateArgs): Promise<Stimulation | null>;
}
