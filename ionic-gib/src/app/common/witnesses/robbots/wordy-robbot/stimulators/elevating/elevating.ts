
/**
 * The Elevating Stimulator works on providing stimulating interactions that
 * start off more passive, like reading, and then progress to more active ones
 * like filling in blanks or even poetry composition.
 *
 * At the end of the stimulations, it's left up to the user how to continue.
 * For example, the user can restart the elevating stimulations, or they can
 * produce one or more new ibgibs that then go on to be stimulated.
*/

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../../../common/constants';
import {
    StimulateArgs, Stimulation, StimulationScope,
    StimulationTarget, StimulationType, Stimulator, WordyTextInfo
} from '../.././types';
import { getTargets, getWords, getWordyTextInfo } from '../../helper';
import { LexData, PropsData } from '../../../../../../common/helper/lex';
import { SemanticId, toLexDatums_Semantics } from '../../../../../../common/types/robbot';
import { pickRandom, weAreRunningOnMobileProbably } from '../../../../../../common/helper/utils';
import { ContinuableStimulatorBase } from '../continuable-base';
import { CommentIbGib_V1 } from '../../../../../../common/types/comment';
import { Stimulator_Read } from '../read';
import { Stimulator_Echo } from '../echo';
import { Stimulator_ReadFirstLines } from '../read-first-lines';
import { Stimulator_Say } from '../say';
import { Stimulator_Seed } from '../seed';
import { Stimulator_Blank } from '../blank';


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

interface StimulationDetails {

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

export class ElevatingStimulator extends ContinuableStimulatorBase {
    protected lc: string = `[${ElevatingStimulator.name}]`;

    constructor() {
        super();
    }

    _lexData: LexData<LexPropsData>;
    protected async getLexData(): Promise<LexData<PropsData>> {
        if (!this._lexData) {
            this._lexData = {
                // [EchoSemanticId.echo]: [
                //     {
                //         texts: [
                //             `# echo`,
                //             `## repeat this/these back to me`,
                //             ``,
                //             `$echoText`,
                //             ``,
                //             `## full text`,
                //             ``,
                //             `$fullText`,
                //         ],
                //     }
                // ],
            }
        }
        return this._lexData;
    }

    protected getName(): string { return ElevatingStimulator.name; }
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

    protected subStimulators: Stimulator[] = [
        new Stimulator_ReadFirstLines(),
        new Stimulator_Read(),
        new Stimulator_Echo(),
        new Stimulator_Say(),
        new Stimulator_Blank(),
        new Stimulator_Seed(),
    ];

    // protected async getSubStimulator({
    //     mostRecentStimulation,
    // }: {
    //     mostRecentStimulation: Stimulation,
    // }): Promise<Stimulator> {
    //     const lc = `${this.lc}[${this.getSubStimulator.name}]`;
    //     try {
    //         if (logalot) { console.log(`${lc} starting... (I: 3759fe3d5531476d85d2cb722a484c0a)`); }

    //         this.subStimulators.filter(x => x.name === mostRecentStimulation.stimulatorName);

    //         switch (mostRecentStimulation.stimulatorName) {
    //             case Stimulator_ReadFirstLines.name:
    //                 break;

    //             default:
    //                 throw new Error(`unknown stimulatorName: ${mostRecentStimulation.stimulatorName} (E: 221281690aa449669c9929c13fed4938)`);
    //         }

    //     } catch (error) {
    //         console.error(`${lc} ${error.message}`);
    //         throw error;
    //     } finally {
    //         if (logalot) { console.log(`${lc} complete.`); }
    //     }
    // }

    /**
     * get a new stimulation that should be introductory, based on the user's
     * @returns Stimulation
     */
    protected async getStimulationImpl_Fresh({
        args,
        targets,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
    }): Promise<Stimulation> {
        const lc = `${this.lc}[${this.getStimulationImpl_Fresh.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: bb19c62486594ddfbbc982262c0877ef)`); }

            // let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            debugger;

            // always start skimming via the first lines
            const subStimulator = this.subStimulators.filter(x => x.name === Stimulator_ReadFirstLines.name)[0];
            const subStimulation = await subStimulator.getStimulation(args);

            const resStimulation: Stimulation = {
                stimulatorName: this.getName(),
                stimulatorVersion: this.getVersion(),
                stimulationMetaType: 'elevating',
                targets,
                isComplete: false,
                stimulationType: subStimulation.stimulationType,
                actualTimestampUTC: subStimulation.actualTimestampUTC,
                scheduledTimestampUTC: subStimulation.scheduledTimestampUTC,
                nextScheduledTimestampUTC: subStimulation.nextScheduledTimestampUTC,
                commentText: subStimulation.commentText,
                expectsResponse: true,
                expectedTexts: subStimulation.expectedTexts,
                stimulationScope: subStimulation.stimulationScope,
                subStimulation: subStimulation,
            };

            return resStimulation;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * If we get here, then we've already seen that the `mostRecentStimulation` was
     * expecting a response.
     */
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
            if (logalot) { console.log(`${lc} starting... (I: 16fde645e6b8435f9c266b14b9c43817)`); }

