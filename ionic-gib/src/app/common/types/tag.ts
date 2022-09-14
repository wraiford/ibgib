import { IbGibAddr } from "ts-gib";
import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";

import * as c from '../../common/constants';

export interface TagData_V1 {
    text: string;
    icon?: string;
    description?: string;
}

export interface TagRel8ns_V1 extends IbGibRel8ns_V1 {
    [c.TAG_REL8N_NAME]?: IbGibAddr[];
}

export interface TagIbGib_V1 extends IbGib_V1<TagData_V1, TagRel8ns_V1> {

}
