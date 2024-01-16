import { AppData_V1, AppRel8ns_V1 } from "./app";

export const DEFAULT_UUID_CHAT_APP = undefined;
export const DEFAULT_NAME_CHAT_APP = 'chat_gib';
export const DEFAULT_DESCRIPTION_CHAT_APP =
    `A chat app done ibgib style, enabling infinitely nesting comments, pics and links. It's ibgibs all the way down...`;


export interface ChatAppData_V1 extends AppData_V1 {

}


export interface ChatAppRel8ns_V1 extends AppRel8ns_V1 {

}

/**
 * Default data values for a random app.
 *
 * If you change this, please bump the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
export const DEFAULT_CHAT_APP_DATA_V1: ChatAppData_V1 = {
    version: '1',
    uuid: DEFAULT_UUID_CHAT_APP,
    name: DEFAULT_NAME_CHAT_APP,
    description: DEFAULT_DESCRIPTION_CHAT_APP,
    // classname: ChatApp_V1.name,
    classname: `ChatApp_V1`,

    icon: 'chatbubbles',

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}
export const DEFAULT_CHAT_APP_REL8NS_V1: ChatAppRel8ns_V1 = undefined;
