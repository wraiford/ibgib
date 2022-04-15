import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, ROOT, } from 'ts-gib/dist/V1';

import * as c from '../../constants';
import { RobbotBase_V1 } from './robbot-base-v1';
// import { getFnAlert } from '../../helper'; // refactoring to not use index
import { RobbotData_V1, RobbotRel8ns_V1 } from '../../types/robbot';
import { getFnAlert } from '../../helper/prompt-functions';
import { FormItemInfo } from 'src/app/ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from 'src/app/ibgib-forms/bases/dynamic-form-factory-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export const DEFAULT_UUID_RANDOM_ROBBOT = undefined;
export const DEFAULT_NAME_RANDOM_ROBBOT = 'Randie';
export const DEFAULT_DESCRIPTION_RANDOM_ROBBOT = 'Randie';


export interface RandomRobbotData_V1 extends RobbotData_V1 {

}

/**
 * Used in bootstrapping.
 *
 * If you change this, please bumpt the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
const DEFAULT_RANDOM_ROBBOT_DATA_V1: RandomRobbotData_V1 = {
    version: '5',
    uuid: DEFAULT_UUID_RANDOM_ROBBOT,
    name: DEFAULT_NAME_RANDOM_ROBBOT,
    description: DEFAULT_DESCRIPTION_RANDOM_ROBBOT,

    tagOutput: false,

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}

export interface RandomRobbotRel8ns_V1 extends RobbotRel8ns_V1 {

}

/**
 *
 */
export class RandomRobbot_V1 extends RobbotBase_V1 {

    /**
     *
     */
    constructor(initialData?: RobbotData_V1, initialRel8ns?: RobbotRel8ns_V1) {
        super(initialData, initialRel8ns);
        const lc = `${this.lc}[ctor]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            this.initialize();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Initializes to default space values.
     */
    protected initialize(): void {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!this.data) { this.data = h.clone(DEFAULT_RANDOM_ROBBOT_DATA_V1); }

            // this.ib = getSpaceIb({space: this, classname: IonicSpace_V1.name});
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async witnessImpl(arg: IbGib_V1): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.witnessImpl.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            await getFnAlert()({title: 'yo', msg: h.pretty(arg)});
            // need to add handling space/robbot in the base class

            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async validateThis(): Promise<string[]> {
        const lc = `${this.lc}[${this.validateThis.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            const errors = [
                ...await super.validateThis(),
            ];
            const { data } = this;
            if (data) {
                // data.outputMode
            // } else {
            //     errors.push(`data required`); // checked in super validation
            }
            return errors;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}

/**
 * The idea is that any witness can be injected via this factory provider.
 *
 * So when you create a witness that you want to be able to instantiate via
 * just metadata, you also provide an accompanying factory that knows
 * how to map from a
 *   * witness -> form data (to generate dynamic forms)
 *   * form data -> witness (to instantiate witness from data)
 *
 */
export class RandomRobbot_V1_Factory
    extends DynamicFormFactoryBase<RandomRobbot_V1> {

    getInjectionName(): string { return RandomRobbot_V1.name; }

    getFormInfos({ model }: { model: RandomRobbot_V1; }): Promise<FormItemInfo[]> {
        throw new Error('Method not implemented.');
    }

    async loadFromFormInfos({ formInfos }: { formInfos: FormItemInfo[]; }): Promise<RandomRobbot_V1> {
        let robbot = new RandomRobbot_V1(null, null);
        return robbot;
    }

    // protected lc: string = `[${WitnessBase_V1_Factory.name}]`;

    // abstract getFormInfos({witness}: {witness: TWitness}): Promise<FormItemInfo[]>;
    // {
    //     const lc = `${this.lc}[${this.getFormInfos.name}]`;
    //     try {
    //         if (logalot) { console.log(`${lc} starting...`); }
    //         return [];
    //     } catch (error) {
    //         console.error(`${lc} ${error.message}`);
    //         throw error;
    //     } finally {
    //         if (logalot) { console.log(`${lc} complete.`); }
    //     }
    // }

    // abstract loadFromFormInfos({formInfos}: {formInfos: FormItemInfo[]}): Promise<TWitness>
    // {
    //     const lc = `${this.lc}[${this.loadFromFormInfos.name}]`;
    //     try {
    //         if (logalot) { console.log(`${lc} starting...`); }
    //         throw new Error()
    //     } catch (error) {
    //         console.error(`${lc} ${error.message}`);
    //         throw error;
    //     } finally {
    //         if (logalot) { console.log(`${lc} complete.`); }
    //     }
    // }
}