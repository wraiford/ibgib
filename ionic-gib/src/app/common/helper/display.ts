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
