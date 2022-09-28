import * as c from '../constants';

const logalot = c.GLOBAL_LOG_A_LOT || true;

export declare class SsmlTypes {
    /**
     * Represents a pause in the speech. Set the length of the pause
     * with the strength or time attributes.
     *
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#break
     *
     * @param param0
     */
    static break({ strength, s, ms }: {
        /**
         * none:     No pause should be outputted. This can be used to remove a pause that would normally occur (such as after a period).
         *
         * x-weak:   No pause should be outputted (same as none).
         *
         * weak:      Treat adjacent words as if separated by a single comma (equivalent to medium).
         *
         * medium:   Treat adjacent words as if separated by a single comma.
         *
         * strong:   Make a sentence break (equivalent to using the <s> tag).
         *
         * x-strong: Make a paragraph break (equivalent to using the <p> tag).
         */
        strength?: BreakStrengthType;
        /**
         * Duration of the pause in seconds; up to 10 seconds.
         */
        s?: number;
        /**
         * Duration of the pause in milliseconds; up to 10000 milliseconds.
         */
        ms?: number;
    }): string;
    /**
     * Takes a given text that will be written and provides an alias
     * for it when it's actually spoken.
     *
     * For example, if the written text is the element symbol "Mg", then
     * you probably want to verbally say the entire word: "Magnesium".
     * In this case, the "text" is "Mg" and the "alias" is "Magnesium".
     *
     * @see (@link https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#sub)
     *
     * @param text Written text that will be substituted when spoken, e.g. "Mg"
     * @param alias Spoken alias that will be spoken, e.g. "Magnesium"
     */
    static sub(text: string, alias: string): string;
    /**
     * Similar to <say-as>, this tag customizes the pronunciation of
     * words by specifying the word’s part of speech.
     *
     * @param text Text that requires clarity.
     * @param partOfSpeech Context provided for the given text.
     */
    static w(text: string, partOfSpeech: PartOfSpeech): string;
    /**
     * Describes how the text should be interpreted. This lets you
     * provide additional context to the text and eliminate any
     * ambiguity on how Alexa should render the text. Indicate how
     * Alexa should interpret the text with the interpret-as attribute.
     *
     * Note that the Alexa service attempts to interpret the provided
     * text correctly based on the text’s formatting even without this
     * tag. For example, if your output speech includes “202-555-1212”,
     * Alexa speaks each individual digit, with a brief pause for each
     * dash. You don’t need to use <say-as interpret-as="telephone"> in
     * this case. However, if you provided the text “2025551212”, but
     * you wanted Alexa to speak it as a phone number, you would need
     * to use <say-as interpret-as="telephone">.
     *
     * @example
     * <speak>
     *     Here is a number spoken as a cardinal number:
     *     <say-as interpret-as="cardinal">12345</say-as>.
     *     Here is the same number with each digit spoken separately:
     *     <say-as interpret-as="digits">12345</say-as>.
     *     Here is a word spelled out: <say-as interpret-as="spell-out">hello</say-as>
     * </speak>
     *
     * @see
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#say-as
     */
    static sayAs({ text, interpret, format }: {
        /**
         * Text to specify interpretation.
         */
        text: string;
        /**
         * Value that indicates how text should be interpreted.
         *
         * @see {InterpretAs}
         */
        interpret: InterpretAs;
        /**
         * Only used when interpret-as is set to date. Set to one of
         * the following to indicate format of the date:
         *
         *     mdy
         *     dmy
         *     ymd
         *     md
         *     dm
         *     ym
         *     my
         *     d
         *     m
         *     y
         *
         * Alternatively, if you provide the date in YYYYMMDD format,
         * the format attribute is ignored. You can include question
         * marks (?) for portions of the date to leave out. For
         * instance, Alexa would speak <say-as interpret-as="date">????
         * 0922</say-as> as “September 22nd”.
         */
        format?: SayAsDate;
    }): string;
}

export type InterpretAs = "characters" | "spell-out" | "cardinal" | "number" | "ordinal" | "digits" | "fraction" | "unit" | "date" | "time" | "telephone" | "address" | "interjection" | "expletive";
/**
 * Values that indicate how Alexa should speak text.
 * To be used with Ssml.sayAs({text, interpret: As.characters})
 */
export const As = {
    /**
     * Spell out each letter.
     */
    characters: "characters" as InterpretAs,
    /**
     * Spell out each letter.
     */
    spell_out: "spell-out" as InterpretAs,
    /**
     * Interpret the value as a cardinal number.
     *
     * @example "12" is pronounced as "twelve" and not "1-2".
     */
    cardinal: "cardinal" as InterpretAs,
    /**
     * Interpret the value as a cardinal number.
     *
     * @example "12" is pronounced as "twelve" and not "1-2".
     */
    number: "number" as InterpretAs,
    /**
     * Interpret the value as an ordinal number.
     *
     * @example "12" is pronounced as "twelfth"
     */
    ordinal: "ordinal" as InterpretAs,
    /**
     * Spell each digit separately.
     */
    digits: "digits" as InterpretAs,
    /**
     * Interpret the value as a fraction. This works for both common
     * fractions (such as 3/20) and mixed fractions (such as 1+1/2).
     */
    fraction: "fraction" as InterpretAs,
    /**
     * Interpret a value as a measurement. The value should be either a
     * number or fraction followed by a unit (with no space in between)
     * or just a unit.
     */
    unit: "unit" as InterpretAs,
    /**
     * Interpret the value as a date. Specify the format with the
     * format attribute.
     */
    date: "date" as InterpretAs,
    /**
     * Interpret a value such as 1'21" as duration in minutes and
     * seconds.
     */
    time: "time" as InterpretAs,
    /**
     * Interpret a value as a 7-digit or 10-digit telephone number.
     * This can also handle extensions (for example, 2025551212x345).
     */
    telephone: "telephone" as InterpretAs,
    /**
     * Interpret a value as part of street address.
     */
    address: "address" as InterpretAs,
    /**
     * askGib NOTE: SpeechCons are already implemented directly: e.g. `Ssml.speech(Con.abracadabra)`
     *
     * Interpret the value as an interjection. Alexa speaks the text in
     * a more expressive voice. For optimal results, only use the
     * supported interjections and surround each one with a pause. For
     *
     * @example
     * <say-as interpret-as="interjection">Wow.</say-as>.
     *
     * Speechcons are supported for English (US), English (UK), and
     * German.
     */
    interjection: "interjection" as InterpretAs,
    /**
     * “Bleep” out the content inside the tag.
     */
    expletive: "expletive" as InterpretAs,
};
export type SayAsDate = "mdy" | "dmy" | "ymd" | "md" | "dm" | "ym" | "my" | "d" | "m" | "y";
/**
 * Date formats, used with @see {sayAs} function when
 * @see {InterpretAs} is "date".
 *
 * Alternatively, if you provide the date in YYYYMMDD format, the
 * format attribute is ignored. You can include question marks (?) for
 * portions of the date to leave out. For instance, Alexa would speak
 * <say-as interpret-as="date">????0922</say-as> as “September 22nd”.
 */