            // probably too defensive
            if (!mostRecentStimulation?.subStimulation) {
                console.error(`${lc} (UNEXPECTED) mostRecentStimulation?.subStimulation expected to be truthy. diverting to fresh get stimulation instead of throwing though. (E: 85a8a0414d3e4b70aa5fc8a419a76b58)`);
                return await this.getStimulationImpl_Fresh({ args, targets });
            }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;
            let subStimulator: Stimulator;

            const { subStimulation: mostRecentSubStimulation } = mostRecentStimulation;
            if (mostRecentSubStimulation.expectsResponse) {
                // populate subStimulator from the previous subStimulator and let it handle it.
                const subs = this.subStimulators.filter(x =>
                    x.name === mostRecentSubStimulation.stimulatorName
                    && x.version === mostRecentSubStimulation.stimulatorVersion
                );
                if (subs.length !== 1) { throw new Error(`unexpected most recent subStimulation name/version. ${mostRecentSubStimulation.stimulatorName}, ${mostRecentSubStimulation.stimulatorVersion} (E: 99d236b0b7434533b41a82d993a09ba3)`); }
                subStimulator = subs[0];
            } else {
                // pick another subStimulator, since the previous one wasn't expecting a response.
                subStimulator = await this.getNextSubStimulator({ args, targets, mostRecentStimulation });
            }
            debugger;

            const subStimulation = await subStimulator.getStimulation(args);

            const resStimulation: Stimulation = {
                stimulatorName: this.name,
                stimulatorVersion: this.version,
                stimulationMetaType: 'elevating',
                targets,
                isComplete: false,
                stimulationType: subStimulation.stimulationType,
                actualTimestampUTC: subStimulation.actualTimestampUTC,
                scheduledTimestampUTC: subStimulation.scheduledTimestampUTC,
                nextScheduledTimestampUTC: subStimulation.nextScheduledTimestampUTC,
                commentText: subStimulation.commentText,
                expectsResponse: true,
                expectedTexts: subStimulation.expectedTexts,
                stimulationScope: subStimulation.stimulationScope,
                subStimulation: subStimulation,
            };

            return resStimulation;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async getNextSubStimulator({
        args,
        targets,
        mostRecentStimulation,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
        mostRecentStimulation: Stimulation,
    }): Promise<Stimulator> {
        const lc = `${this.lc}[${this.getNextSubStimulator.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 24754fe8beb94494a024982cfc9044c6)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            // atow, drive the stimulation by type
            // and previous stimulation count. In the future, this is
            // definitely a point that could be more sophisticated

            prevStimulations = prevStimulations ?? [];

            // just hard coding a strategy here
            const totalCount = prevStimulations.length;
            const period = 7;
            const factor = totalCount % period;

            /**
             * We'll narrow it down to the type of stimulation, then match it to a stimulator.
             */
            let chooseFromTypes: StimulationType[];
            if (totalCount === 0) {
                debugger;
                if (logalot) { console.log(`${lc} totalCount is 0, so first choice? (I: 781490d63abc430db967a627c5e49148)`); }
                chooseFromTypes = ['read'];
            } else if (factor > 0 && factor <= 2) {
                debugger;
                if (logalot) { console.log(`${lc} factor > 0 and <= 2 (I: 7e6d17d0a66841cbbfdb09e477ca2a14)`); }
                chooseFromTypes = ['say', 'echo'];
            } else if (factor > 2 && factor < period) {
                if (logalot) { console.log(`${lc} factor > 2 and < ${period} (I: eeea5d8709b94f17a99b45043fff138c)`); }
                chooseFromTypes = ['blank']; // debug
            } else if (factor === 0) {
                if (logalot) { console.log(`${lc} completed round. factor is 0. (I: 020c0089586d4ba997f5938b4f336585)`); }
                chooseFromTypes = ['seed']; // note to self: this should prompt user how to continue with the ibgib. renew, create derivative, others...hmmm
            } else {
                // default to random
                console.warn(`${lc} (UNEXPECTED) shouldn't get here? chooseFromTypes for stimulationType defaulting to choose from any known type. (W: 06db10c547ed43a5b5052c9a00d0db3f)`);
                chooseFromTypes = Object.values(StimulationType);
            }
            if (logalot) { console.log(`${lc} chooseFromTypes: ${chooseFromTypes} (I: fe59e35afeb44a1a971c5a4bdbc38bbc)`); }

            let stimulationType = pickRandom({ x: chooseFromTypes });
            if (logalot) { console.log(`${lc} stimulationType (${stimulationType}) chosen, having prevStimulations.length (${prevStimulations.length}) (I: 55cc26ddd0d6480994dfeb3ea108a75d)`); }

            const stimulatorToString = (stimulator: Stimulator) => { return `${stimulator.name} (${stimulator.version})`; };

            const stimulatorsPool = this.subStimulators.filter(x => x.types.includes(stimulationType))
            if (logalot) { console.log(`${lc} stimulatorsPool: ${stimulatorsPool.map(x => stimulatorToString(x)).join(', ')} (I: b941c6b811e24bed9496455f41880292)`); }

            const resStimulator = pickRandom({ x: stimulatorsPool });
            if (logalot) { console.log(`${lc} resStimulator: ${stimulatorToString(resStimulator)} (I: 62a7507c1eb34d618366835c8eefd6fa)`); }

            debugger;
            return resStimulator;
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}
