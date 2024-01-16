import { ExpirationFormat, KeystoneScopeBase, ChallengeType } from "./types";
import { Ib } from "ts-gib";

/**
 * Initialized ib for stones, witnesses, etc.
 */
export const UNDEFINED_IB = '[UNDEFINED IB]';

export const KEYSTONE_PRIMITIVE_IB: Ib = 'keystone';
export const KEYSTONE_CONFIG_PRIMITIVE_IB: Ib = 'keystone config';
/**
 * Indicates that the tjp gib is not defined for the keystone yet.
 *
 * Driving use case:
 *   Placeholder for the keystone's tjp gib to be used _inside_ the tjp
 *   for the keystone.
 */
export const UNDEFINED_TJP = 'undefined_tjp';
export const MAX_LENGTH_KEYSTONE_IB = 1024;
export const MIN_LENGTH_KEYSTONE_IB = 'keystone _ _'.length;

/**
 * What is the default value for a keystone's scope.
 *
 * This is the most permissive scope ATOW ('any') and is largely
 * equivalent to an 'owner' function.
 */
export const DEFAULT_KEYSTONE_SCOPE: string = 'any';

/**
 * Space delimited in V1
 */
export const KEYSTONE_IB_DELIMITER = ' ';

/**
 * delimiter between whats, e.g. permissions, for keystones.
 *
 * @example
 * rel8_keystone would allow adding/removing rel8ns in the `keystone` rel8nName.
 * rel8_add_keystone would allow only adding rel8ns in the `keystone` rel8nName.
 */
export const KEYSTONE_PERMISSION_DELIMITER = '_';

export const KEYSTONE_SCOPE_DELIMITER = '_';

/**
 * This lib's minimum number of hashes away from the challengeSalt to
 * generate the challengeSecret
 */
export const MIN_KEY_SECRET_HASH_ITERATIONS = 5;

/**
 * Default hash iterations going from challengeSalt to challengeResult.
 */
export const DEFAULT_CHALLENGE_RESULT_HASH_ITERATIONS = 2;

/**
 * Default hash iterations going from keySecret to challengeSecret.
 */
export const DEFAULT_CHALLENGE_SECRET_HASH_ITERATIONS = 5;

export const DEFAULT_EXPIRATION_FORMAT: ExpirationFormat = 'UTC';

/**
 * Arbitrary-ish minimum.
 */
export const ABS_MIN_CHALLENGE_SALT = 16;
/**
 * Arbitrary-ish max.
 */
export const ABS_MAX_CHALLENGE_SALT = 4096;
/**
 * Arbitrary-ish minimum.
 */
export const DEFAULT_MIN_CHALLENGE_SALT = 32;
/**
 * Arbitrary-ish max.
 */
export const DEFAULT_MAX_CHALLENGE_SALT = 64;

/**
 * Arbitrary-ish max additional metadata length allowed for the keystone's
 * `ib` field.
 */
export const MAX_KEYSTONE_IB_ADDL_METADATA = 32;

export const DEFAULT_CHALLENGE_TYPE: ChallengeType = 'hash';

export const CURRENT_KEYSTONE_CONFIG_VERSION = 'v1';
