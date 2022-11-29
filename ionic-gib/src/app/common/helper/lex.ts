import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import { Ssml } from './ssml';

const logalot = c.GLOBAL_LOG_A_LOT || true;

export type LanguageCode = "en" | "de" | "en-US" | "en-GB" | "en-CA" | "en-IN" | "de-DE";
export const LanguageCode = {
    en: "en" as LanguageCode,
    de: "de" as LanguageCode,
    enUS: "en-US" as LanguageCode,
    enGB: "en-GB" as LanguageCode,
    enCA: "en-CA" as LanguageCode,
    enIN: "en-IN" as LanguageCode,
    deDE: "de-DE" as LanguageCode,
};

/**
 * Interface for each record in the lex data.
 *
 * When specifying `TProps`, be sure it is a flat key: value object. (I think...) Definitely not a circular reference complex object, so maybe any non-circular POCO will work.
 */
export interface LexDatum<TProps = PropsData> {
    /**
     * Language of the lexical datum.
     */
    language?: LanguageCode;
    /**
     * Lexical items with the same id are considered alternatives for
     * the equivalent message, e.g. "Hello" and "Howdy".
     *
     * If you have multiple LexDatums with the same id, then this
     * can differentiate among them to get the _exact_ record.
     *
     * Basically this is an optional unique id, but the data overall
     * is indexed by a non-unique "id" string. :nose:? maybe...
     */
    specifier?: string;
    /**
     * Lexical items with the same id are considered alternatives for
     * the equivalent message, e.g. "Hello" and "Howdy".
     *
     * If you have multiple LexDatums with the same id, then this
     * can define the weighting of chance when selecting one of those
     * alternatives.
     *
     * Must be non-zero. Default weighting is 1.
     *
     * @see Lex.pickDatum
     */
    weighting?: number;
    /**
     * Keywords relating to the datum. You can specify keywords.
     */
    keywords?: string[];
    /**
     * This is the lines of plain text.
     *
     * There should be no ssml tags in here.
     */
    texts?: string[];
    /**
     * This is the ssml equivalent to `text`.
     *
     * Do NOT include any <speak> tags in here.
     */
    ssmls?: string[];
    /**
     * Additional dynamic properties to filter/match against.
     *
     * Use Case:
     *
     * Currently, I'm doing x=123 in keywords, and this is meant to
     * improve upon that.
     */
    props?: TProps;
}
export interface LexGetOptions<TProps = PropsData> {
    /**
     * Language of datum to get.
     */
    language?: LanguageCode;
    /**
     * Specifier of datum to get.
     */
    specifier?: string;
    /**
     * Keywords of datum to get.
     */
    keywords?: string[];
    /**
     * Determines how the `LexGetOptions.keywords` match with filtering
     * data.
     * @see {KeywordMode}
     */
    keywordMode?: KeywordMode;
    /**
     * Index (0-based) into text/ssml of LexDatum to get.
     * If not provided, will return all lines.
     * Basically, use this if you just want a single string from the
     * texts/ssmls array but don't want to duplicate that in a separate
     * data entry.
     *
     * @example If you have texts of [ "a", "b", "c" ], but you just
     * want the "b" line, you would pass in a lineIndex of 1.
     */
    lineIndex?: number;
    /**
     * If provided, and if there are multiple lines in datum's
     * text/ssml, then this determines how they are concatenated.
     *
     * @see LexLineConcat
     */
    lineConcat?: LexLineConcat;
    /**
     * If lineConcat is "delim", then it will concat using this
     * string as a delimiter. I'll have a default in the `get`
     * function.
     *
     * @see Lex.get
     */
    lineConcatDelim?: string;
    /**
     * How to capitalize the lex item text output when concatenating
     * multiple lines in texts/ssmls.
     *
     * NOTE:
     * I'm not sure if I should make it capitalize the ssml, but
     * my hunch is to NOT do this, since that is supposed to be spoken
     * text.
     *
     * @see LexCapitalize for individual options.
     */
    capitalize?: LexCapitalize;
    /**
     * Template placeholder arguments. Each template in Lex can either
     * be a reference to another Lex datum, e.g. $(hi), or it can be
     * a template placeholder, e.g. $name, $age, $0, $1, etc. It simply
     * has to start with a $ and be followed by one or more word
     * characters ([a-zA-Z_0-9]+, i.e. \w+).
     *
     * So this javascript object is in the format of
     *   `"placeholder": "replacement"`, e.g.
     *
     * NOTE: If you want different variable replacements for texts and
     * ssmls, then use this config option for the texts and use
     * ssmlVars for the ssmls.
     *
     * @example
     * In Lex data:
     *   "Welcome back, $username!"
     * Calling code:
     *   `lex._('greeting', { vars: { username } })`
     * If the text is  and this is called
     * with , then the output
     * would be e.g. "Welcome back, Cotter!"
     * (equivalent to `Welcome back, ${username}!`)
     */
    vars?: { [key: string]: string; };
    /**
     * Same as vars option, but will only replace template variables
     * in the `ssmls`.
     */
    ssmlVars?: {
        [key: string]: string;
    };
    /**
     * Additional dynamic properties to filter/match against.
     *
     * Use Case:
     *
     * Currently, I'm doing x=123 in keywords, and this is meant to
     * improve upon that.
     *
     * ## notes
     *
     * These property filters require lambda functions, and as such,
     * these cannot be used from within template references in
     * lex data. see {@link Lex.replaceTemplateRefs}
     */
    props?: PropsFilter<TProps>;
    /**
     * Determines how the props predicate functions.
     * @see PropertyPredicateLevel
     */
    propsMode?: PropsFilterMode;
    /**
     * "Catchall" predicate filter that acts on the entire lex datum.
     *
     * So if you don't have a specific filter option in the params list, use this as
     * a backup to just filter against the entire datum in a custom way.
     *
     * ## driving use case
     *
     * I want to reverse get where the `LexDatum.texts` property is exactly a
     * certain value and get the reverse mapping to the "semantic id".  So a user
     * says some natural language, and I map that back to the possibility(s) for the
     * semantic id of that user word/phrase.
     */
    fnDatumPredicate?: LexDatumPredicate<TProps>,
}
/**
 * Contains properties per datum that allow for more complex filtering with
 * two strategies:
 * 1. per property name via a lambda
 * 2. per entire props object via a lambda
 *
 * This is the type in the LexDatum.props property.
 *
 * NOTE: atow this must be just a flat dictionary, i.e. cannot contain nested
 * objects. However, if you want to use FilterPerProps filtering, I believe you
 * can just `any` cast this and do your filtering predicate against the entire
 * props object as you like.
 * */
