/**
 * stimulators
*/

import { Stimulator } from '.././types';
import { ElevatingStimulator } from './elevating/elevating';

export const WORDY_STIMULATORS: Stimulator[] = [
    new ElevatingStimulator(),
];
