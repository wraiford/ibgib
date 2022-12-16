/**
 * stimulators
*/

import { Stimulator } from '.././types';
import { Stimulator_Read, Stimulator_ReadFirstLines } from './read';

export const WORDY_STIMULATORS: Stimulator[] = [
    new Stimulator_Read(),
    new Stimulator_ReadFirstLines(),
];
