import * as h from 'ts-gib/dist/helper';
import { Ib, } from 'ts-gib';
import { Factory_V1 as factory } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { getRegExp, getSaferSubstring, getTimestampInTicks } from './utils';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';
import { CommonService } from '../../services/common.service';
import {
    DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING,
    RobbotData_V1, RobbotIbGib_V1, RobbotInteractionData_V1, RobbotInteractionIbGib_V1, RobbotInteractionRel8ns_V1,
    // RobbotOutputMode, VALID_ROBBOT_OUTPUT_MODES
} from '../types/robbot';
import { getFn_promptRobbotIbGib } from './prompt-functions';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { WitnessFormBuilder } from './witness';
import { validateIbGibIntrinsically } from './validate';
import { persistTransformResult, registerNewIbGib, rel8ToSpecialIbGib } from './space';
import { GIB, IB, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbgibsService } from '../../services/ibgibs.service';
import { isComment, parseCommentIb } from './comment';
import { CommentIbGib_V1 } from '../types/comment';
import { getGib } from 'ts-gib/dist/V1/transforms/transform-helper';
// import { validateWitnessClassname } from '../witnesses/witness-helper';

const logalot = c.GLOBAL_LOG_A_LOT || false;


export function getRobbotResultMetadata({ robbot }: { robbot: IbGibRobbotAny }): string {
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
        const validationErrors = validateCommonRobbotData({ robbotData });
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


/**
 * Prompts the user a form to build the robbot.
 *
 * Once prompted, the robbot is:
 * 1. validated
 * 2. persisted in the given {@link space}
 * 3. registered with the space
 * 4. related to the space's special robbots index
 * 5. new robbot is returned
 *
 * @returns newly created robbot ibgib (witness)
 */
export async function createNewRobbot({
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
     * space within which to create the robbot. if not provided, the
     * defaults to the local user space via {@link common} or {@link ibgibs}.
     */
    space: IbGibSpaceAny,
}): Promise<IbGibRobbotAny | undefined> {
    const lc = `[${createNewRobbot.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting...`); }

        if (!common && !ibgibs) { throw new Error(`(UNEXPECTED) either common or ibgibs service required. (E: 4be5d20dc81fcdabb8d7d4cd47458522)`); }
        ibgibs = ibgibs ?? common.ibgibs;

        space = space ?? await ibgibs.getLocalUserSpace({ lock: true });

        // prompt user to create the ibgib, passing in null because we're
        // creating not editing.
        let resRobbot = common ?
            await getFn_promptRobbotIbGib(common)(space, /**ibGib*/ null) :
            await ibgibs.fnPromptRobbot(space, /*ibGib because creating*/null);

        /** this should be the witness class itself at this point. */
        const newRobbot = <IbGibRobbotAny>resRobbot.newIbGib;
        let loading = await common.loadingCtrl.create({ message: 'creating...' });
        try {
            await loading.present();
            await h.delay(1000); // ensure that the user sees a creating message
            let allIbGibs: IbGib_V1[] = [];
            allIbGibs.push(newRobbot);
            resRobbot.intermediateIbGibs?.forEach(x => allIbGibs.push(x));
            resRobbot.dnas?.forEach(x => allIbGibs.push(x));
            for (let i = 0; i < allIbGibs.length; i++) {
                const ibGib = allIbGibs[i];
                const validationErrors = await validateIbGibIntrinsically({ ibGib });
                if ((validationErrors ?? []).length > 0) { throw new Error(`(unexpected) invalid robbot ibgib created. validationErrors: ${validationErrors}. robbot: ${h.pretty(newRobbot.toIbGibDto())} (E: a683268621cd6dd3dd60310b164c4d22)`); }
            }

            await persistTransformResult({ resTransform: resRobbot, isMeta: true, space });
            const { zeroSpace, fnBroadcast, fnUpdateBootstrap } = ibgibs;
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
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            await loading.dismiss();
        }
        return newRobbot;
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

/**
 * checks to see if the comment is an ibgib and if that comment starts
 * with the escape sequence.
 */
export function isRequestComment({
    ibGib,
    requestEscapeString = DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING,
}: {
    ibGib: IbGib_V1,
    requestEscapeString?: string,
}): boolean {
    const lc = `${isRequestComment.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: d7c49619ffb7a9c26d9d74959b91ae22)`); }
        debugger;

        if (!isComment({ ibGib })) { return false; /* <<<< returns early */ }

        let { ib } = ibGib;
        if (!ib) { throw new Error(`ib or ibGib.ib required (E: d92c26b15fc143977955a167b8b67522)`); }

        requestEscapeString = requestEscapeString || DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING;

        let { safeIbCommentText } = parseCommentIb({ ib });

        return safeIbCommentText.startsWith(requestEscapeString);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 *
 */
