import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";

/**
 * Data for a link ibGib
 */
export interface LinkData_V1 {
    text: string;
    textTimestamp?: string;
    timestamp?: string;
}

export interface LinkRel8ns_V1 extends IbGibRel8ns_V1 {
}

export interface LinkIbGib_V1 extends IbGib_V1<LinkData_V1, LinkRel8ns_V1> {
}
