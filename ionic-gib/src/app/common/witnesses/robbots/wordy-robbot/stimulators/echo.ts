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
import { pickRandom, weAreRunningOnMobileProbably } from '../../../../../common/helper/utils';
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
                            `## repeat this/these back to me`,
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
            const srcText = ibGibs.map(x => x.data?.text).join('\n\n');

            // get the more special words (rarer, TF/IDF-ish)
            const countToEcho = pickRandom({ x: [1, 2, 3, 4] });
            const specialWords = await getMostSpecialestWords({
                subsetText: srcText,
                globalTextInfo: textInfo,
                countToReturn: countToEcho,
            });

            if (specialWords?.length > countToEcho) { throw new Error(`(UNEXPECTED) specialWords.length (${specialWords.length}) > countToEcho (${countToEcho})? (E: cc6eb17a7836594b68a9a74ba3d31a22)`); }

            // get the echo text from our local lex.
            // todo: vary text for echo via property isFirst or something, so we can say "for starters, echo over this..."
            const speech = this.lex.get(EchoSemanticId.echo, {
                vars: {
                    echoText: specialWords.join(', '),
                    fullText: srcText,
                }
            });

            const resStimulation: Stimulation = {
                stimulationType: 'echo',
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                actualTimestampUTC: h.getTimestamp(),
                targets,
                commentText: speech.text,
                expectsResponse: true,
                expectedTexts: specialWords,
                stimulationScope,
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

            throw new Error(`leaving off here. i could just have this do the same as fresh and ignor the feedback (what the user typed in) and then at the end of the elevating stimulation provide a summary... Also, I could try to squeeze in composition of feedback and the next stimulation at some other point in code. Maybe instead of commentText, I have feedbackText and nextStimulationText? (E: 875129855a9362df2efbc658dbb78c23)`);

            // in accordance with "elevated stimulations", we want to start out
            // small and grow bigger as we go. So first echo just single words
            // (tf/idf-ish), and then entire lines.

            const stimulationScope = StimulationScope.word;

            // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            const srcText = ibGibs.map(x => x.data?.text).join('\n\n');

            // get the echo text from our local lex.
            // todo: vary text for echo via property isFirst or something, so we can say "for starters, echo over this..."
            const speech = this.lex.get(EchoSemanticId.echo, {
                vars: { text: srcText }
            });

            const resStimulation: Stimulation = {
                stimulationType: 'echo',
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                targets,
                actualTimestampUTC: h.getTimestamp(),
                commentText: speech.text,
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
}

export class Stimulator_EchoFirstLines extends StimulatorBase {
    protected lc: string = `[${Stimulator_EchoFirstLines.name}]`;

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
                            `# first lines`,
                            ``,
                            `$text`,
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

    protected async canStimulateImpl(args: StimulateArgs): Promise<boolean> {
        const lc = `${this.lc}[${this.canStimulateImpl.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 3761995b41430ea04e6a9d7425753722)`); }

            let { ibGibs, prevStimulations, textInfo, isResponseCandidate } = args;
            if (isResponseCandidate) {
                // we should get here only if this stimulator is the previous
                // stimulation generator
                if ((prevStimulations ?? []).length === 0) { throw new Error(`(UNEXPECTED) isResponseCandidate is true, but prevStimulations is falsy/empty? (E: 7278785b7d915fe7afc7b6d6a1e62622)`); }
                let prevStimulation = prevStimulations.at(-1);
                let { expectedTexts } = prevStimulation;
                if ((expectedTexts ?? []).length === 0) { throw new Error(`(UNEXPECTED) isReponseCandidate is true, so we are the previous stimluation generator. but prevStimluation.expectedTexts is empty/falsy? (E: 400d7e788557f9f1020724c139020222)`); }

                // if the incoming words has some "reasonable" overlap with
                // expected texts, then yes, we can handle the response.
                // Otherwise, it ain't to do with us.
                let incomingText = ibGibs.map(x => (<CommentIbGib_V1>x).data.text ?? '').join(' ');
                let incomingWords = getWords({
                    text: incomingText,
                    doLowercase: true, doSort: false, doUnique: false,
                });

                let count = 0;
                incomingWords.forEach(word => {
                    if (expectedTexts.includes(word)) { count++; }
                });

                const minPctIsh = 0.5;
                const incomingPctIsh = count / incomingWords.length;

                const incomingIsSimilar = incomingPctIsh > minPctIsh;
                if (logalot) { console.log(`${lc} incomingIsSimilar: ${incomingIsSimilar} (I: 20b485c4d43596cea40a9301f7eed822)`); }
                return incomingIsSimilar;
            } else {
                const hasMultipleParagraphs = textInfo.paragraphs?.length > 2;
                if (logalot) { console.log(`${lc} hasMultipleParagraphs: ${hasMultipleParagraphs} (I: fb6d06a2d694e4d09f522044ea24c122)`); }
                return hasMultipleParagraphs;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            return false;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getStimulationImpl({
        args,
        targets,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
    }): Promise<Stimulation> {
        const lc = `${this.lc}[${this.getStimulationImpl.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: ae0465a2e281e2149f65a8a827cba222)`); }

            let { ibGibs, prevStimulations, textInfo } = args;

            const stimulationScope = StimulationScope.paragraph;

            // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            let firstLines = textInfo.paragraphs.map(paragraph => {
                // for each paragraph, return the first line, whether it's by
                // line break or by sentence delimiter.
                const pieces = paragraph.includes('\n') ?
                    paragraph.split('\n').filter(x => !!x) :
                    paragraph.split(/[.!\?]/).filter(x => !!x);
                return pieces.length > 0 ? pieces[0] : '';
            }).filter(line => !!line);
            const srcText = firstLines.map(x => x + '\t\t...').join('\n\n');

            // get the echo text from our local lex.
            const speech = this.lex.get(EchoSemanticId.echo, {
                vars: { text: srcText }
            });

            const resStimulation: Stimulation = {
                stimulationType: 'echo',
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                targets,
                actualTimestampUTC: h.getTimestamp(),
                commentText: speech.text,
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
}
