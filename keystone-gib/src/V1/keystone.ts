import {
    GetKeystoneIbArgs, GetKeystoneScopeArgs, GenerateKeystoneArgs,
    NewKeystoneResult, KeystoneConfigData, KeystoneData_V1,
    GenerateChallengeArgs, Challenge_Hash, ChallengesConfig,
    GenerateChallengeArgs_Hash,
    KeystoneConfigMetadata,
    KsRel8n,
    KeystoneScopeBase
} from "./types";
import {
    DEFAULT_KEYSTONE_SCOPE, UNDEFINED_TJP,
    KEYSTONE_IB_DELIMITER, KEYSTONE_SCOPE_DELIMITER,
    KEYSTONE_PRIMITIVE_IB, MAX_KEYSTONE_IB_ADDL_METADATA, DEFAULT_CHALLENGE_TYPE,
    KEYSTONE_CONFIG_PRIMITIVE_IB, CURRENT_KEYSTONE_CONFIG_VERSION,
    DEFAULT_EXPIRATION_FORMAT,
    MAX_LENGTH_KEYSTONE_IB,
    MIN_LENGTH_KEYSTONE_IB,
} from "./constants";
import { Gib, Ib, TransformResult } from "ts-gib";
import {
    fork, mut8, rel8,
    Factory_V1 as factory,
    Rel8n,
    IbGib_V1, IbGibData_V1, IbGibRel8ns_V1,
    IBGIB_DELIMITER,
    sha256v1,
} from "ts-gib/dist/V1";
import { generateChallenges } from "./challenge";
import { getIbGibAddr, getIbAndGib } from "ts-gib/dist/helper";
import { generateExpirationString } from "./helper";
import { Stone_V1 } from "./stone";

export function getKeystoneScope({
    base,
    subscopes,
}: GetKeystoneScopeArgs): string {
    const lc = `${getKeystoneScope.name}`;

    // #region validation

    if (!base) { throw new Error(`${lc} base required.`); }

    // maybe not necessary at the moment with below go-list
    if (base.includes(KEYSTONE_IB_DELIMITER)) { throw new Error(`${lc} invalid base (${base}): contains KEYSTONE_IB_DELIMITER (${KEYSTONE_IB_DELIMITER})`); }
    if (base.includes(KEYSTONE_SCOPE_DELIMITER)) { throw new Error(`${lc} invalid base (${base}): contains KEYSTONE_SCOPE_DELIMITER (${KEYSTONE_SCOPE_DELIMITER})`); }

    // go/no-go list
    if (!Object.keys(KeystoneScopeBase).includes(base)) { throw new Error(`${lc} invalid base (${base}): must be one of go-list ${Object.keys(KeystoneScopeBase)}`); }

    // #endregion

    if (subscopes && subscopes.length > 0) {
        // validate
        subscopes.forEach(subscope => {
            if (subscope === null) { throw new Error(`${lc} invalid subscope: is null.`); }
            if (subscope === undefined) { throw new Error(`${lc} invalid subscope: is undefined.`); }
            if (subscope === '') { throw new Error(`${lc} invalid subscope: is empty string.`); }
            if (subscope.includes(KEYSTONE_IB_DELIMITER)) { throw new Error(`${lc} invalid subscope (${subscope}): contains KEYSTONE_IB_DELIMITER (${KEYSTONE_IB_DELIMITER})`); }
        });
        if (subscopes.some(x => x.includes(KEYSTONE_SCOPE_DELIMITER))) {
            throw new Error(`${lc} invalid subscope: contains KEYSTONE_SCOPE_DELIMITER (${KEYSTONE_SCOPE_DELIMITER})`);
        } else {
            return [base, ...subscopes].join(KEYSTONE_SCOPE_DELIMITER);
        }
    } else {
        return base;
    }
}

