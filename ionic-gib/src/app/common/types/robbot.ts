import * as h from 'ts-gib/dist/helper';
import { IbGibData_V1, IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";

import * as c from '../constants';
import { Lex, LexData, LexDatum, PropsData } from "../helper/lex";
import { Ssml } from "../helper/ssml";
import { TjpIbGibAddr } from "./ibgib";
import {
    WitnessData_V1, WitnessRel8ns_V1,
    WitnessCmdData, WitnessCmdRel8ns, WitnessCmdIbGib,
    WitnessResultData, WitnessResultRel8ns, WitnessResultIbGib,
} from "./witness";


export type RobbotTransparency = 'transparent' | 'translucent' | 'opaque';

export interface RobbotData_V1 extends WitnessData_V1 {

    /**
     * Name of a Robbot instance...after all, Robbie was only the first Robbot.
     */
    name: string;

    /**
     * Redeclared over {@link WitnessData_V1.uuid} making it a required field.
     */
    uuid: string;

    /**
     * For simpler robbots (i.e. early implementations), I'm not sure what this
     * will entail. Ideally the function dependency graph is public but right
     * now we're living with witness functionality "off-chain" ("on-chain"
     * stored in git version control).
     *
     * I think atm this will mean that any weighting will be public. If a robbot
     * has any randomness in its decision making, then this should be
     * translucent at least.
     *
     * Of course, even in the future when there are more sovereign "A"Is,
     * transparency doesn't mean you understand where he/she/it is coming from -
     * only that the raw data is available to see.
     */
    // reasoningTransparency: RobbotTransparency;

    /**
     * Transparency of timing of planned ibgibs to be presented to the user in a
     * context.
     *
     * For example, when the robbot is asked to process an ibgib context, it
     * must decide when to add which ibgibs to it's output context.
     */
    // schedulingTransparency: RobbotTransparency;

    /**
     * Minimum amount of time between outputs allowed by the robbot.
     */
    // minSecondsBetweenPosts: number;

    /**
     * Robbots work with scheduling and executing ibgib processing. But
     * it is often (always?) advantageous to give a certain amount of leeway
     * within the algorithms for making scheduling decisions. This is a
     * maximum time variance percentage per decision.
     *
     * So if there is a rigid schedule of every N days, then we allow that
     * it may indeed schedule the ibgib N +- (N * variance/100). If N is 50,
     * and max variance is 10, then this may schedule the output at
     * 50 plus or minus up to 5; consequently a range from 45-55.
     */
    // maxTimeVariancePercentage: number;

    /**
     * If true, then this robbot will be started upon app startup, and perhaps
     * in a background service in the future.
     *
     * if false, the robbot will schedule and execute a single "round" only when
     * prompted by a user.
     */
    // active: boolean;
    // for now, all robbot output will be passive, i.e., when you ask the robbot
    // within a context using the bottom action bar.

    /**
     * Some ibgibs work at the date (day) level of granularity, while others
     * work down to the time.
     */
    // scheduleGranularity: 'date' | 'time';

    /**
     * If provided, this will be prepended to any comments made by the robbot,
     * as well as the output subcontext if {@link outputMode} is
     * {@link RobbotOutputMode.subcontext}.
     */
    outputPrefix?: string;

    /**
     * If provided, this will be appended to any comments made by the robbot,
     * as well as the output subcontext if {@link outputMode} is
     * {@link RobbotOutputMode.subcontext}.
     */
    outputSuffix?: string;

    /**
     * There are multiple possibilities for where to output:
     *
     * 1. Inside the input context
     * 2. In a different subcontext ibgib
     * 3. In the robbot's ibgib (todo later)
     * 4. Tagged but not "inside" an ibgib (not planned atm).
     *
     * Also, it is possible to tag all outputs regardless of where the ibgibs
     * are placed originally. @see {@link tagOutput}
     *
     * ## thoughts
     *
     * Since the driving use case is to create drills, it would seem that inside
     * a single grouping ibgib within the output context makes the most sense.
     */
    // outputMode?: RobbotOutputMode;

    // /**
    //  * If true, rel8s output context depending on {@link outputMode} to the latest
    //  * tag(s) whose tjpAddr(s) are given in {@link RobbotRel8ns_V1}
    //  * {@link c.ROBBOT_TAG_TJP_ADDRS_REL8N_NAME}.
    //  */
    // tagOutput?: boolean;


    /**
     * When relating to an ibGib, this is the default rel8n name.
     *
     * @see `RobbotBase_V1.rel8To`
     */
    defaultRel8nName?: string;
    /**
     * list of all rel8n names, e.g. {@link defaultRel8nName},
     * that this robbot uses for "my ibgibs".
     */
    allRel8nNames?: string[];
    /**
     * escape sequence when requesting something from a robbot.
     *
     * So if a comment starts with this, then it's someone asking a robbot to do
     * something.
     */
    requestEscapeString?: string;
}
/**
 * default value for a robbot request escape string (that string to signify
 * a comment is a request of a robbot)
 */
export const DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING = '?';


// /**
//  * @see {@link RobbotData_V1.outputMode}
//  */
// export type RobbotOutputMode = 'context' | 'subcontext' | 'ask';
// export const RobbotOutputMode = {
//     /**
//      * spread out within the target context
//      */
//     context: 'context' as RobbotOutputMode,
//     /**
//      * creates a single comment ibgib and outputs within that
//      */
//     subcontext: 'subcontext' as RobbotOutputMode,
// }
// export const VALID_ROBBOT_OUTPUT_MODES = Object.values(RobbotOutputMode);

export interface RobbotRel8ns_V1 extends WitnessRel8ns_V1 {
    [c.ROBBOT_TAG_TJP_ADDRS_REL8N_NAME]?: TjpIbGibAddr[];
}

/**
 * A robbot's primary function when assigned to an ibgib is to analyze a context
 * ibgib as its input, and output ibgibs into the same or another context.
 *
 * This is quite similar to existing ideas of microservices, but with a few key
 * differences:
 *
 * 1. Robbots exist within the limited domain of ibgib transforms, i.e., `fork`,
 *    `mut8` & `rel8` transforms.
 * 2. Robbots themselves live "on-chain" alongside the data with which they
 *    interact.
 */
export interface RobbotIbGib_V1 extends IbGib_V1<RobbotData_V1, RobbotRel8ns_V1> {
}



/**
 * Cmds for interacting with ibgib spaces.
 *
 * Not all of these will be implemented for every space.
 *
 * ## todo
 *
 * change these commands to better structure, e.g., verb/do/mod, can/get/addrs
 * */
export type RobbotCmd =
    'ib' | 'gib' | 'ibgib' | 'activate' | 'deactivate';
/** Cmds for interacting with ibgib spaces. */
export const RobbotCmd = {
    /**
     * it's more like a grunt that is intepreted by context from the robbot.
     *
     * my initial use of this will be to add an ibgib to a robbot's
     * awareness. (input)
     */
    ib: 'ib' as RobbotCmd,
    /**
     * it's more like a grunt that is intepreted by context from the robbot.
     *
     * my initial use of this will be to indicate to a robbot to add to a
     * conversation. (output)
     */
    gib: 'gib' as RobbotCmd,
    /**
     * third placeholder command.
     *
     * I imagine this will be like "what's up", but who knows.
     */
    ibgib: 'ibgib' as RobbotCmd,
    /**
     * power on
     */
    activate: 'activate' as RobbotCmd,
    /** power off */
    deactivate: 'deactivate' as RobbotCmd,
}

/**
 * Flags to affect the command's interpretation.
 */
export type RobbotCmdModifier =
    'ib' | 'gib' | 'ibgib';
/**
 * Flags to affect the command's interpretation.
 */
export const RobbotCmdModifier = {
    /**
     * hmm...
     */
    ib: 'ib' as RobbotCmdModifier,
    /**
     * hmm...
     */
    gib: 'gib' as RobbotCmdModifier,
    /**
     * hmm...
     */
    ibgib: 'ibgib' as RobbotCmdModifier,
}

/** Information for interacting with spaces. */
export interface RobbotCmdData
    extends WitnessCmdData<RobbotCmd, RobbotCmdModifier> {
}

export interface RobbotCmdRel8ns extends WitnessCmdRel8ns {
}

/**
 * Shape of options ibgib if used for a robbot.
 *
 * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface RobbotCmdIbGib<
    TIbGib extends IbGib_V1 = IbGib_V1,
    TCmdData extends RobbotCmdData = RobbotCmdData,
    TCmdRel8ns extends RobbotCmdRel8ns = RobbotCmdRel8ns,
> extends WitnessCmdIbGib<TIbGib, RobbotCmd, RobbotCmdModifier, TCmdData, TCmdRel8ns> {
}

/**
 * Optional shape of result data to robbot interactions.
 *
 * This is in addition of course to {@link WitnessResultData}.
 *
 * ## notes
 *
 * * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface RobbotResultData extends WitnessResultData {
}

/**
 * Marker interface rel8ns atm...
 *
 * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface RobbotResultRel8ns extends WitnessResultRel8ns { }

/**
 * Shape of result ibgib if used for a robbot.
 *
 * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface RobbotResultIbGib<
    TIbGib extends IbGib_V1,
    TResultData extends RobbotResultData,
    TResultRel8ns extends RobbotResultRel8ns
>
    extends WitnessResultIbGib<TIbGib, TResultData, TResultRel8ns> {
}

/**
 * When a robbot creates a comment on a context ibgib, he/she also relates it to
 * itself via this rel8nName.
 *
 * @example robbot.rel8ns.my_comment = 'comment myawesomeopinion wordyrobbot123^ABC'
 *
 * ## notes
 *
 * * "my" prefix is used to differentiate between the robbot's comments and comments
 *   on the robbot itself.
 */
export const ROBBOT_MY_COMMENTS_REL8N_NAME = 'my_comment';
/**
 * When a robbot participates in a conversation, that context is related via
 * this rel8n name.
 * @example robbot.rel8ns.context = 'comment someconvo^ABC'
 */
export const ROBBOT_CONTEXT_REL8N_NAME = 'context';
/**
 * Used to rel8 session ibgibs to robbots.
 * @example robbot.rel8ns.session = ['session 123^ABC'];
 */
export const ROBBOT_SESSION_REL8N_NAME = 'session';
/**
 * Used to rel8 interaction to sessions,
 * @example session.rel8ns.interaction = ['interaction 123^ABC'];
 */
export const ROBBOT_INTERACTION_REL8N_NAME = 'interaction';

export const ROBBOT_SESSION_ATOM = 'robbot_session';

export const ROBBOT_ANALYSIS_ATOM = 'robbot_analysis';

/**
 * This is stimulus that is coming over the Context that a robbot is being
 * stimulated with.
 *
 * This is different than stimulus that the robbot provides for a given ibgib.
 */
export interface StimulusForRobbot {
    /**
     * The actual ibgib that is the stimulus.
     *
     * If falsy, `isClick` should be true.
     */
    ibGib?: IbGib_V1;
    /**
     * should be true if the user has typed in a request and added the
     * comment to the context.
     */
    isRequest?: boolean;
    /**
     * The stimulus was generated from a click on a button, as opposed to a
     * comment typed in or a picture/link/comment added/imported in a context.
     *
     * Should be true if `ibGib` is falsy.
     */
    isClick?: boolean;
}

export type RobbotInteractionType = 'greeting' | 'stimulation' | 'farewell' | 'clarification' | 'help';
export const RobbotInteractionType = {
    /**
     * opening statement of a robbot
     */
    greeting: 'greeting' as RobbotInteractionType,
    /**
     * stimulates a certain ibgib.
     */
    stimulation: 'stimulation' as RobbotInteractionType,
    /**
     * closing statements of a robbot
     */
    farewell: 'farewell' as RobbotInteractionType,
    /**
     * small nudges of info, including possibly repeating previous statement.
     */
    clarification: 'clarification' as RobbotInteractionType,
    /**
     * providing info about context to aid the user in their options.
     */
    help: 'help' as RobbotInteractionType,
}

export interface RobbotInteractionData_V1 extends IbGibData_V1 {
    timestamp: string;
    /**
     * type of this interaction. for now, this is strongly typed, but
     * later I should add a catchall `| string` type to allow for
     * expansion.
     */
    type: RobbotInteractionType;
    commentText?: string;
    /**
     * should be an interfaced data object that represents the details of the
     * interaction, e.g. if a stimulation, then here is the simulation interface data.
     *
     * ## notes
     *
     * to create another generic interface here would be too unwieldy. (already may be!)
     */
    details?: any;
}
export interface RobbotInteractionRel8ns_V1 extends IbGibRel8ns_V1 {
}
export interface RobbotInteractionIbGib_V1
    extends IbGib_V1<RobbotInteractionData_V1, RobbotInteractionRel8ns_V1> { }


/**
 * These are used for raw words/phrases that compose larger, more complex
 * semantic ideas that use SemanticId.
 *
 * Because these are used in composition of lex data, they are not prefixed
 * with something like "atomic_", e.g. "atomic_hi".
 */
export type AtomicId =
    'hi' | 'welcome' | 'bye' |
    'yes' | 'no';
export const AtomicId = {
    hi: 'hi' as AtomicId,
    welcome: 'welcome' as AtomicId,
    bye: 'bye' as AtomicId,
    yes: 'yes' as AtomicId,
    no: 'no' as AtomicId,
}

/**
 * These are used for specific lex commands/intents/whatevers. Synonyms and
 * equivalency phrases ultimately get resolved to these.
 *
 * These are complex concepts, as opposed to the smaller atomic words/phrases, that
 * a robbot will use when interacting with users.
 *
 * ## example
 *
 * A robbot may say in a semantic greeting (SemanticId.hello) that incorporates
 * a lot of context-specific text. However, these individual greetings will
 * most likely include the usage of individual phrases like 'hi' or 'good day'.
 * These are small, raw "atomic" lexical atoms.
 */
export type SemanticId =
    'semantic_help' |
    'semantic_hello' | 'semantic_bye' |
    'semantic_yes' | 'semantic_no' | 'semantic_cancel' |
    'semantic_skip' | 'semantic_forget' | 'semantic_next' |
    'semantic_please' |
    'semantic_in_progress' |
    'semantic_list' |
    'semantic_lines' | // maybe just wordy...
    'semantic_request' |
    'semantic_count' |
    'semantic_options' |
    'semantic_ready' |
    'semantic_unknown' | 'semantic_default' |
    string; // have to do this for inheritance?
export const SemanticId = {
    help: 'semantic_help' as SemanticId,
    hello: 'semantic_hello' as SemanticId,
    bye: 'semantic_bye' as SemanticId,
    yes: 'semantic_yes' as SemanticId,
    no: 'semantic_no' as SemanticId,
    cancel: 'semantic_cancel' as SemanticId,
    skip: 'semantic_skip' as SemanticId,
    forget: 'semantic_forget' as SemanticId,
    next: 'semantic_next' as SemanticId,
    please: 'semantic_please' as SemanticId,
    in_progress: 'semantic_in_progress' as SemanticId,
    list: 'semantic_list' as SemanticId,
    lines: 'semantic_lines' as SemanticId,
    request: 'semantic_request' as SemanticId,
    count: 'semantic_count' as SemanticId,
    options: 'semantic_options' as SemanticId,
    ready: 'semantic_ready' as SemanticId,
    unknown: 'semantic_unknown' as SemanticId,
    default: 'semantic_default' as SemanticId,
};

export interface SemanticInfo {
    semanticId: SemanticId;
    request?: IbGib_V1;
    other?: IbGib_V1;
}

export interface SemanticHandler {
    /**
     * This should be a unique id for this handler.
     */
    handlerId: string;
    /**
     * The semanticId that this handler is associated with.
     */
    semanticId: SemanticId;
    /**
     * If truthy, the robbot should execute this filter before
     * attempting to execute this handler's {@link fnExec}
     */
    fnCanExec?: (info: SemanticInfo) => Promise<boolean>;
    /**
     * Actual function of handler that gets executed if context is
     * correct ({@link fnCanExec} is true).
     */
    fnExec?: (info: SemanticInfo) => Promise<RobbotInteractionIbGib_V1>;
}

export interface RobbotPropsData<TSemanticId extends SemanticId = SemanticId> extends PropsData {
    /**
     * This datum expects these template vars.
     *
     * This is not strictly necessary, but is used for documentation/aid to the
     * caller on providing stuff for the datum for what is expected.
     */
    templateVars?: string;
    /**
     * If assigned, then this lex datum is a semantic entry, and this is the corresponding
     * semantic id.
     */
    semanticId?: TSemanticId;
    atomicId?: AtomicId;
    /**
     * Only use this lex datum if YES there is an active session in progress.
     */
    onlyInSession?: boolean;
    /**
     * Only use this lex datum if there is NOT an active session in progress.
     */
    onlyNotInSession?: boolean;
    /**
     * The robbot hasn't seen anything so has no knowledge/has nothing to work
     * on.
     */
    blankSlate?: boolean;
    /**
     * Just starting a new session, i.e. no prev interactions exist.
     */
    freshStart?: boolean;
    /**
     * Flag to indicate if the lex datum corresponds to a user request.
     */
    isRequest?: boolean;
}

export function toLexDatums_Semantics(semanticId: SemanticId, texts: string[]): LexDatum<RobbotPropsData>[] {
    return texts.flatMap(t => {
        return <LexDatum<RobbotPropsData>>{
            texts: [t],
            language: 'en-US',
            props: { semanticId },
        };
    });
}
export function toLexDatums_Atomics(atomicId: AtomicId, texts: string[]): LexDatum<RobbotPropsData>[] {
    return texts.flatMap(t => {
        return <LexDatum<RobbotPropsData>>{
            texts: [t],
            language: 'en-US',
            props: { atomicId },
        };
    });
}

export const DEFAULT_HUMAN_LEX_DATA_ENGLISH_SEMANTICS: LexData<RobbotPropsData> = {
    [SemanticId.help]: [
        ...toLexDatums_Semantics(SemanticId.help, [
            'h', 'help', 'help me',
        ]),
    ],
    [SemanticId.yes]: [
        ...toLexDatums_Semantics(SemanticId.yes, [
            'yes', 'y', 'yeah', 'yea', 'aye', 'yup', 'yep', 'sure', 'ok',
            'sounds good', 'go for it', 'yes please', 'yes thanks', 'ok thanks',
            'uh huh', 'god yes', 'affirmative', 'ten four', '10-4', 'roger',
        ]),
    ],
    [SemanticId.no]: [
        ...toLexDatums_Semantics(SemanticId.no, [
            'no', 'n', 'nah', 'nay', 'nope', 'uh uh', 'no thanks', 'ick', 'nuh uh',
            'god no', 'no way', 'not at all', 'negative', 'that\'s a negative', 'nein',
        ])
    ],
    [SemanticId.cancel]: [
        ...toLexDatums_Semantics(SemanticId.cancel, [
            'cancel', 'nm', 'nevermind', 'cancel that', 'don\'t worry about it'
        ])
    ],
    [SemanticId.skip]: [
        ...toLexDatums_Semantics(SemanticId.skip, [
            'skip', 'sk',
        ])
    ],
    [SemanticId.forget]: [
        ...toLexDatums_Semantics(SemanticId.forget, [
            'forget', 'forget this', 'forget this one',
        ])
    ],
    [SemanticId.next]: [
        ...toLexDatums_Semantics(SemanticId.next, [
            'next', // 'next $(please)' /* need to get this kind of thing working */
        ])
    ],
    [SemanticId.bye]: [
        ...toLexDatums_Semantics(SemanticId.bye, [
            'bye', 'bye bye', 'see you later', 'see you',
        ])
    ],
    [SemanticId.unknown]: [
        ...toLexDatums_Semantics(SemanticId.unknown, [
            'are you mocking me, human?', 'mmhmm...', 'i see...', 'does not compute...', 'indeed'
        ])
    ],
};
export const DEFAULT_HUMAN_LEX_DATA_ENGLISH_ATOMICS: LexData<RobbotPropsData> = {
    [AtomicId.hi]: [
        ...toLexDatums_Atomics(AtomicId.hi, [
            'hi', 'howdy', 'hello', 'greetings', 'good day', 'hello there', 'good day to you', 'yo',
        ]),
    ],
    [AtomicId.welcome]: [
        ...toLexDatums_Atomics(AtomicId.welcome, [
            'welcome',
        ]),
    ],
    [AtomicId.yes]: [
        ...toLexDatums_Atomics(AtomicId.yes, [
            'yes', 'y', 'yeah', 'yea', 'aye', 'yup', 'yep', 'sure', 'ok',
            'sounds good', 'go for it', 'yes please', 'yes thanks', 'ok thanks',
            'uh huh', 'god yes', 'affirmative', 'ten four', '10-4', 'roger',
        ]),
    ],
    [AtomicId.no]: [
        ...toLexDatums_Atomics(AtomicId.no, [
            'no', 'n', 'nope', 'no thanks', 'no thank you',
        ]),
    ],
    [AtomicId.bye]: [
        ...toLexDatums_Atomics(AtomicId.bye, [
            'bye', 'bye bye', 'adios', 'ciao', 'later',
        ]),
    ],
}
export const DEFAULT_HUMAN_LEX_DATA_ENGLISH: LexData<RobbotPropsData> = {
    ...DEFAULT_HUMAN_LEX_DATA_ENGLISH_SEMANTICS,
    ...DEFAULT_HUMAN_LEX_DATA_ENGLISH_ATOMICS,
}
export const DEFAULT_HUMAN_LEX_DATA: LexData<RobbotPropsData> = {
    ...h.clone(DEFAULT_HUMAN_LEX_DATA_ENGLISH),
};

export const DEFAULT_USER_LEX_DATA: LexData<RobbotPropsData> = {
    ...h.clone(DEFAULT_HUMAN_LEX_DATA),
}

/**
 * This lex is to be used for parsing user responses.
 *
 * Also, you can use this in the robbot's responses, if you initialize the
 * robbot's lex to include this. This way, the robbot speaks as he/she expects
 * to be spoken to.
 *
 * So when a user says 'yes', we can interpret it via a lookup in the lex data.
 * we will find the id filter via keywords.
 */
export const DEFAULT_USER_LEX = new Lex<RobbotPropsData>(DEFAULT_USER_LEX_DATA, {
    requestLanguage: "en-US", defaultLanguage: "en-US",
    defaultCapitalize: "none",
    defaultLineConcat: "delim", defaultDelim: "\n\n",
    defaultKeywordMode: "any", defaultPropsMode: "prop",
});

/**
 * default phrases for the robbot to use when chatting.
 */
export const DEFAULT_ROBBOT_LEX_DATA: LexData<RobbotPropsData> = {
    ...h.clone(DEFAULT_HUMAN_LEX_DATA),
};
// adjust for robbot-ness a bit
DEFAULT_ROBBOT_LEX_DATA[SemanticId.bye].push(
    {
        texts: ['EOL',],
        ssmls: [Ssml.sub('EOL', 'end of line'),],
        language: 'en-US',
        props: { semanticId: SemanticId.bye, },
        weighting: 100,
    }
)
DEFAULT_ROBBOT_LEX_DATA[SemanticId.unknown] = [
    ...toLexDatums_Semantics(SemanticId.unknown, [
        'i\'m not quite sure what you mean', 'does not compute',
    ])
];
