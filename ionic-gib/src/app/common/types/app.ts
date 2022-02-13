import { IbGibAddr } from "ts-gib";
import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";
import { IonicSpaceData_V1 } from "../witnesses/spaces/ionic-space-v1";

export interface AppSpaceData extends IonicSpaceData_V1 { }

export enum AppSpaceRel8n {
  roots = 'roots',
  tags = 'tags',
  latest = 'latest',
  outerspaces = 'outerspaces',
  secrets = "secrets",
  encryptions = "encryptions",
}

export interface AppSpaceRel8ns extends IbGibRel8ns_V1 {
    [AppSpaceRel8n.tags]?: IbGibAddr[];
    [AppSpaceRel8n.roots]?: IbGibAddr[];
    [AppSpaceRel8n.latest]?: IbGibAddr[];
    [AppSpaceRel8n.outerspaces]?: IbGibAddr[];
    [AppSpaceRel8n.secrets]?: IbGibAddr[];
    [AppSpaceRel8n.encryptions]?: IbGibAddr[];
}

/**
 * An app space itself works as the config instead of
 * having an external config object.
 *
 * ## notes
 *
 * Probably need to change this at some point...
 */
export interface ConfigIbGib_V1 extends IbGib_V1<AppSpaceData, AppSpaceRel8ns> {}
