/**
 * @module outer-space
 * Outer spaces are spaces connecting local inner spaces.
 * ATOW there is just sync spaces, but definitely just the beginning.
 *
 * ## on future implementations, CRDT-like behavior
 *
 * I just realized that when merging, I can actually create a meta transform
 * ibgib to maintain the order of transforms.
 */

import * as h from 'ts-gib/dist/helper';
import { Ib, } from 'ts-gib';

import * as c from '../constants';
import { OuterSpaceSubtype, OuterSpaceType, StatusCode, StatusIbInfo, VALID_OUTER_SPACE_SUBTYPES, VALID_OUTER_SPACE_TYPES } from '../types/outer-space';


/**
 * Composes ib with given params info.
 *
 * @returns ib string with given info encoded
 */
export function getStatusIb({
    sagaId,
    statusCode,
    spaceType,
    spaceSubtype,
    delimiter,
}: StatusIbInfo): string {
    const lc = `[${getStatusIb.name}]`;
    try {
        if (!sagaId) { throw new Error(`sagaId required. (E: cfc923bb29ee4aa788e947b6416740e6)`); }
        if (statusCode === null || statusCode === undefined) { throw new Error(`status code required. (E: 4e0d232a9955496695012623c2e17ca2)`); }
        if (!Object.values(StatusCode).includes(statusCode)) { throw new Error(`invalid status code (${statusCode}) (E: 91d7655424c44d9680fff099ee2b54d2)`); }
        if (!spaceType) { throw new Error(`spaceType required. (E: 86e98694a56a4f599e98e50abf0eed43)`); }
        if (!spaceSubtype) { throw new Error(`spaceSubtype required. (E: 4857d4677ee34e95aeb2251dd633909e)`); }

        delimiter = delimiter || c.OUTER_SPACE_DEFAULT_IB_DELIMITER;

        return `status ${sagaId} ${statusCode} ${spaceType} ${spaceSubtype}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Parses the given `statusIb` and returns the info object.
 *
 * @returns info from parsing the status ib
 */
export function getStatusIbInfo({
    statusIb,
    delimiter,
}: {
    statusIb: Ib,
    delimiter?: string,
}): StatusIbInfo {
    const lc = `[${getStatusIb.name}]`;
    try {
        if (!statusIb) { throw new Error(`statusIb required. (E: 09e23e8622cf456cadb0c3d0aadc3be9)`); }

        delimiter = delimiter || c.OUTER_SPACE_DEFAULT_IB_DELIMITER;

        // atow `status ${sagaId} ${statusCode} ${spaceType} ${spaceSubtype}`;
        const pieces = statusIb.split(delimiter);

        const sagaId = pieces[1];
        if (sagaId === null || sagaId === undefined) { throw new Error(`sagaId is null/undefined. (E: 5de2861a6afb48e1a1c89d0402a4ea63)`); }

        const statusCode = <StatusCode>pieces[2]; // tenatively cast as StatusCode
        if (!Object.values(StatusCode).includes(statusCode)) { throw new Error(`invalid/unknown status code (${statusCode}) (E: 7580860df7b344b3992148552e80a85e)`); }

        const spaceType = <OuterSpaceType>pieces[3];
        if (spaceType === null || spaceType === undefined) { throw new Error(`spaceType is null/undefined. (E: 12473d35e77b451bb59bb05c03cb8b64)`); }
        if (!VALID_OUTER_SPACE_TYPES.includes(spaceType)) { throw new Error(`invalid/unknown spaceType (${spaceType}) (E: d3ba9add427f49dda34f265f3225d9db)`); }

        const spaceSubtype = <OuterSpaceSubtype>pieces[4];
        if (spaceSubtype === null || spaceSubtype === undefined) { throw new Error(`spaceSubtype is null/undefined. (E: 6da7ae919d0b4a22b4ee685520b6c946)`); }
        if (!VALID_OUTER_SPACE_SUBTYPES.includes(spaceSubtype)) { throw new Error(`invalid/unknown spaceSubtype (${spaceSubtype}) (E: 703ed1aee44447a294b3e1cf0984baba)`); }

        return { statusCode, spaceType, spaceSubtype, sagaId, delimiter };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}
