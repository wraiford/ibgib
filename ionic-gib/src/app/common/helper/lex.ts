import * as c from '../constants';

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
    vars?: {
        [key: string]: string;
    };
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
     */
    props?: PropsFilter<TProps>;
    /**
     * Determines how the props predicate functions.
     * @see PropertyPredicateLevel
     */
    propsMode?: PropsFilterMode;
}
/** This is the type in the LexDatum.props */
export type PropsData = { [propName: string]: string; };
/** This is the type used in LexGetOptions.prFilter either per property or per the entire prop data object. */
export type PropsFilter<TProps> = FilterPerProp | FilterPerProps<TProps>;
/** Individual property predicate */
export type PropertyPredicate = (propName: string) => boolean;
/** Filter on individual property level. */
export type FilterPerProp = { [propName: string]: PropertyPredicate; };
/** Filter at the entire props object level (`LexDatum.props`). */
export type FilterPerProps<TProps> = (props: TProps) => boolean;

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
 * @see Lex._
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
    p: "p" as LexLineConcat,
    /**
     * Each line will be combined into a single string of sentences.
     * @example
     * ["Line 1.", "Line 2."] will become
     *   if text: "Line 1. Line 2."
     *   if ssml: "<s>Line 1</s><s>Line 2</s>"
     */
    s: "s" as LexLineConcat,
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
    n: "n" as LexLineConcat,
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
export abstract class LexT<TProps = PropsData> {
    data: LexData<TProps>;
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
    defaultLanguage: LanguageCode;
    /**
     * Defaults to delim & "" because most of the time, I find I
     * just have a single line and want the single thing returned.
     * This helps with templating, chunking, etc.
     *
     * BREAKING CHANGE: This formerly defaulted to paragraphs, as
     * I thought lines would mean paragraphs. No longer the case.
     */
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
     * Exposed for configuration of logging.
     */
    /**
    * Exposed for configuration of logging.
    */
    // helper: help.Helper;
    /**
     * This is the language that is coming in from the request.
     *
     * @see defaultLanguage
     */
    requestLanguage: LanguageCode;
    defaultKeywordMode: KeywordMode;
    defaultPropsMode: PropsFilterMode;
    /**
     * @param data This is the initial lexical data that you want Alexa to be able to say. You can always change this dynamically at runtime as well.
     * @param defaultLanguage If a language isn't specified in `get`, `text`, or `ssml`, then this is used.
     * @param defaultLineConcat Default setting when concatenating lines. This will depend on how most of your data is structured. For example, it's designed so that you input your data separated by paragraphs, so the concat would be "paragraph". But if you already have data with <p> tags in your ssml, then you may want to set this to "delim" and do your own interpretation of using the multiple strings for the data.
     * @param defaultDelim Default delimiter user as `lineConcatDelim`.
     * @param defaultCapitalize Default capitalization action when getting texts/ssmls.
     */
    constructor(
        data: LexData<TProps>,
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
        defaultLanguage?: LanguageCode,
        /**
         * Defaults to delim & "" because most of the time, I find I
         * just have a single line and want the single thing returned.
         * This helps with templating, chunking, etc.
         *
         * BREAKING CHANGE: This formerly defaulted to paragraphs, as
         * I thought lines would mean paragraphs. No longer the case.
         */
        defaultLineConcat?: LexLineConcat,
        /**
         * Defaults to delim & "" because most of the time, I find I
         * just have a single line and want the single thing returned.
         * This helps with templating, chunking, etc.
         *
         * BREAKING CHANGE: This formerly defaulted to paragraphs, as
         * I thought lines would mean paragraphs. No longer the case.
         */
        defaultDelim?: string, defaultCapitalize?: LexCapitalize) {

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
    abstract _(id: string, { language, specifier, keywords, keywordMode, lineIndex, lineConcat, lineConcatDelim, capitalize, vars, ssmlVars, props, propsMode, }?: LexGetOptions<TProps>): LexResultObj<TProps>;
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
    private extractLines;
    /**
     * Replaces any embedded template variables, e.g. $name, $0, etc.
     * Note the format is "$" proceeded by any word characters
     * ([a-zA-Z0-9_]).
     *
     * This is different than template references.
     *
     * @see {replaceTemplateRefs}
     */
    private replaceTemplateVars;
    /**
     * Replaces any embedded template references, e.g. $(hi).
     * Note the parenthesis around "hi". This means it is a reference to
     * another lex datum.
     *
     * This is different than template variables, e.g. $name, $0, etc.
     *
     * The template refs can be recursive, i.e. datum A can include a
     * ref to datum B which includes a template to datum C.
     * But these cannot be self-referencing, i.e. C cannot then include
     * a reference back to A.
     *
     * @see {replaceTemplateVars}
     *
     * @param param0
     */
    private replaceTemplateRefs;
    /**
     * Capitalizes the given lines depending on the given
     * capitalize options.
     *
     * @param param0
     */
    private capitalizeLines;
    /**
     * Concatenates lines depending on given params.
     *
     * @param param0
     */
    private concatLines;
    /**
     * Filters the given lexData per the language, specifier,
     * and keywords.
     *
     * @param param0 Filter params
     */
    private filterLexData;
    abstract filterProps({ result, props, propsMode }: {
        result: LexDatum<TProps>[];
        props: PropsFilter<TProps>;
        propsMode: PropsFilterMode;
    }): LexDatum<TProps>[];
    abstract filterLanguage(result: LexDatum<TProps>[], language: string): LexDatum<TProps>[];
    /**
     * Picks a randomesque datum from the given lexData, taking into
     * account the weighting of each datum.
     *
     * @param lexData Filtered lexData from which to choose a random item, per the item's weighting
     *
     * @see LexDatum.weighting
     */
    private pickDatum;
}

// 'use strict';
// function __export(m) {
// for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
// }
// Object.defineProperty(exports, "__esModule", { value: true });
// __export(require("./types"));
// const types_1 = require("./types");
/**
 * Imports helper that has logging, among other things.
 */
// const help = require("helper-gib");
// const ssml_gib_1 = require("ssml-gib");
// let h = new help.Helper();
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
    lc: string = `[${Lex.name}]`;

