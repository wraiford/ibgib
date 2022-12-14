/**
 * sitmulators
*/

import { IbGibAddr } from 'ts-gib';
import * as c from '../../../../common/constants';

const logalot = c.GLOBAL_LOG_A_LOT || true;

export type StimulationScope =
    'all' | 'paragraph' | 'line' | 'word' | 'letter';
export const StimulationScope = {
    /**
     * the entirety of the ibgib/text.
     */
    'all': 'all' as StimulationScope,
    'paragraph': 'paragraph' as StimulationScope,
    'line': 'line' as StimulationScope,
    'word': 'word' as StimulationScope,
    'letter': 'letter' as StimulationScope,
    // pic
}
/**
 * There are various ways to stimulate an ibgib.
 */
export type StimulationType =
    'read' |
    'type' |
    'blank' |
    'expound'
    ;
export const StimulationType = {
    /**
     * The user is just shown the source ibgib raw and asked to read it.
     */
    'read': 'read' as StimulationType,
    /**
     * The user is asked to type the given unit of type {@link StimulationScope}
     */
    'type': 'type' as StimulationType,
    /**
     * A unit of type {@link StimulationScope} is blanked out.
     *
     * The user is asked to provide the missing blank.
     */
    'blank': 'blank' as StimulationType,
    /**
     * the user has to say something that will be added to the target ibgib.
     * if the user says "skip" or "no" or "no thanks", etc., then it will be
     * skipped.
     */
    'expound': 'expound' as StimulationType,
}
export function getExpectsResponse({ stimulationType }: { stimulationType: StimulationType }): boolean {
    const lc = `[${getExpectsResponse.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 416b47d45164ab2194ebbdca893eec22)`); }
        switch (stimulationType) {
            case 'read': return false;
            case 'type': return true;
            case 'blank': return true;
            case 'expound': return false;
            default: throw new Error(`unknown stimulationType: ${stimulationType} (E: 08200b453d891734bf5fd76cb0f98522)`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
export interface StimulationTarget {
    /**
     * Soft link to the tjp address (timeline) of the ibgib being stimulated.
     */
    '@toStimulateTjp': IbGibAddr;
    /**
     * Soft link to punctiliar address of the exact ibgib stimulated
     */
    '@toStimulate'?: IbGibAddr;
}

export interface Stimulator {
    type: StimulationType;
    scope: StimulationScope;
    /**
     *
     * @returns Stimulation details
     */
    getDetails: (args: any) => any;
}

/**
 * Fundamental shape that describes stimulating ibgibs.
 *
 * In my driving use case, with Wordy Robbot especially, this
 * is for "learning" the material, i.e., creating, nurturing and
 * maintaining brain traces.
 */
export interface Stimulation {
    /**
     * type of stimulation, like is it a fill in the blank or just showing the
     * ibgib.
     * @see {@link StimulationType}
     */
    stimulationType: StimulationType;
    /**
     * The scope of the stimulation, like 'paragraph' or 'line'.
     * @see {@link StimulationScope}
     */
    stimulationScope: StimulationScope;
    /**
     * soft links to target ibgibs being stimulated
     */
    targets: StimulationTarget[];
    /**
     * If true, then this stimulation expects a metric of some sort, like a grade.
     * For starters, this will be entirely self-reported by the user. In the future
     * when we are talking about multiple entities interacting, then this could
     * be provided by one or more third parties.
     */
    expectsFeedback?: boolean;
    /**
     * Addresses of the feedback ibgib(s) if needed/relavent.
     *
     * the ib's should contain the relative metadata information so we don't
     * have to load the full ibgib. e.g. `comment 5^ASDFEW1234` or `comment
     * good^ABC123`, but this should ultimately be up to the handler.
     */
    '@feedbackList'?: IbGibAddr[];
    /**
     * If true, the stimulation expects the user to add an ibgib to the current
     * context ibgib. For starters, this will be a comment ibgib with, e.g.,
     * the blanked out text.
     */
    expectsResponse?: boolean;
    /**
     * When providing at least one response, these are the soft link addresses.
     */
    '@responseList'?: IbGibAddr[];
    /**
     * Indicates that this stimulation is complete and nothing further is
     * expected regarding it.
     *
     * If {@link expectsFeedback} and {@link expectsResponse} are both falsy,
     * then this should be set to true (though ultimately it's the lack of
     * both of those that is directly meaningful).
     */
    isComplete?: boolean;
    /**
     * If we are making a comment ourselves (and not, e.g., just presenting some
     * other ibgib without additional comment), then here is the text for it.
     *
     * This should also be included in the comment.
     */
    commentText: string;
    /**
     * If we are stimulating an ibgib multiple times, this tracks the number of
     * times in a given stimulation sequence.
     */
    consecutiveCount?: number;
    /**
     * If the stimulation requires extra parameters, they should be put here.
     *
     * For example, a blank stimulation will atow include which text was blanked out.
     */
    details?: any;
}
/**
 * We're stimulating the ibgib via blanking out one or more words in the ibgib's
 * text.
 */
export interface BlankDetails {
    /**
     * Text that we've blanked out.
     */
    blankedText: string;
}
