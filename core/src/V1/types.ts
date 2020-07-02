/**
 * The core of the simplicity of the ibGib protocol is that you are
 * taking two (or more) ibGibs and producing other ibGibs.
 *
 * There are three primary functions: mut8, rel8, fork
 *
 * These are actually different aspects of the single function of
 * relationship and time, either:
 *   1) Creating a 'new' timeline, or...
 *   2) Extending an existing one.
 *
 * Mut8 is intrinsic, rel8 is extrinsic, fork is a new timeline.
 * Mut8 changes a timeline, rel8 changes a timeline's link(s),
 * fork creates a new timeline.
 */
import { IbGibRel8ns, IbGibAddr, IbGibWithDataAndRel8ns, TransformType, CanGetIbGibOptions, GetIbGibOptions, CanPutIbGibOptions, PutIbGibOptions, IbGibRepo } from '../types';

export declare type IbGibData_V1 = {
    [key: string]: any;
};
/**
 * Convenience enum to avoid spelling mistakes. (optional)
 */
export enum Rel8n {
    past = 'past',
    ancestor = 'ancestor',
    dna = 'dna',
    identity = 'identity',
}
export interface IbGibRel8ns_V1 extends IbGibRel8ns {
    [Rel8n.past]?: IbGibAddr[];
    [Rel8n.identity]?: IbGibAddr[];
    [Rel8n.ancestor]?: IbGibAddr[];
    [Rel8n.dna]?: IbGibAddr[];
}
export interface IbGib_V1<TData = IbGibData_V1>
    extends IbGibWithDataAndRel8ns<TData, IbGibRel8ns_V1> {
}

export interface IbGibRepo_V1 extends IbGibRepo<IbGib_V1> {
    canGet(opts: CanGetIbGibOptions): boolean;
    get(opts: GetIbGibOptions): Promise<IbGib_V1 | null>;
    canPut(opts: CanPutIbGibOptions): boolean;
    put(opts: PutIbGibOptions): Promise<boolean>;
}
