import {
    IbGib_V1, IbGibRel8ns_V1, IbGibData_V1, sha256v1, Factory_V1,
} from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import {
    // IbGibRobbot,
    // IbGibRobbotOptionsData, IbGibRobbotOptionsRel8ns, IbGibRobbotOptionsIbGib,
    // IbGibRobbotResultData, IbGibRobbotResultRel8ns, IbGibRobbotResultIbGib,
    // IbGibRobbotData, IbGibRobbotRel8ns,
    // IbGibRobbotOptionsCmd, IbGibRobbotOptionsCmdModifier,
    RobbotData_V1, RobbotRel8ns_V1, RobbotIbGib_V1,
} from '../../types/robbot';
import { WitnessBase_V1, resulty_, argy_ } from '../witnesses';
import * as c from '../../constants';
import {
    // getRobbotResultMetadata,
    getTimestampInTicks,
    validateIbGibIntrinsically
} from '../../helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export interface IbGibRobbotAny
    extends RobbotBase_V1<any,any,any,any,any,any,any,any> {
}

/**
 * ## distinguishing characteristics of robbots
 *
 * With any witness ibgib, we are concerned with interpreting an incoming
 * arg ibgib and producing at least one result ibgib. Most often, there will
 * be additional ibgibs created, either creating "new" ibgibs via `fork`
 * transforms, or changing existing ibgibs through `mut8` and `rel8`
 * transforms. And almost always these will be persisted in at least
 * one space.
 *
 * But Robbots in particular are meant to be increasingly adaptable over time.
 *
 * This results in a couple of notes:
 *
 * 1. They should be able to handle any incoming ibgib, including primitives.
 * 2. If they are learning robbots, then they will mutate internally at some rate.
 * 3. Often robbots' output ibgib(s) will be intended for others'
 *    consumption, in service of others - be they humans or other
 *    biologically living organisms, other robbots or even later versions of
 *    themselves.
 *
 * So for example, one of the simplest robbots is one which simply echos the
 * incoming ibgib arg.

 * ## architecture
 *
 * At the base, any robbot should be able to handle any incoming ibgib.  This is
 * in contrast to, e.g., a Space, which is more rigid in design.
 *
 * Certainly there are robbot's who will be more rigid, but this will be an
 * abstract class on top of this one, and all robbots should be able to react to
 * all incoming ibgibs.
 *
 * Output will default to a simple ok^gib or (ROOT) ib^gib primitive...perhaps
 * we'll go with ack^gib, but whatever it is, it's just an acknowledgement of
 * input received.  (I'll put it in the constants file).
 *
 * Side effects should occur in a parallel execution thread, which ideally would
 * work in a completely parallel execution context (like a service worker). But
 * then we have to deal with race conditions and the real solution there is to
 * abstract to the robbot having its own space and the synchronization happening
 * exactly like any other sync space.
 *
 * For now, we'll spin off a promise with some intermittent `await h.delay`
 * calls if they end up called for, effectively the equivalent of the
 * old-fashioned "ProcessMessages/DoEvents" hack.
 */
export abstract class RobbotBase_V1<
        TOptionsData extends any = any,
        TOptionsRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1,
        TOptionsIbGib extends IbGib_V1<TOptionsData, TOptionsRel8ns>
            = IbGib_V1<TOptionsData, TOptionsRel8ns>,
        TResultData extends any = any,
        TResultRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1,
        TResultIbGib extends IbGib_V1<TResultData, TResultRel8ns>
            = IbGib_V1<TResultData, TResultRel8ns>,
        TData extends RobbotData_V1 = RobbotData_V1,
        TRel8ns extends RobbotRel8ns_V1 = RobbotRel8ns_V1,
    >
    extends WitnessBase_V1<
        TOptionsData, TOptionsRel8ns, TOptionsIbGib,
        TResultData, TResultRel8ns, TResultIbGib,
        TData, TRel8ns>
    implements RobbotIbGib_V1 {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `${super.lc}[${RobbotBase_V1.name}]`;

    // getRobbotIb(classname: string): string {
    //     const lc = `${this.lc}[${this.getRobbotIb.name}]`;
    //     if (!classname) {
    //         classname = this.lc?.replace('[','').replace(']','') || RobbotBase_V1.name+'_descendant';
    //         console.warn(`${lc} classname is falsy. Using ${classname}.`);
    //     }
    //     const name = this.data?.name || c.IBGIB_SPACE_NAME_DEFAULT;
    //     const id = this.data?.uuid || undefined;
    //     return `witness space ${classname} ${name} ${id}`;
    // }

    constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
        super(initialData, initialRel8ns);
    }

    /**
     * At this point in time, the arg has already been intrinsically validated,
     * as well as the internal state of this robbot. so whatever this robbot's
     * function is, it should be good to go.
     */
    // protected async witnessImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
    //     const lc = `${this.lc}[${this.witnessImpl.name}]`;
    //     if (logalot) { console.log(`${lc}`); }

    //     throw new Error('not implemented');
        // do the thing
        // let result = await this.routeAndDoCommand({
        //     cmd: arg.data!.cmd,
        //     cmdModifiers: arg.data!.cmdModifiers ?? [],
        //     arg,
        // });


        // return result;
    // }


    /**
     * builds an arg ibGib.
     *
     * wrapper convenience to avoid long generic calls.
     */
    // async argy({
    //     argData,
    //     ibMetadata,
    //     noTimestamp,
    //     ibGibs,
    // }: {
    //     argData: TOptionsData,
    //     ibMetadata?: string,
    //     noTimestamp?: boolean,
    //     ibGibs?: IbGib_V1[],
    // }): Promise<TOptionsIbGib> {
    //     const arg = await argy_<TOptionsData, TOptionsRel8ns, TOptionsIbGib>({
    //         argData,
    //         ibMetadata,
    //         noTimestamp
    //     });

    //     if (ibGibs) { arg.ibGibs = ibGibs; }

    //     return arg;
    // }

    /**
     * builds a result ibGib.
     *
     * wrapper convenience to avoid long generic calls.
     */
    // async resulty({
    //     resultData,
    //     ibGibs,
    // }: {
    //     resultData: TResultData,
    //     ibGibs?: TIbGib[],
    // }): Promise<TResultIbGib> {
    //     const result = await resulty_<TResultData, TResultIbGib>({
    //         ibMetadata: getRobbotResultMetadata({space: this}),
    //         resultData,
    //     });
    //     if (ibGibs) { result.ibGibs = ibGibs; }
    //     return result;
    // }

}
