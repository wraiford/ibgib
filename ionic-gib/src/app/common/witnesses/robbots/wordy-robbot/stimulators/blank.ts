/**
 * blank stimulator
*/

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../../common/constants';
import {
    StimulateArgs, Stimulation, StimulationScope, StimulationTarget, StimulationType, Stimulator, WordyTextInfo
} from '.././types';
import { getMostSpecialestWords, getTargets, getWords, getWordyTextInfo } from '.././helper';
import { StimulatorBase } from './stimulator-base';
import { LexData, PropsData } from '../../../../../common/helper/lex';
import { SemanticId, toLexDatums_Semantics } from 'src/app/common/types/robbot';
import { getSaferSubstring, pickRandom, replaceCharAt, weAreRunningOnMobileProbably } from '../../../../../common/helper/utils';
import { ContinuableStimulatorBase } from './continuable-base';
import { CommentIbGib_V1 } from 'src/app/common/types/comment';


const logalot = c.GLOBAL_LOG_A_LOT || true;


export type BlankSemanticId =
    "semantic_blank" |
    SemanticId;
export const BlankSemanticId = {
    ...SemanticId,
    blank: 'semantic_blank' as BlankSemanticId,
}

interface LexPropsData extends PropsData {

}

interface StimulationDetails_Blank {
    /**
     * Text slice(s) that the user is to blank.
     */
    texts?: string[];
    /**
     * if applicable, 0-based index that depends on stimulationScope.
     *
     * If the scope is word, then this will indicate the indexes within the string, i.e. found/incidence index.
     * If the scope is line, then this wll provide the index(s) of the line.
     * If the scope is a paragraph, then this will indicate the paragraph index(s).
     *
     * @optional
     */
    indexes?: number[];
}

export class Stimulator_Blank extends ContinuableStimulatorBase {
    protected lc: string = `[${Stimulator_Blank.name}]`;

    constructor() {
        super();
    }

    _lexData: LexData<LexPropsData>;
    protected async getLexData(): Promise<LexData<PropsData>> {
        if (!this._lexData) {
            this._lexData = {
                [BlankSemanticId.blank]: [
                    {
                        texts: [
                            `# blank`,
                            `## type the blanked out text`,
                            ``,
                            `$textWithBlanks`,
                        ],
                    }
                ],
            }
        }
        return this._lexData;
    }

    protected getName(): string { return Stimulator_Blank.name; }
    protected getVersion(): string { return "v1"; }
    protected getTypes(): StimulationType[] { return [StimulationType.blank]; }

    /**
     * We don't want to have to type out if we're on mobile.
     */
    protected canStimulateImpl(args: StimulateArgs): Promise<boolean> {
        // can always blank to some degree
        return Promise.resolve(true);
        // const { ibGibs, prevStimulations, stimulationType, textInfo, semanticInfo } = args;

        //     const isFirstStimulation = prevStimulations.length === 0;
        //     const isMultiline = textInfo.lines?.length > 1;
        //     const stimulationScope = isFirstStimulation || !isMultiline ?
        //         StimulationScope.word :
        //         StimulationScope.line;
        // if we're running on mobile, only type single words.
        // const onMobile = weAreRunningOnMobileProbably();
        // return !onMobile;
    }

    protected async getStimulationImpl_Fresh({
        args,
        targets,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
    }): Promise<Stimulation> {
        const lc = `${this.lc}[${this.getStimulationImpl_Fresh.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 973aaf4076124f98b7fc50a3f0f736c3)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            // in accordance with "elevated stimulations", we want to start out
            // small and grow bigger as we go. So first blank just single words
            // (TF/IDF-ish), and then entire lines.
            debugger;

            const stimulationScope = StimulationScope.word;

            // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            let fullText = ibGibs.map(x => x.data?.text).join('\n\n');

            // get the more special words (rarer, TF/IDF-ish)
            const countToBlank = pickRandom({ x: [3, 7] });
            const specialWords = await getMostSpecialestWords({
                subsetText: fullText,
                globalTextInfo: textInfo,
                countToReturn: countToBlank,
            });

            if (specialWords?.length > countToBlank) { throw new Error(`(UNEXPECTED) specialWords.length (${specialWords.length}) > countToBlank (${countToBlank})? (E: 54d80a4aabdd4b5c8acafb73247a293d)`); }

            if (logalot) { console.log(`${lc} specialWords: ${specialWords.join(',')} (I: 932a365e02284e813a9594332838da23)`); }

            let textWithBlanks = fullText.concat();
            for (let i = 0; i < specialWords.length; i++) {
                const specialWord = specialWords[i];
                const regExp = new RegExp(`(\\W)${specialWord}(\\W)`, 'g');
                debugger;
                textWithBlanks = textWithBlanks.replace(regExp, '$1_____$2');
            }

            // get the blank text from our local lex.
            // todo: vary text for blank via property isFirst or something, so we can say "for starters, blank over this..."
            const speech = this.lex.get(BlankSemanticId.blank, {
                vars: {
                    textWithBlanks,
                }
            });

            const resStimulation: Stimulation = {
                stimulationType: 'blank',
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                actualTimestampUTC: h.getTimestamp(),
                targets,
                commentText: speech.text,
                expectedTexts: specialWords,
                stimulationScope,
                isComplete: true,
            };

            return resStimulation;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getStimulationImpl_Continuation({
        args,
        targets,
        mostRecentStimulation,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
        mostRecentStimulation: Stimulation,
    }): Promise<Stimulation> {
        const lc = `${this.lc}[${this.getStimulationImpl_Continuation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 5e24fe61febf43a39754c7a95ba592a7)`); }

            return await this.getStimulationImpl_Fresh({ args, targets });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}
