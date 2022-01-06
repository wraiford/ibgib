import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import { IbGibAddr, IbGib, IbGibWithDataAndRel8ns, IbGibRel8ns } from 'ts-gib';
import { HashAlgorithm, SaltStrategy, } from 'encrypt-gib';
import * as c from './constants';

export type IbgibItemType =
    'pic' | 'comment' | 'link' | 'tag' | 'tags' | 'root' | 'roots' | 'other';

export interface IbgibItem {
    /**
     * Metadata ib value per use case
     */
    ib?: string;
    /**
     * Often the sha256 hash of the other three ibGib fields ib, data, and rel8ns.
     */
    gib?: string;
    /**
     * ib^gib address which uniquely identifies the ibGib.
     */
    addr?: IbGibAddr;
    /**
     * Full record for this item's data. If this is truthy, then most likely the
     * {@link loaded} property is truthy.
     */
    ibGib?: IbGib_V1;
    /**
     * "Parent" ibGib if applicable, i.e. the ibGib where this item is currently "inside"
     * or "at".  in * the URL bar.
     *
     * For example, the URL will contain the address of the top-most context which the
     * other shown ibGibs are "children". Their own views may have children ibGibs
     * as well, who would consider their parent to be their context.
     *
     * NOTE:
     *   In ibGib, anything can be a "container", similar to a folder. A pic can "contain"
     *   other pics, comments can "contain" other comments, etc. But these do this via
     *   different rel8ns, not just an unnamed or "contains" rel8n.
     */
    ibGib_Context?: IbGib_V1;
    /**
     * type of ibGib per use case in this app.
     *
     * In the future, any comment could conceivably be a tag and thus have
     * multiple types.
     */
    type?: IbgibItemType;
    /**
     * hash of the full-sized image.
     */
    binId?: string;
    /**
     * hash of the thumbnail image.
     *
     * not implemented yet.
     */
    binIdThumb?: string;
    /**
     * extension of the image
     */
    binExt?: string;
    picSrc?: any;
    // picSrc?: string;
    text?: string;
    isMeta?: boolean;

    selected?: boolean;
    loaded?: boolean;
    timestamp?: string;
    /** If true, then the component is checking for updates. */
    refreshing?: boolean;
    /**
     * If true, then the component is currently syncing with
     * (publishing to) other space(s).
     */
    syncing?: boolean;
}


/**
 * Shape of a tag^gib data.
 */
export interface TagData {
    text: string;
    icon?: string;
    description?: string;
}

export interface RootData {
    text: string;
    icon?: string;
    description?: string;
}

export interface LatestData {
}

export interface PicData {
    binHash: string;
    binHashThumb?: string;
    ext: string;
    filename: string;
    timestamp: string;
}

export interface CommentData {
    text: string;
    textTimestamp?: string;
    timestamp?: string;
}

export interface ActionItem {
    type: 'button' | 'inputfile';
    text: string;
    icon: string;
    handler?: (event: MouseEvent) => Promise<void>;
    filepicked?: (event: any) => Promise<void>;
}

export type SpecialIbGibType =
    "tags" | "roots" | "latest" | "outerspaces" | "secrets" |
    "encryptions";

/**
 * There has been a new ibGib that is the latest for a given tjp timeline.
 */
export interface LatestEventInfo {
    tjpAddr: IbGibAddr;
    latestAddr: IbGibAddr;
    latestIbGib?: IbGib_V1<any>;
}

export interface SendData {
    endpoint?: string;

}

// #region witness and spaces (later will pull out into another lib after test iterating here)

/**
 * A witness is a lot like an ibGib analog for a function.
 * Now remember in FP, a function takes a single arg, and
 * multiple args are actually reified single-arg functions
 * that are curried.
 *
 * So an ibGib witness is an ibGib that has a single function: `witness`.
 * What can it witness? Another ibGib. What does it return? An ibGib.
 *
 * ## notes
 *
 * I'm not smart enough to descend this from just IbGib, so I'm doing
 * IbGibwithDataAndRel8ns. This is more of a convenience anyway.
 */
