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

            let { prevStimulations, } = args;
            debugger;

            const mostRecentStimulation = prevStimulations.at(-1);

            const thisIsMostRecentStimulatorMeta = mostRecentStimulation?.expectsResponse &&
                mostRecentStimulation.stimulatorName === this.name &&
                mostRecentStimulation.stimulatorVersion === this.version;

            const thisIsMostRecentStimulatorSub = mostRecentStimulation?.subStimulation.expectsResponse &&
                mostRecentStimulation.subStimulation.stimulatorName === this.name &&
                mostRecentStimulation.subStimulation.stimulatorVersion === this.version;


            const isContinuation = thisIsMostRecentStimulatorMeta || thisIsMostRecentStimulatorSub;

            if (isContinuation) {
                return this.getStimulationImpl_Continuation({ args, targets, mostRecentStimulation });
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
        mostRecentStimulation,
    }: {
        args: StimulateArgs
        targets: StimulationTarget[],
        mostRecentStimulation: Stimulation,
    }): Promise<Stimulation>;

}