export const SayAsDate = {
    mdy: "mdy" as SayAsDate,
    dmy: "dmy" as SayAsDate,
    ymd: "ymd" as SayAsDate,
    md: "md" as SayAsDate,
    dm: "dm" as SayAsDate,
    ym: "ym" as SayAsDate,
    my: "my" as SayAsDate,
    d: "d" as SayAsDate,
    m: "m" as SayAsDate,
    y: "y" as SayAsDate,
};
export type ProsodyRateType = "x-slow" | "slow" | "medium" | "fast" | "x-fast" | number;
export type ProsodyPitchType = "x-low" | "low" | "medium" | "high" | "x-high" | number;
export type ProsodyVolumeType = "silent" | "x-soft" | "soft" | "medium" | "loud" | "x-loud" | number;
export type SpeechCon =
    "abracadabra" | "achoo" | "aha" | "ahem" | "ahoy" | "all righty" | "aloha" | "aooga" | "argh" | "arrivederci" | "as you wish" | "attagirl" | "au revoir" | "avast ye" | "aw man" | "baa" | "bada bing bada boom" | "bah humbug" | "bam" | "bang" | "batter up" | "bazinga" | "beep beep" | "bingo" | "blah" | "blarg" | "blast" | "boing" | "bon appetit" | "bonjour" | "bon voyage" | "boo" | "boo hoo" | "boom" | "booya" | "bravo" | "bummer" | "caw" | "cha ching" | "checkmate" | "cheerio" | "cheers" | "cheer up" | "chirp" | "choo choo" | "clank" | "click clack" | "cock a doodle doo" | "coo" | "cowabunga" | "darn" | "ding dong" | "ditto" | "d’oh" | "dot dot dot" | "duh" | "dum" | "dun dun dun" | "dynomite" | "eek" | "eep" | "encore" | "en gard" | "eureka" | "fancy that" | "geronimo" | "giddy up" | "good grief" | "good luck" | "good riddance" | "gotcha" | "great scott" | "heads up" | "hear hear" | "hip hip hooray" | "hiss" | "honk" | "howdy" | "hurrah" | "hurray" | "huzzah" | "jeepers creepers" | "jiminy cricket" | "jinx" | "just kidding" | "kaboom" | "kablam" | "kaching" | "kapow" | "katchow" | "kazaam" | "kerbam" | "kerboom" | "kerching" | "kerchoo" | "kerflop" | "kerplop" | "kerplunk" | "kerpow" | "kersplat" | "kerthump" | "knock knock" | "le sigh" | "look out" | "mamma mia" | "man overboard" | "mazel tov" | "meow" | "merci" | "moo" | "nanu nanu" | "neener neener" | "no way" | "now now" | "oh boy" | "oh brother" | "oh dear" | "oh my" | "oh snap" | "oink" | "okey dokey" | "oof" | "ooh la la" | "open sesame" | "ouch" | "oy" | "phew" | "phooey" | "ping" | "plop" | "poof" | "pop" | "pow" | "quack" | "read ‘em and weep" | "ribbit" | "righto" | "roger" | "ruh roh" | "shucks" | "splash" | "spoiler alert" | "squee" | "swish" | "swoosh" | "ta da" | "ta ta" | "tee hee" | "there there" | "thump" | "tick tick tick" | "tick-tock" | "touche" | "tsk tsk" | "tweet" | "uh huh" | "uh oh" | "um" | "voila" | "vroom" | "wahoo" | "wah wah" | "watch out" | "way to go" | "well done" | "well well" | "wham" | "whammo" | "whee" | "whew" | "woof" | "whoops a daisy" | "whoosh" | "woo hoo" | "wow" | "wowza" | "wowzer" | "yadda yadda yadda" | "yay" | "yikes" | "yippee" | "yoink" | "yoo hoo" | "you bet" | "yowza" | "yowzer" | "yuck" | "yum" | "zap" | "zing" | "zoinks";
/**
 * Special interjections that Alexa can say.
 * I have this called only "Con" for readability of calling code.
 *
 * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speechcon-reference
 *
 * All spaces in keys are replaced with underscores.
 */