export interface Witness<
    TIbGibIn extends IbGib,
    TIbGibOut extends IbGib,
    TData = any,
    TRel8ns extends IbGibRel8ns = IbGibRel8ns,
    >
    extends IbGibWithDataAndRel8ns<TData, TRel8ns> {
    witness(arg: TIbGibIn): Promise<TIbGibOut | undefined>;
}

/**
 * This interface simply types our data and rel8ns to V1 style.
 */
export interface Witness_V1<
    TDataIn extends any,
    TRel8nsIn extends IbGibRel8ns_V1,
    TIbGibIn extends IbGib_V1<TDataIn, TRel8nsIn>,
    TDataOut extends any,
    TRel8nsOut extends IbGibRel8ns_V1,
    TIbGibOut extends IbGib_V1<TDataOut, TRel8nsOut>,
    TData = any,
    TRel8ns extends IbGibRel8ns_V1 = IbGibRel8ns_V1,
    >
    extends Witness<TIbGibIn, TIbGibOut, TData, TRel8ns> {
}

export interface IbGibSpaceData {
    /**
     * Name for the space.
     *
     * doesn't have to be unique.
     */
    name: string;
    /**
     * Optional description of the space.
     */
    description?: string;
    /**
     * "Should" be a unique identifier for the space.
     *
     * DEBUG Make this optional after compiler stuff DEBUG
     */
    uuid?: string;
    /**
     * Optional configuration for `witness` call.
     * If true, then this space will not catch an error in `witnessImpl`
     * function.
     *
     * ## notes
     *
     * Descendants of Witness who don't override the base `witness` function
     * (but rather override `witnessImpl` as expected) don't need to check
     * for this explicitly, since it is referenced in the base `witness`
     * function implementation.
     */
    catchAllErrors?: boolean;
    /**
     * Optional arg for verbose logging.
     *
     * Space implementations can check this value directly, or if
     * they descend from `WitnessBase`, then there is a property
     * that safely navigates this value.
     */
    trace?: boolean;
    /**
     * DOESNT WORK ATM - NOT IMPLEMENTED - HOOGLEDY BOOGLEDY
     * If true, any calls to `witness` will have the opt and result
     * ibGibs persisted to the space, regardless of what the actual
     * opt/result is.
     *
     * This is like providing a logging feature for the space itself.
     */
    persistOptsAndResultIbGibs?: boolean;
}

export interface IbGibSpaceRel8ns extends IbGibRel8ns_V1 {
    [c.ENCRYPTION_REL8N_NAME]?: IbGibAddr[];
}


/**
 * Cmds for interacting with ibgib spaces.
 *
 * Not all of these will be implemented for every space.
 *
 * ## todo
 *
 * change these commands to better structure, e.g., verb/do/mod, can/get/addrs
 * */
export type IbGibSpaceOptionsCmd = 'get' | 'put' | 'delete';
/** Cmds for interacting with ibgib spaces.  */
export const IbGibSpaceOptionsCmd = {
    /** Retrieve ibGib(s) out of the space (does not remove them). */
    get: 'get' as IbGibSpaceOptionsCmd,
    /** Registers/imports ibGib(s) into the space. */
    put: 'put' as IbGibSpaceOptionsCmd,
    /** Delete an ibGib from a space */
    delete: 'delete' as IbGibSpaceOptionsCmd,
}

/**
 * Flags to affect the command's interpretation.
 */
export type IbGibSpaceOptionsCmdModifier = 'can' | 'addrs' | 'latest';
/**
 * Flags to affect the command's interpretation.
 */
