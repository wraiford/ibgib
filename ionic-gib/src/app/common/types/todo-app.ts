import { AppData_V1, AppRel8ns_V1 } from "./app";

export const DEFAULT_UUID_TODO_APP = undefined;
export const DEFAULT_NAME_TODO_APP = 'todo_gib';
export const DEFAULT_DESCRIPTION_TODO_APP =
    `Todo app for viewing & interacting with ibgibs like checklists.`;


export interface TodoAppData_V1 extends AppData_V1 {

}

export interface TodoAppRel8ns_V1 extends AppRel8ns_V1 {

}

/**
 * Default data values for a random app.
 *
 * If you change this, please bump the version
 *
 * (but of course won't be the end of the world when this doesn't happen).
 */
export const DEFAULT_TODO_APP_DATA_V1: TodoAppData_V1 = {
    version: '1',
    uuid: DEFAULT_UUID_TODO_APP,
    name: DEFAULT_NAME_TODO_APP,
    description: DEFAULT_DESCRIPTION_TODO_APP,
    // classname: TodoApp_V1.name,
    classname: `TodoApp_V1`,

    icon: 'checkbox',

    persistOptsAndResultIbGibs: false,
    allowPrimitiveArgs: true,
    catchAllErrors: true,
    trace: false,
}
export const DEFAULT_TODO_APP_REL8NS_V1: TodoAppRel8ns_V1 = undefined;
