import { Gib, IbGib, TransformResult, } from "ts-gib";
import { IbGibData_V1, IbGib_V1, } from "ts-gib/dist/V1";

/**
 * For can_____ functions, e.g., canTransform, canWitness, etc.
 */
export interface CanResult {
    /**
     * true if transform is allowed to proceed, e.g. authorization checks pass.
     */
    proceed: boolean;
    /**
     * Errors that keep transform from proceeding.
     *
     * {@link proceed} should be false if these are populated (though not a hard rule?).
     */
    errors?: string[];
}

/**
 * Scope of the keystone, i.e. how/in what way it is intended to be applied.
 */
export type KeystoneScopeBase =
    'any' |
    'transform' |
    'fork' | 'mut8' | 'rel8' |
    'txrx' |
    'config' |
    'revoke' | 'recover';

/**
 * Scope of the keystone, i.e. how/in what way it is intended to be applied.
 */
export const KeystoneScopeBase: {[key: string]: KeystoneScopeBase} = {
    /**
     * Keystone enables any action upon an ibgib.
     *
     * This is the least granular scope, and most like an 'owner'.
     */
    any: 'any' as KeystoneScopeBase,
    /**
     * Keystone enables any transform to be performed on an ibgib.
     */
    transform: 'transform' as KeystoneScopeBase,
    /**
     * Can fork an ibgib to produce a new one.
     *
     * This is a tough one, because part of me says anyone can
     * fork an ibgib. But someone will want to use it, at the
     * very least as a statement of intent.
     */
    fork: 'fork'  as KeystoneScopeBase,
    /**
     * Can add/remove entries in `ibgib.data`.
     *
     * Can be further constrained via a path subscope
     */
    mut8: 'mut8'  as KeystoneScopeBase,
    /**
     * Can add/remove addresses in `ibgib.rel8ns`.
     */
    rel8: 'rel8' as KeystoneScopeBase,
    /**
     * Used throughout verification of tx/rx exchanges of ibgibs.
     */
    txrx: 'txrx'  as KeystoneScopeBase,
    /**
     * Can change configuration of ibgib, i.e. rel8/unrel8 "config" rel8n.
     */
    config: 'config'  as KeystoneScopeBase,
    /**
     * Can kill a keystone's validity.
     */
    revoke: 'revoke'  as KeystoneScopeBase,
    /**
     * Can rel8/unrel8 "keystone" rel8n.
     */
    recover: 'recover' as KeystoneScopeBase,
}

// #region Keystone Args

/**
 *
 */
export interface GetKeystoneScopeArgs {
    /**
     * Base of the scope
     */
    base: KeystoneScopeBase;
    /**
     * list of subscopes that will be order-dependent.
     * ATOW these will be underscore-delimited.
     */
    subscopes?: string[];
}

/**
 * A keystone's `ib` field is space-delimited. Any individual sections of this
 * should be delimited as best per use case.
 *
 * @example
 *
 * `keystone mut8 ABC123` would authorize any mut8 transform applied to an ibgib.
 * `keystone mut8_[dataSubPath] ABC123` // authorize mut8 only on given subpath in ibGib's `data` field
 *
 * `keystone rel8 ABC123` would authorize any rel8 transform applied to an ibgib.
 * `keystone rel8_[rel8nName] ABC123` would authorize rel8 transform only on rel8nName.
 *
 * `keystone txrx_TXID123 ABC123` would be used when exchanging ibgibs among nodes.
 * `keystone
 */
export interface GetKeystoneIbArgs {
    keystoneTjpGib?: Gib;
    scope: string;
    /**
     * place to store additional metadata in the ib of the keystone.
     *
     * Should be short. Remember this is stored in the `ib` of the keystone,
     * not in the `data`. So this means that every single address of the ibgib
     * will include it. So it should be important enough to _always_ be able
     * to see without loading the full ibgib record.
     */
    addlMetadata?: string,
}