export function getKeystoneIb({
    keystoneTjpGib,
    scope,
    addlMetadata,
}: GetKeystoneIbArgs): Ib {
    const lc = `[${getKeystoneIb.name}]`;

    // #region validation

    if (keystoneTjpGib && keystoneTjpGib.includes(KEYSTONE_IB_DELIMITER)) { throw new Error(`${lc} invalid keystoneTjpGib: includes KEYSTONE_IB_DELIMITER (${KEYSTONE_IB_DELIMITER})`); }
    if (keystoneTjpGib && keystoneTjpGib.includes(IBGIB_DELIMITER)) { throw new Error(`${lc} invalid keystoneTjpGib: includes IBGIB_DELIMITER (${IBGIB_DELIMITER})`); }

    if (scope && scope.includes(KEYSTONE_IB_DELIMITER)) { throw new Error(`${lc} invalid scope: includes KEYSTONE_IB_DELIMITER (${KEYSTONE_IB_DELIMITER})`); }
    if (scope && scope.includes(IBGIB_DELIMITER)) { throw new Error(`${lc} scope invalid scope: includes IBGIB_DELIMITER (${IBGIB_DELIMITER}).`); }

    if (addlMetadata && addlMetadata.includes(KEYSTONE_IB_DELIMITER)) { throw new Error(`${lc} invalid addlMetadata: includes KEYSTONE_IB_DELIMITER (${KEYSTONE_IB_DELIMITER})`); }
    if (addlMetadata && addlMetadata.includes(IBGIB_DELIMITER)) { throw new Error(`${lc} invalid addlMetadata: includes IBGIB_DELIMITER (${IBGIB_DELIMITER})`); }

    // #endregion

    const tjpGib = keystoneTjpGib || UNDEFINED_TJP;
    scope = scope || DEFAULT_KEYSTONE_SCOPE;

    let ib = addlMetadata ?
        `keystone ${scope} ${tjpGib} ${addlMetadata}` :
        `keystone ${scope} ${tjpGib}`;

    return ib;
}

export async function generateNewKeystone(args: GenerateKeystoneArgs): Promise<NewKeystoneResult> {
    const lc = `[${generateNewKeystone.name}]`;
    try {

        // #region validation

        if (!args) { throw new Error(`${lc} args required.`); }
        if (!args.type) { args.type = DEFAULT_CHALLENGE_TYPE; }
        if (args.type !== 'hash') { throw new Error(`${lc} invalid args.type: only type 'hash' implemented in v1.`); }

        // #endregion validation

        return await generateNewKeystone_Hash(args);
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    }
}

/**
 * Generating new keystones is intended to be in a "secure" environment.
 * By this, I mean that before a keystone is exposed to the world, it
 * is automatically assumed to be under the generating node's influence.
 * If the generating node is compromised, then the keyStone is inherently
 * compromised, but not permanently. A keySecret can always change throughout
 * a keystone's lifetime, as it is always up to the holder to maintain the
 * mapping between the keySecret and the challenges.
 */
export async function generateNewKeystone_Hash({
    type,
    keySecret,
    scope,
    challengesConfig,
    expiration,
    addlMetadata,
}: GenerateKeystoneArgs): Promise<NewKeystoneResult> {
    const lc = `[${generateNewKeystone_Hash.name}]`;

    // #region validation

    type = type || DEFAULT_CHALLENGE_TYPE;
    if (type !== 'hash') { throw new Error(`${lc} invalid type: only hash in v1`); }
    if (!keySecret) { throw new Error(`${lc} keySecret required.`) }
    if (!challengesConfig) { throw new Error(`${lc} challengesConfig required.`) }
    if (addlMetadata) {
        if (addlMetadata.length > MAX_KEYSTONE_IB_ADDL_METADATA) { throw new Error(`${lc} invalid addlMetadata: too long. Length: ${addlMetadata.length}. Max allowed: ${MAX_KEYSTONE_IB_ADDL_METADATA}`); }
        if (addlMetadata.includes(' ')) { throw new Error(`${lc} invalid addlMetadata: cannot include a space (${addlMetadata})`); }
    }
    if (expiration?.format) {
        if (expiration.format !== 'UTC') { throw new Error(`${lc} invalid expiration.format: only UTC in v1`); }
    }

    // #endregion

    scope = scope || DEFAULT_KEYSTONE_SCOPE;

    // manually do first gen.
    // (can't use factory.firstGen because we need to mut8 ib with tjp)
    const primitive = factory.primitive({ib: KEYSTONE_PRIMITIVE_IB});

    // generate keystone tjp, which necessarily doesn't have its gib in the ib
    // because it doesn't exist yet! But keystone security is stronger with tjp in the ib,
    // so this is an intermediate and incomplete step.

    const ibWithoutTjp = getKeystoneIb({scope, addlMetadata});
    const resKeystoneTjp = await fork({
        src: primitive,
        destIb: ibWithoutTjp,
        tjp: {
            timestamp: true,
            uuid: true,
        },
        linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
    });

    // mut8 keystone, using config...
    // prepare mut8 info with...

    //   ...ib that includes tjp's gib, and...
    const { gib: keystoneTjpGib } = getIbAndGib({ibGib: resKeystoneTjp.newIbGib});
    const keystoneIbWithTjp = getKeystoneIb({keystoneTjpGib, scope, addlMetadata});
    //   ...and data that includes initial challenges (and no solutions)
    let keystoneData: KeystoneData_V1 = { challenges: {}, solutions: {}, };
    let newChallenges = <Challenge_Hash[]>(await generateChallenges({
        num: challengesConfig.poolSize,
        generateArgs: <GenerateChallengeArgs_Hash>{ config: challengesConfig, keySecret }
    }));
    newChallenges.forEach((challenge: Challenge_Hash) => {
        keystoneData.challenges[challenge.challengeSalt] = challenge.challengeResult;
    });
    //   ... add expiration if provided...
    if (expiration) {
        keystoneData.expiration = generateExpirationString(expiration);
        keystoneData.expirationFormat = expiration.format || DEFAULT_EXPIRATION_FORMAT;
    }

    //   ...and execute mut8 to create another intermediate keystone, which
    //   at this point has the correct ib (with tjp gib) and internal `data`.
    const resKeystoneWithData = await mut8({
        src: resKeystoneTjp.newIbGib,
        mut8Ib: keystoneIbWithTjp,
        dataToAddOrPatch: keystoneData,
        linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
    });

    // generate keystone config ibGib...
    const resKeystoneConfig = await generateKeystoneConfig({challengesConfig});
    const {newIbGib: keystoneConfig} = resKeystoneConfig;
    const keystoneConfigAddr = getIbGibAddr({ibGib: keystoneConfig});

    //   ...and rel8 to final keystone.
    const resKeystoneFinal = await rel8({
        src: resKeystoneWithData.newIbGib,
        linkedRel8ns: [Rel8n.ancestor, Rel8n.past],
        rel8nsToAddByAddr: {
            [KsRel8n.meta]: [keystoneConfigAddr],
        },
    })

    // gather intermediate ibgibs which will have to be persisted
    // in addition to the final keystone ibGib.
    const intermediateIbGibs: IbGib_V1[] = [
        ...(resKeystoneTjp.intermediateIbGibs || []),
        resKeystoneTjp.newIbGib,
        ...(resKeystoneWithData.intermediateIbGibs || []),
        resKeystoneWithData.newIbGib,
        ...(resKeystoneFinal.intermediateIbGibs || []),
    ];

    const newIbGib = resKeystoneFinal.newIbGib;

    return { newIbGib, intermediateIbGibs, config: keystoneConfig };
}

