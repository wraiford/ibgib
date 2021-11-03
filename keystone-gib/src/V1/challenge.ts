/**
 * This module is just one possible implementation. The protocol
 * allows implementors to have their own use-case driven implementations
 * as long as that code can be leveraged when performing the
 * transforms.
 */

import {
    DEFAULT_CHALLENGE_RESULT_HASH_ITERATIONS,
    MIN_KEY_SECRET_HASH_ITERATIONS,
    DEFAULT_CHALLENGE_SECRET_HASH_ITERATIONS,
    ABS_MIN_CHALLENGE_SALT,
    DEFAULT_MIN_CHALLENGE_SALT,
    DEFAULT_MAX_CHALLENGE_SALT,
    ABS_MAX_CHALLENGE_SALT
} from './constants';
import {
    ChallengesConfig,
    // Challenge,
    GetChallengeResultArgs,
    ChallengeEntryIsSolvedArgs,
    ChallengeEntryIsSolvedArgs_Hash,
    GenerateChallengeArgs,
    GenerateChallengeArgs_Hash,
    GetChallengeSecretArgs,
    Challenge,
    Challenge_Hash,
    GenerateChallengesArgs,
} from './types';
import { getUUID, hash } from 'ts-gib/dist/helper';

/**
 * An application/node/whatever can generate the challenge secret however
 * they wish. This is a naive convenience method.
 *
 * In fact, an attack vector would be for an adversarial actor to somehow generate
 * the desired challenge text and trick the node into giving its answer to that
 * challengeText (even though the node should be the only one to be generating
 * its own challenges!).
 */
export async function getChallengeSecret({
    keySecret,
    challengeSalt,
    hashIterations,
}: GetChallengeSecretArgs) {
    const lc = `${getChallengeSecret.name}`;
    if (!hashIterations) { hashIterations = MIN_KEY_SECRET_HASH_ITERATIONS; }
    if (hashIterations < MIN_KEY_SECRET_HASH_ITERATIONS) { throw new Error(`${lc} ${hashIterations} is too few hashIterations for my comfort.`) }
    if (!keySecret) { throw new Error(`${lc} keySecret required`) }
    if (!challengeSalt) { throw new Error(`${lc} challengeSalt required`) }

    let challengeSecret: string = "";
    for (let i = 1; i <= hashIterations; i++) {
        challengeSecret = await hash({
            s: keySecret + challengeSalt + challengeSecret,
        });
    }

    return challengeSecret;
}

/**
 * Generate a challenge
 *
 * LEAVE OFF: change this to generate a single challenge entry. This will be used
 * when genering the keystone, which is a collection of challenge entries (challenges).
 *
 * I.e. the keystone is the papa challenge with little baby Challenge challenges.
 */
export async function generateChallenge(
    args: GenerateChallengeArgs
): Promise<Challenge> {
    const lc = `[${generateChallenge.name}]`;
    if (!args) { throw new Error(`${lc} args required.`); }
    if (!args.config) { throw new Error(`${lc} config required.`); }
    if (args.config.type !== 'hash') { throw new Error(`${lc} only challenge type "hash" currently implemented.`) }

    return await generateChallenge_Hash(<GenerateChallengeArgs_Hash>args);
}

/**
 * Generates the challenge salt (the key) in a challenge.
 */
async function generateChallengeSalt({
    minChallengeSaltSize: min,
    maxChallengeSaltSize: max,
}: {
    minChallengeSaltSize: number | null | undefined,
    maxChallengeSaltSize: number | null | undefined,
}) {
    const lc = `[${generateChallengeSalt}]`;
    min = min || DEFAULT_MIN_CHALLENGE_SALT;
    if (min < ABS_MIN_CHALLENGE_SALT) { throw new Error(`${lc} minChallengeSaltSize too low (${min}). absolute min: ${ABS_MIN_CHALLENGE_SALT}.`); }
    max = max || DEFAULT_MAX_CHALLENGE_SALT;
    if (max > ABS_MAX_CHALLENGE_SALT) { throw new Error(`${lc} maxChallengeSaltSize too high (${max}). absolute max: ${ABS_MAX_CHALLENGE_SALT}.`); }

    const saltSize = Math.floor(min + Math.random()*(max-min));
    if (saltSize <= 0) { throw new Error(`${lc} invalid saltSize determined. It's less than or equal to zero.`); }

    let uuid: string = await getUUID(max);
    if (!uuid) { throw new Error(`${lc} problem creating uuid. uuid is falsy.`); }
    // how many uuids will it take to get to the saltsize?
    let iterations = Math.ceil(saltSize / uuid.length);

    if (iterations > 1) {
        // we already have one iteration for uuid, so start at 2
        for (let i = 2; i <= iterations; i++) {
            let toAdd = await getUUID(max);
            toAdd = await hash({s: toAdd});
            uuid += toAdd;
        }
    }

    return uuid.substring(0, saltSize);
}