export interface GenerateKeystoneArgs {
    /**
     * type of challenges that give proof of owenership of the keystone.
     */
    type?: ChallengeType; // only hash in v1
    /**
     * secret that will generate the initial challenges.
     * It is always up to the creating library to map between
     * `keySecret` and the challenges, or more specifically
     * from the `keySecret` to the `challengeSecret`.
     *
     * The keystone architecture is largely built upon
     * Kerckhoffs' principle, where the "enemy knows the system"
     * as one famous person or other put it. The point is that
     * Each keystone and all of its metadata/configuration/history
     * is known to all participants. The `keySecret` is the only thing
     * (per keystone) that is hidden.
     */
    keySecret: string;
    /**
     * Scope in which the keystone will apply.
     */
    scope?: string;
    /**
     * Provides the configuration for the keystone's challenges.
     *
     * If falsy, uses the V1 default configuration.
     */
    challengesConfig?: ChallengesConfig;
    /**
     * If given, sets the expiration for the keystone.
     *
     * @see {@link expirationFormat} for the generated format of this string (currently UTC only)
     */
    expiration: ExpirationInfo;
    /**
     * place to store additional metadata in the ib of the keystone.
     *
     * Should be short. Remember this is stored in the `ib` of the keystone,
     * not in the `data`. So this means that every single address of the ibgib
     * will include it. So it should be important enough to _always_ be able
     * to see without loading the full ibgib record.
     */
    addlMetadata?: string,
}

/** Info to generate an expiration Date/Time string. */
export interface ExpirationInfo {
    ms?: number;
    seconds?: number;
    /** 60_000 */
    minutes?: number;
    /** 3_600_000 milliseconds */
    hours?: number;
    /** 86_400_000 milliseconds */
    days?: number;
    /** 604_800_000 milliseconds */
    weeks?: number;
    /** approximate months (30 days converted to milliseconds) */
    months?: number;
    /** approximate years (365 days converted to milliseconds) */
    years?: number;
    /**
     * Format for the generated string to be in.
     *
     * NOTE: In V1 this is only 'UTC', so can be omitted.
     */
    format?: ExpirationFormat;
}

// #endregion

/**
 * Configuration intrinsic to challenges.
 *
 * In general, there should always be a number of challenges available
 * to prove ownership of a keystone.
 */
export interface ChallengesConfig {
    /**
     * Type of challenges. v1 only has hash.
     *
     * In the future, this could be cert or some other more standard challenge
     * type that exists today.
     */
    type: ChallengeType;
    /**
     * How many challenges to maintain in the keystone at all times.
     * When a challenge is solved, that would reduce the pool so a new
     * challenge must take its place so that the total number of challenges
     * available to solve is this number.
     *
     * For example, should the stone maintain a list of 10 challenges, 100,
     * or 1000?
     *
     * There are many dynamics about the size that is maintained:
     *   * obviously, more challenges takes more size/resources.
     *   * more challenges also allow a higher challenges required,
     *     which is harder to replay (when transmitting).
     */
    poolSize: number;
    /**
     * Minimum number of individual challenge entries to solve in order to
     * prove ownership of the keystone.
     */
    minChallengesRequired?: number;
    /**
     * Maximum number of individual challenge entries to solve in order to
     * prove ownership of the keystone.
     */
    maxChallengesRequired?: number;
}

/**
 * Configuration of v1 hash-based challenges specifically.
 * Adds configuration options specific to v1 hash challenges.
 */
export interface ChallengesConfig_Hash extends ChallengesConfig {
    type: 'hash';
    minChallengeSaltSize?: number;
    maxChallengeSaltSize?: number;
    /**
     * Number of recursive iterations to perform on the challengeSalt + challengeSecret
     */
    hashIterations?: number;
    /**
     * Optional right now. V1 only implemented algorithm is SHA-256.
     */
    algo?: HashAlgorithm;
    // /**
    //  * I, as an owner of this keystone, have a secret associated specifically
    //  * with this keystone. But I also have some other secret only I know.
    //  */
    // suggestedChallengeSecretMethod?: KeystoneConfigMetadata;
}

export interface Challenge {
}

/**
 * Contains everything for a single challenge, except the challengeSecret
 * which should only be calculated as needed (not stored).
 *
 * ## note
 *
 * This is not how the challenge is represented in the keystone's data.
 * This is a TypeScript class that contains the information for working
 * with the challenge in memory.
 */
export interface Challenge_Hash extends Challenge {
    /**
     * This is the visible **input** for the hashing challenge.
     *
     * In the key/value challenge entry, this is the key.
     */
    challengeSalt: string;
    /**
     * This is the visible **output** of the hashing challenge.
     *
     * In the key/value challenge entry, this is the value.
     */
    challengeResult: string;
    /**
     * This is the metadata describing the requirements for the challenge.
     */
    config: ChallengesConfig;
}

