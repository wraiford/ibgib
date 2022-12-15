import * as h from 'ts-gib/dist/helper';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr } from 'ts-gib';

import * as c from '../../../../common/constants';
import { pickRandom } from '../../../../common/helper/utils';
import {
    StimulateArgs, Stimulation, StimulationScope, StimulationTarget, StimulationType, Stimulator
} from './types';
import { getTjpAddr } from 'src/app/common/helper/ibgib';


const logalot = c.GLOBAL_LOG_A_LOT || true;

export function getTargets({
    ibGibs,
}: {
    ibGibs: IbGib_V1[],
}): StimulationTarget[] {
    const lc = `${getTargets.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: d5833ceed62a8d6f19677d3d7f81ff22)`); }
        let targets: StimulationTarget[] = ibGibs.map(x => {
            const addr = h.getIbGibAddr({ ibGib: x });
            const tjpAddr = getTjpAddr({ ibGib: x });
            const target: StimulationTarget = { "@toStimulate": addr, "@toStimulateTjp": tjpAddr };
            return target;
        });

        return targets;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
