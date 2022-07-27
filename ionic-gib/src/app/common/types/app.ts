import { IbGibAddr } from "ts-gib";
import { IbGibRel8ns_V1, IbGib_V1 } from "ts-gib/dist/V1";

import * as c from '../constants';
import { IonicSpaceData_V1 } from "../witnesses/spaces/ionic-space-v1";
import {
  WitnessData_V1, WitnessRel8ns_V1,
  WitnessCmdData, WitnessCmdRel8ns, WitnessCmdIbGib,
  WitnessResultData, WitnessResultRel8ns, WitnessResultIbGib,
} from "./witness";


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
export interface ConfigIbGib_V1 extends IbGib_V1<AppSpaceData, AppSpaceRel8ns> { }


export interface AppData_V1 extends WitnessData_V1 {

  /**
   * Name of a App instance...after all, Robbie was only the first App.
   */
  name: string;

  /**
   * Redeclared over {@link WitnessData_V1.uuid} making it a required field.
   */
  uuid: string;

  /**
   * Right now, this will be just for ionicons.
   */
  icon: string;

}


export interface AppRel8ns_V1 extends WitnessRel8ns_V1 {
}

/**
 */
export interface AppIbGib_V1 extends IbGib_V1<AppData_V1, AppRel8ns_V1> {
}

/**
 * Cmds for interacting with ibgib spaces.
 *
 * Not all of these will be implemented for every space.
 *
 * ## todo
 *
 * change these commands to better structure, e.g., verb/do/mod, can/get/addrs
 * */
export type AppCmd =
  'ib' | 'gib' | 'ibgib';
/** Cmds for interacting with ibgib spaces. */
export const AppCmd = {
  /**
   * it's more like a grunt that is intepreted by context from the app.
   *
   * my initial use of this will be to
   * ...
   */
  ib: 'ib' as AppCmd,
  /**
   * it's more like a grunt that is intepreted by context from the app.
   *
   * my initial use of this will be to indicate to a app ...
   */
  gib: 'gib' as AppCmd,
  /**
   * third placeholder command.
   *
   * I imagine this will be like "what's up", but who knows.
   */
  ibgib: 'ibgib' as AppCmd,
}

/**
 * Flags to affect the command's interpretation.
 */
export type AppCmdModifier =
  'ib' | 'gib' | 'ibgib';
/**
 * Flags to affect the command's interpretation.
 */
export const AppCmdModifier = {
  /**
   * hmm...
   */
  ib: 'ib' as AppCmdModifier,
  /**
   * hmm...
   */
  gib: 'gib' as AppCmdModifier,
  /**
   * hmm...
   */
  ibgib: 'ibgib' as AppCmdModifier,
}

/** Information for interacting with spaces. */
export interface AppCmdData
  extends WitnessCmdData<AppCmd, AppCmdModifier> {
}

export interface AppCmdRel8ns extends WitnessCmdRel8ns {
}

/**
 * Shape of options ibgib if used for a app.
 *
 * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface AppCmdIbGib<
  TIbGib extends IbGib_V1 = IbGib_V1,
  TCmdData extends AppCmdData = AppCmdData,
  TCmdRel8ns extends AppCmdRel8ns = AppCmdRel8ns,
  > extends WitnessCmdIbGib<TIbGib, AppCmd, AppCmdModifier, TCmdData, TCmdRel8ns> {
}

/**
 * Optional shape of result data to app interactions.
 *
 * This is in addition of course to {@link WitnessResultData}.
 *
 * ## notes
 *
 * * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface AppResultData extends WitnessResultData {
}

/**
 * Marker interface rel8ns atm...
 *
 * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface AppResultRel8ns extends WitnessResultRel8ns { }

/**
 * Shape of result ibgib if used for a app.
 *
 * I'm not sure what to do with this atm, so I'm just stubbing out...
 */
export interface AppResultIbGib<
  TIbGib extends IbGib_V1,
  TResultData extends AppResultData,
  TResultRel8ns extends AppResultRel8ns
  >
  extends WitnessResultIbGib<TIbGib, TResultData, TResultRel8ns> {
}

/**
 * this is generated in background.js (WARNING! background.js atow is generated
 * from background.v2.js or background.v3.js . ...do NOT make changes directly
 * in background.js!).
 *
 * When the user is in their browser with the ibgib extension and selects some
 * text or clicks an ibgib context menu item to initiate the app, this info is
 * passed to the app via query params (atow).
 */
export interface ExtensionLaunchInfo {
  /** brand the event so we know it's ours */
  ib: boolean;
  /**
   * indicate to the receiving angular app that we're launching
   * from an extension in firefox/chrome. (this is obvious here in
   * background.js but in the angular app, not so much).
   */
  isExtensionLaunch: boolean;
  /**
   * So consumer knows where this is coming from. (obvious to us
   * here, but helps consumer)
   */
  lc: string,
  /**
   * text of the context menu clicked
   * @link https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
   */
  menuItemId: string;
  /**
   * url of the page that _initiates_ the click and starts the app.
   * so if the user is on wikipedia.org, selects some text and clicks on the ibgib link,
   * in order to generate some ibgib data based on the page, this will be
   * https://en.wikipedia.org/wiki/Phanerozoic (or whatever).
   *
   * @link https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
   */
  pageUrl: string;
  /**
   * selected text when initiating the app.
   *
   * @link https://developer.chrome.com/docs/extensions/reference/contextMenus/#type-OnClickData
   */
  selectionText?: string;
}
