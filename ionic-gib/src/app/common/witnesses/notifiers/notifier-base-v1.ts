// import {
//     IbGib_V1, IbGibRel8ns_V1, IbGibData_V1, sha256v1, Factory_V1,
// } from 'ts-gib/dist/V1';

// import {
//     IbGibNotifier,
//     IbGibNotifierOptionsData, IbGibNotifierOptionsRel8ns, IbGibNotifierOptionsIbGib,
//     IbGibNotifierResultData, IbGibNotifierResultRel8ns, IbGibNotifierResultIbGib,
//     IbGibNotifierData, IbGibNotifierRel8ns,
//     IbGibNotifierOptionsCmd, IbGibNotifierOptionsCmdModifier,
// } from '../../types';
// import { WitnessBase_V1, resulty_, argy_ } from '../witnesses';
// import * as c from '../../constants';
// import { getTimestampInTicks } from '../../helper';

// const logalot = c.GLOBAL_LOG_A_LOT || false || true;

// export abstract class NotifierBase_V1<
//         TIbGib extends IbGib_V1 = IbGib_V1,
//         TOptionsData extends IbGibNotifierOptionsData = IbGibNotifierOptionsData,
//         TOptionsRel8ns extends IbGibNotifierOptionsRel8ns = IbGibNotifierOptionsRel8ns,
//         TOptionsIbGib extends IbGibNotifierOptionsIbGib<TIbGib, TOptionsData, TOptionsRel8ns>
//             = IbGibNotifierOptionsIbGib<TIbGib, TOptionsData, TOptionsRel8ns>,
//         TResultData extends IbGibNotifierResultData = IbGibNotifierResultData,
//         TResultRel8ns extends IbGibNotifierResultRel8ns = IbGibNotifierResultRel8ns,
//         TResultIbGib extends IbGibNotifierResultIbGib<TIbGib, TResultData, TResultRel8ns>
//             = IbGibNotifierResultIbGib<TIbGib, TResultData, TResultRel8ns>,
//         TData extends IbGibNotifierData = IbGibNotifierData,
//         TRel8ns extends IbGibNotifierRel8ns = IbGibNotifierRel8ns,
//     >
//     extends WitnessBase_V1<
//         TOptionsData, TOptionsRel8ns, TOptionsIbGib,
//         TResultData, TResultRel8ns, TResultIbGib,
//         TData, TRel8ns>
//     implements IbGibNotifier<TIbGib, TOptionsData, TOptionsRel8ns, TOptionsIbGib, TResultData, TResultRel8ns, TResultIbGib, TData, TRel8ns> {

//     /**
//      * Log context for convenience with logging. (Ignore if you don't want to use this.)
//      */
//     protected lc: string = `${super.lc}[${NotifierBase_V1.name}]`;

//     getNotifierIb(classname: string): string {
//         const lc = `${this.lc}[${this.getNotifierIb.name}]`;
//         if (!classname) {
//             classname = this.lc?.replace('[','').replace(']','') || NotifierBase_V1.name+'_descendant';
//             console.warn(`${lc} classname is falsy. Using ${classname}.`);
//         }
//         const name = this.data?.name || c.IBGIB_SPACE_NAME_DEFAULT;
//         return `witness space ${classname} ${name}`;
//     }

//     getNotifierArgMetadata(): string {
//         return `${this.ib} ${getTimestampInTicks()}`;
//     }
//     getNotifierResultMetadata(): string {
//         return `${this.ib} ${getTimestampInTicks()}`;
//     }

//     constructor(initialData?: TData, initialRel8ns?: TRel8ns) {
//         super(initialData, initialRel8ns);
//     }

//     /**
//      * In a Notifier, we are concerned with getting ibGibs out of and putting ibGibs into a "space".
//      *
//      * So in this base, we take the incoming arg and divert it multiple ways, depending on our settings.
//      */
//     protected async witnessImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.witnessImpl.name}]`;
//         if (logalot) { console.log(`${lc}`); }

//         // do the thing
//         let result = await this.routeAndDoCommand({
//             cmd: arg.data!.cmd,
//             cmdModifiers: arg.data!.cmdModifiers ?? [],
//             arg,
//         });

//         // persist the arg and result if we're configured to do so
//         if (result && this.data.persistOptsAndResultIbGibs) {
//             try {
//                 await this.persistOptsAndResultIbGibs({arg, result});
//             } catch (error) {
//                 const emsg = `${lc} ${error.message}`;
//                 console.error(emsg);
//             }
//         }

//         return result;
//     }

//     protected abstract persistOptsAndResultIbGibs({arg, result}:
//         {arg: TOptionsIbGib, result: TResultIbGib}): Promise<void>;

//     /**
//      * Routes the given `cmd` to the correct handling function in the space,
//      * and executes that function.
//      *
//      * Override this if you have custom commands to handle.
//      * Check for those first, and if not among them, call this
//      * via `super.doCommand(...)`. If cmd is still not found,
//      * this will throw.
//      */
//     protected routeAndDoCommand<TCmdModifier extends IbGibNotifierOptionsCmdModifier = IbGibNotifierOptionsCmdModifier>({
//         cmd,
//         cmdModifiers,
//         arg,
//     }: {
//         cmd: IbGibNotifierOptionsCmd | string,
//         cmdModifiers: (IbGibNotifierOptionsCmdModifier | string)[],
//         arg: TOptionsIbGib,
//     }): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.routeAndDoCommand.name}]`;
//         switch (cmd) {
//             case IbGibNotifierOptionsCmd.get:
//                 if ((cmdModifiers ?? []).length === 0) {
//                     return this.get(arg);
//                 } else if (cmdModifiers.includes('can')) {
//                     return this.canGet(arg);
//                 } else if (cmdModifiers.includes('addrs')) {
//                     return this.getAddrs(arg);
//                 } else if (cmdModifiers.includes('latest')) {
//                     return this.getLatest(arg);
//                 } else {
//                     return this.get(arg);
//                 }

