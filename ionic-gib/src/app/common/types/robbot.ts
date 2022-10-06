import { IbGib_V1 } from "ts-gib/dist/V1";

import * as c from '../constants';
import { Lex, LexData, LexDatum } from "../helper/lex";
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
    'ib' | 'gib' | 'ibgib';
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
 */
export const ROBBOT_MY_COMMENT_REL8N_NAME = 'my_comment';



/**
 * These are used for specific lex commands/intents/whatevers. Synonyms and
 * equivalency phrases ultimately get resolved to these.
 */
export type SemanticId = 'hello' | 'yes' | 'no' | 'cancel' | 'skip' | 'next' | 'please' | 'bye';
export const SemanticId = {
    hello: 'hello' as SemanticId,
    yes: 'yes' as SemanticId,
    no: 'no' as SemanticId,
    cancel: 'cancel' as SemanticId,
    skip: 'skip' as SemanticId,
    next: 'next' as SemanticId,
    please: 'please' as SemanticId,
    bye: 'bye' as SemanticId,
};

export interface RobbotPropsData {
    semanticId?: SemanticId;
}

function toLexDatums(semanticId: SemanticId, texts: string[]): LexDatum<RobbotPropsData>[] {
    return texts.map(t => {
        return <LexDatum<RobbotPropsData>>{
            texts: [t],
            language: 'en-US',
            props: { semanticId },
        };
    });
}

export const DEFAULT_HUMAN_LEX_DATA_ENGLISH: LexData<RobbotPropsData> = {
    [SemanticId.yes]: [
        ...toLexDatums(SemanticId.yes, [
            'yes', 'y', 'yeah', 'yea', 'aye', 'yup', 'yep', 'sure', 'ok',
            'sounds good', 'go for it', 'yes please', 'yes thanks', 'ok thanks',
            'uh huh', 'god yes', 'affirmative', 'ten four', '10-4', 'roger',
        ]),
    ],
    [SemanticId.no]: [
        ...toLexDatums(SemanticId.no, [
            'no', 'n', 'nah', 'nay', 'nope', 'uh uh', 'no thanks', 'ick', 'nuh uh',
            'god no', 'no way', 'not at all', 'negative', 'that\'s a negative', 'nein',
        ])
    ],
    [SemanticId.cancel]: [
        ...toLexDatums(SemanticId.cancel, [
            'cancel', 'nm', 'nevermind', 'cancel that', 'don\'t worry about it'
        ])
    ],
    [SemanticId.skip]: [
        ...toLexDatums(SemanticId.skip, [
            'skip', 'sk',
        ])
    ],
    [SemanticId.next]: [
        ...toLexDatums(SemanticId.next, [
            'next', // 'next $(please)' /* need to get this kind of thing working */
        ])
    ],
    [SemanticId.bye]: [
        ...toLexDatums(SemanticId.bye, [
            'bye', 'bye bye', 'see you later', 'see you',
        ])
    ],
};
export const DEFAULT_HUMAN_LEX_DATA: LexData<RobbotPropsData> = {
    ...DEFAULT_HUMAN_LEX_DATA_ENGLISH,
};

export const DEFAULT_USER_LEX_DATA: LexData<RobbotPropsData> = {
    ...DEFAULT_HUMAN_LEX_DATA,
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
    ...DEFAULT_HUMAN_LEX_DATA,
};
// adjust for robbot-ness a bit
DEFAULT_ROBBOT_LEX_DATA[SemanticId.bye].push(
    {
        texts: [
            'end of line', 'EOL',
        ],
        ssmls: [
            'end of line', Ssml.sayAs({ interpret: 'spell-out', text: 'EOL' }),
        ],
        language: 'en-US',
        props: {
            semanticId: SemanticId.bye,
        },
        weighting: 100,
    }
)

