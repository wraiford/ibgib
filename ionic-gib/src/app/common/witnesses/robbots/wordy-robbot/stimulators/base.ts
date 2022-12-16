
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
import { Lex, LexData } from 'src/app/common/helper/lex';


const logalot = c.GLOBAL_LOG_A_LOT || true;


/**
 * Base class with some plumbing for a stimulator, whose job is to
 * stimulate ibgibs in a robbot.
 *
 * This maybe should be a witness?
 */
export abstract class StimulatorBase implements Stimulator {
    protected lc: string = `[${StimulatorBase.name}]`;

    _initialized: Promise<void>;
    get initialized(): Promise<void> { return this._initialized; }

    _instanceId: string;
    get instanceId(): string { return this._instanceId; }

    get name(): string { return this.getName(); }
    get version(): string { return this.getVersion(); }
    get types(): StimulationType[] { return this.getTypes(); }

    _lex: Lex;
    /**
     * Each stimulator has its own lex data that it will use in generating the
     * `stimulation.commentText`.
     */
    protected get lex(): Lex { return this._lex; }

    constructor() {
        this._initialized = this.initialize(); // spins off!
    }

    /**
     * idempotent initializing function, to be called in the constructor.
     */
    async initialize(): Promise<void> {
        // idempotent ready initializer
        // if (this._initialized) { return this._initialized; }

        await this.initialize_lex();

        return new Promise(resolve => {
            const delayMs = Math.ceil(Math.random() * 5_000);
            setTimeout(async () => {
                this._instanceId = (await h.getUUID()).slice(0, 8);
                resolve();
            }, delayMs);
        });
    }

    /**
     * convenience method to grab the lex data used in the stimulator's lex
     * object.
     */
    protected abstract getLexData(): Promise<LexData>;

    /**
     * initializes this._lex with lex data from {@link getLexData}.
     */
    protected async initialize_lex(): Promise<void> {
        const lc = `${this.lc}[${this.initialize_lex.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: b53b3532d1cc4a9db1da6f97adfc6b5c)`); }

            const lexData = await this.getLexData();
            this._lex = new Lex<any>(lexData, {
                defaultPropsMode: 'props',
                defaultKeywordMode: 'all',
                defaultLineConcat: 'paragraph', // outgoing robbot defaults to multiple paragraphs.
            });
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
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
