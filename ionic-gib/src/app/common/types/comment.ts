import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";

/**
 * Data for a comment ibGib
 */
export interface CommentData_V1 {
    text: string;
    textTimestamp?: string;
    timestamp?: string;
}

export interface CommentRel8ns_V1 extends IbGibRel8ns_V1 {
}

export interface CommentIbGib_V1 extends IbGib_V1<CommentData_V1, CommentRel8ns_V1> {
}
