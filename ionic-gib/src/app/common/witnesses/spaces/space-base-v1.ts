import { IbGib_V1 } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import * as c from '../../constants';
import { WitnessBase_V1, } from '../witness-base-v1';
import {
    IbGibSpace, IbGibSpaceData, IbGibSpaceOptionsCmd,
    IbGibSpaceOptionsCmdModifier, IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib,
    IbGibSpaceOptionsRel8ns, IbGibSpaceRel8ns, IbGibSpaceResultData,
    IbGibSpaceResultIbGib, IbGibSpaceResultRel8ns
} from '../../types/space';
import { getSpaceResultMetadata } from '../../helper/space';
import { validateIbGibIntrinsically } from '../../helper/validate';
import { argy_, resulty_ } from '../witness-helper';
import { IbGibCacheService } from '../../types/ibgib';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export interface IbGibSpaceAny
    extends SpaceBase_V1<any,any,any,any,any,any,any> {
}

export abstract class SpaceBase_V1<
        TIbGib extends IbGib_V1 = IbGib_V1,
        TOptionsData extends IbGibSpaceOptionsData = IbGibSpaceOptionsData,
        TOptionsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns,
        TOptionsIbGib extends IbGibSpaceOptionsIbGib<TIbGib, TOptionsData, TOptionsRel8ns>
            = IbGibSpaceOptionsIbGib<TIbGib, TOptionsData, TOptionsRel8ns>,
        TResultData extends IbGibSpaceResultData = IbGibSpaceResultData,
        TResultRel8ns extends IbGibSpaceResultRel8ns = IbGibSpaceResultRel8ns,
        TResultIbGib extends IbGibSpaceResultIbGib<TIbGib, TResultData, TResultRel8ns>
            = IbGibSpaceResultIbGib<TIbGib, TResultData, TResultRel8ns>,
        TData extends IbGibSpaceData = IbGibSpaceData,
        TRel8ns extends IbGibSpaceRel8ns = IbGibSpaceRel8ns,
    >
    extends WitnessBase_V1<
        TOptionsData, TOptionsRel8ns, TOptionsIbGib,
        TResultData, TResultRel8ns, TResultIbGib,
        TData, TRel8ns>
    implements IbGibSpace<TIbGib, TOptionsData, TOptionsRel8ns, TOptionsIbGib, TResultData, TResultRel8ns, TResultIbGib, TData, TRel8ns> {

    /**
     * Log context for convenience with logging. (Ignore if you don't want to use this.)
     */
    protected lc: string = `${super.lc}[${SpaceBase_V1.name}]`;

    /**
     * Optional cache service. hmm...
     */
    cacheSvc: IbGibCacheService | undefined;

    // getSpaceIb(classname: string): string {
    //     const lc = `${this.lc}[${this.getSpaceIb.name}]`;
    //     if (!classname) {
    //         classname = this.lc?.replace('[','').replace(']','') || SpaceBase_V1.name+'_descendant';
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
     * In a Space, we are concerned with getting ibGibs out of and putting ibGibs into a "space".
     *
     * So in this base, we take the incoming arg and divert it multiple ways, depending on our settings.
     */
    protected async witnessImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.witnessImpl.name}]`;
        if (logalot) { console.log(`${lc}`); }

        // do the thing
        let result = await this.routeAndDoCommand({
            cmd: arg.data!.cmd,
            cmdModifiers: arg.data!.cmdModifiers ?? [],
            arg,
        });

        // persist the arg and result if we're configured to do so
        // if (result && this.data.persistOptsAndResultIbGibs) {
        //     try {
        //         await this.persistOptsAndResultIbGibs({arg, result});
        //     } catch (error) {
        //         const emsg = `${lc} ${error.message}`;
        //         console.error(emsg);
        //     }
        // }

        return result;
    }

    protected abstract persistOptsAndResultIbGibs({arg, result}:
        {arg: TOptionsIbGib, result: TResultIbGib}): Promise<void>;

    /**
     * Routes the given `cmd` to the correct handling function in the space,
     * and executes that function.
     *
     * Override this if you have custom commands to handle.
     * Check for those first, and if not among them, call this
     * via `super.doCommand(...)`. If cmd is still not found,
     * this will throw.
     */
    protected routeAndDoCommand<TCmdModifier extends IbGibSpaceOptionsCmdModifier = IbGibSpaceOptionsCmdModifier>({
        cmd,
        cmdModifiers,
        arg,
    }: {
        cmd: IbGibSpaceOptionsCmd | string,
        cmdModifiers: (TCmdModifier | string)[],
        arg: TOptionsIbGib,
    }): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.routeAndDoCommand.name}]`;
        switch (cmd) {
            case IbGibSpaceOptionsCmd.get:
                if ((cmdModifiers ?? []).length === 0) {
                    return this.get(arg);
                } else if (cmdModifiers.includes('can')) {
                    return this.canGet(arg);
                } else if (cmdModifiers.includes('latest')) {
                    if (cmdModifiers.includes('addrs')) {
                        return this.getLatestAddrs(arg);
                    } else {
                        return this.getLatestIbGibs(arg);
                    }
                } else if (cmdModifiers.includes('tjps')) {
                    if (cmdModifiers.includes('addrs')) {
                        return this.getTjpAddrs(arg);
                    } else {
                        return this.getTjpIbGibs(arg);
                    }
                } else if (cmdModifiers.includes('addrs')) {
                    return this.getAddrs(arg);
                } else {
                    return this.get(arg);
                }

            case IbGibSpaceOptionsCmd.put:
                if ((cmdModifiers ?? []).length === 0) {
                    return this.put(arg);
                } else if (cmdModifiers.includes('can')) {
                    return this.canPut(arg);
                } else {
                    return this.put(arg);
                }

            case IbGibSpaceOptionsCmd.delete:
                if ((cmdModifiers ?? []).length === 0) {
                    return this.delete(arg);
                } else if (cmdModifiers.includes('can')) {
                    return this.canDelete(arg);
                } else {
                    return this.delete(arg);
                }

            default:
                throw new Error(`${lc} unknown cmd: ${cmd}. cmdModifiers: ${cmdModifiers}`);
        }
    }

    protected get(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getImpl(arg); }
    protected abstract getImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;

    protected put(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.putImpl(arg); }
    protected abstract putImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;

    protected delete(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.deleteImpl(arg); }
    protected deleteImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.deleteImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Get all (public?) addrs in space.
     *
     * @optional method for space.
     *
     * @returns all addresses in space (that it wants to reveal).
     */
    protected getAddrs(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getAddrsImpl(arg); }
    protected getAddrsImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.getAddrsImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Get latest ibGibs for given ibGib addresses.
     *
     * Usually I pass in the tjp address(es) if I have them.
     *
     * @optional method for space.
     *
     * @returns latest ibGibs in timelines for each given ibgib address.
     */
    protected getLatestIbGibs(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getLatestIbGibsImpl(arg); }
    protected getLatestIbGibsImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.getLatestIbGibsImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Get latest addrs for given ibGib(s)/address(es).
     *
     * Usually I pass in the tjp address(es) if I have them.
     *
     * @optional method for space.
     *
     * @returns latest addrs in timelines for each given ibgib address.
     */
    protected getLatestAddrs(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getLatestAddrsImpl(arg); }
    protected getLatestAddrsImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.getLatestAddrsImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Get temporal junction point ibgibs for given ibgib(s) or address(es).
     *
     * @optional method for space.
     *
     * @returns tjp ibgib for each given ibgib/address.
     */
    protected getTjpIbGibs(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getTjpIbGibsImpl(arg); }
    protected getTjpIbGibsImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.getTjpIbGibsImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Get temporal junction point addr(s) for given ibgib(s) or address(es).
     *
     * @optional method for space.
     *
     * @returns tjp addrs in timelines for each given ibgib/address.
     */
    protected getTjpAddrs(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getTjpAddrsImpl(arg); }
    protected getTjpAddrsImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.getTjpAddrsImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Supposed to be a check on either authorization, accessibility, existence...
     *
     * @notimplementedyet
     */
    protected canGet(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.canGetImpl(arg); }
    protected canGetImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.canGetImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Supposed to be a check on either authorization, accessibility, existence...
     *
     * @notimplementedyet
     */
    protected canPut(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.canPutImpl(arg); }
    protected canPutImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.canPutImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Supposed to be a check on either authorization, accessibility, existence...
     *
     * @notimplementedyet
     */
    protected canDelete(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.canPutImpl(arg); }
    protected canDeleteImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.canDeleteImpl.name}]`;
        throw new Error(`${lc} not implemented`);
    }

    /**
     * Centralized location for general argument validation for a given witness.
     *
     * In the case of spaces, this is where I usually put my common validation
     * for various cases on cmd+modifier combinations.
     *
     * @returns validation error string, empty if no errors.
     */
    protected async validateWitnessArg(arg: TOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        let errors: string[] = [];
        try {
            errors = await super.validateWitnessArg(arg);
            if (!arg.data) {
                errors.push(`arg.data required (E: 8ee544d7d88a45c6adcbc15838a283a7)`);
                return errors; // <<<< returns immediately
            }

            const { cmd, ibGibAddrs, } = arg.data!;
            let cmdModifiers = arg.data!.cmdModifiers ?? [];
            const ibGibs  = arg.ibGibs;
            if (!cmd) { errors.push(`arg.data.cmd required (E: 72a11ee87a0d4896bcacd65a9c0284d9)`); }
            if (!Object.values(IbGibSpaceOptionsCmd).includes(<any>cmd)) { errors.push(`unknown arg.data.cmd: ${cmd}. (E: 95282ce61e97429f8049e61ec9f14f0b)`); }
            // debugger;
            const ibGibAddrsLength = ibGibAddrs?.length ?? 0;
            if (
                cmd === IbGibSpaceOptionsCmd.get &&
                !cmdModifiers?.includes('addrs') && // we allow get addrs to be get ALL addrs
                !cmdModifiers?.includes('latest') &&
                ibGibAddrsLength === 0
            ) {
                errors.push(`ibGibAddrs required when cmd is ${cmd}. (E: ee55a3f60b90423cbe054f27c34ab7d5)`);
            }
            if (cmd === IbGibSpaceOptionsCmd.put) {
                if (logalot) { console.log(`${lc} validate put cmd`); }
                const ibGibsLength = ibGibs?.length ?? 0;
                if (ibGibsLength === 0) {
                    errors.push(`ibGibs required when cmd is ${cmd}. (E: b3a422169f7344a48a1d44e7ad1ba44e)`);
                } else if (this.data.validateIbGibAddrsMatchIbGibs) {
                    // #region validate ibGib map to ibGibAddrs
                    if (logalot) { console.log(`${lc} validateIbGibAddrsMatchIbGibs true, so doing so.`); }

                    // confirm the incoming ibGibs match up with the addresses
                    // we have in `ibGibAddrs`.
                    if (ibGibsLength !== ibGibAddrsLength) {
                        debugger;
                        errors.push(`ibGibsLength !== ibGibAddrsLength and this.data.validateIbGibAddrsMatchIbGibs is true. (E: 6c6bf824ab32443aa4d6b8bf4f8113dd)`);
                    } else {
                        // lengths match, so validate ibgibs
                        if (logalot) { console.log(`${lc} validateIbGibAddrsMatchIbGibs, lengths match. validating intrinsically`); }
                        const ibGibAddrsCopy = ibGibAddrs.concat();
                        for (let i = 0; i < ibGibs.length; i++) {
                            const ibGib = ibGibs[i];
                            const intrinsicErrors = await validateIbGibIntrinsically({ibGib});
                            if (intrinsicErrors?.length ?? 0 > 0) {
                                intrinsicErrors.forEach(x => errors.push(x));
                            } else {
                                // intrinsically valid, but ensure the ibGib
                                // addr maps 1-to-1 in ibGibAddrs
                                const xAddr = h.getIbGibAddr({ibGib});
                                const xIndex = ibGibAddrsCopy.indexOf(xAddr);
                                if (xIndex === -1) {
                                    errors.push(`ibGibAddrs don't map to calculated ibGib addrs. calculated Addr: (${xAddr}) (E: b21b3a7a74db43e5a8722acc97274646)`);
                                    break;
                                } else {
                                    ibGibAddrsCopy.splice(xIndex, 1);
                                }
                            }
                        }
                    }

                    // #endregion validate ibGib map to ibGibAddrs
                }
            }
            return errors;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (errors?.length > 0) { console.error(`${lc} errors: ${errors}`); }
        }
    }

    /**
     * builds an arg ibGib.
     *
     * wrapper convenience to avoid long generic calls.
     */
    async argy({
        argData,
        ibMetadata,
        noTimestamp,
        ibGibs,
    }: {
        argData: TOptionsData,
        ibMetadata?: string,
        noTimestamp?: boolean,
        ibGibs?: TIbGib[],
    }): Promise<TOptionsIbGib> {
        const arg = await argy_<TOptionsData, TOptionsRel8ns, TOptionsIbGib>({
            argData,
            ibMetadata,
            noTimestamp
        });

        if (ibGibs) { arg.ibGibs = ibGibs; }

        return arg;
    }

    /**
     * builds a result ibGib.
     *
     * wrapper convenience to avoid long generic calls.
     */
    async resulty({
        resultData,
        ibGibs,
    }: {
        resultData: TResultData,
        ibGibs?: TIbGib[],
    }): Promise<TResultIbGib> {
        const result = await resulty_<TResultData, TResultIbGib>({
            ibMetadata: getSpaceResultMetadata({space: this}),
            resultData,
        });
        if (ibGibs) { result.ibGibs = ibGibs; }
        return result;
    }

}
