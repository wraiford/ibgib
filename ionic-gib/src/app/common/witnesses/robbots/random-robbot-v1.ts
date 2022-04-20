import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, ROOT, } from 'ts-gib/dist/V1';

import * as c from '../../constants';
import { RobbotBase_V1 } from './robbot-base-v1';
// import { getFnAlert } from '../../helper'; // refactoring to not use index
import { RobbotData_V1, RobbotOutputMode, RobbotRel8ns_V1 } from '../../types/robbot';
import { getFnAlert } from '../../helper/prompt-functions';
import { FormItemInfo, DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { getRegExp, patchObject } from '../../helper/utils';

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
 */
export class RandomRobbot_V1_Factory
    extends DynamicFormFactoryBase<RandomRobbot_V1> {
    protected lc: string = `[${RandomRobbot_V1_Factory.name}]`;

    getInjectionName(): string { return RandomRobbot_V1.name; }

    witnessToForm({ witness }: { witness: RandomRobbot_V1; }): Promise<DynamicForm> {
        const lc = `${this.lc}[${this.witnessToForm.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let {data} = witness;
            let form: DynamicForm = {
                name: 'form',
                children: [
                    {
                        // witness.data.allowPrimitiveArgs
                        name: "allowPrimitiveArgs",
                        description: "Technical setting on if the robbot accepts primitive incoming ibgibs",
                        label: "Allow Primitive Args",
                        required: true,
                        dataType: 'toggle',
                        value: data.allowPrimitiveArgs ?? false,
                        readonly: true,
                    },
                    {
                        // witness.data.catchAllErrors
                        name: "catchAllErrors",
                        description: "Technical setting on what the robbot does when it encounters an internal error.",
                        label: "Catch All Errors",
                        required: true,
                        dataType: 'toggle',
                        value: data.catchAllErrors ?? false,
                        readonly: true,
                    },
                    {
                        // witness.data.classname
                        name: "classname",
                        description: "This is the robbot's class in computer code.",
                        label: "Classname",
                        regexp: getRegExp({min: 1, max: 128, noSpaces: true}),
                        regexpSource: getRegExp({min: 1, max: 128, noSpaces: true}).source,
                        required: true,
                        dataType: 'text',
                        value: RandomRobbot_V1.name,
                        readonly: true,
                    },
                    {
                        // witness.data.name
                        name: "name",
                        description: "A robbot's name. Doesn't have to be unique, no spaces, up to 32 alphanumerics/underscores in length.",
                        label: "Name",
                        placeholder: `e.g. "bob_the_cool_robbot"`,
                        regexp: getRegExp({min: 1, max: 32, noSpaces: true}),
                        regexpSource: getRegExp({min: 1, max: 32, noSpaces: true}).source,
                        required: true,
                        dataType: 'text',
                        value: data.name,
                    },
                    {
                        // witness.data.description
                        name: "description",
                        description: `Description/notes for this robbot. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
                        label: "Description",
                        placeholder: `Describe these robbot settings here...`,
                        regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
                        regexpSource: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}).source,
                        dataType: 'textarea',
                        value: data.description,
                    },
                    {
                        // witness.data.outputMode
                        name: "outputMode",
                        description: `Technical setting which proscribes how the robbot outputs its beliefs.`,
                        label: "Output Mode",
                        regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
                        regexpSource: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}).source,
                        dataType: 'checkbox',
                        selectOptions: [
                            RobbotOutputMode.context,
                            RobbotOutputMode.subcontext,
                        ],
                        value: data.outputMode,
                    },
                    {
                        // witness.data.outputPrefix
                        name: "outputPrefix",
                        description: `Technical setting that sets a prefix for all text output of the robbot.`,
                        label: "Output Prefix",
                        regexp: getRegExp({min: 0, max: 256, chars: c.SAFE_SPECIAL_CHARS}),
                        regexpSource: getRegExp({min: 0, max: 256, chars: c.SAFE_SPECIAL_CHARS}).source,
                        dataType: 'textarea',
                        value: data.outputPrefix,
                    },
                    {
                        // witness.data.outputSuffix
                        name: "outputSuffix",
                        description: `Technical setting that sets a suffix for all text output of the robbot. (like a signature)`,
                        label: "Output Suffix",
                        regexp: getRegExp({min: 0, max: 256, chars: c.SAFE_SPECIAL_CHARS}),
                        regexpSource: getRegExp({min: 0, max: 256, chars: c.SAFE_SPECIAL_CHARS}).source,
                        dataType: 'textarea',
                        value: data.outputSuffix,
                    },
                    {
                        // witness.data.persistOptsAndResultIbGibs
                        name: "persistOptsAndResultIbGibs",
                        description: "Technical setting on if the robbot maintains an audit trail of all of its inputs/outputs.",
                        label: "Persist Opts and Result IbGibs",
                        dataType: 'toggle',
                        value: data.persistOptsAndResultIbGibs ?? false,
                        readonly: true,
                    },
                    {
                        // witness.data.trace
                        name: "trace",
                        description: "Technical setting on if the robbot's activity should be traced (logged to the console).",
                        label: "Trace",
                        dataType: 'toggle',
                        value: data.trace ?? false,
                        readonly: true,
                    },
                    {
                        // witness.data.uuid
                        name: "uuid",
                        description: "Unique(ish) id of the robbot.",
                        label: "UUID",
                        dataType: 'text',
                        value: data.uuid,
                        readonly: true,
                    },
                    {
                        // witness.data.version
                        name: "version",
                        description: "Technical setting indicating the version of the robbot.",
                        label: "Version",
                        dataType: 'text',
                        value: data.version,
                        readonly: true,
                    },
                ],
            };
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