/**
 * Individual entries in a challenge.
 * challengeSalt: challengeResult
 *
 * NOTE: In v1, hash challenges are the only type of challenge.
 */
export type Challenges_Hash = { [challengeSalt: string]: string }

/**
 * challengeSalt: [challengeResult, challengeSecret]
 */
export type Solutions_Hash = { [challengeSalt: string]: string[] }

// #region Challenge Args

export interface GetChallengeSecretArgs {
    /**
     * The keystone's key secret. This actually shouldn't be stored anywhere! Should
     * be deterministically derivable, most likely from the keystone's tjp.
     */
    keySecret: string;
    /**
     * The challengeSalt for the given challenge must be created first.
     * This should be created/seeded via a "good" RNG.
     * (as good as your use case demands!)
     */
    challengeSalt: string;
    /**
     * Number of hash iterations to perform away from the given keySecret.
     */
    hashIterations?: number;
}

/**
 * Generates the challengeResult
 */
export interface GetChallengeResultArgs {
    /**
     * This is what must be provided later to "solve" the challenge.
     */
    challengeSecret: string;
    /**
     * This is the visible input for the hashing challenge.
     *
     * In the key/value challenge entry, this is the key.
     */
    challengeSalt: string;
    /**
     * Number of times to recursively hash the challenge salt, challenge secret
     * and intermediate challengeResults.
     */
    hashIterations: number;
}

export interface GenerateChallengeArgs {
    config: ChallengesConfig;
}

export interface GenerateChallengeArgs_Hash extends GenerateChallengeArgs {
    keySecret: string;
    config: ChallengesConfig_Hash;
}

/**
 * Syntactic sugar for generating an array of challenges by
 * calling generageChallenge multiple times.
 */
export interface GenerateChallengesArgs {
    num: number;
    generateArgs: GenerateChallengeArgs;
}

/**
 * This is the generic challenge args.
 *
 * In v1 however, the only type of challenge entry we have is a hash challenge.
 */
export interface ChallengeEntryIsSolvedArgs {
    /**
     * Type of challenge
     */
    type: ChallengeType; // hash in v1
    /**
     *
     */
    challengesConfig: ChallengesConfig;
}

export interface ChallengeEntryIsSolvedArgs_Hash extends ChallengeEntryIsSolvedArgs {
    /**
     * This is the `challengeSecret` provided that we are to check to
     * see if it actually is the correct secret to the given challenge entry.
     */
    challengeSecretToCheck: string;
    /**
     * This is the visible input for the hashing challenge.
     *
     * In the key/value challenge entry, this is the key.
     */
    challengeSalt: string;
    /**
     * This is the visible **output** of the hashing challenge.
     *
     * In the key/value challenge entry, this is the value.
     */
    challengeResult: string;
    /**
     * Number of times to recursively hash the challenge salt, challenge secret
     * and intermediate challengeResults.
     */
    hashIterations: number;
}

// #endregion

/**
 * Shape of keystone data
 */
export interface KeystoneData extends IbGibData_V1 {
    /**
     * If given, sets the expiration for the keystone stored in a
     * keystone config.
     *
     * @see {@link expirationFormat} for the format of this string.
     */
    expiration?: string;
    /**
     * Format for the {@link expiration} string.
     *
     * NOTE: In V1 this is only 'UTC', so can be omitted.
     */
    expirationFormat?: ExpirationFormat;
}

/**
 * V1 only has hash challenges, so this contains keystone data
 * specifically referring to those.
 */
export interface KeystoneData_V1 extends KeystoneData {
    /**
     * Individual entries in a challenge.
     * challengeSalt: challengeResult
     *
     * NOTE: In v1, hash challenges are the only type of challenge.
     */
    challenges: Challenges_Hash;
    /**
     * These are the solutions provided to the last mutation of the keystone.
     *
     * By this, I mean that when you mutate a keystone, and thus provide
     * proof of ownership of the keystone, this is where the solutions
     * to those challenges are put.
     *
     * So the key/value from the challenges in Keystone1 are moved into the
     * 'solutions' in Keystone2, with the revealed challengeSecret added
     * to the value, which is an array (whereas the challenges value is just a string).
     *
     * @example
     * previous `challenges` key/value in e.g. Keystone1:
     *   "SALT12345": "MNH432"
     *
     * key is removed and now the `solutions` in Keystone2 (which has Keystone1 in its
     * `past` rel8n):
     *   "SALT12345": ["MNH432", "SEC876"]
     *
     * It is up to others of course to validate this solution, which requires
     * both ibgibs K1 and K2 to actually do. For this reason, it's very important that
     * entire Keystone dependency graphs (no dna) are always shared (or some
     * checkpointing mechanism is inevitably implemented via witnesses/consensus).
     *
     * Also note that it is possible to replay this information to some other node
     * that has not witnessed this solution being performed. This is why keystones
     * must have the idea of locality for some modicum of integrity. This can be among
     * multiple nodes, depending on the consensus algorithms accepted for the given
     * keystone. But it can't be unbounded. There are always additional challenge sections
     * that can produce something _similar_ to unbounded, like an iterable section that by
     * convention in a consensus algorithm is not used under some set of circumstances,
     * but again this "must" be some finite list. If you ascribe to that sort of thing anyway.
     */
    solutions: Solutions_Hash;
}

