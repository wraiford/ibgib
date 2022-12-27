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
import { StimulatorBase } from './stimulator-base';
import { LexData, PropsData } from '../../../../../common/helper/lex';
import { SemanticId, toLexDatums_Semantics } from 'src/app/common/types/robbot';
import { pickRandom } from '../../../../../common/helper/utils';


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


export class Stimulator_Read extends StimulatorBase {
    protected lc: string = `[${Stimulator_Read.name}]`;

    constructor() {
        super();
    }

    _lexData: LexData<LexPropsData>;
    protected async getLexData(): Promise<LexData<PropsData>> {
        if (!this._lexData) {
            this._lexData = {
                [ReadSemanticId.read]: [
                    {
                        texts: [
                            `# read`,
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

            const stimulationScope = StimulationScope.all;

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
                stimulationScope,
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

export class Stimulator_ReadFirstLines extends StimulatorBase {
    protected lc: string = `[${Stimulator_ReadFirstLines.name}]`;

    constructor() {
        super();
    }

    _lexData: LexData<LexPropsData>;
    protected async getLexData(): Promise<LexData<PropsData>> {
        if (!this._lexData) {
            this._lexData = {
                [ReadSemanticId.read]: [
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

    protected getName(): string { return Stimulator_ReadFirstLines.name; }
    protected getVersion(): string { return "v1"; }
    protected getTypes(): StimulationType[] { return [StimulationType.read]; }

    protected async canStimulateImpl(args: StimulateArgs): Promise<boolean> {
        let { ibGibs, prevStimulations, stimulationType, textInfo } = args;
        return textInfo.paragraphs?.length > 2;
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

            // get the read text from our local lex.
            const speech = this.lex.get(ReadSemanticId.read, {
                vars: { text: srcText }
            });

            const resStimulation: Stimulation = {
                stimulationType,
                targets,
                commentText: speech.text,
                stimulationScope,
                stimulatorName: this.getName(),
                expectsResponse: false,
                // isComplete: true,
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
