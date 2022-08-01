import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import {
    IbGib_V1, ROOT, Factory_V1 as factory, Rel8n,
    IbGibRel8ns_V1,
} from 'ts-gib/dist/V1';
import { TransformResult } from 'ts-gib';

import * as c from '../../constants';
import {
    AppData_V1, AppRel8ns_V1, AppIbGib_V1,
    AppCmdData, AppCmdIbGib, AppCmdRel8ns, AppCmd,
} from '../../types/app';
import { AppBase_V1 } from './app-base-v1';
import { DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { getIdPool } from '../../helper/utils';
import { WitnessFormBuilder } from '../../helper/witness';
import { getAppIb, AppFormBuilder } from '../../helper/app';
import { DynamicFormBuilder } from '../../helper/form';


const logalot = c.GLOBAL_LOG_A_LOT || false;

export const DEFAULT_UUID_CHAT_APP = undefined;
export const DEFAULT_NAME_CHAT_APP = 'chat_gib';
export const DEFAULT_DESCRIPTION_CHAT_APP =
    `A chat app done ibgib style, enabling infinitely nesting comments, pics and links. It's ibgibs all the way down...`;


export interface ChatAppData_V1 extends AppData_V1 {

}


export interface ChatAppRel8ns_V1 extends AppRel8ns_V1 {

}

/**
 *
 */
export class ChatApp_V1 extends AppBase_V1<
    // in
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // out
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // this
    ChatAppData_V1, ChatAppRel8ns_V1
> {
    protected lc: string = `[${ChatApp_V1.name}]`;

    constructor(initialData?: ChatAppData_V1, initialRel8ns?: ChatAppRel8ns_V1) {
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
            if (!this.data) { this.data = h.clone(DEFAULT_CHAT_APP_DATA_V1); }
            if (!this.rel8ns && DEFAULT_CHAT_APP_REL8NS_V1) {
                this.rel8ns = h.clone(DEFAULT_CHAT_APP_REL8NS_V1);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async doDefault({
        ibGib,
    }: {
        ibGib: IbGib_V1,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doDefault.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented (E: 62217a6f28228a576df094bf237df322)`);
            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * In this app, the ib command looks at given ibGib(s) and remembers
     * it/them (i.e. the app rel8s the ibgibs to itself).
     *
     * @returns ROOT if successful, else throws
     */
    protected async doCmdIb({
        arg,
    }: {
        arg: AppCmdIbGib<IbGib_V1, AppCmdData, AppCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdIb.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented (E: 09ce64dd7939ee2bd3a614ce80138d22)`);
            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * "Speak" one of the memorized ibgibs using the given arg.data.ibGibAddrs[0] as the context
     * ibGib.
     *
     * @returns ROOT if all goes well, otherwise throws an error.
     */
    protected async doCmdGib({
        arg,
    }: {
        arg: AppCmdIbGib<IbGib_V1, AppCmdData, AppCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdGib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            const space = await this.ibgibsSvc.getLocalUserSpace({ lock: true });

            throw new Error(`not implemented yet (E: 2fee227028baa72a660cb5b60f020122)`);
            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }

    }
    protected async doCmdIbgib({
        arg,
    }: {
        arg: AppCmdIbGib<IbGib_V1, AppCmdData, AppCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdIbgib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not implemented yet (E: 425ef954b639e64202fe5fb9fdc94b22)`);
            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }

    }

    protected async validateWitnessArg(arg: AppCmdIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            const errors = await super.validateWitnessArg(arg) ?? [];
            if (!this.ibgibsSvc) {
                errors.push(`this.ibgibsSvc required (E: 2e64390a2e014631b5bcc1c0cc9b80cf)`);
            }
            if ((<any>arg.data).cmd) {
                // perform extra validation for cmds
                if ((arg.ibGibs ?? []).length === 0) {
                    errors.push(`ibGibs required. (E: a21da24eea0049128eeed253aae1218b)`);
                }
            }
            return errors;
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
 * Default data values for a random app.
 *
 * If you change this, please bump the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
export const DEFAULT_CHAT_APP_DATA_V1: ChatAppData_V1 = {
    version: '1',
    uuid: DEFAULT_UUID_CHAT_APP,
    name: DEFAULT_NAME_CHAT_APP,
    description: DEFAULT_DESCRIPTION_CHAT_APP,
    classname: ChatApp_V1.name,

    icon: 'chatbubbles',

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}
const DEFAULT_CHAT_APP_REL8NS_V1: ChatAppRel8ns_V1 = undefined;

/**
 * factory for random app.
 *
 * @see {@link DynamicFormFactoryBase}
 */
@Injectable({ providedIn: 'root' })
export class ChatApp_V1_Factory
    extends DynamicFormFactoryBase<ChatAppData_V1, ChatAppRel8ns_V1, ChatApp_V1> {

    protected lc: string = `[${ChatApp_V1_Factory.name}]`;

    getName(): string { return ChatApp_V1.name; }

    async newUp({
        data,
        rel8ns,
    }: {
        data?: ChatAppData_V1,
        rel8ns?: ChatAppRel8ns_V1,
    }): Promise<TransformResult<ChatApp_V1>> {
        const lc = `${this.lc}[${this.newUp.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            data = data ?? h.clone(DEFAULT_CHAT_APP_DATA_V1);
            rel8ns = rel8ns ?? DEFAULT_CHAT_APP_REL8NS_V1 ? h.clone(DEFAULT_CHAT_APP_REL8NS_V1) : undefined;
            data.uuid = data.uuid ?? await h.getUUID();
            let { classname } = data;

            const ib = getAppIb({ appData: data, classname });

            const resApp = <TransformResult<AppIbGib_V1>>await factory.firstGen({
                ib,
                parentIbGib: factory.primitive({ ib: `app ${classname}` }),
                data: data,
                rel8ns,
                dna: true,
                linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
                nCounter: true,
                tjp: { timestamp: true },
            });

            // replace the newIbGib which is just ib,gib,data,rel8ns with loaded
            // witness class (that has the witness function on it)
            const appDto = resApp.newIbGib;
            let appIbGib = new ChatApp_V1(null, null);
            await appIbGib.loadIbGibDto(appDto);
            resApp.newIbGib = appIbGib;
            if (logalot) { console.log(`${lc} appDto: ${h.pretty(appDto)} (I: af9d16de46d6e6d75b2a21312d72d922)`); }

            return <TransformResult<ChatApp_V1>>resApp;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async witnessToForm({ witness }: { witness: ChatApp_V1; }): Promise<DynamicForm> {
        const lc = `${this.lc}[${this.witnessToForm.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let { data } = witness;
            // We do the AppFormBuilder specific functions first, because of
            if (logalot) { console.log(`${lc} data: ${h.pretty(data)} (I: d4dc7619a4da932badbd7738bb4ebd22)`); }
            const idPool = await getIdPool({ n: 100 });
            // type inference in TS! eesh...
            let form = new AppFormBuilder()
                .with({ idPool })
                .name({ of: data.name, required: true })
                .description({ of: data.description })
                .and<AppFormBuilder>()
                .icon({ of: data.icon, required: true })
                .and<DynamicFormBuilder>()
                .uuid({ of: data.uuid, required: true })
                .classname({ of: data.classname })
                .and<WitnessFormBuilder>()
                .commonWitnessFields({ data })
                .outputForm({
                    formName: 'form',
                    label: 'Chat',
                });
            return Promise.resolve(form);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async formToWitness({ form }: { form: DynamicForm; }): Promise<TransformResult<ChatApp_V1>> {
        // let app = new ChatApp_V1(null, null);
        let data: AppData_V1 = h.clone(DEFAULT_CHAT_APP_DATA_V1);
        this.patchDataFromItems({ data, items: form.items, pathDelimiter: c.DEFAULT_DATA_PATH_DELIMITER });
        let resApp = await this.newUp({ data });
        return resApp;
    }

}