async function generateChallenge_Hash({
    keySecret,
    config,
}: GenerateChallengeArgs_Hash): Promise<Challenge_Hash> {
    const lc = `[${generateChallenge_Hash.name}]`;
    if (!config) { throw new Error(`${lc} config required.`); }
    if (config.type !== 'hash') { throw new Error(`${lc} only challenge type "hash" currently implemented.`) }
    const {
        hashIterations,
        // suggestedChallengeSecretMethod,
        minChallengeSaltSize,
        maxChallengeSaltSize,
    } = config;

    // challengeSalt
    const challengeSalt =
        await generateChallengeSalt({minChallengeSaltSize, maxChallengeSaltSize});

    // challengeSecret
    const challengeSecret = await getChallengeSecret({
        keySecret,
        challengeSalt,
        hashIterations:
            // suggestedChallengeSecretMethod?.hashIterations ||
            hashIterations ||
            DEFAULT_CHALLENGE_SECRET_HASH_ITERATIONS,
    });

    // challengeResult
    const challengeResult = await getChallengeResult({
        challengeSecret,
        challengeSalt,
        hashIterations: hashIterations || DEFAULT_CHALLENGE_RESULT_HASH_ITERATIONS,
    });

    // challenge
    const challenge = {
        challengeSalt,
        challengeResult,
        config,
    }

    return challenge;
}

export async function generateChallenges({
    num,
    generateArgs,
}: GenerateChallengesArgs): Promise<Challenge[]> {
    const lc = `[${generateChallenges.name}(${(num || 'falsy').toString()})]`;
    if (!num || num === 0) { throw new Error(`${lc} invalid num`); }
    const challenges: Challenge[] = [];
    for (let i = 1; i <= num; i++) {
        const challenge = await generateChallenge(generateArgs);
        challenges.push(challenge);
    }

    return challenges;
}

export async function getChallengeResult({
    challengeSecret,
    challengeSalt,
    hashIterations,
}: GetChallengeResultArgs): Promise<string> {
    const lc = `[${getChallengeResult.name}]`;

    let challengeResult: string = "";
    for (let i = 1; i<= hashIterations; i++) {
        challengeResult = await hash({
            s: challengeSecret + challengeSalt + challengeResult
        });
    }

    return challengeResult;
}

export async function challengeEntryIsSolved(
    args: ChallengeEntryIsSolvedArgs
): Promise<boolean> {
    const lc = `[${challengeEntryIsSolved.name}]`;
    if (args.type !== 'hash') { throw new Error(`${lc} only hash challenges are implemented in v1.`); }

    return await challengeEntryIsSolved_Hash(<ChallengeEntryIsSolvedArgs_Hash>args);
}

export async function challengeEntryIsSolved_Hash({
    type,
    challengeSecretToCheck,
    challengeSalt,
    challengeResult,
    hashIterations,
}: ChallengeEntryIsSolvedArgs_Hash): Promise<boolean> {
    const lc = `[${challengeEntryIsSolved_Hash.name}]`;
    if (type !== 'hash') { throw new Error(`${lc} only hash challenges are implemented in v1.`); }

    let challengeResult_Calculated = await getChallengeResult({
        challengeSecret: challengeSecretToCheck,
        challengeSalt,
        hashIterations
    });

    return challengeResult_Calculated === challengeResult;
}