export interface GenerateKeystoneConfigArgs {
    challengesConfig: ChallengesConfig;
    suggestedChallengeSecretMethod?: KeystoneConfigMetadata;
}

export interface GenerateKeystoneConfigResult
    extends TransformResult<IbGib_V1> { }

/**
 * Generates a keystone config ibgib.
 *
 * ## NOTE
 *
 * ATOW this deletes any intermediate ibgibs and clears the past for
 * the config and only returns the config itself. This way, there is not unnecessary
 * extra dependencies. Its only rel8n should be to the primitive (and thus is
 * not required when sending/validating the dependency graph).
 */
export async function generateKeystoneConfig({
    challengesConfig,
    hashIterations,
    notes,
}: {
    /**
     * Required, public config of the challenges used by the keystone.
     */
    challengesConfig: ChallengesConfig,
    /**
     * Will use this many hash iterations when generating the
     * challengeSecret from the `keySecret` and challengeSalt.
     *
     * ## notes
     *
     * This is an optional memo field for the
     */
    hashIterations?: number;
    /**
     * Additional notes for the keystone owner to use when determining
     * how to create the challengeSecret from its `keySecret` and
     * `challengeSalt`.
     */
    notes?: string;
}): Promise<GenerateKeystoneConfigResult> {
    const lc = `[${generateKeystoneConfig.name}]`;

    if (!challengesConfig) { throw new Error(`${lc} challengesConfig required.`) }
    if (challengesConfig.type !== 'hash') { throw new Error(`${lc} invalid type ${challengesConfig.type}: only hash in v1`); }
    const primitive = factory.primitive({ib: KEYSTONE_CONFIG_PRIMITIVE_IB});
    const configData: KeystoneConfigData = {
        version: CURRENT_KEYSTONE_CONFIG_VERSION,
        challenges: challengesConfig,
    };
    const resConfig = await factory.firstGen({
        parentIbGib: primitive,
        ib: KEYSTONE_CONFIG_PRIMITIVE_IB,
        linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
        noTimestamp: true,
        data: configData,
    });

    // I want to clear the past and not have any other dependency ibgibs
    // for this config. So I'm going to clear the past and not pass back
    // any intermediate ibgibs. (should probably have this in core ibgib lib
    // as an option when mutating or at least in `factory.firstGen`)

    if (resConfig.newIbGib.rel8ns!.past) { delete resConfig.newIbGib.rel8ns!.past; }

    resConfig.newIbGib.gib = await sha256v1(resConfig.newIbGib);

    return { newIbGib: resConfig.newIbGib }; // no intermediates or dna
}

