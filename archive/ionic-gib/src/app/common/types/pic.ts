import { IbGibAddr } from "ts-gib";
import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";
import { BinIbGib_V1 } from "./bin"; // js-doc reference

import * as c from '../constants';

/**
 * Data for a pic ibGib
 *
 * @see {@link BinIbGib_V1}
 */
export interface PicData_V1 {
    binHash: string;
    binHashThumb?: string;
    ext: string;
    filename: string;
    timestamp: string;
}

export interface PicRel8ns_V1 extends IbGibRel8ns_V1 {
    [c.BINARY_REL8N_NAME]: IbGibAddr[];
}

export interface PicIbGib_V1 extends IbGib_V1<PicData_V1, PicRel8ns_V1> {

}