//             case IbGibNotifierOptionsCmd.put:
//                 if ((cmdModifiers ?? []).length === 0) {
//                     return this.put(arg);
//                 } else if (cmdModifiers.includes('can')) {
//                     return this.canPut(arg);
//                 } else {
//                     return this.put(arg);
//                 }

//             case IbGibNotifierOptionsCmd.delete:
//                 if ((cmdModifiers ?? []).length === 0) {
//                     return this.delete(arg);
//                 } else if (cmdModifiers.includes('can')) {
//                     return this.canDelete(arg);
//                 } else {
//                     return this.delete(arg);
//                 }

//             default:
//                 throw new Error(`${lc} unknown cmd: ${cmd}. cmdModifiers: ${cmdModifiers}`);
//         }
//     }

//     protected get(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getImpl(arg); }
//     protected abstract getImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;

//     protected put(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.putImpl(arg); }
//     protected abstract putImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;

//     protected delete(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.deleteImpl(arg); }
//     protected deleteImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.deleteImpl.name}]`;
//         throw new Error(`${lc} not implemented`);
//     }

//     protected getAddrs(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getAddrsImpl(arg); }
//     protected getAddrsImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.getAddrsImpl.name}]`;
//         throw new Error(`${lc} not implemented`);
//     }

//     protected getLatest(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.getLatestImpl(arg); }
//     protected getLatestImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.getLatestImpl.name}]`;
//         throw new Error(`${lc} not implemented`);
//     }

//     protected canGet(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.canGetImpl(arg); }
//     protected canGetImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.canGetImpl.name}]`;
//         throw new Error(`${lc} not implemented`);
//     }

//     protected canPut(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.canPutImpl(arg); }
//     protected canPutImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.canPutImpl.name}]`;
//         throw new Error(`${lc} not implemented`);
//     }

//     protected canDelete(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> { return this.canPutImpl(arg); }
//     protected canDeleteImpl(arg: TOptionsIbGib): Promise<TResultIbGib | undefined> {
//         const lc = `${this.lc}[${this.canDeleteImpl.name}]`;
//         throw new Error(`${lc} not implemented`);
//     }

//     protected async validateWitnessArg(arg: TOptionsIbGib): Promise<string[]> {
//         const lc = `${this.lc}[${this.validateWitnessArg.name}]`;
//         let errors: string[] = [];
//         try {
//             errors = await super.validateWitnessArg(arg);
//             if (!arg.data) { errors.push(`arg.data required`); return errors; } // <<<< returns immediately
//             const { cmd, ibGibAddrs, } = arg.data!;
//             let cmdModifiers = arg.data!.cmdModifiers ?? [];
//             const ibGibs  = arg.ibGibs;
//             if (!cmd) { errors.push(`arg.data.cmd required`); }
//             if (!Object.values(IbGibNotifierOptionsCmd).includes(<any>cmd)) { errors.push(`unknown arg.data.cmd: ${cmd}`); }
//             if (
//                 cmd === IbGibNotifierOptionsCmd.get &&
//                 !cmdModifiers?.includes('addrs') && // we allow get addrs to be get ALL addrs
//                 !cmdModifiers?.includes('latest') &&
//                 (ibGibAddrs || []).length === 0
//             ) {
//                 errors.push(`ibGibAddrs required when cmd is ${cmd}`);
//             }
//             if (cmd === IbGibNotifierOptionsCmd.put && (ibGibs || []).length === 0) {
//                 errors.push(`ibGibs required when cmd is ${cmd}`);
//             }
//             return errors;
//         } catch (error) {
//             console.error(`${lc} ${error.message}`);
//             throw error;
//         } finally {
//             if (errors?.length > 0) { console.error(`${lc} errors: ${errors}`); }
//         }
//     }

//     /**
//      * builds an arg ibGib.
//      *
//      * wrapper convenience to avoid long generic calls.
//      */
//     async argy({
//         argData,
//         ibMetadata,
//         noTimestamp,
//         ibGibs,
//     }: {
//         argData: TOptionsData,
//         ibMetadata?: string,
//         noTimestamp?: boolean,
//         ibGibs?: TIbGib[],
//     }): Promise<TOptionsIbGib> {
//         const arg = await argy_<TOptionsData, TOptionsRel8ns, TOptionsIbGib>({
//             argData,
//             ibMetadata,
//             noTimestamp
//         });

//         if (ibGibs) { arg.ibGibs = ibGibs; }

//         return arg;
//     }

//     /**
//      * builds a result ibGib.
//      *
//      * wrapper convenience to avoid long generic calls.
//      */
//     async resulty({
//         resultData,
//         ibGibs,
//     }: {
//         resultData: TResultData,
//         ibGibs?: TIbGib[],
//     }): Promise<TResultIbGib> {
//         const result = await resulty_<TResultData, TResultIbGib>({
//             ibMetadata: this.getNotifierResultMetadata(),
//             resultData,
//         });
//         if (ibGibs) { result.ibGibs = ibGibs; }
//         return result;
//     }

// }