/**
 * Extracts the tjp gib, scope and optional subscopes (KEYSTONE_SCOPE_DELIMITER-delimited)
 * from the `keystoneIb` field (space-delimited).
 */
export function getKeystoneInfoFromIb({
    keystoneIb,
}: {
    keystoneIb?: string,
}): {
    tjpGib: Gib,
    scope: string,
    scopeBase: string,
    subscopes?: string[],
    addlMetadata?: string,
} {
    const lc = `[${getKeystoneInfoFromIb.name}(${keystoneIb || 'keystoneIb is falsy'})]`;
    if (!keystoneIb) { throw new Error(`${lc} keystoneIb required.`) };
    if (keystoneIb.length > MAX_LENGTH_KEYSTONE_IB) { throw new Error(`${lc} invalid keystoneIb: too long (${keystoneIb.length}). max: (${MAX_LENGTH_KEYSTONE_IB }) required.`) }
    if (keystoneIb.length < MIN_LENGTH_KEYSTONE_IB) { throw new Error(`${lc} invalid keystoneIb: too short (${keystoneIb.length}). min: (${MIN_LENGTH_KEYSTONE_IB }) required.`) }

    const ibPieces = keystoneIb.split(KEYSTONE_IB_DELIMITER);
    if (ibPieces.length < 2) { throw new Error(`${lc} unknown keystone ib format. Expect "keystone [scope] [tjp gib] [addlMetadata]"`) }
    // "keystone [scope] [tjp gib] [addlMetadata]"

    // scope
    const pieceScope = ibPieces[1];
    if (!pieceScope) { throw new Error(`${lc} invalid scope: falsy`); }
    let scope = pieceScope,
        scopeBase = scope,
        subscopes: string[] = [];
    if (pieceScope.includes(KEYSTONE_SCOPE_DELIMITER)) {
        const scopeAndSubscopes = pieceScope.split(KEYSTONE_SCOPE_DELIMITER);
        scopeBase = scopeAndSubscopes[0]; // reassign
        subscopes = scopeAndSubscopes.slice(1);
    }

    const tjpGib = ibPieces[2];
    if (!tjpGib) { throw new Error(`${lc} invalid tjpGib: falsy`); }

    const addlMetadata = (ibPieces.length > 3) ? ibPieces[3] : undefined;

    let result: { tjpGib: Gib, scope: string, scopeBase: string, subscopes?: string[], addlMetadata?: string, } =
        { tjpGib, scope, scopeBase };
    if (subscopes) { result.subscopes = subscopes; }
    if (addlMetadata) { result.addlMetadata = addlMetadata; }
    return result;
}

/**
 * A stone specific to keystone
 */
export class Keystone_V1<TKeystoneData_V1 extends IbGibData_V1 = KeystoneData_V1>
    extends Stone_V1<TKeystoneData_V1> {

    constructor() {
        super();
    }

}

export function getKeystoneIbScopeString({
    scopeBase,
    subscopes
}: {
    scopeBase: KeystoneScopeBase,
    subscopes?: string[],
}): string {
    const lc = `[${getKeystoneIbScopeString.name}]`;
    try {
        if (!scopeBase) { throw new Error(`scopeBase required.`); }
        if (scopeBase.length > MAX_LENGTH_KEYSTONE_IB) { throw new Error(`invalid scopeBase: too long. actual: ${scopeBase.length}. max: ${MAX_LENGTH_KEYSTONE_IB}`); }
        if (scopeBase.includes(KEYSTONE_SCOPE_DELIMITER)) { throw new Error(`invalid scopeBase: contains delimiter (${KEYSTONE_SCOPE_DELIMITER})`); }
        let result: string = scopeBase;
        (subscopes || []).forEach(sub => {
            if (!sub) { throw new Error(`invalid subscope: falsy`); }
            if (sub.includes(KEYSTONE_SCOPE_DELIMITER)) { throw new Error(`invalid subscope: contains delimiter (${KEYSTONE_SCOPE_DELIMITER})`); }
            result = `${result}${KEYSTONE_SCOPE_DELIMITER}${sub}`;
            if (result.length > MAX_LENGTH_KEYSTONE_IB) { throw new Error(`invalid generated scope: too long. max: ${MAX_LENGTH_KEYSTONE_IB}`); }
        });
        return result;
    } catch (error) {
        const emsg = `${lc} ${error.message}`;
        console.error(emsg);
        throw new Error(emsg);
    }
}
