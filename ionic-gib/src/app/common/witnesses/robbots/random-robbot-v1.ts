import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, ROOT, } from 'ts-gib/dist/V1';

import * as c from '../../constants';
import { RobbotBase_V1 } from './robbot-base-v1';
// import { getFnAlert } from '../../helper'; // refactoring to not use index
import { RobbotData_V1, RobbotFormBuilder, RobbotOutputMode, RobbotRel8ns_V1 } from '../../types/robbot';
import { getFnAlert } from '../../helper/prompt-functions';
import { FormItemInfo, DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { getRegExp, patchObject } from '../../helper/utils';
import { WitnessFormBuilder } from '../../helper/witness';
import { Injectable } from '@angular/core';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export const DEFAULT_UUID_RANDOM_ROBBOT = undefined;
export const DEFAULT_NAME_RANDOM_ROBBOT = 'Randie';
export const DEFAULT_DESCRIPTION_RANDOM_ROBBOT = 'Randie spouts out a random ibgib that he is aware of.';


export interface RandomRobbotData_V1 extends RobbotData_V1 {

}


export interface RandomRobbotRel8ns_V1 extends RobbotRel8ns_V1 {

}

/**
 *
 */
export class RandomRobbot_V1 extends RobbotBase_V1 {
    protected lc: string = `${super.lc}[${RandomRobbot_V1.name}]`;

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
 * Default data values for a random robbot.
 *
 * If you change this, please bump the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
const DEFAULT_RANDOM_ROBBOT_DATA_V1: RandomRobbotData_V1 = {
    version: '1',
    uuid: DEFAULT_UUID_RANDOM_ROBBOT,
    name: DEFAULT_NAME_RANDOM_ROBBOT,
    description: DEFAULT_DESCRIPTION_RANDOM_ROBBOT,
    classname: RandomRobbot_V1.name,

    // tagOutput: false,

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}

/**
 * factory for random robbot.
 *
 * @see {@link DynamicFormFactoryBase}
 */
@Injectable({providedIn: 'root'})
export class RandomRobbot_V1_Factory
    extends DynamicFormFactoryBase<RandomRobbot_V1> {
    protected lc: string = `[${RandomRobbot_V1_Factory.name}]`;

    getInjectionName(): string { return RandomRobbot_V1.name; }

    witnessToForm({ witness }: { witness: RandomRobbot_V1; }): Promise<DynamicForm> {
        const lc = `${this.lc}[${this.witnessToForm.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let {data} = witness;
            // We do the RobbotFormBuilder specific functions first, because of
            // type inference in TS
            let form = new RobbotFormBuilder()
                .with<RobbotFormBuilder>()
                .outputMode({of: data.outputMode})
                .outputPrefix({of: data.outputPrefix})
                .outputSuffix({of: data.outputSuffix})
                .and<WitnessFormBuilder>()
                .name({of: data.name, required: true})
                .description({of: data.description})
                .classname({of: data.classname})
                .commonWitnessFields({data})
                .outputForm({
                    formName: 'form',
                    label: 'Random Robbot',
                });
            return Promise.resolve(form);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async formToWitness({ form }: { form: DynamicForm; }): Promise<RandomRobbot_V1> {
        let robbot = new RandomRobbot_V1(null, null);
        let data: any = {};
        this.patchDataFromItems({data, items: form.children, pathDelimiter: c.DEFAULT_DATA_PATH_DELIMITER});
        robbot.data = data;
        return robbot;
    }

}
