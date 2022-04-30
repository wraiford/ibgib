import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, ROOT, Factory_V1 as factory, Rel8n } from 'ts-gib/dist/V1';

import * as c from '../../constants';
import { RobbotBase_V1 } from './robbot-base-v1';
// import { getFnAlert } from '../../helper'; // refactoring to not use index
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
    // RobbotOutputMode,
} from '../../types/robbot';
import { getFnAlert } from '../../helper/prompt-functions';
import { FormItemInfo, DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { getRegExp, patchObject, getIdPool } from '../../helper/utils';
import { WitnessFormBuilder } from '../../helper/witness';
import { getRobbotIb, RobbotFormBuilder } from '../../helper/robbot';
import { TransformResult } from 'ts-gib';


const logalot = c.GLOBAL_LOG_A_LOT || false;

export const DEFAULT_UUID_RANDOM_ROBBOT = undefined;
export const DEFAULT_NAME_RANDOM_ROBBOT = 'Randie';
export const DEFAULT_DESCRIPTION_RANDOM_ROBBOT =
    `Randie chooses a random ibgib from those he's seen and says it.`;


export interface RandomRobbotData_V1 extends RobbotData_V1 {

}


export interface RandomRobbotRel8ns_V1 extends RobbotRel8ns_V1 {

}

/**
 *
 */
export class RandomRobbot_V1 extends RobbotBase_V1 {
    protected lc: string = `[${RandomRobbot_V1.name}]`;

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
            if (!this.rel8ns) { this.rel8ns = h.clone(DEFAULT_RANDOM_ROBBOT_REL8NS_V1); }
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
    outputPrefix: '👀: ',
    outputSuffix: '-🤖',

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}
const DEFAULT_RANDOM_ROBBOT_REL8NS_V1: RandomRobbotRel8ns_V1 = undefined;

/**
 * factory for random robbot.
 *
 * @see {@link DynamicFormFactoryBase}
 */
@Injectable({providedIn: 'root'})
export class RandomRobbot_V1_Factory
    extends DynamicFormFactoryBase<RandomRobbotData_V1, RandomRobbotRel8ns_V1, RandomRobbot_V1> {

    protected lc: string = `[${RandomRobbot_V1_Factory.name}]`;

    getInjectionName(): string { return RandomRobbot_V1.name; }

    async newUp({
        data,
        rel8ns,
    }: {
        data?: RandomRobbotData_V1,
        rel8ns?: RandomRobbotRel8ns_V1,
    }): Promise<TransformResult<RandomRobbot_V1>> {
        const lc = `${this.lc}[${this.newUp.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            data = data ?? h.clone(DEFAULT_RANDOM_ROBBOT_DATA_V1);
            rel8ns = rel8ns ?? DEFAULT_RANDOM_ROBBOT_REL8NS_V1 ? h.clone(DEFAULT_RANDOM_ROBBOT_REL8NS_V1) : undefined;
            data.uuid = data.uuid ?? await h.getUUID();
            let {classname} = data;

            const ib = getRobbotIb({robbotData: data, classname});

            const resRobbot = <TransformResult<RobbotIbGib_V1>>await factory.firstGen({
                ib,
                parentIbGib: factory.primitive({ib: `robbot ${classname}`}),
                data: data,
                rel8ns,
                dna: true,
                linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
                nCounter: true,
                tjp: { timestamp: true },
            });

            // replace the newIbGib which is just ib,gib,data,rel8ns with loaded
            // witness class
            const robbotDto = resRobbot.newIbGib;
            let robbotIbGib = new RandomRobbot_V1(null, null);
            robbotIbGib.loadDto(robbotDto);
            resRobbot.newIbGib = robbotIbGib;
            if (logalot) { console.log(`${lc} robbotDto: ${h.pretty(robbotDto)} (I: af9d16de46d6e6d75b2a21312d72d922)`); }

            return <TransformResult<RandomRobbot_V1>>resRobbot;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async witnessToForm({ witness }: { witness: RandomRobbot_V1; }): Promise<DynamicForm> {
        const lc = `${this.lc}[${this.witnessToForm.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let {data} = witness;
            // We do the RobbotFormBuilder specific functions first, because of
            if (logalot) { console.log(`${lc} data: ${h.pretty(data)} (I: d4dc7619a4da932badbd7738bb4ebd22)`); }
            const idPool = await getIdPool({n: 100});
            // type inference in TS! eesh...
            let form = new RobbotFormBuilder()
                .with({idPool})
                .name({of: data.name, required: true})
                .description({of: data.description})
                .and<RobbotFormBuilder>()
                .outputPrefix({of: data.outputPrefix})
                .outputSuffix({of: data.outputSuffix})
                // .outputMode({of: data.outputMode})
                .and<WitnessFormBuilder>()
                .uuid({of: data.uuid, required: true})
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

    async formToWitness({ form }: { form: DynamicForm; }): Promise<TransformResult<RandomRobbot_V1>> {
        // let robbot = new RandomRobbot_V1(null, null);
        let data: RobbotData_V1 = h.clone(DEFAULT_RANDOM_ROBBOT_DATA_V1);
        this.patchDataFromItems({data, items: form.items, pathDelimiter: c.DEFAULT_DATA_PATH_DELIMITER});
        let resRobbot = await this.newUp({data});
        return resRobbot;
    }

}
