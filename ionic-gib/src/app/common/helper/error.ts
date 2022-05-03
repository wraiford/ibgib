import { Ib } from "ts-gib";

import * as c from '../constants';
import { constantIbGib } from "./ibgib";
import { ErrorData_V1, ErrorIbGib_V1, ErrorRel8ns_V1 } from '../types/error';


const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Generates an ib based on a raw error msg.
 *
 * ## future
 *
 * If this is changed in the future, then without versioning of some sort, this
 * will change the error constant ibgibs that rely on this functions
 * deterministic qualities.
 *
 * @returns the error's `ib`
 */
export function getErrorIb({
    rawMsg,
}: {
    rawMsg: string,
}): Ib {
    const lc = `[${getErrorIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        const parsed = parseRawErrorMsg({rawMsg});
        const saferText = parsed.body.replace(/\s/g, '_').replace(/\W/g, '');
        let msgSlice: string;
        if (saferText.length > c.DEFAULT_ERROR_MSG_IB_SUBSTRING_LENGTH) {
            msgSlice =
                saferText.substring(0, c.DEFAULT_ERROR_MSG_IB_SUBSTRING_LENGTH);
        } else if (saferText.length > 0) {
            msgSlice = saferText;
        } else {
            // msg only has characters/nonalphanumerics ?
            throw new Error(`(UNEXPECTED) error msg should have characters/alphanumerics... (E: a3b9cd11a44cc7892a748819c2885422)`);
        }

        return `error ${msgSlice} ${parsed.uuid ?? 'undefined'}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}


/**
 * Parses a raw error/exception message.
 *
 * If it has sections that I personally use (usually), then it will break that
 * out. otherwise, it will just have the `rawMsg` as the msg body and raw msg.
 *
 * @see {@link ErrorData_V1}
 */
export function parseRawErrorMsg({
    rawMsg,
}: {
    rawMsg: string,
}): ErrorData_V1 {
    const lc = `[${parseRawErrorMsg.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!rawMsg) { throw new Error(`(UNEXPECTED) rawMsg required (E: e5bd3b433a1781ebe885534cd2495622)`); }

        let data: ErrorData_V1;
        let regexResult = rawMsg.match(c.ERROR_MSG_WITH_ID_CAPTURE_GROUPS_REGEXP);
        if (regexResult) {
            // has id section
            const [_, location, unexpectedAtStart, body, idSection, unexpectedAtEnd] = regexResult;
            if (!body) { throw new Error(`invalid error msg body (E: a675e6855cca96519d33d44ea5400922)`); }
            data = {
                raw: rawMsg,
                body: body?.trim(),
                uuid: idSection.slice(4,36),
            };
            if (location) { data.location = location; }
            if (unexpectedAtStart || unexpectedAtEnd) { data.unexpected = true; }
        } else {
            // no id or unexpected regex (maybe changed?)
            data = {
                raw: rawMsg,
                body: rawMsg,
            };
            let regexResultLocation = rawMsg.match(c.ERROR_MSG_LOCATION_ONLY_REGEXP);
            if (regexResultLocation) {
                const [_, location] = regexResultLocation;
                data.location = location;
            }
            if (rawMsg.toLowerCase().includes(`(unexpected)`)) {
                data.unexpected = true;
            }
        }

        return data;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * Builds a "constant" error ibgib based on the given `rawMsg`.
 *
 * @returns constant error ibgib built from given `rawMsg`
 *
 * @see {@link ErrorData_V1}
 * @see {@link ErrorIbGib_V1}
 */
export async function errorIbGib({rawMsg}: {rawMsg: string}): Promise<ErrorIbGib_V1> {
    const lc = `[${errorIbGib.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        return constantIbGib<ErrorData_V1, ErrorRel8ns_V1>({
            parentPrimitiveIb: 'error',
            ib: getErrorIb({rawMsg}),
            data: parseRawErrorMsg({rawMsg}),
            ibRegExpPattern: c.ERROR_IB_REGEXP.source,
        });
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
