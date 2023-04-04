import { AppData_V1, AppRel8ns_V1 } from "./app";

export const DEFAULT_UUID_FLASH_APP = undefined;
export const DEFAULT_NAME_FLASH_APP = 'flash_gib';
export const DEFAULT_DESCRIPTION_FLASH_APP =
    `A flashcard app done ibgib style, where ibgib are the "cards" and are shown in various ways.`;


export interface FlashAppData_V1 extends AppData_V1 {

}


export interface FlashAppRel8ns_V1 extends AppRel8ns_V1 {

}

/**
 * Default data values for a flash app.
 *
 * If you change this, please bump the version.
 */
export const DEFAULT_FLASH_APP_DATA_V1: FlashAppData_V1 = {
    version: '1',
    uuid: DEFAULT_UUID_FLASH_APP,
    name: DEFAULT_NAME_FLASH_APP,
    description: DEFAULT_DESCRIPTION_FLASH_APP,
    // classname: FlashApp_V1.name,
    classname: `FlashApp_V1`,

    icon: 'flash',

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}
export const DEFAULT_FLASH_APP_REL8NS_V1: FlashAppRel8ns_V1 = undefined;