export type PropsData = { [propName: string]: string | boolean | number; };
/** This is the type used in LexGetOptions.prFilter either per property or per the entire prop data object. */
export type PropsFilter<TProps> = FilterPerProp | FilterPerProps<TProps>;
/** Individual property predicate */
export type PropertyPredicate = (propName: string) => boolean;
/** Filter on individual property level. */
export type FilterPerProp = { [propName: string]: PropertyPredicate; };
/** Filter at the entire props object level (`LexDatum.props`). */
export type FilterPerProps<TProps> = (props: TProps) => boolean;

export interface LexFindOptions<TProps = PropsData> {
    fnDatumPredicate?: LexDatumPredicate<TProps>,
}

/**
 * filter against the entier lex datum entry. see the LexGet options.
 */
export type LexDatumPredicate<TProps> = (value: LexDatum<TProps>) => boolean;

/**
 * keywords are used to filter lex items. this sets how those keywords are
 * interpreted.
 */
export type KeywordMode = "any" | "all" | "none";
/**
 * keywords are used to filter lex items. this sets how those keywords are
 * interpreted.
 */
export const KeywordMode = {
    /** Any of the keywords must match to return a lex result. */
    any: "any" as KeywordMode,
    /** All of the keywords must match to return a lex result. */
    all: "all" as KeywordMode,
    /** Only return results that do NOT include any of the keywords. */
    none: "none" as KeywordMode,
};

export type PropsFilterMode = "prop" | "props";
export const PropertyPredicateLevel = {
    /**
     * Predicate acts upon individual properties.
     * So you'll pass an object in with prop key and a predicate(s).
     *
     * Check out advanced unit tests for more concrete examples.
     *
     * @example props: { id: x => x === "id2", color: x => x === "orange" }
     */
    prop: "prop" as PropsFilterMode,
    /**
     * Predicate acts upon the datum's entire props object.
     * So you'll pass a single predicate that is the entire props
     * object, i.e. datum[props].
     *
     * Check out advanced unit tests for more concrete examples.
     *
     * @example { props: (p: PropsData) => { return p && p.id && p.id === "id1"; }, propsMode: "props"
     */
    props: "props" as PropsFilterMode,
};

// export type LexResultType = "text" | "ssml" | "obj";

/**
 * Result object when using `Lex._`
 *
 * @see Lex
 * @see Lex.get
 */
export interface LexResultObj<TProps = PropsData> {
    /**
     * The text output of the single datum that was picked.
     */
    text: string;
    /**
     * The ssml output of the single datum that was picked.
     */
    ssml: string;
    /**
     * The single raw datum that was picked.
     */
    datum: LexDatum<TProps>;
    /**
     * All of the data that matched the given params (specifier,
     * keywords, language, etc.)
     */
    rawData: LexDatum<TProps>[];
}

export type LexCapitalize = "upperfirst" | "uppereach" | "lowerfirst" | "lowereach" | "none";
export const LexCapitalize = {
    /**
     * Uppercase the first letter of only the first line in texts/ssmls.
     */
    upperfirst: "upperfirst" as LexCapitalize,
    /**
     * Uppercase the first letter of each line in texts/ssmls.
     */
    uppereach: "uppereach" as LexCapitalize,
    /**
     * Lowercase the first letter of only the first line in texts/ssmls.
     */
    lowerfirst: "lowerfirst" as LexCapitalize,
    /**
     * Lowercase the first letter of each line in texts/ssmls.
     */
    lowereach: "lowereach" as LexCapitalize,
    /**
     * Leave the casing as-is for texts/ssmls.
     */
    none: "none" as LexCapitalize,
};

export type LexLineConcat = "paragraph" | "sentence" | "newline" | "delim";
export const LexLineConcat = {
    /**
     * Each line will be combined into a single string of paragraphs.
     * @example
     * ["Line 1.", "Line 2."] will become
     *   if text: "Line 1.\n\nLine 2."
     *   if ssml: "<p>Line 1.</p><p>Line 2.</p>"
     */
    p: "paragraph" as LexLineConcat,
    /**
     * Each line will be combined into a single string of sentences.
     * @example
     * ["Line 1.", "Line 2."] will become
     *   if text: "Line 1. Line 2."
     *   if ssml: "<s>Line 1</s><s>Line 2</s>"
     */
    s: "sentence" as LexLineConcat,
    /**
     * Each line will be combined into a single string with new
     * line feeds between each line.
     *
     * Note: For Ssml, this is the same as "paragraph".
     *
     * @example
     * ["Line 1.", "Line 2."] will become
     *   if text: "Line 1.\nLine 2."
     *   if ssml: "<p>Line 1.</p><p>Line 2.</p>"
     */
    n: "newline" as LexLineConcat,
    /**
     * Each line will be combined into a single string with each
     * line delimited by the delimiter specified in the function.
     *
     * @example
     * ["Line 1.", "Line 2."] with delim | will become
     *   if text: "Line 1.|Line 2."
     *   if ssml: "Line 1.|Line 2."
     */
    delim: "delim" as LexLineConcat,
};
export type LexData<TProps = PropsData> = {
    [key: string]: LexDatum<TProps>[];
};

/**
 * These options control mostly the default behavior for filtering lex results
 * when consuming via the `Lex._(someIdentifier, opts)` call.  When you don't
 * specify in the `opts` how to filter, these values will be used.
 *
 * These options are in the constructor of the {@link Lex} class.
 */
