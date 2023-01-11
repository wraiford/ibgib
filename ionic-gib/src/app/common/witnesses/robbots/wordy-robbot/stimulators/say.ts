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
import { getTargets } from '.././helper';
import { StimulatorBase } from './stimulator-base';
import { LexData, PropsData } from '../../../../../common/helper/lex';
import { SemanticId, toLexDatums_Semantics } from 'src/app/common/types/robbot';
import { pickRandom } from '../../../../../common/helper/utils';


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


export class Stimulator_Say extends StimulatorBase {
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
                            `$text`,
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

            const stimulationScope = StimulationScope.all;

            // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            const srcText = ibGibs.map(x => x.data?.text).join('\n\n');

            // get the say text from our local lex.
            // todo: vary text for say via property isFirst or something, so we can say "for starters, read/scan/skim over this..."
            const speech = this.lex.get(SaySemanticId.say, {
                vars: { text: srcText }
            });

            const resStimulation: Stimulation = {
                stimulationType: 'say',
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
