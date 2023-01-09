
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
    ];

    // protected async getSubStimulator({
    //     mostRecentStimulation,
    // }: {
    //     mostRecentStimulation: Stimulation,
    // }): Promise<Stimulator> {
    //     const lc = `${this.lc}[${this.getSubStimulator.name}]`;
    //     try {
    //         if (logalot) { console.log(`${lc} starting... (I: 92b1376b8a87fce975ae4e544036b722)`); }

    //         this.subStimulators.filter(x => x.name === mostRecentStimulation.stimulatorName);

    //         switch (mostRecentStimulation.stimulatorName) {
    //             case Stimulator_ReadFirstLines.name:
    //                 break;

    //             default:
    //                 throw new Error(`unknown stimulatorName: ${mostRecentStimulation.stimulatorName} (E: 22f859c4c6221bbd564cce1bd45b6922)`);
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
            if (logalot) { console.log(`${lc} starting... (I: 9e849b937fbf5b053561f3953113a522)`); }

            // let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            debugger;

            // always start skimming via the first lines
            const stimulator = this.subStimulators.filter(x => x.name === Stimulator_ReadFirstLines.name)[0];
            const subStimulation = await stimulator.getStimulation(args);

            const resStimulation: Stimulation = {
                stimulatorName: this.getName(),
                stimulationMetaType: 'elevating',
                targets,
                isComplete: false,
                stimulationType: subStimulation.stimulationType,
                actualTimestampUTC: subStimulation.actualTimestampUTC,
                scheduledTimestampUTC: subStimulation.scheduledTimestampUTC,
                nextScheduledTimestampUTC: subStimulation.nextScheduledTimestampUTC,
                commentText: subStimulation.commentText,
                expectsResponse: subStimulation.expectsResponse,
                expectedTexts: subStimulation.expectedTexts,
                stimulationScope: subStimulation.stimulationScope,
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
            if (logalot) { console.log(`${lc} starting... (I: 8c958aa03b674d9c8920e178a7d4adb7)`); }

            let { ibGibs, prevStimulations, textInfo, semanticInfo } = args;

            debugger;

            throw new Error(`not impl (E: 4948296d208e56903db84faddab79923)`);

            // if (mostRecentStimulation.isComplete) {
            //     // sub stimulator completed its stimulation
            // } else {
            //     // sub stimulator is ready for the next stimulation
            // }
            // // in the future, if these get broken out we would be testing/including
            // // authentication stuff here.
            // this.subStimulators.filter(x => x.name === mostRecentStimulation.stimulatorName)

            // // in accordance with "elevated stimulations", we want to start out
            // // small and grow bigger as we go. So first echo just single words
            // // (tf/idf-ish), and then entire lines.


            // const stimulationScope = StimulationScope.word;

            // // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            // const srcText = ibGibs.map(x => x.data?.text).join('\n\n');

            // // get the echo text from our local lex.
            // // todo: vary text for echo via property isFirst or something, so we can say "for starters, echo over this..."
            // const speech = this.lex.get(EchoSemanticId.echo, {
            //     vars: { text: srcText }
            // });

            // const resStimulation: Stimulation = {
            //     stimulationType: ,
            //     targets,
            //     commentText: speech.text,
            //     stimulationScope,
            //     stimulatorName: this.getName(),
            //     isComplete: true,
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
