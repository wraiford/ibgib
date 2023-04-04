/**
 * say stimulator
*/

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../../common/constants';
import {
    StimulateArgs, Stimulation, StimulationScope, StimulationTarget, StimulationType, Stimulator
} from '.././types';
import { getMostSpecialestWords, getTargets } from '.././helper';
import { StimulatorBase } from './stimulator-base';
import { LexData, PropsData } from '../../../../../common/helper/lex';
import { SemanticId, toLexDatums_Semantics } from 'src/app/common/types/robbot';
import { pickRandom } from '../../../../../common/helper/utils';
import { ContinuableStimulatorBase } from './continuable-base';


const logalot = c.GLOBAL_LOG_A_LOT || true;


export type SaySemanticId =
    "semantic_say" |
    SemanticId;
export const SaySemanticId = {
    ...SemanticId,
    say: 'semantic_say' as SaySemanticId,
}

interface LexPropsData extends PropsData {

}


export class Stimulator_Say extends ContinuableStimulatorBase {
    protected lc: string = `[${Stimulator_Say.name}]`;

    constructor() {
        super();
    }

    _lexData: LexData<LexPropsData>;
    protected async getLexData(): Promise<LexData<PropsData>> {
        if (!this._lexData) {
            this._lexData = {
                [SaySemanticId.say]: [
                    {
                        texts: [
                            `# say this *out loud*, as evenly and clearly as possible`,
                            ``,
                            `$textToSay`,
                        ],
                    }
                ],
            }
        }
        return this._lexData;
    }

    protected async initialize_lex(): Promise<void> {
        const lc = `${this.lc}[${this.initialize_lex.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: efe0debb5c12b10684273b9c89af2522)`); }
            await super.initialize_lex();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected getName(): string { return Stimulator_Say.name; }
    protected getVersion(): string { return "v1"; }
    protected getTypes(): StimulationType[] { return [StimulationType.say]; }

    protected canStimulateImpl(args: StimulateArgs): Promise<boolean> {
        // can always say
        return Promise.resolve(true);
    }

    protected async getTextToSay({
        args,
        targets,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
    }): Promise<string> {
        const lc = `${this.lc}[${this.getTextToSay.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 562b6c3503a7150debc30d12792f1923)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            const fullText = ibGibs.map(x => x.data?.text).join('\n\n');

            // get the more special words (rarer, TF/IDF-ish)
            const countToSay = pickRandom({ x: [3, 7] });
            const specialWords = await getMostSpecialestWords({
                subsetText: fullText,
                globalTextInfo: textInfo,
                countToReturn: countToSay,
            });

            if (specialWords?.length > countToSay) { throw new Error(`(UNEXPECTED) specialWords.length (${specialWords.length}) > countToSay (${countToSay})? (E: fbbf20f3920044ae8c48de3b3fd6968a)`); }

            return specialWords.join(', ');
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
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
            if (logalot) { console.log(`${lc} starting... (I: d4aa141baf1149a68f4d0f1a5033f414)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            // in accordance with "elevated stimulations", we want to start out
            // small and grow bigger as we go. So first say just single words
            // (TF/IDF-ish), and then entire lines.
            debugger;

            const stimulationScope = StimulationScope.word;

            const textToSay = await this.getTextToSay({ args, targets });

            // get the say text from our local lex.
            // todo: vary text for say via property isFirst or something, so we can say "for starters, say over this..."
            const speech = this.lex.get(SaySemanticId.say, {
                vars: {
                    textToSay,
                }
            });

            const resStimulation: Stimulation = {
                stimulationType: 'say',
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                actualTimestampUTC: h.getTimestamp(),
                targets,
                commentText: speech.text,
                // expectsResponse: true,
                // expectedTexts: specialWords,
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

    protected getStimulationImpl_Continuation({ args, targets, mostRecentStimulation, }: {
        args: StimulateArgs,
        targets: StimulationTarget[],
        mostRecentStimulation: Stimulation,
    }): Promise<Stimulation> {
        const lc = `${this.lc}[${this.getStimulationImpl_Continuation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e736fdcd77cc4fedc820c08cb8a8eb23)`); }
            return this.getStimulationImpl_Fresh({ args, targets });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}