export const Con = {
    abracadabra: "abracadabra" as SpeechCon,
    achoo: "achoo" as SpeechCon,
    aha: "aha" as SpeechCon,
    ahem: "ahem" as SpeechCon,
    ahoy: "ahoy" as SpeechCon,
    all_righty: "all righty" as SpeechCon,
    aloha: "aloha" as SpeechCon,
    aooga: "aooga" as SpeechCon,
    argh: "argh" as SpeechCon,
    arrivederci: "arrivederci" as SpeechCon,
    as_you_wish: "as you wish" as SpeechCon,
    attagirl: "attagirl" as SpeechCon,
    au_revoir: "au revoir" as SpeechCon,
    avast_ye: "avast ye" as SpeechCon,
    aw_man: "aw man" as SpeechCon,
    baa: "baa" as SpeechCon,
    bada_bing_bada_boom: "bada bing bada boom" as SpeechCon,
    bah_humbug: "bah humbug" as SpeechCon,
    bam: "bam" as SpeechCon,
    bang: "bang" as SpeechCon,
    batter_up: "batter up" as SpeechCon,
    bazinga: "bazinga" as SpeechCon,
    beep_beep: "beep beep" as SpeechCon,
    bingo: "bingo" as SpeechCon,
    blah: "blah" as SpeechCon,
    blarg: "blarg" as SpeechCon,
    blast: "blast" as SpeechCon,
    boing: "boing" as SpeechCon,
    bon_appetit: "bon appetit" as SpeechCon,
    bonjour: "bonjour" as SpeechCon,
    bon_voyage: "bon voyage" as SpeechCon,
    boo: "boo" as SpeechCon,
    boo_hoo: "boo hoo" as SpeechCon,
    boom: "boom" as SpeechCon,
    booya: "booya" as SpeechCon,
    bravo: "bravo" as SpeechCon,
    bummer: "bummer" as SpeechCon,
    caw: "caw" as SpeechCon,
    cha_ching: "cha ching" as SpeechCon,
    checkmate: "checkmate" as SpeechCon,
    cheerio: "cheerio" as SpeechCon,
    cheers: "cheers" as SpeechCon,
    cheer_up: "cheer up" as SpeechCon,
    chirp: "chirp" as SpeechCon,
    choo_choo: "choo choo" as SpeechCon,
    clank: "clank" as SpeechCon,
    click_clack: "click clack" as SpeechCon,
    cock_a_doodle_doo: "cock a doodle doo" as SpeechCon,
    coo: "coo" as SpeechCon,
    cowabunga: "cowabunga" as SpeechCon,
    darn: "darn" as SpeechCon,
    ding_dong: "ding dong" as SpeechCon,
    ditto: "ditto" as SpeechCon,
    doh: "doh" as SpeechCon,
    dot_dot_dot: "dot dot dot" as SpeechCon,
    duh: "duh" as SpeechCon,
    dum: "dum" as SpeechCon,
    dun_dun_dun: "dun dun dun" as SpeechCon,
    dynomite: "dynomite" as SpeechCon,
    eek: "eek" as SpeechCon,
    eep: "eep" as SpeechCon,
    encore: "encore" as SpeechCon,
    en_gard: "en gard" as SpeechCon,
    eureka: "eureka" as SpeechCon,
    fancy_that: "fancy that" as SpeechCon,
    geronimo: "geronimo" as SpeechCon,
    giddy_up: "giddy up" as SpeechCon,
    good_grief: "good grief" as SpeechCon,
    good_luck: "good luck" as SpeechCon,
    good_riddance: "good riddance" as SpeechCon,
    gotcha: "gotcha" as SpeechCon,
    great_scott: "great scott" as SpeechCon,
    heads_up: "heads up" as SpeechCon,
    hear_hear: "hear hear" as SpeechCon,
    hip_hip_hooray: "hip hip hooray" as SpeechCon,
    hiss: "hiss" as SpeechCon,
    honk: "honk" as SpeechCon,
    howdy: "howdy" as SpeechCon,
    hurrah: "hurrah" as SpeechCon,
    hurray: "hurray" as SpeechCon,
    huzzah: "huzzah" as SpeechCon,
    jeepers_creepers: "jeepers creepers" as SpeechCon,
    jiminy_cricket: "jiminy cricket" as SpeechCon,
    jinx: "jinx" as SpeechCon,
    just_kidding: "just kidding" as SpeechCon,
    kaboom: "kaboom" as SpeechCon,
    kablam: "kablam" as SpeechCon,
    kaching: "kaching" as SpeechCon,
    kapow: "kapow" as SpeechCon,
    katchow: "katchow" as SpeechCon,
    kazaam: "kazaam" as SpeechCon,
    kerbam: "kerbam" as SpeechCon,
    kerboom: "kerboom" as SpeechCon,
    kerching: "kerching" as SpeechCon,
    kerchoo: "kerchoo" as SpeechCon,
    kerflop: "kerflop" as SpeechCon,
    kerplop: "kerplop" as SpeechCon,
    kerplunk: "kerplunk" as SpeechCon,
    kerpow: "kerpow" as SpeechCon,
    kersplat: "kersplat" as SpeechCon,
    kerthump: "kerthump" as SpeechCon,
    knock_knock: "knock knock" as SpeechCon,
    le_sigh: "le sigh" as SpeechCon,
    look_out: "look out" as SpeechCon,
    mamma_mia: "mamma mia" as SpeechCon,
    man_overboard: "man overboard" as SpeechCon,
    mazel_tov: "mazel tov" as SpeechCon,
    meow: "meow" as SpeechCon,
    merci: "merci" as SpeechCon,
    moo: "moo" as SpeechCon,
    nanu_nanu: "nanu nanu" as SpeechCon,
    neener_neener: "neener neener" as SpeechCon,
    no_way: "no way" as SpeechCon,
    now_now: "now now" as SpeechCon,
    oh_boy: "oh boy" as SpeechCon,
    oh_brother: "oh brother" as SpeechCon,
    oh_dear: "oh dear" as SpeechCon,
    oh_my: "oh my" as SpeechCon,
    oh_snap: "oh snap" as SpeechCon,
    oink: "oink" as SpeechCon,
    okey_dokey: "okey dokey" as SpeechCon,
    oof: "oof" as SpeechCon,
    ooh_la_la: "ooh la la" as SpeechCon,
    open_sesame: "open sesame" as SpeechCon,
    ouch: "ouch" as SpeechCon,
    oy: "oy" as SpeechCon,
    phew: "phew" as SpeechCon,
    phooey: "phooey" as SpeechCon,
    ping: "ping" as SpeechCon,
    plop: "plop" as SpeechCon,
    poof: "poof" as SpeechCon,
    pop: "pop" as SpeechCon,
    pow: "pow" as SpeechCon,
    quack: "quack" as SpeechCon,
    read_em_and_weep: "read em and weep" as SpeechCon,
    ribbit: "ribbit" as SpeechCon,
    righto: "righto" as SpeechCon,
    roger: "roger" as SpeechCon,
    ruh_roh: "ruh roh" as SpeechCon,
    shucks: "shucks" as SpeechCon,
    splash: "splash" as SpeechCon,
    spoiler_alert: "spoiler alert" as SpeechCon,
    squee: "squee" as SpeechCon,
    swish: "swish" as SpeechCon,
    swoosh: "swoosh" as SpeechCon,
    ta_da: "ta da" as SpeechCon,
    ta_ta: "ta ta" as SpeechCon,
    tee_hee: "tee hee" as SpeechCon,
    there_there: "there there" as SpeechCon,
    thump: "thump" as SpeechCon,
    tick_tick_tick: "tick tick tick" as SpeechCon,
    tick_tock: "tick tock" as SpeechCon,
    touche: "touche" as SpeechCon,
    tsk_tsk: "tsk tsk" as SpeechCon,
    tweet: "tweet" as SpeechCon,
    uh_huh: "uh huh" as SpeechCon,
    uh_oh: "uh oh" as SpeechCon,
    um: "um" as SpeechCon,
    voila: "voila" as SpeechCon,
    vroom: "vroom" as SpeechCon,
    wahoo: "wahoo" as SpeechCon,
    wah_wah: "wah wah" as SpeechCon,
    watch_out: "watch out" as SpeechCon,
    way_to_go: "way to go" as SpeechCon,
    well_done: "well done" as SpeechCon,
    well_well: "well well" as SpeechCon,
    wham: "wham" as SpeechCon,
    whammo: "whammo" as SpeechCon,
    whee: "whee" as SpeechCon,
    whew: "whew" as SpeechCon,
    woof: "woof" as SpeechCon,
    whoops_a_daisy: "whoops a daisy" as SpeechCon,
    whoosh: "whoosh" as SpeechCon,
    woo_hoo: "woo hoo" as SpeechCon,
    wow: "wow" as SpeechCon,
    wowza: "wowza" as SpeechCon,
    wowzer: "wowzer" as SpeechCon,
    yadda_yadda_yadda: "yadda yadda yadda" as SpeechCon,
    yay: "yay" as SpeechCon,
    yikes: "yikes" as SpeechCon,
    yippee: "yippee" as SpeechCon,
    yoink: "yoink" as SpeechCon,
    yoo_hoo: "yoo hoo" as SpeechCon,
    you_bet: "you bet" as SpeechCon,
    yowza: "yowza" as SpeechCon,
    yowzer: "yowzer" as SpeechCon,
    yuck: "yuck" as SpeechCon,
    yum: "yum" as SpeechCon,
    zap: "zap" as SpeechCon,
    zing: "zing" as SpeechCon,
    zoinks: "zoinks" as SpeechCon,
};
export type SpeechConUK = "abracadabra" | "ace" | "achoo" | "ahoy" | "all" | "aloha" | "aooga" | "arrivederci" | "as if" | "as you wish" | "au revoir" | "aw" | "aw man" | "awesome" | "baa" | "bah humbug" | "bam" | "bang" | "bazinga" | "beep beep" | "bingo" | "blah" | "blarg" | "blast" | "blimey" | "bob's your uncle" | "boing" | "bon appetit" | "bon voyage" | "bonjour" | "boo" | "boo hoo" | "booya" | "bother" | "bravo" | "caw" | "cha ching" | "checkmate" | "cheer up" | "cheerio" | "cheers" | "chirp" | "choo choo" | "clank" | "clickety clack" | "cock a doodle doo" | "codswallop" | "coo" | "cowabunga" | "crikey" | "d'oh" | "darn" | "ditto" | "dot dot dot" | "duh" | "dun dun dun" | "eek" | "eep" | "en garde" | "encore" | "eureka" | "ew" | "fancy that" | "geronimo" | "giddy up" | "good golly" | "good grief" | "good luck" | "good riddance" | "gosh" | "gotcha" | "great scott" | "ha" | "ha ha" | "heads up" | "hear hear" | "hip hip hooray" | "hiss" | "honk" | "howdy" | "howzat" | "hurrah" | "hurray" | "huzzah" | "jeepers creepers" | "jiminy cricket" | "jinx" | "just kidding" | "kablam" | "kaboom" | "kaching" | "kapow" | "knock knock" | "le sigh" | "look out" | "mamma mia" | "man overboard" | "mazel tov" | "meow" | "merci" | "moo" | "no way" | "nom nom" | "now now" | "oh boy" | "oh dear" | "oh my" | "oh my giddy aunt" | "oh snap" | "okey dokey" | "oof" | "ooh la la" | "open sesame" | "ouch" | "ow" | "oy" | "pardon" | "phew" | "phooey" | "ping" | "plop" | "pop" | "pow" | "quack" | "read 'em and weep" | "ribbit" | "righto" | "roger" | "sigh" | "simples" | "splash" | "spoiler alert" | "squee" | "swish" | "swoosh" | "ta da" | "tallyho" | "tee hee" | "there there" | "thump" | "tick tick tick" | "tick tock" | "tosh" | "touche" | "tsk tsk" | "tut tut" | "tweet" | "uh huh" | "uh oh" | "voila" | "vroom" | "wahoo" | "watch out" | "way to go" | "well done" | "well well" | "wham" | "whammo" | "whee" | "whoop" | "whoops" | "whoops a daisy" | "whoosh" | "woo hoo" | "wow" | "wowza" | "yadda yadda yadda" | "yippee" | "yoink" | "you bet" | "yowza" | "yum" | "zap" | "zing" | "zoinks";
export const ConUK = {
    abracadabra: "abracadabra" as SpeechConUK,
    ace: "ace" as SpeechConUK,
    achoo: "achoo" as SpeechConUK,
    ahoy: "ahoy" as SpeechConUK,
    all: "all" as SpeechConUK,
    aloha: "aloha" as SpeechConUK,
    aooga: "aooga" as SpeechConUK,
    arrivederci: "arrivederci" as SpeechConUK,
    as_if: "as if" as SpeechConUK,
    as_you_wish: "as you wish" as SpeechConUK,
    au_revoir: "au revoir" as SpeechConUK,
    aw: "aw" as SpeechConUK,
    aw_man: "aw man" as SpeechConUK,
    awesome: "awesome" as SpeechConUK,
    baa: "baa" as SpeechConUK,
    bah_humbug: "bah humbug" as SpeechConUK,
    bam: "bam" as SpeechConUK,
    bang: "bang" as SpeechConUK,
    bazinga: "bazinga" as SpeechConUK,
    beep_beep: "beep beep" as SpeechConUK,
    bingo: "bingo" as SpeechConUK,
    blah: "blah" as SpeechConUK,
    blarg: "blarg" as SpeechConUK,
    blast: "blast" as SpeechConUK,
    blimey: "blimey" as SpeechConUK,
    bobs_your_uncle: "bobs your uncle" as SpeechConUK,
    boing: "boing" as SpeechConUK,
    bon_appetit: "bon appetit" as SpeechConUK,
    bon_voyage: "bon voyage" as SpeechConUK,
    bonjour: "bonjour" as SpeechConUK,
    boo: "boo" as SpeechConUK,
    boo_hoo: "boo hoo" as SpeechConUK,
    booya: "booya" as SpeechConUK,
    bother: "bother" as SpeechConUK,
    bravo: "bravo" as SpeechConUK,
    caw: "caw" as SpeechConUK,
    cha_ching: "cha ching" as SpeechConUK,
    checkmate: "checkmate" as SpeechConUK,
    cheer_up: "cheer up" as SpeechConUK,
    cheerio: "cheerio" as SpeechConUK,
    cheers: "cheers" as SpeechConUK,
    chirp: "chirp" as SpeechConUK,
    choo_choo: "choo choo" as SpeechConUK,
    clank: "clank" as SpeechConUK,
    clickety_clack: "clickety clack" as SpeechConUK,
    cock_a_doodle_doo: "cock a doodle doo" as SpeechConUK,
    codswallop: "codswallop" as SpeechConUK,
    coo: "coo" as SpeechConUK,
    cowabunga: "cowabunga" as SpeechConUK,
    crikey: "crikey" as SpeechConUK,
    doh: "doh" as SpeechConUK,
    darn: "darn" as SpeechConUK,
    ditto: "ditto" as SpeechConUK,
    dot_dot_dot: "dot dot dot" as SpeechConUK,
    duh: "duh" as SpeechConUK,
    dun_dun_dun: "dun dun dun" as SpeechConUK,
    eek: "eek" as SpeechConUK,
    eep: "eep" as SpeechConUK,
    en_garde: "en garde" as SpeechConUK,
    encore: "encore" as SpeechConUK,
    eureka: "eureka" as SpeechConUK,
    ew: "ew" as SpeechConUK,
    fancy_that: "fancy that" as SpeechConUK,
    geronimo: "geronimo" as SpeechConUK,
    giddy_up: "giddy up" as SpeechConUK,
    good_golly: "good golly" as SpeechConUK,
    good_grief: "good grief" as SpeechConUK,
    good_luck: "good luck" as SpeechConUK,
    good_riddance: "good riddance" as SpeechConUK,
    gosh: "gosh" as SpeechConUK,
    gotcha: "gotcha" as SpeechConUK,
    great_scott: "great scott" as SpeechConUK,
    ha: "ha" as SpeechConUK,
    ha_ha: "ha ha" as SpeechConUK,
    heads_up: "heads up" as SpeechConUK,
    hear_hear: "hear hear" as SpeechConUK,
    hip_hip_hooray: "hip hip hooray" as SpeechConUK,
    hiss: "hiss" as SpeechConUK,
    honk: "honk" as SpeechConUK,
    howdy: "howdy" as SpeechConUK,
    howzat: "howzat" as SpeechConUK,
    hurrah: "hurrah" as SpeechConUK,
    hurray: "hurray" as SpeechConUK,
    huzzah: "huzzah" as SpeechConUK,
    jeepers_creepers: "jeepers creepers" as SpeechConUK,
    jiminy_cricket: "jiminy cricket" as SpeechConUK,
    jinx: "jinx" as SpeechConUK,
    just_kidding: "just kidding" as SpeechConUK,
    kablam: "kablam" as SpeechConUK,
    kaboom: "kaboom" as SpeechConUK,
    kaching: "kaching" as SpeechConUK,
    kapow: "kapow" as SpeechConUK,
    knock_knock: "knock knock" as SpeechConUK,
    le_sigh: "le sigh" as SpeechConUK,
    look_out: "look out" as SpeechConUK,
    mamma_mia: "mamma mia" as SpeechConUK,
    man_overboard: "man overboard" as SpeechConUK,
    mazel_tov: "mazel tov" as SpeechConUK,
    meow: "meow" as SpeechConUK,
    merci: "merci" as SpeechConUK,
    moo: "moo" as SpeechConUK,
    no_way: "no way" as SpeechConUK,
    nom_nom: "nom nom" as SpeechConUK,
    now_now: "now now" as SpeechConUK,
    oh_boy: "oh boy" as SpeechConUK,
    oh_dear: "oh dear" as SpeechConUK,
    oh_my: "oh my" as SpeechConUK,
    oh_my_giddy_aunt: "oh my giddy aunt" as SpeechConUK,
    oh_snap: "oh snap" as SpeechConUK,
    okey_dokey: "okey dokey" as SpeechConUK,
    oof: "oof" as SpeechConUK,
    ooh_la_la: "ooh la la" as SpeechConUK,
    open_sesame: "open sesame" as SpeechConUK,
    ouch: "ouch" as SpeechConUK,
    ow: "ow" as SpeechConUK,
    oy: "oy" as SpeechConUK,
    pardon: "pardon" as SpeechConUK,
    phew: "phew" as SpeechConUK,
    phooey: "phooey" as SpeechConUK,
    ping: "ping" as SpeechConUK,
    plop: "plop" as SpeechConUK,
    pop: "pop" as SpeechConUK,
    pow: "pow" as SpeechConUK,
    quack: "quack" as SpeechConUK,
    read_em_and_weep: "read em and weep" as SpeechConUK,
    ribbit: "ribbit" as SpeechConUK,
    righto: "righto" as SpeechConUK,
    roger: "roger" as SpeechConUK,
    sigh: "sigh" as SpeechConUK,
    simples: "simples" as SpeechConUK,
    splash: "splash" as SpeechConUK,
    spoiler_alert: "spoiler alert" as SpeechConUK,
    squee: "squee" as SpeechConUK,
    swish: "swish" as SpeechConUK,
    swoosh: "swoosh" as SpeechConUK,
    ta_da: "ta da" as SpeechConUK,
    tallyho: "tallyho" as SpeechConUK,
    tee_hee: "tee hee" as SpeechConUK,
    there_there: "there there" as SpeechConUK,
    thump: "thump" as SpeechConUK,
    tick_tick_tick: "tick tick tick" as SpeechConUK,
    tick_tock: "tick tock" as SpeechConUK,
    tosh: "tosh" as SpeechConUK,
    touche: "touche" as SpeechConUK,
    tsk_tsk: "tsk tsk" as SpeechConUK,
    tut_tut: "tut tut" as SpeechConUK,
    tweet: "tweet" as SpeechConUK,
    uh_huh: "uh huh" as SpeechConUK,
    uh_oh: "uh oh" as SpeechConUK,
    voila: "voila" as SpeechConUK,
    vroom: "vroom" as SpeechConUK,
    wahoo: "wahoo" as SpeechConUK,
    watch_out: "watch out" as SpeechConUK,
    way_to_go: "way to go" as SpeechConUK,
    well_done: "well done" as SpeechConUK,
    well_well: "well well" as SpeechConUK,
    wham: "wham" as SpeechConUK,
    whammo: "whammo" as SpeechConUK,
    whee: "whee" as SpeechConUK,
    whoop: "whoop" as SpeechConUK,
    whoops: "whoops" as SpeechConUK,
    whoops_a_daisy: "whoops a daisy" as SpeechConUK,
    whoosh: "whoosh" as SpeechConUK,
    woo_hoo: "woo hoo" as SpeechConUK,
    wow: "wow" as SpeechConUK,
    wowza: "wowza" as SpeechConUK,
    yadda_yadda_yadda: "yadda yadda yadda" as SpeechConUK,
    yippee: "yippee" as SpeechConUK,
    yoink: "yoink" as SpeechConUK,
    you_bet: "you bet" as SpeechConUK,
    yowza: "yowza" as SpeechConUK,
    yum: "yum" as SpeechConUK,
    zap: "zap" as SpeechConUK,
    zing: "zing" as SpeechConUK,
    zoinks: "zoinks" as SpeechConUK,
};
export type SpeechConDE = "aber hallo" | "aber sicher" | "abrakadabra" | "ach" | "ach du grüne neune" | "ach du liebe zeit" | "ach du meine güte" | "ach ja" | "ach so" | "achje" | "achtung" | "ade" | "ah" | "aha" | "ähm" | "ahoi" | "alles klar" | "aloha" | "als ob" | "argh" | "arrivederci" | "aso" | "au" | "au weia" | "aua" | "autsch" | "bazinga" | "bingo" | "bis bald" | "bis dann" | "bla" | "boing" | "bon appetit" | "bon voyage" | "bonjour" | "bravo" | "brumm" | "buh" | "buhu" | "bumm" | "bzz" | "da lachen ja die hühner" | "ding dong" | "dito" | "donner und doria" | "donnerwetter" | "ebenso" | "en garde" | "ey" | "geh nur" | "gemach" | "genug" | "gesundheit" | "gott im himmel" | "grüß gott" | "gute reise" | "guten appetit" | "hach ja" | "halleluja" | "hals und beinbruch" | "halt" | "hände hoch" | "heiliger strohsack" | "heisa" | "hey" | "hihi" | "hipp hipp hurra" | "hört hört" | "hü" | "hüa" | "huch" | "huhu" | "hui" | "hurra" | "ich glaub ich bin im kino" | "ich glaub mein schwein pfeift" | "ich glaub mich knutscht ein elch" | "ich glaub mich laust der affe" | "ich glaub mich tritt ein pferd" | "igitt" | "iiieh" | "ist nicht dein ernst" | "japp" | "jawohl" | "jo" | "juhu" | "kein kommentar" | "keine ursache" | "kikeriki" | "klar" | "klick klack" | "kopf hoch" | "kuckuck" | "lass es dir schmecken" | "lecker" | "los" | "mach's gut" | "mahlzeit" | "mamma mia" | "mann über bord" | "manometer" | "mazel tov" | "mein gott" | "merci" | "miau" | "mist" | "moin" | "muh" | "na klar" | "na sieh mal einer an" | "na und?" | "na?" | "naja" | "nanu?" | "ne" | "nee" | "nichts da" | "nix da" | "nö" | "null problemo" | "obacht" | "och" | "oh mann" | "oh mein gott" | "oh my god" | "oh nein" | "oh oh" | "ohne scheiß" | "oink" | "oje" | "okey dokey" | "ooh la la" | "pfui" | "piep" | "plop" | "plumps" | "prima" | "prosit" | "prost" | "puff" | "puh" | "pustekuchen" | "schachmatt" | "schade" | "schau an" | "sesam öffne dich" | "seufz" | "sieh an" | "siehe da" | "siehste?" | "spoileralarm" | "stimmt" | "super" | "supi" | "süßes oder saures" | "tada" | "tatsächlich" | "tick tack" | "tja" | "touche" | "tschö" | "türlich" | "tut" | "uff" | "verdammt" | "verflixt" | "viel glück" | "voila" | "von wegen" | "vorsicht" | "war nur ein scherz" | "was zur hölle" | "weh mir" | "wehe" | "wie du meinst" | "willkommen" | "wow" | "wuff" | "yay" | "zugabe" | "zum wohl";
export const ConDE = {
    aber_hallo: "aber hallo" as SpeechConDE,
    aber_sicher: "aber sicher" as SpeechConDE,
    abrakadabra: "abrakadabra" as SpeechConDE,
    ach: "ach" as SpeechConDE,
    ach_du_grüne_neune: "ach du grüne neune" as SpeechConDE,
    ach_du_liebe_zeit: "ach du liebe zeit" as SpeechConDE,
    ach_du_meine_güte: "ach du meine güte" as SpeechConDE,
    ach_ja: "ach ja" as SpeechConDE,
    ach_so: "ach so" as SpeechConDE,
    achje: "achje" as SpeechConDE,
    achtung: "achtung" as SpeechConDE,
    ade: "ade" as SpeechConDE,
    ah: "ah" as SpeechConDE,
    aha: "aha" as SpeechConDE,
    ähm: "ähm" as SpeechConDE,
    ahoi: "ahoi" as SpeechConDE,
    alles_klar: "alles klar" as SpeechConDE,
    aloha: "aloha" as SpeechConDE,
    als_ob: "als ob" as SpeechConDE,
    argh: "argh" as SpeechConDE,
    arrivederci: "arrivederci" as SpeechConDE,
    aso: "aso" as SpeechConDE,
    au: "au" as SpeechConDE,
    au_weia: "au weia" as SpeechConDE,
    aua: "aua" as SpeechConDE,
    autsch: "autsch" as SpeechConDE,
    bazinga: "bazinga" as SpeechConDE,
    bingo: "bingo" as SpeechConDE,
    bis_bald: "bis bald" as SpeechConDE,
    bis_dann: "bis dann" as SpeechConDE,
    bla: "bla" as SpeechConDE,
    boing: "boing" as SpeechConDE,
    bon_appetit: "bon appetit" as SpeechConDE,
    bon_voyage: "bon voyage" as SpeechConDE,
    bonjour: "bonjour" as SpeechConDE,
    bravo: "bravo" as SpeechConDE,
    brumm: "brumm" as SpeechConDE,
    buh: "buh" as SpeechConDE,
    buhu: "buhu" as SpeechConDE,
    bumm: "bumm" as SpeechConDE,
    bzz: "bzz" as SpeechConDE,
    da_lachen_ja_die_hühner: "da lachen ja die hühner" as SpeechConDE,
    ding_dong: "ding dong" as SpeechConDE,
    dito: "dito" as SpeechConDE,
    donner_und_doria: "donner und doria" as SpeechConDE,
    donnerwetter: "donnerwetter" as SpeechConDE,
    ebenso: "ebenso" as SpeechConDE,
    en_garde: "en garde" as SpeechConDE,
    ey: "ey" as SpeechConDE,
    geh_nur: "geh nur" as SpeechConDE,
    gemach: "gemach" as SpeechConDE,
    genug: "genug" as SpeechConDE,
    gesundheit: "gesundheit" as SpeechConDE,
    gott_im_himmel: "gott im himmel" as SpeechConDE,
    grüß_gott: "grüß gott" as SpeechConDE,
    gute_reise: "gute reise" as SpeechConDE,
    guten_appetit: "guten appetit" as SpeechConDE,
    hach_ja: "hach ja" as SpeechConDE,
    halleluja: "halleluja" as SpeechConDE,
    hals_und_beinbruch: "hals und beinbruch" as SpeechConDE,
    halt: "halt" as SpeechConDE,
    hände_hoch: "hände hoch" as SpeechConDE,
    heiliger_strohsack: "heiliger strohsack" as SpeechConDE,
    heisa: "heisa" as SpeechConDE,
    hey: "hey" as SpeechConDE,
    hihi: "hihi" as SpeechConDE,
    hipp_hipp_hurra: "hipp hipp hurra" as SpeechConDE,
    hört_hört: "hört hört" as SpeechConDE,
    hü: "hü" as SpeechConDE,
    hüa: "hüa" as SpeechConDE,
    huch: "huch" as SpeechConDE,
    huhu: "huhu" as SpeechConDE,
    hui: "hui" as SpeechConDE,
    hurra: "hurra" as SpeechConDE,
    ich_glaub_ich_bin_im_kino: "ich glaub ich bin im kino" as SpeechConDE,
    ich_glaub_mein_schwein_pfeift: "ich glaub mein schwein pfeift" as SpeechConDE,
    ich_glaub_mich_knutscht_ein_elch: "ich glaub mich knutscht ein elch" as SpeechConDE,
    ich_glaub_mich_laust_der_affe: "ich glaub mich laust der affe" as SpeechConDE,
    ich_glaub_mich_tritt_ein_pferd: "ich glaub mich tritt ein pferd" as SpeechConDE,
    igitt: "igitt" as SpeechConDE,
    iiieh: "iiieh" as SpeechConDE,
    ist_nicht_dein_ernst: "ist nicht dein ernst" as SpeechConDE,
    japp: "japp" as SpeechConDE,
    jawohl: "jawohl" as SpeechConDE,
    jo: "jo" as SpeechConDE,
    juhu: "juhu" as SpeechConDE,
    kein_kommentar: "kein kommentar" as SpeechConDE,
    keine_ursache: "keine ursache" as SpeechConDE,
    kikeriki: "kikeriki" as SpeechConDE,
    klar: "klar" as SpeechConDE,
    klick_klack: "klick klack" as SpeechConDE,
    kopf_hoch: "kopf hoch" as SpeechConDE,
    kuckuck: "kuckuck" as SpeechConDE,
    lass_es_dir_schmecken: "lass es dir schmecken" as SpeechConDE,
    lecker: "lecker" as SpeechConDE,
    los: "los" as SpeechConDE,
    mach: "mach's gut" as SpeechConDE,
    mahlzeit: "mahlzeit" as SpeechConDE,
    mamma_mia: "mamma mia" as SpeechConDE,
    mann_über_bord: "mann über bord" as SpeechConDE,
    manometer: "manometer" as SpeechConDE,
    mazel_tov: "mazel tov" as SpeechConDE,
    mein_gott: "mein gott" as SpeechConDE,
    merci: "merci" as SpeechConDE,
    miau: "miau" as SpeechConDE,
    mist: "mist" as SpeechConDE,
    moin: "moin" as SpeechConDE,
    muh: "muh" as SpeechConDE,
    na_klar: "na klar" as SpeechConDE,
    na_sieh_mal_einer_an: "na sieh mal einer an" as SpeechConDE,
    na_und_: "na und?" as SpeechConDE,
    na_: "na?" as SpeechConDE,
    naja: "naja" as SpeechConDE,
    nanu: "nanu" as SpeechConDE,
    ne: "ne" as SpeechConDE,
    nee: "nee" as SpeechConDE,
    nichts_da: "nichts da" as SpeechConDE,
    nix_da: "nix da" as SpeechConDE,
    nö: "nö" as SpeechConDE,
    null_problemo: "null problemo" as SpeechConDE,
    obacht: "obacht" as SpeechConDE,
    och: "och" as SpeechConDE,
    oh_mann: "oh mann" as SpeechConDE,
    oh_mein_gott: "oh mein gott" as SpeechConDE,
    oh_my_god: "oh my god" as SpeechConDE,
    oh_nein: "oh nein" as SpeechConDE,
    oh_oh: "oh oh" as SpeechConDE,
    ohne_scheiß: "ohne scheiß" as SpeechConDE,
    oink: "oink" as SpeechConDE,
    oje: "oje" as SpeechConDE,
    okey_dokey: "okey dokey" as SpeechConDE,
    ooh_la_la: "ooh la la" as SpeechConDE,
    pfui: "pfui" as SpeechConDE,
    piep: "piep" as SpeechConDE,
    plop: "plop" as SpeechConDE,
    plumps: "plumps" as SpeechConDE,
    prima: "prima" as SpeechConDE,
    prosit: "prosit" as SpeechConDE,
    prost: "prost" as SpeechConDE,
    puff: "puff" as SpeechConDE,
    puh: "puh" as SpeechConDE,
    pustekuchen: "pustekuchen" as SpeechConDE,
    schachmatt: "schachmatt" as SpeechConDE,
    schade: "schade" as SpeechConDE,
    schau_an: "schau an" as SpeechConDE,
    sesam_öffne_dich: "sesam öffne dich" as SpeechConDE,
    seufz: "seufz" as SpeechConDE,
    sieh_an: "sieh an" as SpeechConDE,
    siehe_da: "siehe da" as SpeechConDE,
    siehste: "siehste" as SpeechConDE,
    spoileralarm: "spoileralarm" as SpeechConDE,
    stimmt: "stimmt" as SpeechConDE,
    super: "super" as SpeechConDE,
    supi: "supi" as SpeechConDE,
    süßes_oder_saures: "süßes oder saures" as SpeechConDE,
    tada: "tada" as SpeechConDE,
    tatsächlich: "tatsächlich" as SpeechConDE,
    tick_tack: "tick tack" as SpeechConDE,
    tja: "tja" as SpeechConDE,
    touche: "touche" as SpeechConDE,
    tschö: "tschö" as SpeechConDE,
    türlich: "türlich" as SpeechConDE,
    tut: "tut" as SpeechConDE,
    uff: "uff" as SpeechConDE,
    verdammt: "verdammt" as SpeechConDE,
    verflixt: "verflixt" as SpeechConDE,
    viel_glück: "viel glück" as SpeechConDE,
    voila: "voila" as SpeechConDE,
    von_wegen: "von wegen" as SpeechConDE,
    vorsicht: "vorsicht" as SpeechConDE,
    war_nur_ein_scherz: "war nur ein scherz" as SpeechConDE,
    was_zur_hölle: "was zur hölle" as SpeechConDE,
    weh_mir: "weh mir" as SpeechConDE,
    wehe: "wehe" as SpeechConDE,
    wie_du_meinst: "wie du meinst" as SpeechConDE,
    willkommen: "willkommen" as SpeechConDE,
    wow: "wow" as SpeechConDE,
    wuff: "wuff" as SpeechConDE,
    yay: "yay" as SpeechConDE,
    zugabe: "zugabe" as SpeechConDE,
    zum_wohl: "zum wohl" as SpeechConDE,
};
export type Effect = "whispered";
export const Effect = {
    whispered: "whispered" as Effect,
};
export type BreakStrengthType = "none" | "x-weak" | "weak" | "medium" | "strong" | "x-strong";
/**
 * amazon:VB: Interpret the word as a verb (present simple).
 *
 * amazon:VBD: Interpret the word as a past participle.
 *
 * amazon:NN: Interpret the word as a noun.
 *
 * amazon:SENSE_1:  Use the non-default sense of the word. For example,
 *   the noun “bass” is pronounced differently depending on meaning.
 *   The “default” meaning is the lowest part of the musical range. The
 *   alternate sense (which is still a noun) is a freshwater fish.
 *   Specifying <speak><w role="amazon:SENSE_1">bass</w>"</speak>
 *   renders the non-default pronunciation (freshwater fish).
 */
