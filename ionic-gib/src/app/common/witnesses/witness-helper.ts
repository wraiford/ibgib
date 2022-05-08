import {
    IbGib_V1, IbGibRel8ns_V1, Factory_V1 as factory, sha256v1,
} from 'ts-gib/dist/V1';

import * as c from '../constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Builds the ib for the witness arg ibgib.
 *
 * @returns ib that we'll use when creating a witness arg.
 */
export function getArgIb(ibMetadata: string): string {
    const lc = `[${getArgIb.name}]`;
    try {
        const ib = ibMetadata ?
            `${c.WITNESS_ARG_METADATA_STRING} ${ibMetadata}` :
            c.WITNESS_ARG_METADATA_STRING;
        if (logalot) { console.log(`${lc} ${ib}`); }
        return ib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Builds the ib for the witness result ibgib.
 *
 * @returns ib that we'll use when creating a witness result.
 */
export function getResultIb(ibMetadata: string): string {
    const lc = `[${getResultIb.name}]`;
    try {
        const ib = ibMetadata ?
            `${c.WITNESS_RESULT_METADATA_STRING} ${ibMetadata}` :
            c.WITNESS_RESULT_METADATA_STRING;
        if (logalot) { console.log(`${lc} ${ib}`); }
        return ib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * This builds the arg ibGib for a witness function.
 *
 * By default, this is considered a one-off ibGib. As such,
 * there is no dna and no uuid. The timestamp will be included, which
 * adds some metadata (and makes for a most-often unique tjp). If there
 * is something that needs to reference this result, it can use the
 * the ibgib's address.
 *
 * @returns Result (wrapper) ibGib for a `witness` function.
 */
export async function argy_<
        TArgData,
        TArgRel8ns extends IbGibRel8ns_V1,
        TArgIbGib extends IbGib_V1<TArgData, TArgRel8ns
    > = IbGib_V1<TArgData, TArgRel8ns>>({
    argData,
    ibMetadata,
    noTimestamp,
}: {
    argData: TArgData,
    ibMetadata?: string,
    noTimestamp?: boolean,
}): Promise<TArgIbGib> {
    const lc = `[${argy_.name}]`;
    try {
        const resArgIbGib = await factory.firstGen<TArgData>({
            ib: getArgIb(ibMetadata),
            parentIbGib: factory.primitive({ ib: c.WITNESS_ARG_METADATA_STRING }),
            data: argData,
            dna: false,
            noTimestamp,
        });
        if (resArgIbGib.newIbGib) {
            const {newIbGib: resultIbGib} = resArgIbGib;

            // clear out past, disregard any intermediate ibgibs.
            resultIbGib.rel8ns!.past = [];

            resultIbGib.gib = await sha256v1(resultIbGib);

            return <TArgIbGib>resultIbGib;
        } else {
            throw new Error(`create ibGib failed`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * This builds the result ibGib for a witness function.
 *
 * By default, the result is considered a one-off ibGib. As such,
 * there is no dna and no uuid. The timestamp will be included, which
 * adds some metadata (and makes for a most-often unique tjp). If there
 * is something that needs to reference this result, it can use the
 * the ibgib's address.
 *
 * @returns Result (wrapper) ibGib for a `witness` function.
 */
export async function resulty_<TResultData, TResultIbGib extends IbGib_V1<TResultData> = IbGib_V1<TResultData>>({
    resultData,
    ibMetadata,
    noTimestamp,
}: {
    resultData: TResultData,
    ibMetadata?: string,
    noTimestamp?: boolean,
}): Promise<TResultIbGib> {
    const lc = `[${resulty_.name}]`;
    try {
        const resResultIbGib = await factory.firstGen<TResultData>({
            ib: getResultIb(ibMetadata),
            parentIbGib: factory.primitive({ ib: c.WITNESS_RESULT_METADATA_STRING }),
            data: resultData,
            dna: false,
            noTimestamp,
        });
        if (resResultIbGib?.newIbGib) {
            const {newIbGib: resultIbGib} = resResultIbGib;

            // clear out past, disregard any intermediate ibgibs.
            resultIbGib.rel8ns!.past = [];

            resultIbGib.gib = await sha256v1(resultIbGib);

            return <TResultIbGib>resultIbGib;
        } else {
            throw new Error(`create ibGib failed`);
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * If valid, returns null.
 */
export function validateWitnessClassname({
    classname,
}: {
    classname: string,
}): string | null {
    const lc = `[${validateWitnessClassname.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!classname) { throw new Error(`classname required (E: b1c7b455d58fdd8d77acd15bdf017722)`); }

        if (!classname.match(c.CLASSNAME_REGEXP)) {
            return `classname (${classname}) must match regex ${c.CLASSNAME_REGEXP}`;
        }

        return null;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
