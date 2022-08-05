import { AppData_V1, AppRel8ns_V1 } from "./app";

export const DEFAULT_UUID_RAW_APP = undefined;
export const DEFAULT_NAME_RAW_APP = 'raw_gib';
export const DEFAULT_DESCRIPTION_RAW_APP =
    `Explorer app for navigating raw ibgib data.`;


export interface RawAppData_V1 extends AppData_V1 {

}

export interface RawAppRel8ns_V1 extends AppRel8ns_V1 {

}

/**
 * Default data values for a random app.
 *
 * If you change this, please bump the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
export const DEFAULT_RAW_APP_DATA_V1: RawAppData_V1 = {
    version: '1',
    uuid: DEFAULT_UUID_RAW_APP,
    name: DEFAULT_NAME_RAW_APP,
    description: DEFAULT_DESCRIPTION_RAW_APP,
    // classname: RawApp_V1.name,
    classname: `RawApp_V1`,

    icon: 'paper-plane',

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}
export const DEFAULT_RAW_APP_REL8NS_V1: RawAppRel8ns_V1 = undefined;