export interface LexCtorOpts {
    /**
     * This is the language that your data will default to.
     *
     * This means that entries defined in the Lex data that do not
     * have an explicit 'language' set will be interpreted as this
     * language.
     *
     * So basically, if you're an American with American data, leave
     * this as en-US. If you're a German speaker writing a skill
     * that is primarily targeted at a German-speaking audience,
     * then set this to de-DE and you don't need to explicitly
     * set each entry to this.
     *
     * Then, when you go to translate into other languages, you can
     * add on the explicit language markers in data. The overall
     * mechanism allows you to skip this for the first language
     * you write the skill in.
     *
     * @see requestLanguage
     */
    defaultLanguage?: LanguageCode;
    /**
     * This is the language that is coming in from the request.
     *
     * @see defaultLanguage
     */
    requestLanguage?: LanguageCode;
    /**
     * Default setting when concatenating lines. This will depend on how most of
     * your data is structured. For example, it's designed so that you input
     * your data separated by paragraphs, so the concat would be "paragraph".
     * But if you already have data with <p> tags in your ssml, then you may
     * want to set this to "delim" and do your own interpretation of using the
     * multiple strings for the data.
     *
     * Defaults to delim & "" because most of the time, I find I
     * just have a single line and want the single thing returned.
     * This helps with templating, chunking, etc.
     */
    defaultLineConcat?: LexLineConcat;
    /**
     * Default delimiter used when using `lineConcatDelim`.
     *
     * Defaults to delim & "" because most of the time, I find I just have a
     * single line and want the single thing returned.  This helps with
     * templating, chunking, etc.
     */
    defaultDelim?: string;
    /**
     * Default capitalization action when getting texts/ssmls.
     */
    defaultCapitalize?: LexCapitalize;
    /**
     * When using keyword filtering, this is the default mode to be used
     * when not explicitly set in the lex consumer.
     */
    defaultKeywordMode?: KeywordMode;
    /**
     * When using props filtering, this is the default mode to be used
     * when not explicitly set in the lex consumer.
     */
    defaultPropsMode?: PropsFilterMode;
}



// export * from "./types";
// import { LanguageCode, KeywordMode, LexData, LexDatum, LexGetOptions, LexResultObj, LexCapitalize, LexLineConcat, PropsFilterMode, PropsFilter, PropsData } from './types';

/**
 * Imports helper that has logging, among other things.
 */
// import * as help from 'helper-gib';
/**
 * Lex is a helper for your lexical data, i.e. the things that you get
 * Alexa to say. This can be used for i18n, but really it's a broader
 * helper to create more dynamic speech/text for Alexa to say and
 * present via cards.
 *
 * I am making this after learning my lessons with creating dynamic,
 * alternative-laden text and/or ssml generation for use with both
 * Alexa's speech, as well as outputting plain text to
 * cards. I'm designing it to be (actually) simple to use, but with
 * robustness allowed the more you become comfortable with it.
 *
 * Simple Usage
 *
 * To use it, you simply init what you want her to be able to say.
 * Then, when you want to create her speech, you call `text` or `ssml`
 * and pass in your options, the primary one being the `id`.
 *
 * For example, you could define the following data:
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ]}
        ]
    }
    ```
 * To access this, you would call `Lex._('hi').text` to simply get the
 * plain text entry for "hi".
 *
 * Alternatives
 *
 * But there are a LOT of ways to say "hi", and this is the primary
 * reason for using Lex: Alternatives. With Lex, multiple items with
 * the same id are considered alternatives.
 *
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ] },
            { texts: [ "Hello" ] },
            { texts: [ "Howdy" ] }
        ]
    }
    ```
 * Again, to access this, you would call the same line:
 *   `Lex._('hi').text
 *
 * So by using the _same_ calling code, you could get any one of these
 * texts as _alternatives_ for the "hi" lex datum. This is a huge
 * difference between natural voice interaction and computer UI as we
 * have known it up to now.
 *
 * If you want to get really fancy (looking forward to AI/ML), you can
 * weight the various alternatives, for example if you want to only
 * say "Howdy" a small percentage of the time. You could define this as follows:
 *
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ] },
            { texts: [ "Hello" ] },
            { texts: [ "Howdy" ], weighting: 0.2 }
        ]
    }
    ```
 * Again, there is _no_ change to the calling code. This really allows
 * for a wonderful layer of dynamicism, and is easy to do.
 *
 * Internationalization (i18n)
 *
 * You can have your text be localized, but not worry about it to start
 * off with. It's _implicit_ i18n. So the above examples are actually
 * not really attached to any language, even though I'm writing in
 * English (en-US). This is because the i18n aspect relies on both the
 * data and the retrieval of the data via the `language` param option.
 *
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ] },
            { texts: [ "Hello" ] },
            { texts: [ "Howdy" ], weighting: 0.2 },
            { texts: [ "Cheers" ], language: "en-GB" },
            { texts: [ "Guten Tag" ], language: "de-DE" }
        ]
    }
    ```
/**
 * Lex is a helper for your lexical data, i.e. the things that you get
 * Alexa to say. This can be used for i18n, but really it's a broader
 * helper to create more dynamic speech/text for Alexa to say and
 * present via cards.
 *
 * I am making this after learning my lessons with creating dynamic,
 * alternative-laden text and/or ssml generation for use with both
 * Alexa's speech, as well as outputting plain text to
 * cards. I'm designing it to be (actually) simple to use, but with
 * robustness allowed the more you become comfortable with it.
 *
 * Simple Usage
 *
 * To use it, you simply init what you want her to be able to say.
 * Then, when you want to create her speech, you call `text` or `ssml`
 * and pass in your options, the primary one being the `id`.
 *
 * For example, you could define the following data:
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ]}
        ]
    }
    ```
 * To access this, you would call `Lex._('hi').text` to simply get the
 * plain text entry for "hi".
 *
 * Alternatives
 *
 * But there are a LOT of ways to say "hi", and this is the primary
 * reason for using Lex: Alternatives. With Lex, multiple items with
 * the same id are considered alternatives.
 *
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ] },
            { texts: [ "Hello" ] },
            { texts: [ "Howdy" ] }
        ]
    }
    ```
 * Again, to access this, you would call the same line:
 *   `Lex._('hi').text
 *
 * So by using the _same_ calling code, you could get any one of these
 * texts as _alternatives_ for the "hi" lex datum. This is a huge
 * difference between natural voice interaction and computer UI as we
 * have known it up to now.
 *
 * If you want to get really fancy (looking forward to AI/ML), you can
 * weight the various alternatives, for example if you want to only
 * say "Howdy" a small percentage of the time. You could define this as follows:
 *
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ] },
            { texts: [ "Hello" ] },
            { texts: [ "Howdy" ], weighting: 0.2 }
        ]
    }
    ```
 * Again, there is _no_ change to the calling code. This really allows
 * for a wonderful layer of dynamicism, and is easy to do.
 *
 * Internationalization (i18n)
 *
 * You can have your text be localized, but not worry about it to start
 * off with. It's _implicit_ i18n. So the above examples are actually
 * not really attached to any language, even though I'm writing in
 * English (en-US). This is because the i18n aspect relies on both the
 * data and the retrieval of the data via the `language` param option.
 *
    ```
    const data: LexData = {
        'hi': [
            { texts: [ "Hi" ] },
            { texts: [ "Hello" ] },
            { texts: [ "Howdy" ], weighting: 0.2 },
            { texts: [ "Cheers" ], language: "en-GB" },
            { texts: [ "Guten Tag" ], language: "de-DE" }
        ]
    }
    ```
 *
 * You can get at these languages multiple ways:
 *
 *   1) Choose the language when instantiating Lex.
 *      `let lex = new Lex(data, "de-DE");`
 *      Now, when you call `lex._(...)`, you will only return German
 *      data.
 *   2) Override the default language upon calling for data:
 *      `lex._('hi', { language: "en-US" }).text;`
 */