    data: LexData<TProps>;
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
    defaultLanguage: LanguageCode;
    /**
     * Defaults to delim & "" because most of the time, I find I
     * just have a single line and want the single thing returned.
     * This helps with templating, chunking, etc.
     *
     * BREAKING CHANGE: This formerly defaulted to paragraphs, as
     * I thought lines would mean paragraphs. No longer the case.
     */
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
     * Exposed for configuration of logging.
     */
    /**
    * Exposed for configuration of logging.
    */
    // helper: help.Helper;
    /**
     * This is the language that is coming in from the request.
     *
     * @see defaultLanguage
     */
    requestLanguage: LanguageCode;
    defaultKeywordMode: KeywordMode;
    defaultPropsMode: PropsFilterMode;
    /**
     * @param data This is the initial lexical data that you want Alexa to be able to say. You can always change this dynamically at runtime as well.
     * @param defaultLanguage If a language isn't specified in `get`, `text`, or `ssml`, then this is used.
     * @param defaultLineConcat Default setting when concatenating lines. This will depend on how most of your data is structured. For example, it's designed so that you input your data separated by paragraphs, so the concat would be "paragraph". But if you already have data with <p> tags in your ssml, then you may want to set this to "delim" and do your own interpretation of using the multiple strings for the data.
     * @param defaultDelim Default delimiter user as `lineConcatDelim`.
     * @param defaultCapitalize Default capitalization action when getting texts/ssmls.
     */
    constructor(
        data: LexData<TProps>,
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
        defaultLanguage?: LanguageCode,
        /**
         * Defaults to delim & "" because most of the time, I find I
         * just have a single line and want the single thing returned.
         * This helps with templating, chunking, etc.
         *
         * BREAKING CHANGE: This formerly defaulted to paragraphs, as
         * I thought lines would mean paragraphs. No longer the case.
         */
        defaultLineConcat?: LexLineConcat,
        /**
         * Defaults to delim & "" because most of the time, I find I
         * just have a single line and want the single thing returned.
         * This helps with templating, chunking, etc.
         *
         * BREAKING CHANGE: This formerly defaulted to paragraphs, as
         * I thought lines would mean paragraphs. No longer the case.
         */
        defaultDelim?: string, defaultCapitalize?: LexCapitalize
    ) {
        this.data = data;
        this.defaultLanguage = defaultLanguage;
        this.defaultLineConcat = defaultLineConcat;
        this.defaultDelim = defaultDelim;
        this.defaultCapitalize = defaultCapitalize;
        /**
         * This is the language that is coming in from the request.
         *
         * @see defaultLanguage
         */
        this.requestLanguage = "en-US";
        this.defaultKeywordMode = "any";
        this.defaultPropsMode = "prop";
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
    _(
        id: string,
        opts: LexGetOptions<TProps> = {
            // simplest case default options
            language: this.requestLanguage,
            keywordMode: this.defaultKeywordMode,
            lineConcat: this.defaultLineConcat,
            lineConcatDelim: this.defaultDelim,
            capitalize: this.defaultCapitalize,
            propsMode: this.defaultPropsMode,
        }): LexResultObj<TProps> {
        let { language, specifier, keywords, keywordMode, lineIndex,
            lineConcat, lineConcatDelim, capitalize, vars, ssmlVars, props, propsMode,
        } = opts;
        const lc = `${this.lc}[${this._.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e4e76a6bb301010fc13cf4456efcdc22)`); }

