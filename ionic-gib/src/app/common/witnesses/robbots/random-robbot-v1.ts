import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import {
    IbGib_V1, ROOT, Factory_V1 as factory, Rel8n,
    IbGibRel8ns_V1, isPrimitive,
} from 'ts-gib/dist/V1';
import { Gib, IbGibAddr, TransformResult } from 'ts-gib';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../../constants';
import { RobbotBase_V1 } from './robbot-base-v1';
import {
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
    RobbotCmdData, RobbotCmdIbGib, RobbotCmdRel8ns, RobbotCmd,
} from '../../types/robbot';
import { DynamicForm } from '../../../ibgib-forms/types/form-items';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { getIdPool } from '../../helper/utils';
import { WitnessFormBuilder } from '../../helper/witness';
import { getRobbotIb, RobbotFormBuilder } from '../../helper/robbot';
import { constantIbGib } from '../../helper/ibgib';
import { createCommentIbGib } from '../../helper/comment';


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
export class RandomRobbot_V1 extends RobbotBase_V1<
        // in
        any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
        // out
        any, IbGibRel8ns_V1, IbGib_V1<any, IbGibRel8ns_V1>,
        // this
        RandomRobbotData_V1, RandomRobbotRel8ns_V1
    > {
    protected lc: string = `[${RandomRobbot_V1.name}]`;

    constructor(initialData?: RandomRobbotData_V1, initialRel8ns?: RandomRobbotRel8ns_V1) {
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
            if (!this.rel8ns && DEFAULT_RANDOM_ROBBOT_REL8NS_V1) {
                this.rel8ns = h.clone(DEFAULT_RANDOM_ROBBOT_REL8NS_V1);
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
            await this.rel8To({ibGibs: [ibGib]});
            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * In this robbot, the ib command looks at given ibGib(s) and remembers
     * it/them (i.e. the robbot rel8s the ibgibs to itself).
     *
     * @returns ROOT if successful, else throws
     */
    protected async doCmdIb({
        arg,
    }: {
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdIb.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            await this.rel8To({ibGibs: arg.ibGibs});
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
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdGib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            const space = await this.ibgibsSvc.getLocalUserSpace({lock: true});

            // choose from rel8d and post to given context.
            const rel8nName =
                this.data?.defaultRel8nName ?? c.DEFAULT_ROBBOT_TARGET_REL8N_NAME;
            const rel8dAddrs = (this.rel8ns ?? {})[rel8nName] ?? [];

            const contextIbGibAddr = arg.data.ibGibAddrs[0]; // guaranteed by this.validateWitnessArg
            let contextTjpGib = getGibInfo({ibGibAddr: contextIbGibAddr}).tjpGib;
            /**
             * flag to indicate if one of our rel8d ibgib addrs belongs to the
             * same timeline as the current context.
             */
            let contextTjpCollision = false;

            let ibGibAddrToSpeak: IbGibAddr;
            let addrPool = rel8dAddrs.filter(x => {
                // only addrs that are a different timeline from the current context
                // or any existing rel8d
                const xTjpGib = getGibInfo({gib: h.getIbAndGib({ibGibAddr: x}).gib}).tjpGib;
                if (xTjpGib === contextTjpGib) { contextTjpCollision = true; }
                return xTjpGib !== contextTjpGib;
            });
            if (addrPool.length > 0) {
                const randomIndex = Math.floor(addrPool.length * Math.random());
                ibGibAddrToSpeak = addrPool[randomIndex];
            }

            /**
             * if we create a comment, we don't need to go fetching a more up to
             * date version, because we just made it and know that it is already
             * up-to-date.
             */
            let upToDateConfirmed = false;
            if (!ibGibAddrToSpeak) {
                const text = contextTjpCollision ?
                    `${this.data?.outputPrefix ?? ''}I've only seen the current ibgib so far!${this.data?.outputSuffix ?? ''}` :
                    `${this.data?.outputPrefix ?? ''}I haven't seen anything yet!${this.data?.outputSuffix ?? ''}`;
                const resComment = await createCommentIbGib({text, space, saveInSpace: true});
                await this.ibgibsSvc.registerNewIbGib({ibGib: resComment.newIbGib});
                ibGibAddrToSpeak = h.getIbGibAddr({ibGib: resComment.newIbGib});
                upToDateConfirmed = true;
            }

            let resGetContext = await this.ibgibsSvc.get({addr: contextIbGibAddr, space});
            if (!resGetContext.success || resGetContext.ibGibs?.length !== 1) { throw new Error(`get context address failed (E: 7690ec188f9680bd138fe7e1eef87522)`); }
            let contextIbGib = resGetContext.ibGibs[0];
            const contextLatestAddr =
                await this.ibgibsSvc.getLatestAddr({ibGib: contextIbGib, space}) ?? contextIbGibAddr;
            if (contextLatestAddr !== contextIbGibAddr) {
                // update to the latest context ibgib
                resGetContext = await this.ibgibsSvc.get({addr: contextLatestAddr, space});
                if (!resGetContext.success || resGetContext.ibGibs?.length !== 1) { throw new Error(`get latest context address failed (E: 3f4c44173af34cb5a6e93ae631c73de0)`); }
                contextIbGib = resGetContext.ibGibs[0];
            }

            if (!upToDateConfirmed && !isPrimitive({gib: h.getIbAndGib({ibGibAddr: ibGibAddrToSpeak}).gib})) {
                // get the latest ibgib addr to speak
                let resGetIbGib = await this.ibgibsSvc.get({addr: ibGibAddrToSpeak, space});
                if (!resGetIbGib.success || resGetIbGib.ibGibs?.length !== 1) { throw new Error(`get ibGib failed (E: 0afd345445b248b2aac60267fc57249a)`); }
                let ibGibToSpeak = resGetIbGib.ibGibs[0];
                const ibGibToSpeakLatestAddr =
                    await this.ibgibsSvc.getLatestAddr({ibGib: ibGibToSpeak, space}) ?? ibGibAddrToSpeak;
                if (ibGibToSpeakLatestAddr !== ibGibAddrToSpeak) {
                    ibGibAddrToSpeak = ibGibToSpeakLatestAddr;
                }
            }

            await this.rel8ToIbGib({
                ibGibAddrToRel8: ibGibAddrToSpeak,
                contextIbGib,
                rel8nNames: [rel8nName],
            });

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
        arg: RobbotCmdIbGib<IbGib_V1, RobbotCmdData, RobbotCmdRel8ns>,
    }): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.doCmdIbgib.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            return ROOT;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }

    }

    protected async validateWitnessArg(arg: RobbotCmdIbGib): Promise<string[]> {
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
    defaultRel8nName: c.DEFAULT_ROBBOT_TARGET_REL8N_NAME,

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

    getName(): string { return RandomRobbot_V1.name; }

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
            await robbotIbGib.loadIbGibDto(robbotDto);
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