export class Lex<TProps = PropsData> {
    protected lc: string = `[${Lex.name}]`;

    data: LexData<TProps>;
    defaultLanguage: LanguageCode;
    defaultLineConcat: LexLineConcat;
    /**
     * Defaults to delim & "" because most of the time, I find I
     * just have a single line and want the single thing returned.
     * This helps with templating, chunking, etc.
     *
     * BREAKING CHANGE: This formerly defaulted to paragraphs, as
     * I thought lines would mean paragraphs. No longer the case.
     */
    defaultDelim: string;
    defaultCapitalize: LexCapitalize;
    /**
     * This is the language that is coming in from the request.
     *
     * @see defaultLanguage
     */
    requestLanguage: LanguageCode;
    defaultKeywordMode: KeywordMode;
    defaultPropsMode: PropsFilterMode;

    constructor(
        /**
         * This is the initial lexical data that you want Alexa to be able to
         * say. You can always change this dynamically at runtime as well.
         */
        data: LexData<TProps>,
        /** optional opts */
        {
            /**
             * This is the language that your data will default to.
             * If a language isn't specified in `get`, `text`, or `ssml`, then this is used.
             *
             * This means that entries defined in the Lex data that do not
             * have an explicit 'language' set will be interpreted as this
             * language.
             *
             * So basically, if you're an American with American data, leave
             * this as en-US. If you're a German speaker writing a skill
             * that is primarily targeted at a German-speaking audience,
             * then set this to de-DE and you don't need to explicitly
             * set each entry to this.
             *
             * Then, when you go to translate into other languages, you can
             * add on the explicit language markers in data. The overall
             * mechanism allows you to skip this for the first language
             * you write the skill in.
             *
             * @see requestLanguage
             */
            defaultLanguage = "en-US",
            requestLanguage = "en-US",
            /**
             * Defaults to delim & "" because most of the time, I find I
             * just have a single line and want the single thing returned.
             * This helps with templating, chunking, etc.
             *
             * BREAKING CHANGE: This formerly defaulted to paragraphs, as
             * I thought lines would mean paragraphs. No longer the case.
             */
            defaultLineConcat = LexLineConcat.delim,
            /**
             * Defaults to delim & "" because most of the time, I find I
             * just have a single line and want the single thing returned.
             * This helps with templating, chunking, etc.
             *
             * BREAKING CHANGE: This formerly defaulted to paragraphs, as
             * I thought lines would mean paragraphs. No longer the case.
             */
            defaultDelim = "",
            defaultCapitalize = "none",
            defaultKeywordMode = "any",
            defaultPropsMode = "prop",
        }: LexCtorOpts
    ) {
        if (!data) { throw new Error(`data required (E: 2f8db30fa9d71d76db616ab110392c22)`); }
        this.data = data;
        this.defaultLanguage = defaultLanguage ?? "en-US";
        this.defaultLineConcat = defaultLineConcat ?? LexLineConcat.delim;
        this.defaultDelim = defaultDelim ?? "";
        this.defaultCapitalize = defaultCapitalize ?? "none";
        this.requestLanguage = requestLanguage ?? "en-US";
        this.defaultKeywordMode = defaultKeywordMode ?? "any";
        this.defaultPropsMode = defaultPropsMode ?? "prop";
    }

