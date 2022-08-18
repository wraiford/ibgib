import { IbGibAddr, IbGibRel8ns } from 'ts-gib/dist/types';
import { IbGib_V1 } from 'ts-gib/dist/V1';

export interface RawExportData_V1 {
    dependencyGraphAsString: string,
    contextIbGibAddr: IbGibAddr;
    tjpAddr?: IbGibAddr;
}

export interface RawExportRel8ns_V1 extends IbGibRel8ns { }

/**
 * Ibgib that contains an entire export of a given ibgib.
 *
 * This could potentially be huge, so I'm naming it "Raw" in hopes
 * that in the future some type of sharding & compression might happen.
 */
export interface RawExportIbGib_V1 extends IbGib_V1<RawExportData_V1, RawExportRel8ns_V1> { }
