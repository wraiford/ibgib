import {
    IbGibSpace, IbGibSpaceOptionsData, IbGibSpaceOptionsIbGib as IbGibSpaceOptionsIbGib, IbGibSpaceResultData, IbGibSpaceResultIbGib, IbGibSpaceOptionsCmd,
} from '../types';
import {
    IbGib_V1, IbGibRel8ns_V1, IbGibData_V1, sha256v1, Factory_V1,
} from 'ts-gib/dist/V1';
import { WitnessBase_V1, getWrapperResultIbGib } from '../witnesses';
import { getIbGibAddr, IbGibAddr } from 'ts-gib';

export abstract class SpaceBase_V1<
        TIbGib extends IbGib_V1 = IbGib_V1,
        TOptionsData extends IbGibSpaceOptionsData = IbGibSpaceOptionsData,
        TOptionsIbGib extends IbGibSpaceOptionsIbGib<TIbGib, TOptionsData> = IbGibSpaceOptionsIbGib<TIbGib, TOptionsData>,
        TResultData extends IbGibSpaceResultData = IbGibSpaceResultData,
        TResultIbGib extends IbGibSpaceResultIbGib<TIbGib, TResultData> = IbGibSpaceResultIbGib<TIbGib, TResultData>,
        TData = any,
        TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1,
    >
    extends WitnessBase_V1<TOptionsIbGib, TResultIbGib, TData, TRel8ns>
    implements IbGibSpace<TIbGib, TOptionsData, TOptionsIbGib, TResultData, TResultIbGib, TData, TRel8ns> {

        constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
            super(initialData, initialRel8ns);
        }

    /**
     * In a Space, we are concerned with getting ibGibs out of and putting ibGibs into a "space".
     *
     * So in this base, we take the incoming arg and divert it multiple ways, depending on our settings.
     */
    witnessImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
        const lc = `${this.lc}[${this.witnessImpl.name}]`;
        // "guaranteed" at this point to have valid witness arg
        // but witnessImpl already wrapped just in case
        const { cmd } = arg.data!;
        switch (cmd) {
            case IbGibSpaceOptionsCmd.get:
                return this.get(arg);
            case IbGibSpaceOptionsCmd.put:
                return this.put(arg);
            case IbGibSpaceOptionsCmd.getAddrs:
                return this.getAddrs(arg);
            case IbGibSpaceOptionsCmd.canGet:
                return this.canGet(arg);
            case IbGibSpaceOptionsCmd.canPut:
                return this.canPut(arg);
            default:
                throw new Error(`${lc} unknown cmd: ${cmd}`);
        }
    }

    protected abstract get(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;
    protected abstract put(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;
    protected abstract getAddrs(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;
    protected abstract canGet(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;
    protected abstract canPut(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;

    protected async validateWitnessArg(arg: TOptionsIbGib): Promise<string[]> {
        const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
        let errors: string[] = [];
        try {
            errors = await super.validateWitnessArg(arg);
            if (!arg.data) { errors.push(`arg.data required`); return errors; } // <<<< returns immediately
            const { cmd, ibGibAddrs, } = arg.data!;
            const ibGibs  = arg.ibGibs;
            if (cmd) { errors.push(`arg.data.cmd required`); }
            if (!Object.values(IbGibSpaceOptionsCmd).includes(cmd)) { errors.push(`unknown arg.data.cmd: ${cmd}`); }
            // commenting this out for now. in my getting of pictures (binaries), I just give the binHash and not addr.
            // if (
            //     [IbGibSpaceOptionsCmd.get, IbGibSpaceOptionsCmd.canGet].includes(cmd) &&
            //     (ibGibAddrs || []).length === 0
            // ) {
            //     errors.push(`ibGibAddrs required when cmd is ${cmd}`);
            // }
            if (
                [IbGibSpaceOptionsCmd.put, IbGibSpaceOptionsCmd.canPut].includes(cmd) &&
                (ibGibs || []).length === 0
            ) {
                errors.push(`ibGibs required when cmd is ${cmd}`);
            }
            return errors;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (errors?.length > 0) { console.error(`${lc} errors: ${errors}`); }
        }
    }

}
