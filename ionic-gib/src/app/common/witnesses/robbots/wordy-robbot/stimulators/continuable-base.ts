/**
 * stimulators
*/

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../constants';
import { StimulatorBase } from "./stimulator-base";
import { pickRandom } from '../../../../helper/utils';
import {
    StimulateArgs, Stimulation, StimulationScope, StimulationTarget, StimulationType, Stimulator
} from '../types';
import { getTargets } from '../helper';
import { Lex, LexData } from 'src/app/common/helper/lex';


const logalot = c.GLOBAL_LOG_A_LOT || true;


/**
 * Some additional plumbing for those stimulators that do multi-step stimulation
 * sagas.
 */
export abstract class ContinuableStimulatorBase extends StimulatorBase {
    protected lc: string = `[${ContinuableStimulatorBase.name}]`;

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

            let { ibGibs, prevStimulations, stimulationType, textInfo, semanticInfo } = args;

            const prevStimulation = prevStimulations.at(-1);

            const isContinuation = prevStimulation?.expectsResponse &&
                prevStimulation.stimulatorName === this.name &&
                prevStimulation.stimulatorVersion === this.version;

            if (isContinuation) {
                return this.getStimulationImpl_Continuation({ args, targets, prevStimulation });
            } else {
                return this.getStimulationImpl_Fresh({ args, targets });
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected abstract getStimulationImpl_Fresh({
        args,
        targets,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
    }): Promise<Stimulation>;
    protected abstract getStimulationImpl_Continuation({
        args,
        targets,
        prevStimulation,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
        prevStimulation: Stimulation,
    }): Promise<Stimulation>;
}