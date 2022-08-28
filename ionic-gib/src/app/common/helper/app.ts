import * as h from 'ts-gib/dist/helper';
import { Gib, Ib, } from 'ts-gib';

import * as c from '../constants';
import { getRegExp, getTimestampInTicks } from './utils';
import { IbGibAppAny } from '../witnesses/apps/app-base-v1';
import { CommonService } from '../../services/common.service';
import {
    AppData_V1, AppIbGib_V1,
    // AppOutputMode, VALID_APP_OUTPUT_MODES
} from '../types/app';
import { getFn_promptAppIbGib } from './prompt-functions';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { WitnessFormBuilder } from './witness';
import { validateIbGibIntrinsically } from './validate';
import { persistTransformResult, registerNewIbGib, rel8ToSpecialIbGib } from './space';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { IbgibsService } from '../../services/ibgibs.service';
// import { validateWitnessClassname } from '../witnesses/witness-helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;


export function getAppResultMetadata({ app }: { app: IbGibAppAny }): string {
    return `${app.ib} ${getTimestampInTicks()}`;
}

export function validateCommonAppData({
    appData,
}: {
    appData: AppData_V1,
}): string[] {
    const lc = `[${validateCommonAppData.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!appData) { throw new Error(`appData required (E: 3df782b29bc4406a87e4895cfcea28ed)`); }
        const errors: string[] = [];
        const {
            name, uuid, classname,
            // outputPrefix, outputSuffix,
            // outputMode,
        } =
            appData;

        if (name) {
            if (!name.match(c.APP_NAME_REGEXP)) {
                errors.push(`name must match regexp: ${c.APP_NAME_REGEXP}`);
            }
        } else {
            errors.push(`name required.`);
        }

        if (uuid) {
            if (!uuid.match(c.UUID_REGEXP)) {
                errors.push(`uuid must match regexp: ${c.UUID_REGEXP}`);
            }
        } else {
            errors.push(`uuid required.`);
        }

        // if (outputPrefix) {
        //     if (!outputPrefix.match(c.APP_PREFIX_SUFFIX_REGEXP)) {
        //         errors.push(`outputPrefix must match regexp: ${c.APP_PREFIX_SUFFIX_REGEXP}`);
        //     }
        // }

        // if (outputSuffix) {
        //     if (!outputSuffix.match(c.APP_PREFIX_SUFFIX_REGEXP)) {
        //         errors.push(`outputSuffix must match regexp: ${c.APP_PREFIX_SUFFIX_REGEXP}`);
        //     }
        // }

        // if (outputMode) {
        //     if (!VALID_APP_OUTPUT_MODES.includes(outputMode)) {
        //         errors.push(`invalid outputMode (${outputMode}). Must be a value from ${VALID_APP_OUTPUT_MODES}`);
        //     }
        // }

        // if (tagOutput !== undefined) {
        //     const tagOutputType = typeof tagOutput;
        //     if (tagOutputType !== 'boolean') {
        //         errors.push(`invalid tagOutputType (${tagOutputType}). should be boolean if set.`);
        //     }
        // }

        if (classname) {
            if (!classname.match(c.APP_NAME_REGEXP)) {
                errors.push(`classname must match regexp: ${c.APP_NAME_REGEXP}`);
            }
        }

        return errors;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function getAppIb({
    appData,
    classname,
}: {
    appData: AppData_V1,
    classname?: string,
}): Ib {
    const lc = `[${getAppIb.name}]`;
    try {
        const validationErrors = validateCommonAppData({ appData });
        if (validationErrors.length > 0) { throw new Error(`invalid appData: ${validationErrors} (E: 9aff04f0cfc54a5188ca8bc40764160d)`); }
        if (classname) {
            if (appData.classname && appData.classname !== classname) { throw new Error(`classname does not match appData.classname (E: 66f1447eef97485fba521c40980f5eb5)`); }
        } else {
            classname = appData.classname;
            if (!classname) { throw new Error(`classname required (E: 5f6ffb4317044125b94f662070e1f40b)`); }
        }

        const { name, uuid } = appData;
        return `app ${classname} ${name} ${uuid}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Current schema is `app ${classname} ${name} ${uuid}`
 *
 * NOTE this is space-delimited
 */
export function getInfoFromAppIb({
    appIb,
}: {
    appIb: Ib,
}): {
    appClassname: string,
    appName: string,
    appId: string,
} {
    const lc = `[${getInfoFromAppIb.name}]`;
    try {
        if (!appIb) { throw new Error(`appIb required (E: 6b065aee67e641ba9f9c6db367ebb0fb)`); }

        const pieces = appIb.split(' ');

        return {
            appClassname: pieces[1],
            appName: pieces[2],
            appId: pieces[3],
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export function getAppInfoIb({
    appData,
    appTjpGib,
    classname,
}: {
    appData: AppData_V1,
    appTjpGib: Gib,
    /**
     * Not sure why i have this here, since it should always be in the appData.classname...
     */
    classname?: string,
}): Ib {
    const lc = `[${getAppIb.name}]`;
    try {
        const validationErrors = validateCommonAppData({ appData });
        if (validationErrors.length > 0) { throw new Error(`invalid appData: ${validationErrors} (E: 7be1f54ce8af4e4982966b2dedb4cf6e)`); }
        if (classname) {
            if (appData.classname && appData.classname !== classname) { throw new Error(`classname does not match appData.classname (E: 64bd9eaef1f94be8856e18b791d4ae52)`); }
        } else {
            classname = appData.classname;
            if (!classname) { throw new Error(`classname required (E: 8d194cf8fb3f4c8eb2f708e0ccfe187c)`); }
        }

        const { name, uuid } = appData;
        return `info_app ${classname} ${name} ${uuid} ${appTjpGib ?? 0}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Current schema is `info_app ${classname} ${name} ${uuid} ${appTjpGib ?? 0}`
 *
 * NOTE this is space-delimited
 */
export function getInfoFromAppInfoIb({
    appInfoIb,
}: {
    appInfoIb: Ib,
}): {
    appClassname: string;
    appName: string;
    appId: string;
    appTjpGib: Gib;
} {
    const lc = `[${getInfoFromAppIb.name}]`;
    try {
        if (!appInfoIb) { throw new Error(`appInfoIb required (E: d12756f218144d22acb14c794dd3eeef)`); }

        const pieces = appInfoIb.split(' ');

        if (pieces.length !== 5) { throw new Error(`invalid appInfoIb. Expected space-delimited pieces.length === 5 (E: 21bfc58e4d88c298680ea95bc6dfc622)`); }

        return {
            appClassname: pieces[1],
            appName: pieces[2],
            appId: pieces[3],
            appTjpGib: pieces[4],
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}


/**
 * Prompts the user a form to build the app.
 *
 * Once prompted, the app is:
 * 1. validated
 * 2. persisted in the given {@link space}
 * 3. registered with the space
 * 4. related to the space's special apps index
 * 5. new app is returned
 *
 * @returns newly created app ibgib (witness)
 */
export async function createNewApp({
    common,
    ibgibs,
    space,
}: {
    /**
     * Either {@link common} or {@link ibgibs} is required
     * @hack
     */
    common?: CommonService,
    /**
     * Either {@link common} or {@link ibgibs} is required
     * @hack
     */
    ibgibs?: IbgibsService,
    /**
     * space within which to create the app. if not provided, the
     * defaults to the local user space via {@link common} or {@link ibgibs}.
     */
    space: IbGibSpaceAny,
}): Promise<IbGibAppAny | undefined> {
    const lc = `[${createNewApp.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!common && !ibgibs) { throw new Error(`(UNEXPECTED) either common or ibgibs service required. (E: b24e78de0d204dc78909022bee296b30)`); }
        ibgibs = ibgibs ?? common.ibgibs;

        space = space ?? await ibgibs.getLocalUserSpace({ lock: true });

        // prompt user to create the ibgib, passing in null because we're
        // creating not editing.
        let resApp = common ?
            await getFn_promptAppIbGib(common)(space, /**ibGib*/ null) :
            await ibgibs.fnPromptApp(space, /*ibGib*/ null);

        /** this should be the witness class itself at this point. */
        const newApp = <IbGibAppAny>resApp.newIbGib;

        let allIbGibs: IbGib_V1[] = [];
        allIbGibs.push(newApp);
        resApp.intermediateIbGibs?.forEach((x: IbGib_V1) => allIbGibs.push(x));
        resApp.dnas?.forEach((x: IbGib_V1) => allIbGibs.push(x));
        for (let i = 0; i < allIbGibs.length; i++) {
            const ibGib = allIbGibs[i];
            const validationErrors = await validateIbGibIntrinsically({ ibGib });
            if ((validationErrors ?? []).length > 0) { throw new Error(`(unexpected) invalid app ibgib created. validationErrors: ${validationErrors}. app: ${h.pretty(newApp.toIbGibDto())} (E: 54cfc2f6bc284ed79be91d2da5e4bd2f)`); }
        }

        await persistTransformResult({ resTransform: resApp, isMeta: true, space });
        const { zeroSpace, fnBroadcast, fnUpdateBootstrap } = ibgibs;
        await registerNewIbGib({
            ibGib: newApp,
            space,
            zeroSpace,
            fnBroadcast: (x) => fnBroadcast(x),
            fnUpdateBootstrap: (x) => fnUpdateBootstrap(x),
        });

        await rel8ToSpecialIbGib({
            type: "apps",
            rel8nName: c.APP_REL8N_NAME,
            ibGibsToRel8: [newApp],
            space,
            zeroSpace,
            fnUpdateBootstrap,
            fnBroadcast,
        });
        return newApp;
    } catch (error) {
        debugger;
        console.error(`${lc} ${error.message}`);
        return;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export class AppFormBuilder extends WitnessFormBuilder {
    protected lc: string = `${super.lc}[${AppFormBuilder.name}]`;

    constructor() {
        super();
        this.what = 'app';
    }

    icon({
        of,
        required,
        defaultValue,
    }: {
        of: string,
        required?: boolean,
        defaultValue?: string,
    }): AppFormBuilder {
        const exampleIonicons = c.IONICONS.slice(0, 4).map(x => `"${x}"`).join(', ');
        this.addItem({
            // witness.data.outputPrefix
            name: "icon",
            description: `Icon name for the app's icon in the app bar. (NOTE: Only ionicons right now, e.g. ${exampleIonicons}). See https://ionic.io/ionicons for a full list.`,
            label: "Icon",
            fnValid: (x: string | number) => { return typeof x === 'string' && c.IONICONS.includes(x); },
            defaultErrorMsg: `Must be a valid ionicon selection, e.g. ${exampleIonicons}. See https://ionic.io/ionicons for a full list.`,
            dataType: 'select',
            value: of,
            defaultValue: defaultValue || 'beer',
            selectOptions: [
                ...c.IONICONS,
            ],
            required,
        });
        return this;
    }

    // outputSuffix({
    //     of,
    //     required,
    // }: {
    //     of: string,
    //     required?: boolean,
    // }): AppFormBuilder {
    //     this.addItem({
    //         // witness.data.outputSuffix
    //         name: "outputSuffix",
    //         description: `Technical setting that sets a suffix for all text output of the ${this.what}. (like a signature)`,
    //         label: "Output Suffix",
    //         regexp: c.APP_PREFIX_SUFFIX_REGEXP,
    //         regexpErrorMsg: c.APP_PREFIX_SUFFIX_REGEXP_DESC,
    //         dataType: 'textarea',
    //         value: of,
    //         required,
    //     });
    //     return this;
    // }

}

export function documentLocationIsAtWelcomePage(): boolean {
    return ['welcome', '/welcome', '/welcome/'].includes(document.location.pathname);
}