            let lexData = this.data[id];

            if (!lexData) { throw new Error('Data id not found. (E: 4a79897167714dd5a34df77953072aaf)'); }

            lexData = this.filterLexData({
                lexData,
                language, specifier,
                keywords, keywordMode,
                props, propsMode
            });
            if (lexData.length === 0) {
                // no data found matching filtering.
                // just return null and do not error.
                return null;
            }
            let lexDatum = this.pickDatum(lexData);
            let textLines = this.extractLines({
                lexDatum,
                resultAs: "text",
                lineIndex
            });
            textLines =
                this.replaceTemplateRefs({ lines: textLines, resultAs: "text" });
            // Replace vars after references, so all text is fully
            // expanded first.
            textLines =
                this.replaceTemplateVars({ lines: textLines, vars: vars });
            textLines =
                this.capitalizeLines({ lines: textLines, resultAs: "text", capitalize });
            let text = this.concatLines({
                lines: textLines,
                lineType: "text",
                lineConcat,
                lineConcatDelim
            });
            let ssmlLines = this.extractLines({ lexDatum, resultAs: "ssml", lineIndex });
            ssmlLines =
                this.replaceTemplateRefs({ lines: ssmlLines, resultAs: "ssml" });
            // Replace vars after references, so all text is fully
            // expanded first.
            ssmlLines =
                this.replaceTemplateVars({ lines: ssmlLines, vars: ssmlVars || vars });
            ssmlLines = this.capitalizeLines({
                lines: ssmlLines,
                resultAs: "ssml",
                capitalize
            });
            let ssml = this.concatLines({
                lines: ssmlLines,
                lineType: "ssml",
                lineConcat,
                lineConcatDelim
            });
            return { text, ssml, datum: lexDatum, rawData: lexData };

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
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
    extractLines({ lexDatum, resultAs, lineIndex }) {
        let lc = `Lex.extractLines`;
        let f = () => {
            // ensure that either texts or ssmls is defined in data
            if ((!lexDatum.texts || lexDatum.texts.length === 0) &&
                (!lexDatum.ssmls || lexDatum.ssmls.length === 0)) {
                throw new Error(`Invalid lexDatum. Datum texts and ssmls are both undefined. lexDatum: ${JSON.stringify(lexDatum)}.`);
            }
            let lines;
            let useLineIndex = lineIndex || lineIndex === 0;
            if (resultAs === "text" &&
                lexDatum.texts && lexDatum.texts.length > 0) {
                // text wanted, text defined in data
                return useLineIndex ?
                    [lexDatum.texts[lineIndex]] :
                    lexDatum.texts;
            }
            else if (resultAs === "text") {
                // text wanted, but no text defined in data
                h.log(`building text lines from ssml`, 'warn', 1, lc);
                return useLineIndex ?
                    [ssml_gib_1.Ssml.stripSsml(lexDatum.ssmls[lineIndex])] :
                    lexDatum.ssmls.map(ssml => ssml_gib_1.Ssml.stripSsml(ssml));
            }
            else if (lexDatum.ssmls && lexDatum.ssmls.length > 0) {
                // ssml wanted, ssml defined in data
                return useLineIndex ?
                    [lexDatum.ssmls[lineIndex]] :
                    lexDatum.ssmls;
            }
            else {
                // ssml wanted, but no ssml defined in data
                return useLineIndex ?
                    [lexDatum.texts[lineIndex]] :
                    lexDatum.texts;
            }
        };
        return h.gib(this, f, /*args*/ null, lc);
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
    replaceTemplateVars({ lines, vars }) {
        let lc = `Lex.replaceTemplateVars`;
        let replaceVarsSingleLine = (line) => {
            let varNames = Object.keys(vars);
            h.log(`varNames: ${JSON.stringify(varNames)}`, "debug", 0, lc);
            return varNames.reduce((l, varName) => {
                h.log(`varName: ${varName}`, "debug", 0, lc);
                return l.replace(new RegExp('\\$' + varName, "g"), vars[varName]);
            }, line);
        };
        let f = () => {
            if (vars) {
                return lines.map(line => replaceVarsSingleLine(line));
            }
            else {
                return lines;
            }
        };
        return h.gib(this, f, /*args*/ null, lc);
    }
    /**
     * Replaces any embedded template references, e.g. $(hi).
     * Note the parenthesis around "hi". This means it is a reference to
     * another lex datum.
     *
     * This is different than template variables, e.g. $name, $0, etc.
     *
     * The template refs can be recursive, i.e. datum A can include a
     * ref to datum B which includes a template to datum C.
     * But these cannot be self-referencing, i.e. C cannot then include
     * a reference back to A.
     *
     * @see {replaceTemplateVars}
     *
     * @param param0
     */
    replaceTemplateRefs({ lines, resultAs }) {
        let lc = `Lex.replaceTemplateRefs`;
        let regex = /\$\([\w-]+\|?[\w-|\{\}:'"\s,\[\].,<>]+\)/;
        let replaceRefsSingleLine = (line) => {
            let match = regex.exec(line);
            if (match) {
                let template = match[0];
                // strip the $()
                template = template.substring(2, template.length - 1);
                // id|options
                let idAndOptions = template.split('|');
                let id = idAndOptions[0];
                let options = idAndOptions.length === 2 ?
                    JSON.parse(idAndOptions[1]) :
                    {};
                if (!options.lineConcat) {
                    options.lineConcat = types_1.LexLineConcat.delim;
                    options.lineConcatDelim = "";
                }
                let replacementResult = this._(id, options);
                let replacement = resultAs === "text" ?
                    replacementResult.text :
                    replacementResult.ssml;
                line = line.replace(regex, replacement);
                // recursively call if more templates in line
                return regex.test(line) ?
                    replaceRefsSingleLine(line) :
                    line;
            }
            else {
                return line;
            }
        };
        let f = () => {
            return lines.map(line => replaceRefsSingleLine(line));
        };
        return h.gib(this, f, /*args*/ null, lc);
    }
    /**
     * Capitalizes the given lines depending on the given
     * capitalize options.
     *
     * @param param0
     */
    capitalizeLines({ lines, resultAs, capitalize }) {
        let lc = `Lex.capitalizeLines`;
        let replaceAt = (s, i, replacement) => {
            return s.substr(0, i) +
                replacement +
                s.substr(i + replacement.length);
        };
        let upperText = (line) => {
            if (line === "") {
                return "";
            }
            // Thanks https://paulund.co.uk/capitalize-first-letter-string-javascript
            return line.charAt(0).toUpperCase() + line.slice(1);
        };
        let upperSsml = (line) => {
            if (line === "") {
                return "";
            }
            if (line.charAt(0) === "<") {
                let iFirstLetter = line.indexOf(">") + 1;
                return replaceAt(line, iFirstLetter, line[iFirstLetter].toUpperCase());
            }
            else {
                return upperText(line);
            }
        };
        let lowerText = (line) => {
            if (line === "") {
                return "";
            }
            // Thanks https://paulund.co.uk/capitalize-first-letter-string-javascript
            return line.charAt(0).toLowerCase() + line.slice(1);
        };
        let lowerSsml = (line) => {
            if (line === "") {
                return "";
            }
            if (line.charAt(0) === "<") {
                let iFirstLetter = line.indexOf(">") + 1;
                return replaceAt(line, iFirstLetter, line[iFirstLetter].toLowerCase());
            }
            else {
                return lowerText(line);
            }
        };
        let f = () => {
            let firstLine = lines[0];
            switch (capitalize) {
                case types_1.LexCapitalize.upperfirst:
                    lines[0] =
                        resultAs === "text" ?
                            upperText(firstLine) :
                            upperSsml(firstLine);
                    return lines;
                case types_1.LexCapitalize.uppereach:
                    return lines.map(l => {
                        return resultAs === "text" ?
                            upperText(l) :
                            upperSsml(l);
                    });
                case types_1.LexCapitalize.lowerfirst:
                    lines[0] =
                        resultAs === "text" ?
                            lowerText(firstLine) :
                            lowerSsml(firstLine);
                    return lines;
                case types_1.LexCapitalize.lowereach:
                    return lines.map(l => {
                        return resultAs === "text" ?
                            lowerText(l) :
                            lowerSsml(l);
                    });
                case types_1.LexCapitalize.none:
                    return lines;
                default:
                    throw new Error(`Unknown LexCapitalize: ${capitalize}`);
            }
        };
        return h.gib(this, f, /*args*/ null, lc);
    }
    /**
     * Concatenates lines depending on given params.
     *
     * @param param0
     */
    concatLines({ lines, lineType, lineConcat, lineConcatDelim }) {
        let lc = `Lex.concatLines`;
        let firstLine = lines[0];
        // This used in both LexLineConcat.p and .n
        let concatSsmlP = () => {
            const pTag = "<p>";
            if (firstLine.length < pTag.length ||
                firstLine.substring(0, pTag.length).toLowerCase() !== pTag) {
                return lines.map(l => `<p>${l}</p>`).join('');
            }
            else {
                // First line starts with <p> so
                // we will simply concat all lines,
                // assuming the user has wrapped all lines.
                return lines.join('');
            }
        };
        let f = () => {
            switch (lineConcat) {
                case types_1.LexLineConcat.p:
                    if (lineType === "text") {
                        return lines.join("\n\n");
                    }
                    else {
                        return concatSsmlP();
                    }
                case types_1.LexLineConcat.s:
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
                    }
                    else {
                        const sTag = "<s>";
                        if (firstLine.length < sTag.length ||
                            firstLine.substring(0, sTag.length).toLowerCase() !== sTag) {
                            return lines.map(l => `<s>${l}</s>`).join('');
                        }
                        else {
                            // First line starts with <s> so
                            // we will simply concat all lines,
                            // assuming the user has wrapped all lines.
                            return lines.join('');
                        }
                    }
                case types_1.LexLineConcat.n:
                    if (lineType === "text") {
                        return lines.join('\n');
                    }
                    else {
                        return concatSsmlP();
                    }
                case types_1.LexLineConcat.delim:
                    return lines.join(lineConcatDelim);
                default:
                    throw new Error(`Unknown LexLineConcat: ${lineConcat}`);
            }
        };
        return h.gib(this, f, /*args*/ null, lc);
    }
    /**
     * Filters the given lexData per the language, specifier,
     * and keywords.
     *
     * @param param0 Filter params
     */
    filterLexData({ lexData, language, specifier, keywords, keywordMode, props, propsMode }) {
        let lc = `Lex.filterLexData`;
        let f = () => {
            let result = lexData.slice();
            if (language) {
                result = this.filterLanguage(result, language);
            }
            if (specifier) {
                result =
                    result.filter(d => d.specifier && d.specifier === specifier);
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
                        h.log(`Unknown keywordMode: ${keywordMode}`, "error", 3, lc);
                        break;
                }
            }
            if (props) {
                result = this.filterProps({ result, props, propsMode });
            }
            return result;
        };
        return h.gib(this, f, /*args*/ null, lc);
    }
    filterProps({ result, props, propsMode }) {
        if (propsMode === "prop") {
            return result.filter(d => {
                return Object.keys(props).every(propName => {
                    let propFn = props[propName];
                    let dPropValue = d.props ? d.props[propName] : undefined;
                    return propFn(dPropValue);
                });
            });
        }
        else if (propsMode === "props") {
            let propsFn = props;
            return result.filter(d => propsFn(d.props));
        }
        else {
            throw new Error(`Invalid propsMode: ${propsMode}`);
        }
    }
    filterLanguage(result, language) {
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
    pickDatum(lexData) {
        let lc = `Lex.pickDatum`;
        let f = () => {
            if (lexData.length === 1) {
                return lexData[0];
            }
            else {
                let totalWeight = lexData.reduce((agg, item) => {
                    return agg + (item.weighting ? item.weighting : 1);
                }, 0);
                // normalized random number
                let randomNumber = Math.random() * totalWeight;
                let result = null;
                lexData.reduce((runningWeight, item) => {
                    if (result) {
                        // already got a result
                        return -1;
                    }
                    else {
                        runningWeight +=
                            (item.weighting ? item.weighting : 1);
                        if (runningWeight >= randomNumber) {
                            result = item;
                        }
                        return runningWeight;
                    }
                }, 0);
                return result;
            }
        };
        return h.gib(this, f, /*args*/ null, lc);
    }
}
exports.Lex = Lex;