export const IbGibSpaceOptionsCmdModifier = {
    /**
     * Only interested if possibility to do command.
     *
     * This can be due to authorization or other.
     */
    can: 'can' as IbGibSpaceOptionsCmdModifier,
    /**
     * Only return the addresses of ibgibs
     */
    addrs: 'addrs' as IbGibSpaceOptionsCmdModifier,
    /**
     * Only interested in the latest one(s).
     *
     * The incoming addr(s) should be the tjp(s), since "latest"
     * only makes sense with unique timelines which are referenced by
     * their tjps.
     *
     * ## notes
     *
     * ATOW I'm actually using this in the aws dynamodb ibgib space to
     * get "newer" ibgibs, not just the latest.
     */
    latest: 'latest' as IbGibSpaceOptionsCmdModifier,
}

/** Information for interacting with spaces. */
export interface IbGibSpaceOptionsData {
    /**
     * Not really in use atm, but will use in the future.
     */
    version?: string;
    cmd: IbGibSpaceOptionsCmd | string;
    /**
     * Optional modifier flag(s) to the command.
     *
     * ## notes
     *
     * An implementing class can always use/extend these or extend the interface
     * of the options data.
     */
    cmdModifiers?: (IbGibSpaceOptionsCmdModifier | string)[];
    /**
     * Addrs of ibgibs to get/delete
     */
    ibGibAddrs?: IbGibAddr[];
    /**
     * If putting, this will force replacing the file.
     *
     * ## intent
     * atow this is just for `put` commands.
     */
    force?: boolean;
    /**
     * {@see WitnessBase_V1.trace}
     */
    catchAllErrors?: boolean;
    /**
     * {@see WitnessBase_V1.trace}
     */
    trace?: boolean;
}

export interface IbGibSpaceOptionsRel8ns extends IbGibRel8ns_V1 {
}

export interface IbGibSpaceOptionsIbGib<
    TIbGib extends IbGib = IbGib_V1,
    TOptsData extends IbGibSpaceOptionsData = IbGibSpaceOptionsData,
    // TOptsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns
    TOptsRel8ns extends IbGibSpaceOptionsRel8ns = IbGibSpaceOptionsRel8ns,
    > extends IbGibWithDataAndRel8ns<TOptsData, TOptsRel8ns> {
    /**
     * When putting ibGibs, we don't want to persist the entire graph in the
     * data object. So these ibGibs live on the ibGib arg object itself.
     */
    ibGibs?: TIbGib[];
}

export interface IbGibSpaceResultData {
    /**
     * The address of the options ibGib that corresponds this space result.
     *
     * So if you called `space.witness(opts)` which produced this result, this is
     * `getIbGibAddr({ibGib: opts})`.
     *
     * Perhaps I should have this as a rel8n on the actual result ibGib instead of here
     * in the data.
     */
    optsAddr: IbGibAddr;
    /**
     * true if the operation executed successfully.
     *
     * If this is a `canGet` or `canPut` `cmd`, this does NOT indicate if you
     * can or can't. For that, see the `can` property of this interface.
     */
    success?: boolean;
    /**
     * If the `cmd` is `canGet` or `canPut`, this holds the result that indicates
     * if you can or can't.
     */
    can?: boolean;
    /**
     * Any error messages go here. If this is populated, then the `success`
     * *should* be false (but obvious the interface can't guarantee implementation).
     */
    errors?: string[];
    /**
     * Any warnings that don't cause this operation to explicitly fail, i.e. `errors`
     * is falsy/empty.
     */
    warnings?: string[];
    /**
     * If getting address(es), they will be here.
     */
    addrs?: IbGibAddr[];
    /**
     * Addresses not found in a get.
     */
    addrsNotFound?: IbGibAddr[];
    /**
     * Addresses that are already in the space when requesting `put` or `canPut`.
     */
    addrsAlreadyHave?: IbGibAddr[];
    /**
     * Addresses for ibGibs which had errors.
     */
    addrsErrored?: IbGibAddr[];
}