    /**
     * Gets a string or array of strings of text or ssml.
     * Builds the string or obj depending on the passed in options.
     *
     * NOTE: You'll probably want to actually use the `text` or `ssml`
     * functions instead of this one.
     *
     * @param id Lexical items with the same id are considered alternatives for the equivalent message, e.g. "Hello" and "Howdy".
     * @see LexGetOptions
     */
    get(
        id: string,
        {
            language = this.requestLanguage,
            specifier,
            keywords, keywordMode = this.defaultKeywordMode,
            lineIndex,
            lineConcat = this.defaultLineConcat, lineConcatDelim = this.defaultDelim,
            capitalize = this.defaultCapitalize,
            vars, ssmlVars,
            props, propsMode = this.defaultPropsMode,
            fnDatumPredicate,
        }: LexGetOptions<TProps> = {
                // simplest case default options
                language: this.requestLanguage,
                keywordMode: this.defaultKeywordMode,
                lineConcat: this.defaultLineConcat,
                lineConcatDelim: this.defaultDelim,
                capitalize: this.defaultCapitalize,
                propsMode: this.defaultPropsMode,
            }): LexResultObj<TProps> {
        const lc = `${this.lc}[${this.get.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e4e76a6bb301010fc13cf4456efcdc22)`); }

            let lexData = this.data[id];

            if (!lexData) { throw new Error(`Data id not found: ${id} (E: 4a79897167714dd5a34df77953072aaf)`); }

            lexData = this.filterLexData({
                lexData,
                language, specifier,
                keywords, keywordMode,
                props: <PropsFilter<TProps>>props, propsMode,
                fnDatumPredicate,
            });
            if (lexData.length === 0) {
                // no data found matching filtering.
                // just return null and do not error.
                return null;
            }
            const lexDatum = this.pickDatum(lexData);
            let textLines = this.extractLines({ lexDatum, resultAs: "text", lineIndex });
            textLines = this.replaceTemplateRefs({ lines: textLines, resultAs: "text" });
            // Replace vars after references, so all text is fully
            // expanded first.
            textLines = this.replaceTemplateVars({ lines: textLines, vars: vars });
            textLines = this.capitalizeLines({ lines: textLines, resultAs: "text", capitalize });
            const text = this.concatLines({
                lines: textLines,
                lineType: "text",
                lineConcat,
                lineConcatDelim
            });
            let ssmlLines = this.extractLines({ lexDatum, resultAs: "ssml", lineIndex });
            ssmlLines = this.replaceTemplateRefs({ lines: ssmlLines, resultAs: "ssml" });
            // Replace vars after references, so all text is fully
            // expanded first.
            ssmlLines = this.replaceTemplateVars({ lines: ssmlLines, vars: ssmlVars || vars });
            ssmlLines = this.capitalizeLines({ lines: ssmlLines, resultAs: "ssml", capitalize });
            const ssml = this.concatLines({ lines: ssmlLines, lineType: "ssml", lineConcat, lineConcatDelim });

            return { text, ssml, datum: lexDatum, rawData: lexData };
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Does a reverse lookup for lex data ids that correspond to the find
     * criteria.
     *
     * @returns array of data ids that have at least one LexDatum entry that matches criteria.
     */
    find({ fnDatumPredicate }: LexFindOptions<TProps>): string[] {
        const lc = `${this.lc}[${this.find.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 35e26d234ca2d0e987b39ee939f29c22)`); }
            if (!fnDatumPredicate) { throw new Error(`only fnDatumPredicate implemented atow (E: 8c8babd2fa6fc4cb223b7b8c10ad5c22)`); }

            const resultIds: string[] = [];

            const ids = Object.keys(this.data);
            for (let i = 0; i < ids.length; i++) {
                const id = ids[i];
                /**
                 * this.data means the data construct as a whole, datums here
                 * indicates the individual value array that corresponds to the
                 * id.
                 */
                const datums = this.data[id];
                if (datums.some(d => fnDatumPredicate(d))) {
                    resultIds.push(id);
                }
            }

            return resultIds;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * This is the original single function. it is just for backwards compatibility at this point.
     * Probably not needed...
     *
     * @deprecated
     */
    _(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }

    // #region syntactic sugar calls for `get`

    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    getVariant(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }
    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    variant(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }
    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    getTranslation(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }
    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    translate(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }
    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    getSynonym(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }
    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    synonym(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }
    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    getI18n(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }
    /**
     * just syntactic sugar for {@link Lex.get} .
     */
    i18n(id: string, opts: LexGetOptions<TProps>): LexResultObj<TProps> {
        return this.get(id, opts);
    }

    // #endregion syntactic sugar calls for `get`

    /**
     * Pulls out lines from the datum, based on the what is wanted
     * and what exists in the data.
     *
     * For example, you may be trying to extract text but only ssml
     * is defined in the data. So you'll have to strip the ssml and
     * return that. Or if you want ssml and only text exists in the
     * data, then you'll simply return the texts.
     *
     * If you only want a single line out of multiple strings in the
     * texts/ssmls array, then use lineIndex.
     *
     * @param param0 info
     */
    private extractLines({
        lexDatum,
        resultAs,
        lineIndex
    }: {
        lexDatum: LexDatum<TProps>,
        resultAs: "text" | "ssml",
        lineIndex: number,
    }) {
        const lc = `${this.lc}[${this.extractLines.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 0c21a7ed7c1b56251f39342380c47922)`); }

            // ensure that either texts or ssmls is defined in data
            if ((!lexDatum.texts || lexDatum.texts.length === 0) &&
                (!lexDatum.ssmls || lexDatum.ssmls.length === 0)) {
                throw new Error(`Invalid lexDatum. Datum texts and ssmls are both undefined. lexDatum: ${JSON.stringify(lexDatum)}.`);
            }
            // let lines;
            let useLineIndex = lineIndex || lineIndex === 0;
            if (resultAs === "text" &&
                lexDatum.texts && lexDatum.texts.length > 0) {
                // text wanted, text defined in data
                return useLineIndex ?
                    [lexDatum.texts[lineIndex]] :
                    lexDatum.texts;
            } else if (resultAs === "text") {
                // text wanted, but no text defined in data
                console.warn(`building text lines from ssml (W: cfb59a05efda475ab7511acc659a5ee3)`);
                return useLineIndex ?
                    [Ssml.stripSsml(lexDatum.ssmls[lineIndex])] :
                    lexDatum.ssmls.map(ssml => Ssml.stripSsml(ssml));
            } else if (lexDatum.ssmls && lexDatum.ssmls.length > 0) {
                // ssml wanted, ssml defined in data
                return useLineIndex ?
                    [lexDatum.ssmls[lineIndex]] :
                    lexDatum.ssmls;
            } else {
                // ssml wanted, but no ssml defined in data
                return useLineIndex ?
                    [lexDatum.texts[lineIndex]] :
                    lexDatum.texts;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Replaces any embedded template variables, e.g. $name, $0, etc.
     * Note the format is "$" proceeded by any word characters
     * ([a-zA-Z0-9_]).
     *
     * This is different than template references.
     *
     * @see {replaceTemplateRefs}
     */
    private replaceTemplateVars({
        lines,
        vars,
    }: {
        lines: string[],
        vars?: { [key: string]: string; },
    }): string[] {
        const lc = `${this.lc}[${this.replaceTemplateVars.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: a756e7603d03d427c60c202cb4f6dd22)`); }

            let replaceVarsSingleLine = (line: string) => {
                let varNames = Object.keys(vars);
                if (logalot) { console.log(`${lc} varNames: ${JSON.stringify(varNames)} (I: d9351cf582420b35eb3eceb923e64f22)`); }
                return varNames.reduce((l, varName) => {
                    if (logalot) { console.log(`${lc} varName: ${varName} (I: 8c0e4261972945d2bb4624efad14870b)`); }
                    return l.replace(new RegExp('\\$' + varName, "g"), vars[varName]);
                }, line);
            };
            if (vars) {
                return lines.map(line => replaceVarsSingleLine(line));
            } else {
                return lines;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    /**
     * Replaces any embedded template references, e.g. $(hi).  Note the
     * parenthesis around "hi". This means it is a reference to another lex
     * datum.
     *
     * This is different than template variables, e.g. $name, $0, etc.
     *
     * The template refs can be recursive, i.e. datum A can include a ref to
     * datum B which includes a template to datum C.  But these cannot be
     * self-referencing, i.e. C cannot then include a reference back to A.
     *
     * Template refs CANNOT work with props for filtering, as these require
     * lambda functions.
     *
     * @see {replaceTemplateVars}
     */
    private replaceTemplateRefs({
        lines,
        resultAs,
    }: {
        /**
         * source lines from data
         */
        lines: string[],
        /**
         * how do you want the lines back?
         */
        resultAs: "ssml" | "text",
    }): string[] {
        const lc = `${this.lc}[${this.replaceTemplateRefs.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 548949b651bbec84de5b25f3c01cf422)`); }
            const regex = /\$\([\w-]+\|?[\w-|\{\}:'"\s,\[\].,<>]+\)/;

            let replaceRefsSingleLine = (line: string) => {
                let match = regex.exec(line);
                if (match) {
                    let template = match[0];
                    // strip the $()
                    template = template.substring(2, template.length - 1);
                    // id|options
                    const idAndOptions = template.split('|');
                    const id = idAndOptions[0];
                    const options: LexGetOptions<TProps> = idAndOptions.length === 2 ?
                        <LexGetOptions<TProps>>JSON.parse(idAndOptions[1]) :
                        {};
                    if (!options.lineConcat) {
                        options.lineConcat = LexLineConcat.delim;
                        options.lineConcatDelim = "";
                    }
                    const replacementResult = this.get(id, options);
                    const replacement = resultAs === "text" ?
                        replacementResult.text :
                        replacementResult.ssml;
                    line = line.replace(regex, replacement);
                    // recursively call if more templates in line
                    return regex.test(line) ?
                        replaceRefsSingleLine(line) :
                        line;
                } else {
                    return line;
                }
            };

            return lines.map(line => replaceRefsSingleLine(line));
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Capitalizes the given lines depending on the given
     * capitalize options.
     *
     * @param param0
     */
    private capitalizeLines({
        lines,
        resultAs,
        capitalize,
    }: {
        lines: string[],
        resultAs: "ssml" | "text",
        capitalize: LexCapitalize,
    }) {
        const lc = `${this.lc}[${this.capitalizeLines.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: b0ec8263fd94c68ee53fdf61534c8322)`); }

            const replaceAt = (s: string, i: number, replacement: string) => {
                // todo: change substr to use substring
                return s.substr(0, i) +
                    replacement +
                    s.substr(i + replacement.length);
            };
            const upperText = (line: string) => {
                if (line === "") {
                    return "";
                }
                // Thanks https://paulund.co.uk/capitalize-first-letter-string-javascript
                return line.charAt(0).toUpperCase() + line.slice(1);
            };
            const upperSsml = (line: string) => {
                if (line === "") {
                    return "";
                }
                if (line.charAt(0) === "<") {
                    let iFirstLetter = line.indexOf(">") + 1;
                    return replaceAt(line, iFirstLetter, line[iFirstLetter].toUpperCase());
                } else {
                    return upperText(line);
                }
            };
            const lowerText = (line: string) => {
                if (line === "") {
                    return "";
                }
                // Thanks https://paulund.co.uk/capitalize-first-letter-string-javascript
                return line.charAt(0).toLowerCase() + line.slice(1);
            };
            const lowerSsml = (line: string) => {
                if (line === "") {
                    return "";
                }
                if (line.charAt(0) === "<") {
                    let iFirstLetter = line.indexOf(">") + 1;
                    return replaceAt(line, iFirstLetter, line[iFirstLetter].toLowerCase());
                } else {
                    return lowerText(line);
                }
            };
            const firstLine = lines[0];
            switch (capitalize) {
                case LexCapitalize.upperfirst:
                    lines[0] =
                        resultAs === "text" ?
                            upperText(firstLine) :
                            upperSsml(firstLine);
                    return lines;
                case LexCapitalize.uppereach:
                    return lines.map(l => {
                        return resultAs === "text" ?
                            upperText(l) :
                            upperSsml(l);
                    });
                case LexCapitalize.lowerfirst:
                    lines[0] =
                        resultAs === "text" ?
                            lowerText(firstLine) :
                            lowerSsml(firstLine);
                    return lines;
                case LexCapitalize.lowereach:
                    return lines.map(l => {
                        return resultAs === "text" ?
                            lowerText(l) :
                            lowerSsml(l);
                    });
                case LexCapitalize.none:
                    return lines;
                default:
                    throw new Error(`Unknown LexCapitalize: ${capitalize}`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Concatenates lines depending on given params.
     *
     * @param param0
     */
    private concatLines({
        lines,
        lineType,
        lineConcat,
        lineConcatDelim
    }: {
        lines: string[],
        lineType: "ssml" | "text",
        lineConcat: LexLineConcat,
        lineConcatDelim: string,
    }): string {
        const lc = `${this.lc}[${this.concatLines.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 59e0a7b89457283751b376295b61bb22)`); }

            const firstLine = lines[0];
            // This used in both LexLineConcat.p and .n
            const concatSsmlP = () => {
                const pTag = "<p>";
                if (firstLine.length < pTag.length ||
                    firstLine.substring(0, pTag.length).toLowerCase() !== pTag) {
                    return lines.map(l => `<p>${l}</p>`).join('');
                } else {
                    // First line starts with <p> so
                    // we will simply concat all lines,
                    // assuming the user has wrapped all lines.
                    return lines.join('');
                }
            };
            switch (lineConcat) {
                case LexLineConcat.p:
                    if (lineType === "text") {
                        return lines.join("\n\n");
                    } else {
                        return concatSsmlP();
                    }
                case LexLineConcat.s:
                    if (lineType === "text") {
                        // Append period if not in data.
                        // e.g. Data may just be "hello" and we want to
                        // make it a sentence by appending "."
                        return lines.map(l => {
                            let lastChar = l.substring(l.length - 1);
                            return [".", "!", "?"].includes(lastChar) ?
                                l :
                                l + ".";
                        }).join(' ');
                    } else {
                        const sTag = "<s>";
                        if (firstLine.length < sTag.length ||
                            firstLine.substring(0, sTag.length).toLowerCase() !== sTag) {
                            return lines.map(l => `<s>${l}</s>`).join('');
                        } else {
                            // First line starts with <s> so
                            // we will simply concat all lines,
                            // assuming the user has wrapped all lines.
                            return lines.join('');
                        }
                    }
                case LexLineConcat.n:
                    if (lineType === "text") {
                        return lines.join('\n');
                    } else {
                        return concatSsmlP();
                    }
                case LexLineConcat.delim:
                    return lines.join(lineConcatDelim);
                default:
                    throw new Error(`Unknown LexLineConcat: ${lineConcat} (E: e19f9c44217f4eb5999e2085d3f77b5c)`);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Filters the given lexData per the language, specifier,
     * and keywords.
     *
     * @param param0 Filter params
     * @returns filtered datum array
     */
    private filterLexData({
        lexData,
        language,
        specifier,
        keywords, keywordMode,
        props, propsMode,
        fnDatumPredicate,
    }: {
        lexData: LexDatum<TProps>[],
        language: LanguageCode,
        specifier: string,
        keywords: string[], keywordMode: KeywordMode,
        props: PropsFilter<TProps>, propsMode: PropsFilterMode,
        fnDatumPredicate: LexDatumPredicate<TProps>,
    }): LexDatum<TProps>[] {
        const lc = `${this.lc}[${this.filterLexData.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 1091755e98f390954d296575d1096722)`); }
            let result = lexData.concat(); // makes a copy
            if (language) {
                result = this.filterLanguage(result, language);
            }
            if (specifier) {
                result = result.filter(d => d.specifier && d.specifier === specifier);
            }
            if (keywords && keywords.length > 0) {
                // Datum must contain keywords that overlap with given
                // keywords args.
                keywords = keywords.map(kw => kw.toLocaleLowerCase());
                switch (keywordMode) {
                    case "any":
                        result =
                            result.filter(d => d.keywords &&
                                d.keywords.some(kwDatum => keywords
                                    .map(kwArg => kwArg.toLocaleLowerCase())
                                    .some(kwArg => kwDatum === kwArg)));
                        break;
                    case "all":
                        result = result.filter(d => {
                            let dKeywords = (d.keywords || [])
                                .map(x => x.toLocaleLowerCase());
                            return keywords.every(kwArg => dKeywords.includes(kwArg));
                        });
                        break;
                    case "none":
                        result = result.filter(d => {
                            let dKeywords = (d.keywords || [])
                                .map(x => x.toLocaleLowerCase());
                            return keywords.every(kwArg => !dKeywords.includes(kwArg));
                        });
                        break;
                    default:
                        console.error(`${lc} Unknown keywordMode: ${keywordMode}`);
                        break;
                }
            }
            if (props) {
                result = this.filterProps({ result, props, propsMode });
            }
            if (fnDatumPredicate) {
                result = result.filter(x => fnDatumPredicate(x));
            }
            return result;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * executes the property filter on the given (intermediate) result.
     */
    private filterProps({
        result,
        props,
        propsMode
    }: {
        result: LexDatum<TProps>[],
        /**
         * Filters either per prop or per the entire props object.
         *
         * Here are how they're defined atow. (see them for reference)
         * PropsData = { [propName: string]: string; };
         * PropsFilter<TProps> = FilterPerProp | FilterPerProps<TProps>;
         * PropertyPredicate = (propName: string) => boolean;
         * FilterPerProp = { [propName: string]: PropertyPredicate; };
         * FilterPerProps<TProps> = (props: TProps) => boolean;
         */
        props: PropsFilter<TProps>,
        propsMode: PropsFilterMode,
    }): LexDatum<TProps>[] {
        // not within a try...catch because used in a tight loop within another fn that catches it
        if (propsMode === "prop") {
            const propsFilter = <FilterPerProp>props;
            return result.filter(d => {
                return Object.keys(propsFilter).every(propName => {
                    const propFn = propsFilter[propName];
                    const dPropValue = d.props ? d.props[propName] : undefined;
                    return propFn(dPropValue);
                });
            });
        } else if (propsMode === "props") {
            let propsFn = <FilterPerProps<TProps>>props;
            return result.filter(d => propsFn(d.props));
        } else {
            throw new Error(`Invalid propsMode: ${propsMode} (E: 216a926144d2436a900b81ffe0aa6174)`);
        }
    }

    private filterLanguage(result: LexDatum<TProps>[], language: string): LexDatum<TProps>[] {
        result = result.filter(d =>
            // explicit language given
            (d.language && d.language === language) ||
            // default language is 2 letters and matches
            (!d.language &&
                this.defaultLanguage.length === 2 &&
                language.startsWith(this.defaultLanguage)) ||
            // default language is 4 letters and is equal
            (!d.language && this.defaultLanguage === language));
        return result;
    }

    /**
     * Picks a randomesque datum from the given lexData, taking into
     * account the weighting of each datum.
     *
     * @param lexData Filtered lexData from which to choose a random item, per the item's weighting
     *
     * @see LexDatum.weighting
     */
    private pickDatum(lexData: LexDatum<TProps>[]): LexDatum<TProps> {
        const lc = `${this.lc}[${this.pickDatum.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: f95c8585a8274f78a1e724d6ab58ff22)`); }
            if (!lexData) { throw new Error(`lexData required (E: cedb1fd9b67856c33b41c7dd4aab7c22)`); }
            if (lexData.length === 0) {
                return null;
            } else if (lexData.length === 1) {
                return lexData[0];
            } else {
                const totalWeight = lexData.reduce((agg, item) => {
                    return agg + (item.weighting ? item.weighting : 1);
                }, 0);
                // normalized random number
                const randomNumber = Math.random() * totalWeight;
                let result: LexDatum<TProps> = null;
                lexData.reduce((runningWeight, item) => {
                    if (result) {
                        // already got a result
                        return -1;
                    } else {
                        runningWeight += (item.weighting ? item.weighting : 1);
                        if (runningWeight >= randomNumber) { result = item; }
                        return runningWeight;
                    }
                }, 0);
                return result;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}

/**
 * Contains a unit of speech, represented either by text, ssml, or both.
 * */
export interface OutputSpeech {
    /**
     * A string containing the type of output speech to render. Valid types are:
     *   "PlainText": Indicates that the output speech is defined as plain text.
     *   "SSML": Indicatesthat the output speech is text marked up with SSML.
     */
    type: OutputSpeechType;
    /** A string containing the speech to render to the user. Use this when type is "PlainText" */
    text?: string;
    /** A string containing text marked up with SSML to render to the user. Use this when type is "SSML" */
    ssml?: string;
}

/**
 * output speech is either text or ssml.
 */
export declare type OutputSpeechType = 'PlainText' | 'SSML';
export declare const OutputSpeechType: {
    /**
     * Indicates that the output speech is defined as plain text.
     */
    PlainText: OutputSpeechType;
    /**
     * Indicates that the output speech is text marked up with SSML.
     */
    SSML: OutputSpeechType;
};

/**
 * Builds an OutputSpeech object that contains both text and ssml.  The text is
 * convenient for showing information on cards, while building the ssml at the
 * same time.
 *
 * The OutputSpeech.type is always ssml.
 */
export class SpeechBuilder {
    private lc: string = `[${SpeechBuilder.name}]`;

    /**
     * The builder accumulates speech bits and then composes these together when
     * outputting.
     */
    private _bits: SpeechBit[];

    constructor() {
        const lc = `${this.lc}[ctor]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 38d63eb021d971a24d532aec75b60e22)`); }
            this._bits = [];
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Static factory function for fluent-style speech building.
     */
    static with(): SpeechBuilder { return new SpeechBuilder(); }

    /**
     * Adds a bit of speech corresponding to bare (non-ssml/tagged) text.
     *
     * @param text text to add to the builder
     */
    text(text: string): SpeechBuilder {
        let bit: SpeechBit = {
            type: "text",
            value: text + ""
        };
        this._bits.push(bit);
        return this;
    }
    /**
     * Adds a bit of speech corresponding to existing ssml.
     *
     * NOTE: This ssml should **NOT** contain a `<speak>` tag, as this
     * is not automatically stripped. Also, if you choose
     * `newParagraph`, ssml should **NOT** contain any hard-coded <p>
     * tags
     *
     * @param ssml ssml to add to the builder. See NOTE in function description.
     * @param newParagraph if true, wraps ssml in <p> tags. See NOTE in function description.
     */
    ssml(ssml: string, newParagraph: boolean = false): SpeechBuilder {
        const bit = {
            type: SpeechBitType.ssml,
            value: newParagraph ? `<p>${ssml}</p>` : ssml
        };
        this._bits.push(bit);
        return this;
    }
    /**
     * Adds a pause (<break> tag) in the speech builder.
     * Equivalent to `<break='${seconds}s'/>` ATOW.
     *
     * @param seconds amount of time to pause.
     */
    pause(seconds: number): SpeechBuilder {
        const bit = {
            type: SpeechBitType.break,
            value: seconds
        };
        this._bits.push(bit);
        return this;
    }

    /**
     * Syntactic sugar for adding text of '\n'
     */
    newLine(): SpeechBuilder {
        const bit: SpeechBit = {
            type: 'text',
            value: '\n'
        };
        this._bits.push(bit);
        return this;
    }

    /**
     * Syntactic sugar for adding text of '\n\n'
     */
    newParagraph(): SpeechBuilder {
        const bit: SpeechBit = {
            type: 'text',
            value: '\n\n'
        };
        this._bits.push(bit);
        return this;
    }

    /**
     * Takes text and/or ssml from existing `OutputSpeech`
     * object and adds it to the builder.
     *
     * For example, say you already have an outputSpeech and you just
     * want to add an intro text to it. You would create the builder,
     * add the intro text via `text` function and then call this
     * function with your existing outputSpeech.
     *
     * @example `let outputWithIntro = SpeechBuilder.with().text('Some intro text').existing(prevOutputSpeech).outputSpeech();`
     * @param outputSpeech existing `OutputSpeech` to weave into the builder.
     */
    existing(outputSpeech: OutputSpeech): SpeechBuilder {
        const bit: SpeechBit = {
            type: SpeechBitType.existingOutputSpeech,
            value: outputSpeech
        };
        this._bits.push(bit);
        return this;
    }
    /**
     * Creates an `OutputSpeech` from the builder's state.
     */
    outputSpeech({
        outputType = 'PlainText',
    }: {
        /**
         * Somewhat vestigial, originally for use with Alexa skills (I had
         * created ask-gib and this builder before Amazon's sdk was created.)
         */
        outputType?: OutputSpeechType,
    }): OutputSpeech {
        const lc = `${this.lc}[${this.outputSpeech.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 3820fa4816d7ca999489b45fff5e2622)`); }

            outputType = outputType || 'PlainText';

            let text = "", ssml = "";
            if (logalot) { console.log(`${lc} about to do bits...`); }
            if (logalot) { console.log(`${lc} bits: ${JSON.stringify(this._bits)}`); }
            this._bits.forEach(bit => {
                if (logalot) { console.log(`${lc} ssml: ${ssml}`); }
                if (text || ssml) {
                    text = text + " ";
                    ssml = ssml + " ";
                }
                if (logalot) { console.log(`${lc} bit: ${JSON.stringify(bit)}`); }
                switch (bit.type) {
                    case "text":
                        if (logalot) { console.log(`${lc} text in case`); }
                        text += bit.value;
                        ssml += bit.value;
                        break;
                    case "ssml":
                        if (logalot) { console.log(`${lc} ssml in case`); }
                        // do these in two steps to fully strip ssml.
                        text += bit.value;
                        text = Ssml.stripSsml(text);
                        ssml += bit.value;
                        break;
                    case "break":
                        if (logalot) { console.log(`${lc} break in case`); }
                        // ridic edge case, if pause before any text/ssml.
                        if (ssml === " ") { ssml = ""; }
                        // text doesn't change
                        ssml += `<break time='${bit.value}s'/>`;
                        break;
                    case "existingOutputSpeech":
                        if (logalot) { console.log(`${lc} existing in case`); }
                        const existing = <OutputSpeech>bit.value;
                        if (existing.text && (existing as OutputSpeech).ssml) {
                            if (logalot) { console.log(`${lc} existing text and ssml`); }
                            text += existing.text;
                            ssml += Ssml.unwrapSsmlSpeak(existing.ssml);
                        } else if (existing.text) {
                            if (logalot) { console.log(`${lc} existing text only`); }
                            text += existing.text;
                            ssml += text;
                        } else { // existing ssml
                            if (logalot) { console.log(`${lc} existing ssml only`); }
                            let unwrapped = Ssml.unwrapSsmlSpeak(existing.ssml);
                            // do these in two steps to fully strip ssml.
                            text += unwrapped;
                            text = Ssml.stripSsml(text);
                            ssml += unwrapped;
                        }
                        break;
                    case "phoneme":
                        throw new Error("phoneme case not implemented");
                    // break
                    default:
                        throw new Error(`Unknown bit.type: ${bit.type}`);
                }
            });
            if (logalot) {
                console.log(`${lc} text: ${JSON.stringify(text)}`);
                console.log(`${lc} ssml: ${JSON.stringify(ssml)}`);
            }
            const output: OutputSpeech = {
                type: outputType,
                text: text,
                ssml: Ssml.wrapSsmlSpeak([ssml], /*addParaTags*/ false)
            };
            // console.log(`${lc} output: ${JSON.stringify(output)}`);
            return output;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}
export declare type SpeechBitType = "text" | "ssml" | "break" | "phoneme" | "existingOutputSpeech";
export declare const SpeechBitType: {
    text: SpeechBitType;
    ssml: SpeechBitType;
    break: SpeechBitType;
    phoneme: SpeechBitType;
    existingOutputSpeech: SpeechBitType;
};
/**
 * OutputSpeech objects are basically just arrays of these.
 */
export interface SpeechBit {
    type: SpeechBitType;
    value: string | number | OutputSpeech;
}
