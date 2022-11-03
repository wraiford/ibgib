import * as h from 'ts-gib/dist/helper';
import { Gib, Ib, } from 'ts-gib';
import { GIB, IbGib_V1 } from 'ts-gib/dist/V1';
import { getGib, getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../constants';
import { getSaferSubstring, getTimestampInTicks } from './utils';
import { CommonService } from '../../services/common.service';
import {
    DisplayData_V1, DisplayRel8ns_V1, DisplayIbGib_V1,
    DISPLAY_ATOM,
    // DisplayOutputMode, VALID_DISPLAY_OUTPUT_MODES
} from '../types/display';
import { validateIbGibIntrinsically } from './validate';
import { persistTransformResult, registerNewIbGib, rel8ToSpecialIbGib } from './space';
import { IbgibsService } from '../../services/ibgibs.service';
import { isComment, parseCommentIb } from './comment';
import { CommentIbGib_V1 } from '../types/comment';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';


const logalot = c.GLOBAL_LOG_A_LOT || false;


export function validateDisplayData({
    data,
}: {
    data: DisplayData_V1,
}): string[] {
    const lc = `[${validateDisplayData.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!data) { throw new Error(`displayData required (E: 9e138d1bc84c4dbdaad768e85ce3dfa7)`); }
        const errors: string[] = [];
        const {
            uuid,
            filters,
            sorts,
        } =
            data;

        if (logalot) { console.warn(`${lc} not implemented yet (W: cc8c2d55cdbb40bc85531d8ff4df5bbc)`); }

        if (filters?.length > 0) { }

        if (sorts?.length > 0) { }

        if (uuid) {
            if (!uuid.match(c.UUID_REGEXP)) {
                errors.push(`uuid must match regexp: ${c.UUID_REGEXP}`);
            }
        } else {
            errors.push(`uuid required.`);
        }

        return errors;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function getDisplayIb({
    data,
}: {
    data: DisplayData_V1,
}): Ib {
    const lc = `[${getDisplayIb.name}]`;
    try {
        const validationErrors = validateDisplayData({ data });
        if (validationErrors.length > 0) { throw new Error(`invalid data: ${validationErrors} (E: 8b025bed03b7477e8114fb0f3fc68aea)`); }

        const { ticks } = data;

        return `${DISPLAY_ATOM} ${ticks}`
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Current schema is `witness display [classname] [displayName] [displayId]
 *
 * NOTE this is space-delimited
 */
export function parseDisplayIb({
    displayIb,
}: {
    displayIb: Ib,
}): {
    ticks: string,
} {
    const lc = `[${parseDisplayIb.name}]`;
    try {
        if (!displayIb) { throw new Error(`displayIb required (E: d9920ab1683042388d156b1ae781565d)`); }

        const [atom, ticks] = displayIb.split(' ');

        return { ticks, };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

// export async function createNewDisplay({
//     common,
//     ibgibs,
//     space,
// }: {
//     /**
//      * Either {@link common} or {@link ibgibs} is required
//      * @hack
//      */
//     common?: CommonService,
//     /**
//      * Either {@link common} or {@link ibgibs} is required
//      * @hack
//      */
//     ibgibs?: IbgibsService,
//     /**
//      * space within which to create the display. if not provided, the
//      * defaults to the local user space via {@link common} or {@link ibgibs}.
//      */
//     space: IbGibSpaceAny,
// }): Promise<DisplayIbGib_V1 | undefined> {
//     const lc = `[${createNewDisplay.name}]`;
//     try {
//         if (logalot) { console.log(`${lc} starting...`); }

//         if (!common && !ibgibs) { throw new Error(`(UNEXPECTED) either common or ibgibs service required. (E: 94f040fa9dba47478af3128ae18179a9)`); }
//         ibgibs = ibgibs ?? common.ibgibs;

//         space = space ?? await ibgibs.getLocalUserSpace({ lock: true });

//         // prompt user to create the ibgib, passing in null because we're
//         // creating not editing.
//         // let resDisplay = common ?
//         //     await getFn_promptDisplayIbGib(common)(space, /**ibGib*/ null) :
//         //     await ibgibs.fnPromptDisplay(space, /*ibGib because creating*/null);

//         /** this should be the witness class itself at this point. */
//         const newDisplay = <DisplayIbGib_V1>resDisplay.newIbGib;
//         let loading = await common.loadingCtrl.create({ message: 'creating...' });
//         try {
//             await loading.present();
//             await h.delay(1000); // ensure that the user sees a creating message
//             let allIbGibs: IbGib_V1[] = [];
//             allIbGibs.push(newDisplay);
//             resDisplay.intermediateIbGibs?.forEach(x => allIbGibs.push(x));
//             resDisplay.dnas?.forEach(x => allIbGibs.push(x));
//             for (let i = 0; i < allIbGibs.length; i++) {
//                 const ibGib = allIbGibs[i];
//                 const validationErrors = await validateIbGibIntrinsically({ ibGib });
//                 if ((validationErrors ?? []).length > 0) { throw new Error(`(unexpected) invalid display ibgib created. validationErrors: ${validationErrors}. display: ${h.pretty(newDisplay.toIbGibDto())} (E: abebc94c346846c28aecefe3dea31fa7)`); }
//             }

//             await persistTransformResult({ resTransform: resDisplay, isMeta: true, space });
//             const { zeroSpace, fnBroadcast, fnUpdateBootstrap } = ibgibs;
//             await registerNewIbGib({
//                 ibGib: newDisplay,
//                 space,
//                 zeroSpace,
//                 fnBroadcast: (x) => fnBroadcast(x),
//                 fnUpdateBootstrap: (x) => fnUpdateBootstrap(x),
//             });

//             await rel8ToSpecialIbGib({
//                 type: "displays",
//                 rel8nName: c.DISPLAY_REL8N_NAME,
//                 ibGibsToRel8: [newDisplay],
//                 space,
//                 zeroSpace,
//                 fnUpdateBootstrap,
//                 fnBroadcast,
//             });
//         } catch (error) {
//             console.error(`${lc} ${error.message}`);
//             throw error;
//         } finally {
//             await loading.dismiss();
//         }
//         return newDisplay;
//     } catch (error) {
//         console.error(`${lc} ${error.message}`);
//         return;
//     } finally {
//         if (logalot) { console.log(`${lc} complete.`); }
//     }
// }
