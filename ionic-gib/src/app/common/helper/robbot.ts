import * as h from 'ts-gib/dist/helper';
import { Gib, Ib, } from 'ts-gib';
import { GIB, IbGib_V1 } from 'ts-gib/dist/V1';
import { getGib, getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../constants';
import { getSaferSubstring, getTimestampInTicks } from './utils';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';
import { CommonService } from '../../services/common.service';
import {
    DEFAULT_ROBBOT_REQUEST_ESCAPE_STRING,
    RobbotData_V1, RobbotIbGib_V1, RobbotInteractionData_V1, RobbotInteractionIbGib_V1, RobbotInteractionRel8ns_V1, ROBBOT_SESSION_ATOM,
    // RobbotOutputMode, VALID_ROBBOT_OUTPUT_MODES
} from '../types/robbot';
import { getFn_promptRobbotIbGib } from './prompt-functions';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { WitnessFormBuilder } from './witness';
import { validateIbGibIntrinsically } from './validate';
import { persistTransformResult, registerNewIbGib, rel8ToSpecialIbGib } from './space';
import { IbgibsService } from '../../services/ibgibs.service';
import { isComment, parseCommentIb } from './comment';
import { CommentIbGib_V1 } from '../types/comment';


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
        const timestampInTicks = Number.isInteger(data.timestamp) ?
            data.timestamp :
            getTimestampInTicks(data.timestamp);
        // let saferTimestamp = getSaferSubstring({ text: data.timestamp, length: 64 });

        // if (data.timestamp !== saferTimestamp) {
        //     throw new Error(`data.timestamp is expected to be safe. this usually means should be in ticks, i.e. no spaces or special characters. (E: 3a0f627ec632272ee62da7ddf6a78422)`);
        // }

        if (addlDetailsText) {
            let saferAddlDetailsText = getSaferSubstring({ text: addlDetailsText, length: 64 });
            if (saferAddlDetailsText !== addlDetailsText) {
                console.warn(`${lc} using safer version of addlDetailsText: ${saferAddlDetailsText}. (W: b5516dabaeab4c93996e726e8feffe7f)`)
                addlDetailsText = saferAddlDetailsText;
            }
        }

        return addlDetailsText ?
            `${atom} ${data.type} ${timestampInTicks} ${addlDetailsText}` :
            `${atom} ${data.type} ${timestampInTicks}`;
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

export function getRobbotSessionIb({
    robbot,
    timestampInTicks,
    sessionId,
    contextTjpGib,
    addlMetadata,
}: {
    robbot: IbGibRobbotAny,
    timestampInTicks: string,
    sessionId: string,
    contextTjpGib: Gib,
    addlMetadata?: string,
}): string {
    const lc = `[${getRobbotSessionIb.name}]`;
    try {
        // validate
        if (logalot) { console.log(`${lc} starting... (I: 21206e0defe4bf23db96979fb456e822)`); }
        if (!robbot) { throw new Error(`robbot required (E: 200b32bbc4cac516e56d9561a9ffae22)`); }
        if (!robbot.data?.name) { throw new Error(`robbot.data.name required (E: d6470d5a146a1794811b9577ce881522)`); }
        if (!robbot.data.classname) { throw new Error(`robbot.data.classname required (E: 42077779c80889f1079e582d45932e22)`); }
        if (!robbot.data.uuid) { throw new Error(`robbot.data.uuid required (E: 34222f5639c329c99a2007ba6789bb22)`); }
        if (!timestampInTicks) { throw new Error(`timestampInTicks required (E: 17447cb30277af2beea8f2b13266c722)`); }
        if (!sessionId) { throw new Error(`sessionId required (E: 37a1737920996a55f311e79efe558422)`); }
        if (!contextTjpGib) { throw new Error(`contextTjpGib required (E: ad967964b764b077f448121e8b63c822)`); }
        if (addlMetadata) { if (!addlMetadata.match(/^\w+$/)) { throw new Error(`addlMetadata must be alphanumerics only (E: 26f52b1378d1ad01f20f8ef5a5441722)`); } }

        // prepare
        const { name, classname, uuid } = robbot.data;
        const robbotTjpGib = getGibInfo({ gib: robbot.gib }).tjpGib;

        // main ib string
        let resultIb = `${ROBBOT_SESSION_ATOM} ${timestampInTicks} ${name} ${classname} ${uuid} ${robbotTjpGib} ${sessionId} ${contextTjpGib}`;

        // amend if addlMetadata provided
        if (addlMetadata) { resultIb += ` ${addlMetadata}`; }

        // returns
        return resultIb;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export function parseRobbotSessionIb({
    ib,
}: {
    ib: Ib,
}): {
    timestamp: string,
    robbotName: string,
    robbotClassname: string,
    robbotId: string,
    robbotTjpGib: Gib,
    sessionId: string,
    contextTjpGib: Gib,
    addlMetadata: string,
} {
    const lc = `[${parseRobbotSessionIb.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 21206e0defe4bf23db96979fb456e822)`); }
        if (!ib) { throw new Error(`ib required (E: c99627d871dbada4745474d9b63d4822)`); }

        const pieces = ib.split(' ');
        if (pieces.length !== 8 && pieces.length !== 9) { throw new Error(`invalid ib. should be space-delimited with 8 or 9 pieces, but there were ${pieces.length}. Expected pieces: atom, timestamp, robbotName, robbotClassname, robbotId, robbotTjpGib, sessionId, contextTjpGib, and optional addlMetadata. (E: 239ba7f599ce02a20271dd288c187d22)`); }

        const [_, timestamp, robbotName, robbotClassname, robbotId, robbotTjpGib, sessionId, contextTjpGib, addlMetadata] = ib.split(' ');
        return {
            timestamp,
            robbotName, robbotClassname, robbotId, robbotTjpGib,
            sessionId,
            contextTjpGib,
            addlMetadata
        };
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}
