/**
 * sitmulators
*/

import { IbGibAddr } from 'ts-gib';
import * as c from '../../../../common/constants';
import { GetStimulationDetailsOptions, StimulationScope, StimulationType, Stimulator } from './types';

export class Stimulator_Read implements Stimulator {

    type: StimulationType;

    get applicableScopes(): StimulationScope[] {
        return ['paragraph', 'line', 'word', 'letter'];
    }

    get hasDetails(): boolean { return false; }

    constructor() { }

    getStimulationDetails({
        ibGib,
        prevStimulations,
        stimulationType,
        textInfo,
    }: GetStimulationDetailsOptions): Promise<any | null> {
        return null;
    }
}

export const WORDY_STIMULATORS: Stimulator[] = [
    new Stimulator_Read(),
];
