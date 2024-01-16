/**
 * echo stimulator
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
import { getSaferSubstring, pickRandom, weAreRunningOnMobileProbably } from '../../../../../common/helper/utils';
import { ContinuableStimulatorBase } from './continuable-base';
import { CommentIbGib_V1 } from 'src/app/common/types/comment';


const logalot = c.GLOBAL_LOG_A_LOT || true;


export type EchoSemanticId =
    "semantic_echo" |
    SemanticId;
export const EchoSemanticId = {
    ...SemanticId,
    echo: 'semantic_echo' as EchoSemanticId,
}

interface LexPropsData extends PropsData {

}

interface StimulationDetails_Echo {
    /**
     * Text slice(s) that the user is to echo.
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

export class Stimulator_Echo extends ContinuableStimulatorBase {
    protected lc: string = `[${Stimulator_Echo.name}]`;

    constructor() {
        super();
    }

    _lexData: LexData<LexPropsData>;
    protected async getLexData(): Promise<LexData<PropsData>> {
        if (!this._lexData) {
            this._lexData = {
                [EchoSemanticId.echo]: [
                    {
                        texts: [
                            `# echo`,
                            `## type these back to me`,
                            ``,
                            `$echoText`,
                            ``,
                            `## full text`,
                            ``,
                            `$fullText`,
                        ],
                    }
                ],
            }
        }
        return this._lexData;
    }

    protected getName(): string { return Stimulator_Echo.name; }
    protected getVersion(): string { return "v1"; }
    protected getTypes(): StimulationType[] { return [StimulationType.echo]; }

    /**
     * We don't want to have to type out if we're on mobile.
     */
    protected canStimulateImpl(args: StimulateArgs): Promise<boolean> {
        // can always echo to some degree
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
            if (logalot) { console.log(`${lc} starting... (I: 9e849b937fbf5b053561f3953113a522)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            // in accordance with "elevated stimulations", we want to start out
            // small and grow bigger as we go. So first echo just single words
            // (TF/IDF-ish), and then entire lines.
            debugger;

            const stimulationScope = StimulationScope.word;

            // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            const fullText = ibGibs.map(x => x.data?.text).join('\n\n');

            // get the more special words (rarer, TF/IDF-ish)
            const countToEcho = pickRandom({ x: [3, 7] });
            const specialWords = await getMostSpecialestWords({
                subsetText: fullText,
                globalTextInfo: textInfo,
                countToReturn: countToEcho,
            });

            if (specialWords?.length > countToEcho) { throw new Error(`(UNEXPECTED) specialWords.length (${specialWords.length}) > countToEcho (${countToEcho})? (E: cc6eb17a7836594b68a9a74ba3d31a22)`); }

            // get the echo text from our local lex.
            // todo: vary text for echo via property isFirst or something, so we can say "for starters, echo over this..."
            const speech = this.lex.get(EchoSemanticId.echo, {
                vars: {
                    echoText: specialWords.join(', '),
                    fullText,
                }
            });

            const resStimulation: Stimulation = {
                stimulationType: 'echo',
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                actualTimestampUTC: h.getTimestamp(),
                targets,
                commentText: speech.text,
                // expectsResponse: true,
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
            if (logalot) { console.log(`${lc} starting... (I: 8c958aa03b674d9c8920e178a7d4adb7)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;
            return await this.getStimulationImpl_Fresh({ args, targets });

            // if we've reached here, then we have echoed at least once.

            // i'm calculating the score here, but i'm not sure if this even
            // matters.  ultimately the progress will be determined by the
            // opinion of the learner.  we can always have a request that does
            // this kind of calculation for us and presents it to the user.
            // let score: number;
            // let perfectScore: number;
            // if (semanticInfo.other?.data?.text) {
            //     debugger;
            //     const expectedTexts = (mostRecentStimulation.expectedTexts ?? [])
            //         .map(x => getSaferSubstring({ text: x }))
            //         .map(x => x.toLowerCase());
            //     if (logalot) { console.log(`${lc} expectedTexts: ${expectedTexts.join(',')} (I: a9eb05c8bba84fb4ec242632bcdb0323)`); }
            //     const responseText = <string>semanticInfo.other.data.text;
            //     if (logalot) { console.log(`${lc} responseText: ${responseText} (I: 496fa807389a7f876b82b03795b3f623)`); }
            //     const actualTexts = responseText
            //         .split(/\W/)
            //         .map(x => (x ?? "").trim().toLowerCase())
            //         .map(x => getSaferSubstring({ text: x }))
            //         .filter(x => !!x);
            //     if (logalot) { console.log(`${lc} actualTexts: ${actualTexts.join(',')} (I: 287ff8a78c9b76b6ab62b1c557bedc23)`); }
            //     const expectedMap: { [s: string]: boolean } = {};
            //     for (let i = 0; i < expectedTexts.length; i++) {
            //         const expectedResponse = expectedTexts[i];
            //         expectedMap[expectedResponse] = actualTexts.includes(expectedResponse)
            //     }
            //     perfectScore = expectedTexts.length;
            //     score = expectedTexts.length;
            //     Object.values(expectedMap).forEach(x => {
            //         if (!x) { score--; }
            //     });
            //     console.log(`${lc} score: ${score}/${perfectScore}`);
            // } else {
            //     debugger;
            // }

            // in accordance with "elevated stimulations", we want to start out
            // small and grow bigger as we go. So first echo just single words
            // (tf/idf-ish), and then entire lines.

            // const stimulationScope = StimulationScope.word;

            // // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            // const srcText = ibGibs.map(x => x.data?.text).join('\n\n');

            // // get the echo text from our local lex.
            // // todo: vary text for echo via property isFirst or something, so we can say "for starters, echo over this..."
            // const speech = this.lex.get(EchoSemanticId.echo, {
            //     vars: { text: srcText }
            // });

            // const resStimulation: Stimulation = {
            //     stimulationType: 'echo',
            //     stimulatorName: this.name,
            //     stimulatorVersion: this.version,
            //     targets,
            //     actualTimestampUTC: h.getTimestamp(),
            //     commentText: speech.text,
            //     stimulationScope,
            //     isComplete: true,
            //     details: {
            //     }
            // };

            // return resStimulation;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}
