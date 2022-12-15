/**
 * read stimulator
*/

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../../common/constants';
import { pickRandom } from '../../../../../common/helper/utils';
import {
    StimulateArgs, Stimulation, StimulationScope, StimulationTarget, StimulationType, Stimulator
} from '.././types';
import { getTargets } from '.././helper';
import { StimulatorBase } from './base';


const logalot = c.GLOBAL_LOG_A_LOT || true;


export class Stimulator_Read extends StimulatorBase {

    protected lc: string = `[${Stimulator_Read.name}]`;

    constructor() {
        super();
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

            const stimulationScope = await this.getStimulationScope(args);

            const resStimulation: Stimulation = {
                stimulationType,
                targets,
                commentText: '',
                stimulationScope,
                stimulatorName: this.getName(),
            }

            return resStimulation;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}
