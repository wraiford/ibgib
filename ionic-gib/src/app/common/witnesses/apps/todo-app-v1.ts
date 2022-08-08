import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import {
    IbGib_V1, ROOT, Factory_V1 as factory, Rel8n, IbGibRel8ns_V1,
} from 'ts-gib/dist/V1';
import { TransformResult } from 'ts-gib';

import * as c from '../../constants';
import { AppBase_V1 } from './app-base-v1';
import {
    AppData_V1, AppRel8ns_V1, AppIbGib_V1,
    AppCmdData, AppCmdIbGib, AppCmdRel8ns,
} from '../../types/app';
import { DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { getIdPool } from '../../helper/utils';
import { WitnessFormBuilder } from '../../helper/witness';
import { getAppIb, AppFormBuilder } from '../../helper/app';
import { DynamicFormBuilder } from '../../helper/form';
import { DEFAULT_TODO_APP_DATA_V1, DEFAULT_TODO_APP_REL8NS_V1, TodoAppData_V1, TodoAppRel8ns_V1 } from '../../types/todo-app';


const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 *
 */
export class TodoApp_V1 extends AppBase_V1<
    // in
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // out
    any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
    // this
    TodoAppData_V1, TodoAppRel8ns_V1
> {
    protected lc: string = `[${TodoApp_V1.name}]`;

    constructor(initialData?: TodoAppData_V1, initialRel8ns?: TodoAppRel8ns_V1) {
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
            if (!this.data) { this.data = h.clone(DEFAULT_TODO_APP_DATA_V1); }
            if (!this.rel8ns && DEFAULT_TODO_APP_REL8NS_V1) {
                this.rel8ns = h.clone(DEFAULT_TODO_APP_REL8NS_V1);
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
            throw new Error(`not implemented (E: bd8ce5e2518742c98ae1928cabddab64)`);
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
            throw new Error(`not implemented (E: 7c57ff07b45a4779895eb245590c3de4)`);
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

            throw new Error(`not implemented yet (E: 0f83e488f2774a64b3a905b08d64946e)`);
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
            throw new Error(`not implemented yet (E: b87ad1a62e8c48f1a4860abe3d3789b0)`);
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
                errors.push(`this.ibgibsSvc required (E: aa389a8642e643d78ff0ea777893a3df)`);
            }
            if ((<any>arg.data).cmd) {
                // perform extra validation for cmds
                if ((arg.ibGibs ?? []).length === 0) {
                    errors.push(`ibGibs required. (E: 1ced444edbf745a5828f0a478a5d8d85)`);
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
 * factory for random app.
 *
 * @see {@link DynamicFormFactoryBase}
 */
@Injectable({ providedIn: 'root' })
export class TodoApp_V1_Factory
    extends DynamicFormFactoryBase<TodoAppData_V1, TodoAppRel8ns_V1, TodoApp_V1> {

    protected lc: string = `[${TodoApp_V1_Factory.name}]`;

    getName(): string { return TodoApp_V1.name; }

    async newUp({
        data,
        rel8ns,
    }: {
        data?: TodoAppData_V1,
        rel8ns?: TodoAppRel8ns_V1,
    }): Promise<TransformResult<TodoApp_V1>> {
        const lc = `${this.lc}[${this.newUp.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            data = data ?? h.clone(DEFAULT_TODO_APP_DATA_V1);
            rel8ns = rel8ns ?? DEFAULT_TODO_APP_REL8NS_V1 ? h.clone(DEFAULT_TODO_APP_REL8NS_V1) : undefined;
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
            let appIbGib = new TodoApp_V1(null, null);
            await appIbGib.loadIbGibDto(appDto);
            resApp.newIbGib = appIbGib;
            if (logalot) { console.log(`${lc} appDto: ${h.pretty(appDto)} (I: 0f76e11281684ee0b9b7b719f7065d2a)`); }

            return <TransformResult<TodoApp_V1>>resApp;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async witnessToForm({ witness }: { witness: TodoApp_V1; }): Promise<DynamicForm> {
        const lc = `${this.lc}[${this.witnessToForm.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let { data } = witness;
            // We do the AppFormBuilder specific functions first, because of
            if (logalot) { console.log(`${lc} data: ${h.pretty(data)} (I: 7601c0e1046b4faa9f62df45e92fd77e)`); }
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
                    label: 'Todo',
                });
            return Promise.resolve(form);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async formToWitness({ form }: { form: DynamicForm; }): Promise<TransformResult<TodoApp_V1>> {
        // let app = new TodoApp_V1(null, null);
        let data: AppData_V1 = h.clone(DEFAULT_TODO_APP_DATA_V1);
        this.patchDataFromItems({ data, items: form.items, pathDelimiter: c.DEFAULT_DATA_PATH_DELIMITER });
        let resApp = await this.newUp({ data });
        return resApp;
    }

}