/**
 * This is the shape of the config data for the KeystoneTransformConfig ibGib.
 *
 * IOW a KeystoneTransform has a related config, KeystoneTransformConfig. That
 * config ibGib's `data` property has this shape.
 */
export interface KeystoneConfigData {
    /**
     * V1 value is 'v1' as a string, not a number.
     */
    version: ConfigVersion;
    /**
     * Individual challenge entry configuration.
     */
    challenges: ChallengesConfig;
    /**
     * Flat string-to-string key/value store for additional,
     * simple configuration options.
     *
     * ## notes
     *
     * There are many many possible finesses with usage of keystones,
     * and so there are many configuration options that we as developers
     * will never be able to anticipate. But the keystone and its
     * configuration ibgibs are foundational for any attempt at
     * security, and we want to lock down this fundamental
     * piece of architecture as much as possible.
     *
     * So this property allows for a simple key/value store for this
     * additional configuration.
     *
     * ## examples
     *
     * ### source secret to keystone secret
     *
     * A keystone owner has a secret stored in his/her/its memory which.
     * We'll call this the source secret.
     * Usually they slice off a small piece of memory and call it a
     * password. But this password should often be
     * different per keystone, i.e. per use case. We'll call this the
     * keystone secret.
     *
     * Ideally security-wise, this keystone secret should be very difficult
     * to reverse engineer to the source secret.
     *
     * So this property can provide simple metadata to the owner to keep
     * track of mapping from the source secret to the keystone's secret.
     *
     *
     * So for a human, say he/she enters one or more passwords.
     * For each password, you
     * can prompt the user with a mnemonic phrase that maps to the
     * use case/keystone password.
     *
     * For this example, we'll say the source secret is "ABC".
     *
     * you generate the keystone
     * secret based on 3 iterations of hashing with secret + salt +
     * last letter of salt, then you may have entries like:
     *
     * { salt: XYZ, iterations: 3, method: "ender's game", algo: SHA-512 }
     *
     */
    meta?: { [key: string]: string };
    /**
     * If given, sets the expiration for the keystone stored in a
     * keystone config.
     *
     * @see {@link expirationFormat} for the format of this string.
     */
    expiration?: string;
    /**
     * Format for the {@link expiration} string.
     *
     * NOTE: In V1 this is only 'UTC', so can be omitted.
     */
    expirationFormat?: ExpirationFormat;
}

/**
 * Optional metadata for a keystone owner (or partial owner/admin/etc.).
 *
 * There must be some kind of deterministic way of mapping between the
 * secret that the keystone holder knows/has and the `challengeSecret`
 * that will be the revealed piece when creating/solving challenges.
 *
 * If it's too closely related to the keySecret, then it may be possible
 * to work backwards and get at that keySecret and compromise/invalidate the entire
 * stone.
 *
 * So this metadata is used by a keystone owner to figure out how
 * he/she/it generated the challenge secret from its own root secret
 * knowledge.
 *
 * Without this metadata, the keystone owner is assumed to only have
 * one method or secret that never ever changes.
 */
export interface KeystoneConfigMetadata {
}

// #region helper types

/**
 * Really should be pulling this from ts-gib...
 */
export type HashAlgorithm = 'SHA-256';
export type ExpirationFormat = 'UTC';
export type ChallengeType = 'hash';
export type ConfigVersion = 'v1';

// #endregion

export interface NewKeystoneResult extends TransformResult<IbGib_V1> {
    config: IbGib_V1;
}


export enum KsRel8n {
    meta = 'meta',
    // config = 'config',
    // keystone = 'keystone',
}
