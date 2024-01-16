/**
 * seed stimulator
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
import { AtomicId, DEFAULT_HUMAN_LEX_DATA_ENGLISH_ATOMICS, SemanticId, toLexDatums_Semantics } from 'src/app/common/types/robbot';
import { getSaferSubstring, pickRandom, weAreRunningOnMobileProbably } from '../../../../../common/helper/utils';
import { ContinuableStimulatorBase } from './continuable-base';
import { CommentIbGib_V1 } from 'src/app/common/types/comment';


const logalot = c.GLOBAL_LOG_A_LOT || true;


export type SeedSemanticId =
    "semantic_seed" |
    SemanticId;
export const SeedSemanticId = {
    ...SemanticId,
    seed: 'semantic_seed' as SeedSemanticId,
}

interface LexPropsData extends PropsData {

}

interface StimulationDetails_Seed {
    /**
     * Text slice(s) that the user is to seed.
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

export class Stimulator_Seed extends ContinuableStimulatorBase {
    protected lc: string = `[${Stimulator_Seed.name}]`;

    constructor() {
        super();
    }

    _lexData: LexData<LexPropsData>;
    protected async getLexData(): Promise<LexData<PropsData>> {
        if (!this._lexData) {
            this._lexData = {
                [SeedSemanticId.seed]: [
                    {
                        texts: [
                            `# seed`,
                            ``,
                            `ibgib elevated! $(${AtomicId.wtg})`,
                        ],
                    }
                ],
                [AtomicId.wtg]: [
                    ...DEFAULT_HUMAN_LEX_DATA_ENGLISH_ATOMICS[AtomicId.wtg],
                ],
            }
        }
        return this._lexData;
    }

    protected getName(): string { return Stimulator_Seed.name; }
    protected getVersion(): string { return "v1"; }
    protected getTypes(): StimulationType[] { return [StimulationType.seed]; }

    /**
     * We don't want to have to type out if we're on mobile.
     */
    protected canStimulateImpl(args: StimulateArgs): Promise<boolean> {
        // can always seed to some degree
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
            if (logalot) { console.log(`${lc} starting... (I: 0b526709165844d3ae0498edad33e3e8)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            // in accordance with "elevated stimulations", we want to start out
            // small and grow bigger as we go. So first seed just single words
            // (TF/IDF-ish), and then entire lines.
            debugger;

            const stimulationScope = StimulationScope.all;

            // get the seed text from our local lex.
            // todo: vary text for seed via property isFirst or something, so we can say "for starters, seed over this..."
            const speech = this.lex.get(SeedSemanticId.seed, {

            });

            const resStimulation: Stimulation = {
                stimulationType: 'seed',
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                actualTimestampUTC: h.getTimestamp(),
                targets,
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
            if (logalot) { console.log(`${lc} starting... (I: c181e66dc7cf4e1db24a69dd6aa0f8d1)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            return await this.getStimulationImpl_Fresh({ args, targets });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}
