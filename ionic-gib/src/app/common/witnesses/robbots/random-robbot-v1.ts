import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, IbGibRel8ns_V1, GIB, ROOT, } from 'ts-gib/dist/V1';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';

import * as c from '../../constants';
import { RobbotBase_V1 } from './robbot-base-v1';
import { argy_, } from '../witnesses';
import { RobbotData_V1, RobbotRel8ns_V1 } from '../../types';

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

    outputMode: 'ask',
    tagOutput: false,

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}

export interface RandomRobbotRel8ns_V1 extends RobbotRel8ns_V1 {

}


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

    protected witnessImpl(arg: IbGib_V1): Promise<IbGib_V1> {
        const lc = `${this.lc}[${this.witnessImpl.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            throw new Error(`not impl (E: 80872f4b7c1c79afa665113ea06cce22)`);

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}