export type PartOfSpeech = "amazon:VB" | "amazon:VBD" | "amazon:NN" | "amazon:SENSE_1";
export const PartOfSpeech = {
    /**
     * Interpret the word as a verb (present simple).
     */
    verb: "amazon:VB" as PartOfSpeech,
    /**
     * Interpret the word as a past participle.
     */
    past_participle: "amazon:VBD" as PartOfSpeech,
    /**
     * Interpret the word as a noun.
     */
    noun: "amazon:NN" as PartOfSpeech,
    /**
     * Use the non-default sense of the word. For example,
     * the noun “bass” is pronounced differently depending on meaning.
     * The “default” meaning is the lowest part of the musical range.
     * The alternate sense (which is still a noun) is a freshwater
     * fish. Specifying
     * <speak><w role="amazon:SENSE_1">bass</w>"</speak>
     * renders the non-default pronunciation (freshwater fish).
     */
    sense1: "amazon:SENSE_1" as PartOfSpeech,
};

class Ssml {
    /**
     * Wraps a given list of paragraph strings in `<speak>` tags, with
     * optional paragraph `<p>` tags.
     *
     * @param paras individual paragraphs to be wrapped in <p></p> tags.
     * @param addParaTags If true, wraps individual strings in paras with `<p>` tags. Otherwise just concats.
     */
    static wrapSsmlSpeak(paras: string[], addParaTags: boolean = true): string {
        let result: string = "<speak>" +
            paras.reduce((agg, p) => {
                return addParaTags ? agg + "<p>" + p + "</p>" : agg + p;
            }, "") +
            "</speak>";
        return result;
    }
    /**
     * This simply replaces <speak> and </speak> tags with an empty
     * string.
     *
     * Use this when you want to add some text to existing ssml and
     * then re-wrap the ssml.
     *
     * @see {Helper.stripSsml} function.
     *
     * @param ssml with <speak> tag around the whole thing.
     */
    static unwrapSsmlSpeak(ssml: string): string {
        return ssml.replace(/\<speak\>/g, "").replace(/\<\/speak\>/g, "");
    }
    /**
     * Simply wraps with <p> tag.
     *
     * Represents a paragraph. This tag provides extra-strong breaks
     * before and after the tag. This is equivalent to specifying a
     * pause with <break strength="x-strong"/>.
     *
     * @param text to wrap
     */
    static p(text: string): string {
        return '<p>' + text + '</p>';
    }
    /**
     * Simply wraps with <s> tag.
     *
     * Represents a sentence. This tag provides strong breaks before
     * and after the tag.
     *
     * This is equivalent to:
     *     Ending a sentence with a period (.).
     *     Specifying a pause with <break strength="strong"/>.

     * @param text to wrap
     */
    static s(text: string): string {
        return '<s>' + text + '</s>';
    }
    /**
     * Strips all tags within ssml to produce plain text.
     *
     * @see {Helper.unwrapSsmlSpeak} function.
     *
     * @param ssml to strip
     */
    static stripSsml(ssml: string): string {
        const stripped = ssml
            // Combines </p> <p> to not double para breaks
            .replace(/\<\/p\>[ ]*\<p\>/g, "<p>")
            // remove spaces after <p>,</p> tags
            .replace(/\<p\>(?=[ ])/g, "<p>")
            .replace(/\<\/p\>(?=[ ])/g, "</p>")
            // convert <p> and </p> to two new lines
            .replace(/\<[\/]*p\>/g, "\n\n")
            // Strip all remaining tags
            .replace(/(<([^>]*)>)/ig, "")
            // Replace multiple spaces with a single space
            .replace(/  +/g, ' ')
            .replace(/\\n\\n\\n/g, "\n\n")
            // .replace(/^\\n+/, "")
            .replace(/^\n+/, "")
            .replace(/\n+$/, "");
        return stripped;
    }
    /**
     * Wraps a given text in an ssml phoneme tag with the given
     * pronunciation and alphabet.
     *
     * @param text Literal text that we're wrapping the phoneme tag around, e.g. "sewing".
     * @param pronunciation the phoneme itself, e.g. "soʊɪŋ"
     * @param alphabet phoneme alphabet, either "ipa" or "x-sampe" (ATOW)
     *
     * @see {@link https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#prosody|SsmlReference}
     */
    static phoneme(text: string, pronunciation: string, alphabet: "ipa" | "x-sampa" = "ipa"): string {
        return `<phoneme alphabet="${alphabet}" ph="${pronunciation}">${text}</phoneme>`;
    }
    /**
     * Wraps a given text in an ssml emphasis tag.
     *
     * e.g. <emphasis level="${level}">${text}</emphasis>`
     *
     * @param text to wrap with the emphasis tag
     * @param level attribute in emphasis tag. Valid values "strong" | "moderate" | "reduced" = "moderate"
     *
     * @see {@link https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#prosody|SsmlReference}
     */
    static emphasis(text: string, level: "strong" | "moderate" | "reduced" = "moderate"): string {
        return `<emphasis level="${level}">${text}</emphasis>`;
    }
    /**
     * Wraps a given text in an ssml prosody tag with the given
     * options of rate, pitch, and/or volume.
     *
     * @param rate valid values ATOW "x-slow" | "slow" | "medium" | "fast" | "x-fast" | number,
     * @param pitch valid values ATOW "x-low" | "low" | "medium" | "high" | "x-high" | number,
     * @param volume valid values ATOW "silent" | "x-soft" | "soft" | "medium" | "loud" | "x-loud" | number
     *
     * @see {@link https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#prosody|SsmlReference}
     */
    // static prosody(text, { rate, pitch, volume }) {
    static prosody(text: string, { rate, pitch, volume }: {
        rate?: ProsodyRateType;
        pitch?: ProsodyPitchType;
        volume?: ProsodyVolumeType;
    }): string {
        let t = this, lc = `prosody`;
        let attrs = "";
        // adds the + to positive numbers
        if (rate || rate === 0) {
            const rateText = typeof rate === 'number' ?
                rate + "%" :
                <string>rate;
            attrs += `rate="${rateText}"`;
        }
        if (pitch || pitch === 0) {
            let pitchText: string;
            if (typeof pitch === 'number') {
                const pitchNum = pitch;
                if (pitch >= 0) {
                    const max = 50;
                    if (pitchNum > max) { console.warn(`${lc} max: ${max}, actual: ${pitchNum} (W: 7fd9706e59f24dba896e2de149904677)`); }
                    pitchText = "+" + pitchNum + "%";
                } else {
                    const min = -33.3;
                    if (pitchNum < min) { console.warn(`${lc} min: ${min}, actual: ${pitchNum} (W: 90f4c21672034c51a8a95dcfcd281f98)`); }
                    pitchText = "-" + pitchNum + "%";
                }
            } else {
                pitchText = <string>pitch;
            }
            attrs = attrs ? attrs + " " : attrs;
            attrs += `pitch="${pitchText}"`;
        }
        if (volume || volume === 0) {
            let volumeText: string;
            if (typeof volume === 'number') {
                let volumeNum = <number>volume;
                if (volumeNum >= 0) {
                    const max = 4.08;
                    if (volumeNum > max) { console.warn(`${lc} max: ${max}, actual: ${volumeNum} (W: 7db9521e6b3e418faca89d2f5cfa4f2c)`); }
                    volumeText = "+" + volumeNum + "%";
                } else {
                    const min = -12;
                    if (volumeNum < min) { console.warn(`${lc} min: ${min}, actual: ${volumeNum} (W: 49210d930272498e828d2c9a815ceea0)`); }
                }

                volumeText = volumeNum + "%";
            } else {
                volumeText = <string>volume;

            }
            attrs = attrs ? attrs + " " : attrs;
            attrs += (volume ? `volume="${volumeText}"` : "");
        }
        return "<prosody " + attrs + ">" + text + "</prosody>";
    }
    /**
     * Generates SpeechCon SSML.
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speechcon-reference
     */
    static speech(speechCon: SpeechCon): string {
        return `<say-as interpret-as="interjection">${speechCon}</say-as>`;
    }
    /**
     * Applies Amazon-specific effects to the speech.
     *
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#amazon-effect
     *
     * The name of the effect to apply to the speech. Available effects:
     *   whispered: Applies a whispering effect to the speech.
     * @param effect Which amazon:effect. ATOW only whispered implemented.
     * @param s text to wrap in the effect.
     */
    static amazon(effect: Effect, s: string): string {
        return `<amazon:effect name="${effect}">${s}</amazon:effect>`;
    }
    /**
     * The audio tag lets you provide the URL for an MP3 file that the
     * Alexa service can play while rendering a response. You can use
     * this to embed short, pre-recorded audio within your service’s
     * response. For example, you could include sound effects alongside
     * your text-to-speech responses, or provide responses using a
     * voice associated with your brand. For more information, see
     * Including Short Pre-Recorded Audio in your Response at
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/handling-requests-sent-by-alexa#audio.
     *
     * Note the following requirements and limitations:
     *
     * * The MP3 must be hosted at an Internet-accessible HTTPS
     *   endpoint. HTTPS is required, and the domain hosting the MP3
     *   file must present a valid, trusted SSL certificate.
     *   Self-signed certificates cannot be used.
     * * The MP3 must not contain any customer-specific or other
     *   sensitive information.
     * * The MP3 must be a valid MP3 file (MPEG version 2).
     * * The audio file cannot be longer than ninety (90) seconds.
     * * The bit rate must be 48 kbps. Note that this bit rate gives a
     *   good result when used with spoken content, but is generally
     *   not a high enough quality for music.
     * * The sample rate must be 16000 Hz.
     *
     * You may need to use converter software to convert your MP3 files
     * to the required codec version (MPEG version 2) and bit rate (48
     * kbps).
     *
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#audio
     *
     * @param srcUrl Specifies the URL for the MP3 file.
     */
    static audio(srcUrl: string): string {
        return `<audio src="${srcUrl}" />`;
    }
    /**
     * Represents a pause in the speech. Set the length of the pause
     * with the strength or time attributes.
     *
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#break
     *
     * @param param0
     */
    static break({ strength, s, ms }: {
        /**
         * none:     No pause should be outputted. This can be used to remove a pause that would normally occur (such as after a period).
         *
         * x-weak:   No pause should be outputted (same as none).
         *
         * weak:      Treat adjacent words as if separated by a single comma (equivalent to medium).
         *
         * medium:   Treat adjacent words as if separated by a single comma.
         *
         * strong:   Make a sentence break (equivalent to using the <s> tag).
         *
         * x-strong: Make a paragraph break (equivalent to using the <p> tag).
         */
        strength?: BreakStrengthType;
        /**
         * Duration of the pause in seconds; up to 10 seconds.
         */
        s?: number;
        /**
         * Duration of the pause in milliseconds; up to 10000 milliseconds.
         */
        ms?: number;
    }): string {
        const lc = `Ssml.break`;
        if (strength) {
            return `<break strength="${strength}"/>`;
        }
        else if (s || s === 0) {
            const min = 0;
            const max = 10;
            if (s < min) {
                console.warn(`${lc} min: ${min}, actual: ${s} (W: 6ff97060a6734f20b16a81a20d06630e)`);
                s = min;
            }
            else if (s > max) {
                console.warn(`${lc} max: ${max}, actual: ${s} (W: d57ed120e09c4fcaa19b864bdf9f1fc7)`);
                s = max;
            }
            return `<break time="${s}s"/>`;
        } else if (ms || ms === 0) {
            const min = 0;
            const max = 10000;
            if (ms < min) {
                console.warn(`min: ${min}, actual: ${ms} (W: 0addf6dbab1844a9906bd18a859be3d7)`);
                ms = 0;
            }
            else if (ms > max) {
                console.warn(`max: ${max}, actual: ${ms} (W: f46b9868ec6d4ef2abd4f2aefe879427)`);
                ms = max;
            }
            return `<break time="${ms}ms"/>`;
        } else {
            throw new Error('Unknown break parameters (E: 1ae569301a354c28a54cc06b58c93b87)');
        }
    }
    /**
     * Takes a given text that will be written and provides an alias
     * for it when it's actually spoken.
     *
     * For example, if the written text is the element symbol "Mg", then
     * you probably want to verbally say the entire word: "Magnesium".
     * In this case, the "text" is "Mg" and the "alias" is "Magnesium".
     *
     * @see (@link https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#sub)
     *
     * @param text Written text that will be substituted when spoken, e.g. "Mg"
     * @param alias Spoken alias that will be spoken, e.g. "Magnesium"
     */
    static sub(text, alias) {
        return `<sub alias="${alias}">${text}</sub>`;
    }
    /**
     * Similar to <say-as>, this tag customizes the pronunciation of
     * words by specifying the word’s part of speech.
     *
     * @param text Text that requires clarity.
     * @param partOfSpeech Context provided for the given text.
     */
    static w(text, partOfSpeech) {
        return `<w role="${partOfSpeech}">${text}</w>`;
    }
    /**
     * Describes how the text should be interpreted. This lets you
     * provide additional context to the text and eliminate any
     * ambiguity on how Alexa should render the text. Indicate how
     * Alexa should interpret the text with the interpret-as attribute.
     *
     * Note that the Alexa service attempts to interpret the provided
     * text correctly based on the text’s formatting even without this
     * tag. For example, if your output speech includes “202-555-1212”,
     * Alexa speaks each individual digit, with a brief pause for each
     * dash. You don’t need to use <say-as interpret-as="telephone"> in
     * this case. However, if you provided the text “2025551212”, but
     * you wanted Alexa to speak it as a phone number, you would need
     * to use <say-as interpret-as="telephone">.
     *
     * @example
     * <speak>
     *     Here is a number spoken as a cardinal number:
     *     <say-as interpret-as="cardinal">12345</say-as>.
     *     Here is the same number with each digit spoken separately:
     *     <say-as interpret-as="digits">12345</say-as>.
     *     Here is a word spelled out: <say-as interpret-as="spell-out">hello</say-as>
     * </speak>
     *
     * @see
     * https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/speech-synthesis-markup-language-ssml-reference#say-as
     */
    static sayAs({ text, interpret, format }) {
        let lc = `Ssml.sayAs`;
        if (format) {
            if (interpret !== exports.As.date) {
                throw new Error(`${lc} format is only valid when InterpretAs is "date"`);
            }
            return `<say-as interpret-as="${interpret}" format="${format}">${text}</say-as>`;
        }
        else {
            return `<say-as interpret-as="${interpret}">${text}</say-as>`;
        }
    }
}