export interface IbGibSpaceResultRel8ns extends IbGibRel8ns_V1 { }

export interface IbGibSpaceResultIbGib<
    TIbGib extends IbGib,
    TResultData extends IbGibSpaceResultData,
    TResultRel8ns extends IbGibSpaceResultRel8ns
    >
    extends IbGibWithDataAndRel8ns<TResultData, TResultRel8ns> {

    /**
     * When getting ibGibs, we don't want to persist the entire graph in the
     * data object. So these ibGibs live on the result ibGib object itself.
     */
    ibGibs?: TIbGib[];
}

/**
* Data space adapter/provider, such that a space should only have one type of...
*   * ibGib shape
*   * witness arg shape (which brings in external ibGibs)
*   * witness result shape
*
* So this interface facilitates that belief.
*/
export interface IbGibSpace<
    TIbGib extends IbGib,
    TOptionsData extends IbGibSpaceOptionsData,
    TOptionsRel8ns extends IbGibSpaceOptionsRel8ns,
    TOptionsIbGib extends IbGibSpaceOptionsIbGib<TIbGib, TOptionsData, TOptionsRel8ns>,
    TResultData extends IbGibSpaceResultData,
    TResultRel8ns extends IbGibSpaceResultRel8ns,
    TResultIbGib extends IbGibSpaceResultIbGib<TIbGib, TResultData, TResultRel8ns>,
    TData extends IbGibSpaceData = IbGibSpaceData,
    TRel8ns extends IbGibSpaceRel8ns = IbGibRel8ns,
    >
    extends Witness<TOptionsIbGib, TResultIbGib, TData, TRel8ns> {
    witness(arg: TOptionsIbGib): Promise<TResultIbGib | undefined>;
}

// #endregion

export type AWSRegion = 'us-east-1' | string;

// #region outer spaces

export type OuterSpaceType = "sync";
export const OuterSpaceType = {
    sync: 'sync' as OuterSpaceType,
}
export const VALID_OUTER_SPACE_TYPES = Object.values(OuterSpaceType).concat();

export type SyncSpaceSubtype = 'aws-dynamodb';
export const SyncSpaceSubtype = {
    aws_dynamodb: 'aws-dynamodb' as SyncSpaceSubtype,
}
export const VALID_OUTER_SPACE_SUBTYPES = Object.values(SyncSpaceSubtype).concat();

export interface OuterSpaceData extends IbGibSpaceData {
    type: OuterSpaceType;
}

export interface SyncSpaceData extends OuterSpaceData {
    type: 'sync';
    subtype: SyncSpaceSubtype;
}

export interface OuterSpaceRel8ns extends IbGibSpaceRel8ns {
    [c.CIPHERTEXT_REL8N_NAME]?: IbGibAddr[];
    /**
     * ATOW this will only be c.CONSENSUS_ADDR_SYNC_NAIVE_PUT_MERGE
     */
    [c.CONSENSUS_REL8N_NAME]: IbGibAddr[];
}

export interface OuterSpaceIbGib
    extends IbGib_V1<OuterSpaceData, OuterSpaceRel8ns> {

}

// #endregion

// #region secrets related

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


// #endregion

export interface FieldInfo {
  /**
   * Property name
   */
  name: string;
  /**
   * Label for the property on a form
   */
  label?: string;
  /**
   * Optional description for the property. Can bind title/hover/tooltip to this.
   */
  description?: string;
  /**
   * Placeholder when entering the field's data.
   */
  placeholder?: string;
  /**
   * Validation regular expression
   */
  regexp?: RegExp;
  /**
   * Only required if wanting to do validation beyond regexp/required.
   */
  fnValid?: (value: string) => boolean;
  /**
   * Error message that shows up **when using `fnValid`**.
   * Other messages show for regexp/required.
   */
  fnErrorMsg?: string;
  /**
   * If the field is required.
   */
  required?: boolean;
}