export function getRequestTextFromComment({
    ibGib,
    requestEscapeString = DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING,
}: {
    ibGib: IbGib_V1,
    requestEscapeString?: string,
}): string {
    const lc = `${getRequestTextFromComment.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: b4cbe054fe254414b77204ad80e519aa)`); }

        if (!isComment({ ibGib })) { throw new Error(`ibGib is not a comment (E: ab34df44eb57c170cec6c6db6f4f5722)`); }

        let { data } = ibGib;
        if (!data) { throw new Error(`ibGib.data required (E: 6155a49a0c1286c0bb8aa6f81c396522)`); }

        let { text } = data;

        requestEscapeString = requestEscapeString || DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING;

        text = getSaferSubstring({ text: text, length: 100, keepLiterals: [requestEscapeString] });

        const subText = text.substring(requestEscapeString.length).trim();
        return subText;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export const ROBBOT_INTERACTION_IB_ATOM = 'robbot_interaction';

export function getInteractionIb({
    data,
    addlDetailsText,
}: {
    data: RobbotInteractionData_V1,
    addlDetailsText?: string,
}): Ib {
    const lc = `[${getInteractionIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 9ac657cab7e292e2bd587595757ab622)`); }
        const atom = 'robbot_interaction';
        if (!data) { throw new Error(`data required (E: 8fac6ce2ae6dd521255dc8ba241a5222)`); }
        if (!data.type) { throw new Error(`data.type required (E: 77786fe653be04c9fa33e30ac3b77f22)`); }
        let saferType = getSaferSubstring({ text: data.type, length: 32 });
        if (data.type !== saferType) { throw new Error(`invalid data.type (${data.type}). Should be safer like (${saferType}) (E: efe7888da08f148c8972c0923356b122)`); }

        if (!data.timestamp) { throw new Error(`data.timestamp required (E: 8682a5af1cd48d0cb372b7f519a61e22)`); }
        let saferTimestamp = getSaferSubstring({ text: data.timestamp, length: 64 });
        if (data.timestamp !== saferTimestamp) { throw new Error(`data.timestamp is expected to be safe. this usually means should be in ticks, i.e. no spaces or special characters. (E: 3a0f627ec632272ee62da7ddf6a78422)`); }

        if (addlDetailsText) {
            let saferAddlDetailsText = getSaferSubstring({ text: addlDetailsText, length: 64 });
            if (saferAddlDetailsText !== addlDetailsText) {
                console.warn(`${lc} using safer version of addlDetailsText: ${saferAddlDetailsText}. (W: b5516dabaeab4c93996e726e8feffe7f)`)
                addlDetailsText = saferAddlDetailsText;
            }
        }

        return addlDetailsText ?
            `${atom} ${data.type} ${data.timestamp} ${addlDetailsText}` :
            `${atom} ${data.type} ${data.timestamp}`;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function isInteraction({
    ibGib,
    ib,
}: {
    ibGib?: IbGib_V1,
    ib?: Ib,
}): boolean {
    ib = ib ?? ibGib.ib;

    if (!ib) { throw new Error(`either ib or ibGib required (E: 15786fe75a5219ec7d925189f22d9f22)`); }

    const [atom, _type, _timestamp, _metadata] = ib;
    return atom === ROBBOT_INTERACTION_IB_ATOM
}

/**
 * creates an ibgib stone (no tjp) that contains the interaction info.
 *
 * @returns interaction ibgib stone
 */
export async function getInteractionIbGib_V1({
    data,
    rel8ns,
    addlDetailsText,
}: {
    /**
     * beginning data that may be mutated in this function.
     */
    data: RobbotInteractionData_V1,
    /**
     * beginning rel8ns that may be mutated in this function.
     */
    rel8ns?: RobbotInteractionRel8ns_V1,
    /**
     * for use in creating the ib per use case, if provided
     *
     * atow, I'm not using this.
     */
    addlDetailsText?: string,
}): Promise<RobbotInteractionIbGib_V1> {
    const lc = `[${getInteractionIbGib_V1.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 138e6a406e1c600aad5b64e58a250922)`); }

        if (!data) { throw new Error(`data required (E: 7bdc46e1cfca9c286fc0dad9e8d60722)`); }

        if (!data.uuid) { data.uuid = await h.getUUID(); }

        rel8ns = rel8ns ?? {};
        rel8ns.ancestor = [`${ROBBOT_INTERACTION_IB_ATOM}^${GIB}`];
        delete rel8ns.past;

        const ib = getInteractionIb({ data, addlDetailsText });

        const ibGib: RobbotInteractionIbGib_V1 = {
            ib, data, rel8ns,
        };
        ibGib.gib = await getGib({ ibGib, hasTjp: false });

        return ibGib;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
