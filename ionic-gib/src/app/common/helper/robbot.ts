import * as h from 'ts-gib/dist/helper';
import {
    Ib, IbGibAddr, TransformResult, V1,
} from 'ts-gib';
import {
    GIB, IbGib_V1, Rel8n,
    Factory_V1 as factory,
    isPrimitive,
    IBGIB_DELIMITER,
} from 'ts-gib/dist/V1';
import { getGib, } from 'ts-gib/dist/V1/transforms/transform-helper';


import * as c from '../constants';
import { getTimestampInTicks } from './utils';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false;


export function getRobbotResultMetadata({robbot}: {robbot: IbGibRobbotAny}): string {
    return `${robbot.ib} ${getTimestampInTicks()}`;
}

export function getRobbotIb({
    robbot,
    classname,
}: {
    robbot: IbGibRobbotAny,
    classname: string,
}): Ib {
    const lc = `[${getRobbotIb.name}]`;
    try {
        if (!robbot) { throw new Error(`robbot required (E: 00404e478cae40258136472e00652cd1)`); }
        if (!classname) { throw new Error(`classname required (E: e0519f89df8a468c8743cb932f436bfe)`); }
        if (classname.includes(' ')) { throw new Error(`invalid classname. cannot contain spaces (E: 20fddb54342743a383c33c87a1db9343)`); }
        const name = robbot.data?.name || c.IBGIB_ROBBOT_NAME_DEFAULT;
        if (name.includes(' ')) { throw new Error(`invalid robbot name. cannot contain spaces (E: 173cf478ab7a4359902fd564be838cf7)`); }
        const id = robbot.data?.uuid || undefined;
        if (id.includes(' ')) { throw new Error(`invalid robbot id. cannot contain spaces (E: 19ac5c32113243378c1b81f0ea38ca58)`); }
        return `witness robbot ${classname} ${name} ${id}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Current schema is `witness robbot [classname] [robbotName] [robbotId]
 *
 * NOTE this is space-delimited
 */
export function getInfoFromRobbotIb({
    robbotIb,
}: {
    robbotIb: Ib,
}): {
    robbotClassname: string,
    robbotName: string,
    robbotId: string,
} {
    const lc = `[${getInfoFromRobbotIb.name}]`;
    try {
        if (!robbotIb) { throw new Error(`robbotIb required (E: 4a35881058094f1a90bb4ea37052d6d7)`); }

        // const name = robbot.data?.name || c.IBGIB_ROBBOT_NAME_DEFAULT;
        // const id = robbot.data?.uuid || undefined;
        // return `witness robbot ${classname} ${name} ${id}`;
        const pieces = robbotIb.split(' ');

        return {
            robbotClassname: pieces[2],
            robbotName: pieces[3],
            robbotId: pieces[4],
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}
