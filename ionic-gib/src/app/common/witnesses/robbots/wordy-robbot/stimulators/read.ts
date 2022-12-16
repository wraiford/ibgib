/**
 * read stimulator
*/

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../../common/constants';
import {
    StimulateArgs, Stimulation, StimulationScope, StimulationTarget, StimulationType, Stimulator
} from '.././types';
import { getTargets } from '.././helper';
import { StimulatorBase } from './base';
import { LexData, PropsData } from '../../../../../common/helper/lex';
import { SemanticId, toLexDatums_Semantics } from 'src/app/common/types/robbot';


const logalot = c.GLOBAL_LOG_A_LOT || true;


export type ReadSemanticId =
    "semantic_read" |
    SemanticId;
export const ReadSemanticId = {
    ...SemanticId,
    read: 'semantic_read' as ReadSemanticId,
}

interface LexPropsData extends PropsData {

}

const LEX_DATA: LexData<LexPropsData> = {
    [ReadSemanticId.read]: [
        {
            texts: [
                `Read over this:`,
                ``,
                `$text`,
            ],
        }
    ],
};

export class Stimulator_Read extends StimulatorBase {
    protected lc: string = `[${Stimulator_Read.name}]`;

    constructor() {
        super();
    }

    protected async getLexData(): Promise<LexData<PropsData>> {
        return LEX_DATA;
    }

    protected getName(): string { return Stimulator_Read.name; }
    protected getVersion(): string { return "v1"; }
    protected getTypes(): StimulationType[] { return [StimulationType.read]; }

    protected canStimulateImpl(args: StimulateArgs): Promise<boolean> {
        // can always read
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

            let { ibGibs, prevStimulations, stimulationType, textInfo } = args;

            // const stimulationScope = await this.getStimulationScope(args);
            // just concat the incoming ibGib(s). Right now, there is only one ibGib anyway...
            const srcText = ibGibs.map(x => x.data?.text).join('\n\n');

            // get the read text from our local lex.
            // todo: vary text for read via property isFirst or something, so we can say "for starters, read/scan/skim over this..."
            const speech = this.lex.get(ReadSemanticId.read, {
                vars: { text: srcText }
            });

            const resStimulation: Stimulation = {
                stimulationType,
                targets,
                commentText: speech.text,
                stimulationScope: 'all',
                stimulatorName: this.getName(),
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
