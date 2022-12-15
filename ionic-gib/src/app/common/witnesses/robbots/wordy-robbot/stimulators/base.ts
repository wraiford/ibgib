
/**
 * stimulators
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


const logalot = c.GLOBAL_LOG_A_LOT || true;


/**
 * Base class with some plumbing for a stimulator, whose job is to
 * stimulate ibgibs in a robbot.
 *
 * This maybe should be a witness?
 */
export abstract class StimulatorBase implements Stimulator {
    protected lc: string = `[${StimulatorBase.name}]`;

    #initialized: Promise<void>;
    get initialized(): Promise<void> { return this.#initialized; }

    #instanceId: string;
    get instanceId(): string { return this.#instanceId; }

    get name(): string { return this.getName(); }
    get version(): string { return this.getVersion(); }
    get types(): StimulationType[] { return this.getTypes(); }

    constructor() {
        this.#initialized = this.initialize(); // spins off!
    }

    /**
     * idempotent initializing function, to be called in the constructor.
     */
    async initialize(): Promise<void> {
        // idempotent ready initializer
        if (this.#initialized) { return this.#initialized; }

        return new Promise(resolve => {
            const delayMs = Math.ceil(Math.random() * 5_000);
            setTimeout(async () => {
                this.#instanceId = (await h.getUUID()).slice(0, 8);
                resolve();
            }, delayMs);
        });
    }

    /**
     * Name that will be associated the stimulator of the stimulation.
     */
    protected abstract getName(): string;
    /**
     * Version that will be associated the stimulator of the stimulation.
     */
    protected abstract getVersion(): string;
    protected abstract getTypes(): StimulationType[];

    async canStimulate(args: StimulateArgs): Promise<boolean> {
        const lc = `${this.lc}[${this.canStimulate.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: faf0e8d93441462404178f9c74ffde22)`); }
            await this.initialized;
            return this.canStimulateImpl(args);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    protected abstract canStimulateImpl(args: StimulateArgs): Promise<boolean>;

    async getStimulation(args: StimulateArgs): Promise<Stimulation> {
        const lc = `${this.lc}[${this.getStimulation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: d9d779530cb797eafb94bd518ea01522)`); }

            // wait until ready
            await this.initialized;

            // prepare with additional plumbing for convenience
            const targets = getTargets({ ibGibs: args.ibGibs });

            // execute the concrete implementation in the implementing class
            return await this.getStimulationImpl({ args, targets });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    /**
     * implementation function, with additional plumbing args for convenience.
     */
    protected abstract getStimulationImpl(implArgs: { args: StimulateArgs, targets: StimulationTarget[], }): Promise<Stimulation>;

    /**
     * default implementation naively bases the scope on the textInfo based
     * strictly on the lengths of the textInfo paragraphs, lines, words, etc.
     *
     * override this to get more customized scope production.
     */
    protected async getStimulationScope({ textInfo }: StimulateArgs): Promise<StimulationScope> {
        const lc = `${this.lc}[${this.getStimulationScope.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: a597e7c71b5df4638bdd38ef2d89a922)`); }

            let stimulationScope: StimulationScope;

            if (textInfo.paragraphs?.length > 15) {
                // has multiple paragraphs
                stimulationScope = 'paragraph';
            } else if (textInfo.lines?.length > 1) {
                // has multiple lines
                stimulationScope = 'line';
            } else if (textInfo.wordCount > 4) {
                // has a decent length phrase/sentence
                stimulationScope = 'word';
            } else {
                // has only a few words
                stimulationScope = pickRandom({ x: ['all', 'letter'] });
            }

            return stimulationScope;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}
