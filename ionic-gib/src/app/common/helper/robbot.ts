import * as h from 'ts-gib/dist/helper';
import { Ib, } from 'ts-gib';

import * as c from '../constants';
import { getRegExp, getTimestampInTicks } from './utils';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';
import { CommonService } from '../../services/common.service';
import {
    RobbotData_V1, RobbotIbGib_V1,
    // RobbotOutputMode, VALID_ROBBOT_OUTPUT_MODES
} from '../types/robbot';
import { getFn_promptRobbotIbGib } from './prompt-functions';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { WitnessFormBuilder } from './witness';
import { validateIbGibIntrinsically } from './validate';
import { persistTransformResult, registerNewIbGib, rel8ToSpecialIbGib } from './space';
import { IbGib_V1 } from 'ts-gib/dist/V1';
// import { validateWitnessClassname } from '../witnesses/witness-helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;


export function getRobbotResultMetadata({robbot}: {robbot: IbGibRobbotAny}): string {
    return `${robbot.ib} ${getTimestampInTicks()}`;
}


export function validateCommonRobbotData({
    robbotData,
}: {
    robbotData: RobbotData_V1,
}): string[] {
    const lc = `[${validateCommonRobbotData.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }
        if (!robbotData) { throw new Error(`robbotData required (E: 1ac78ffae5354b67acb64a34cfe23c2f)`); }
        const errors: string[] = [];
        const {
            name, uuid, classname,
            outputPrefix, outputSuffix,
            // outputMode,
        } =
            robbotData;

        if (name) {
            if (!name.match(c.ROBBOT_NAME_REGEXP)) {
                errors.push(`name must match regexp: ${c.ROBBOT_NAME_REGEXP}`);
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

        if (outputPrefix) {
            if (!outputPrefix.match(c.ROBBOT_PREFIX_SUFFIX_REGEXP)) {
                errors.push(`outputPrefix must match regexp: ${c.ROBBOT_PREFIX_SUFFIX_REGEXP}`);
            }
        }

        if (outputSuffix) {
            if (!outputSuffix.match(c.ROBBOT_PREFIX_SUFFIX_REGEXP)) {
                errors.push(`outputSuffix must match regexp: ${c.ROBBOT_PREFIX_SUFFIX_REGEXP}`);
            }
        }

        // if (outputMode) {
        //     if (!VALID_ROBBOT_OUTPUT_MODES.includes(outputMode)) {
        //         errors.push(`invalid outputMode (${outputMode}). Must be a value from ${VALID_ROBBOT_OUTPUT_MODES}`);
        //     }
        // }

        // if (tagOutput !== undefined) {
        //     const tagOutputType = typeof tagOutput;
        //     if (tagOutputType !== 'boolean') {
        //         errors.push(`invalid tagOutputType (${tagOutputType}). should be boolean if set.`);
        //     }
        // }

        if (classname) {
            if (!classname.match(c.ROBBOT_NAME_REGEXP)) {
                errors.push(`classname must match regexp: ${c.ROBBOT_NAME_REGEXP}`);
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

export function getRobbotIb({
    robbotData,
    classname,
}: {
    robbotData: RobbotData_V1,
    classname?: string,
}): Ib {
    const lc = `[${getRobbotIb.name}]`;
    try {
        const validationErrors = validateCommonRobbotData({robbotData});
        if (validationErrors.length > 0) { throw new Error(`invalid robbotData: ${validationErrors} (E: 390316b7c4fb0bd104ddc4e6c2e12922)`); }
        if (classname) {
            if (robbotData.classname && robbotData.classname !== classname) { throw new Error(`classname does not match robbotData.classname (E: e21dbc830856fbcee1d3ab260b0c5922)`); }
        } else {
            classname = robbotData.classname;
            if (!classname) { throw new Error(`classname required (E: e0519f89df8a468c8743cb932f436bfe)`); }
        }

        // ad hoc validation here. should centralize witness classname validation
        // let classnameValidationError = validateWitnessClassname({classname});
        // if (classnameValidationError) { throw new Error(`invalid classname. ${classnameValidationError} (E: 20fddb54342743a383c33c87a1db9343)`); }

        const { name, uuid } = robbotData;
        return `witness robbot ${classname} ${name} ${uuid}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Current schema is `witness robbot [classname] [robbotName] [robbotId]
 *
 * NOTE this is space-delimited
 */
export function getInfoFromRobbotIb({
    robbotIb,
}: {
    robbotIb: Ib,
}): {
    robbotClassname: string,
    robbotName: string,
    robbotId: string,
} {
    const lc = `[${getInfoFromRobbotIb.name}]`;
    try {
        if (!robbotIb) { throw new Error(`robbotIb required (E: 4a35881058094f1a90bb4ea37052d6d7)`); }

        // const name = robbot.data?.name || c.IBGIB_ROBBOT_NAME_DEFAULT;
        // const id = robbot.data?.uuid || undefined;
        // return `witness robbot ${classname} ${name} ${id}`;
        const pieces = robbotIb.split(' ');

        return {
            robbotClassname: pieces[2],
            robbotName: pieces[3],
            robbotId: pieces[4],
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

export async function createNewRobbot({
    common,
    space,
}: {
    common: CommonService,
    space: IbGibSpaceAny,
}): Promise<RobbotIbGib_V1 | undefined> {
    const lc = `[${createNewRobbot.name}]`;

    try {
        if (logalot) { console.log(`${lc} starting...`); }

        space = space ?? await common.ibgibs.getLocalUserSpace({lock: true});

        let newRobbotIbGib: RobbotIbGib_V1;

        // prompt user to create the ibgib, passing in null because we're
        // creating not editing.
        let resRobbot = await getFn_promptRobbotIbGib(common)(space, /**ibGib*/ null);
        const newRobbot = <IbGibRobbotAny>resRobbot.newIbGib;
        debugger;
        let allIbGibs: IbGib_V1[] = [];
        allIbGibs.push(newRobbot);
        resRobbot.intermediateIbGibs?.forEach(x => allIbGibs.push(x));
        resRobbot.dnas?.forEach(x => allIbGibs.push(x));
        for (let i = 0; i < allIbGibs.length; i++) {
            const ibGib = allIbGibs[i];
            const validationErrors = await validateIbGibIntrinsically({ibGib});
            if ((validationErrors ?? []).length > 0) { throw new Error(`(unexpected) invalid robbot ibgib created. validationErrors: ${validationErrors}. robbot: ${h.pretty(newRobbot.toDto())} (E: a683268621cd6dd3dd60310b164c4d22)`); }
        }
        debugger;

        await persistTransformResult({resTransform: resRobbot, isMeta: true, space});
        const { zeroSpace, fnBroadcast, fnUpdateBootstrap } = common.ibgibs;
        await registerNewIbGib({
            ibGib: newRobbot,
            space,
            zeroSpace,
            fnBroadcast: (x) => fnBroadcast(x),
            fnUpdateBootstrap: (x) => fnUpdateBootstrap(x),
        });

        await rel8ToSpecialIbGib({
            type: "robbots",
            rel8nName: c.ROBBOT_REL8N_NAME,
            ibGibsToRel8: [newRobbot],
            space,
            zeroSpace,
            fnUpdateBootstrap,
            fnBroadcast,
        });
        return newRobbotIbGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        return;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export class RobbotFormBuilder extends WitnessFormBuilder {
    protected lc: string = `${super.lc}[${RobbotFormBuilder.name}]`;

    constructor() {
        super();
        this.what = 'robbot';
    }

    // name<RobbotFormBuilder>({ of, required, }: { of: string; required?: boolean; }): RobbotFormBuilder {
    //     return <RobbotFormBuilder><any>super.name({of, required});
    // }
    // description<RobbotFormBuilder>({ of, required, }: { of: string; required?: boolean; }): RobbotFormBuilder {
    //     return <RobbotFormBuilder><any>super.description({of, required});
    // }

    // outputMode({
    //     of,
    //     required,
    // }: {
    //     of: string,
    //     required?: boolean,
    // }): RobbotFormBuilder {
    //     this.addItem({
    //         // witness.data.outputMode
    //         name: "outputMode",
    //         description: `Technical setting which proscribes how the robbot outputs its beliefs.`,
    //         label: "Output Mode",
    //         regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    //         regexpErrorMsg: `0 to 155 alphanumerics or chars: ${c.SAFE_SPECIAL_CHARS}`,
    //         // regexpSource: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}).source,
    //         dataType: 'checkbox',
    //         selectOptions: [
    //             RobbotOutputMode.context,
    //             RobbotOutputMode.subcontext,
    //         ],
    //         value: of,
    //         required,
    //     });
    //     return this;
    // }

    outputPrefix({
        of,
        required,
    }: {
        of: string,
        required?: boolean,
    }): RobbotFormBuilder {
        this.addItem({
            // witness.data.outputPrefix
            name: "outputPrefix",
            description: `Technical setting that sets a prefix for all text output of the robbot.`,
            label: "Output Prefix",
            regexp: c.ROBBOT_PREFIX_SUFFIX_REGEXP,
            regexpErrorMsg: c.ROBBOT_PREFIX_SUFFIX_REGEXP_DESC,
            dataType: 'textarea',
            value: of,
            required,
        });
        return this;
    }

    outputSuffix({
        of,
        required,
    }: {
        of: string,
        required?: boolean,
    }): RobbotFormBuilder {
        this.addItem({
            // witness.data.outputSuffix
            name: "outputSuffix",
            description: `Technical setting that sets a suffix for all text output of the ${this.what}. (like a signature)`,
            label: "Output Suffix",
            regexp: c.ROBBOT_PREFIX_SUFFIX_REGEXP,
            regexpErrorMsg: c.ROBBOT_PREFIX_SUFFIX_REGEXP_DESC,
            dataType: 'textarea',
            value: of,
            required,
        });
        return this;
    }

}