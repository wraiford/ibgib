import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, } from 'ts-gib';
import { HashAlgorithm, SaltStrategy } from 'encrypt-gib';
import * as c from '../constants';

export type SecretType = "password";
export const SecretType = {
    password: 'password' as SecretType,
}
export const VALID_SECRET_TYPES = Object.values(SecretType).concat();

export interface SecretInfo {
    name: string;
    description?: string;
    expirationUTC: string;
    type: SecretType;
}

export interface SecretInfo_Password extends SecretInfo {
    type: 'password';
    /**
     * We won't save the entire hash, just the hash.slice(16),
     * because we are not checking to give authority, we are
     * just checking to see if the user entered the same
     * password for their own check.
     *
     * ## warnings
     * NOTHING giving actual authorization should look at this.
     */
    hash16816_SHA256: string;
    /**
     * Public hint to help you remember your secret (or help the bad person
     * attack your secret).
     */
    hint?: string;
}
export type SecretData_V1 = SecretInfo; // extend this with logical OR later

export interface SecretRel8ns_V1 extends IbGibRel8ns_V1 {
}

export interface SecretIbGib_V1 extends IbGib_V1<SecretData_V1, SecretRel8ns_V1> {
}

export interface EncryptionInfo {
    name: string;
    description?: string;
    method: EncryptionMethod;
}

export type EncryptionMethod = 'encrypt-gib (weak)';
export const EncryptionMethod = {
    encrypt_gib_weak: 'encrypt-gib (weak)' as EncryptionMethod,
}

export interface EncryptionInfo {
    method: EncryptionMethod,
}

export interface EncryptionInfo_EncryptGib extends EncryptionInfo {
    method: 'encrypt-gib (weak)'
    /**
     * This is the algorithm that encrypt-gib will use in its
     * internal hashing round function to encrypt the data.
     */
    hashAlgorithm: HashAlgorithm;
    /**
     * This is an initial number of recursions to perform to "get farther away"
     * from the password. It is a one-time cost at the beginning of the
     * entire encryption process, so it does not cost more with more data.
     */
    initialRecursions: number;
    /**
     * This is the number of internal hashes per round function, which is per
     * hex character of data. So the more recursions here, the longer it is
     * going to take to encrypt/decrypt.
     */
    recursionsPerHash?: number;
    /**
     * Salt used throughout hashing in encryption/decryption. The longer and
     * more random, the better for security. But there is also a resource cost.
     */
    salt: string;
    /**
     * Stronger are the perHash options.
     *
     *    'prependPerHash' | 'appendPerHash' | 'initialPrepend' | 'initialAppend';
     */
    saltStrategy?: SaltStrategy;
    /**
     * The encrypted data is a delimited list of indices.
     *
     * @default "," (comma-delimited)
     */
    encryptedDataDelimiter?: string;
}

export type EncryptionData_V1 = EncryptionInfo_EncryptGib; // extend this with logical OR later

export interface EncryptionRel8ns_V1 extends IbGibRel8ns_V1 { }

/**
 * IbGib that represents encryption settings
 */
export interface EncryptionIbGib extends IbGib_V1<EncryptionData_V1, EncryptionRel8ns_V1> { }

/**
 * Data for the actual encrypted ciphertext.
 */
export interface CiphertextData<TMetadata = any> {
    ciphertext?: string;
    metadata?: TMetadata;
}

/**
 * Rel8ns for the actual encrypted ciphertext
 */
export interface CiphertextRel8ns extends IbGibRel8ns_V1 {
    [c.ENCRYPTION_REL8N_NAME]?: IbGibAddr[];
}

/**
 * Ibgib for the actual encrypted content, as opposed to the
 * encryption secret (password) or encryption method/algorithm.
 */
export interface CiphertextIbGib_V1<TMetadata = any>
    extends IbGib_V1<CiphertextData<TMetadata>, CiphertextRel8ns> {
}

