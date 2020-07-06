/**
 * The core of the simplicity of the ibGib protocol is that
 * fundamentally you are taking two ibGibs and producing a third.
 *
 * There are three primary functions: mut8, rel8, fork
 *
 * These are actually different aspects of the single function of
 * relationship and time, either extending or creating a timeline.
 *
 * Mut8 is intrinsic, rel8 is extrinsic, fork is a new timeline.
 * Mut8 changes a timeline, rel8 changes a timeline's link(s),
 * fork creates a new timeline.
 */
export declare type Ib = '' | string;
export declare type Gib = '' | 'gib' | string;
/**
 * Convenient for when destructuring an IbGibAddr
 */
export interface IbAndGib {
    ib: Ib,
    gib: Gib,
}
/**
 * Mostly a marker type of address.
 *
 * Not sure how to enforce schema on demand in TypeScript, but
 * that's to decide for future.
 */
export declare type IbGibAddr = string;
export declare type IbGibRel8ns = {
    /**
     * The key is the rel8nName.
     *
     * TS doesnt allow for the indexer to have a non-number/string value
     * even if it's an alias for one of these types to be more readable.
     * Otherwise I would type the `key` here as a `Rel8nName` alias of
     * `string.`
     */
    [key: string]: IbGibAddr[] | null | undefined;
};
/**
 * At the base ibGib, the bare minimum is that an ib (data) is required,
 * with an optional gib (metadata).
 */
export interface IbGib {
    ib: Ib;
    gib?: Gib;
}
/**
 * When adding additional structure to an ibGib, the first representation
 * mechanism (from V1) was having explicit Data and Rel8ns keys.
 *
 * This is, however, not the only way to represent this. As just one example,
 * you could also have a prefix for keys that are meant to be the relationships
 * to other ibGibs.
 *
 * I'm including this shape at the core here and not just in V1 because it could
 * be reused for other versions that are different tweaks with different default
 * relationships and data structures but still adhere to this data/rel8ns split
 * (and naming convention).
 */
export interface IbGibWithDataAndRel8ns<TData = any, TRel8ns extends IbGibRel8ns = IbGibRel8ns> extends IbGib {
    /**
     * Intrinsic data to this ibGib, most likely with primitives e.g. strings or numbers,
     * that will be statically copied from mutation to mutation.
     */
    data?: TData | undefined;
    /**
     * Extrinsic data WRT this ibGib, which can track their own timelines of changes.
     *
     * Note that even if the relationships here point to the same address, i.e. do
     * not change, the other ibGibs can be seen as changing or not. It all depends
     * on how you want to interpret the relationship.
     *
     * For example, if you want to pause/freeze a relationship, then this would be
     * handled by the viewer of the relationship. It just wouldn't check anywhere for
     * the more up-to-date version.
     */
    rel8ns?: TRel8ns;
}
/**
 * Data repo adapter/provider.
 */
export interface IbGibRepo<TIbGib extends IbGib = IbGib> {
    canGet(opts: CanGetIbGibOptions): boolean;
    get(opts: GetIbGibOptions): Promise<TIbGib | null>;
    canPut(opts: CanPutIbGibOptions): boolean;
    put(opts: PutIbGibOptions<TIbGib>): Promise<boolean>;
}
export interface CanGetIbGibOptions {
    /**
     * Check to see if the repo can handle getting a certain version.
     */
    version?: string;
}
export interface GetIbGibOptions {
    ib?: Ib;
    gib?: Gib;
    ibGibAddr?: IbGibAddr;
}
export interface CanPutIbGibOptions {
    /**
     * Check to see if the repo can handle getting a certain version.
     */
    version?: string;
}
export interface PutIbGibOptions<TIbGib extends IbGib = IbGib> {
    ibGib?: TIbGib;
}
export declare type TransformType = 'fork' | 'mut8' | 'rel8';
export interface TransformOpts<TSrc extends IbGib = IbGib> {
    /**
     * Fork, mut8, rel8
     */
    type?: TransformType;
    /**
     * If truthy, does NOT add a timestamp to the new ibGib.
     */
    noTimestamp?: boolean;
    /**
     * If truthy, creates dna ibGibs like V1.
     * If falsy, skips the dna and only creates the resultant ibGib.
     */
    dna?: boolean;
    /**
     * Src to apply the transform to.
     *
     * Used at runtime, NOT persisted in repo.
     */
    src?: TSrc;
    /**
     * Address of Src. Used in the repo persistence.
     */
    srcAddr?: IbGibAddr;
    /**
     * There are two ways of creating rel8ns to other ibgibs:
     *
     * 1) Concat previous ones with new one
     *   * e.g. past: ['a^gib'] --> past: ['a^gib', 'b^gib'] --> past: ['a^gib', 'b^gib', 'c^gib']
     * 2) Only have most recent one, linked list style:
     *   * e.g. past: ['a^gib'] --> past: ['b^gib'] --> past: ['c^gib']
     *
     * If you choose #1, then you have the advantage of not needing to load up all of the previous
     * records to evaluate. So this will give you minimal runtime requirements, but take up more space.
     * If you choose #2, like in a blockchain e.g., then you will have a smaller space footprint but
     * it takes longer to build the entire list.
     *
     * This gives flexibility for having rel8ns that only wish to have a single value at most.
     *
     */
    linkedRel8ns?: string[];
}
export interface TemporalJunctionPointOptions {
    timestamp?: boolean;
    uuid?: boolean;
}
export interface TransformOpts_Fork<TSrc extends IbGib = IbGib> extends TransformOpts<TSrc> {
    type?: 'fork';
    /**
     * Destination ib for the transform.
     */
    destIb?: string;
    /**
     * If truthy, creates a UUID to encourage local uniqueness of the fork.
     */
    uuid?: boolean;
    /**
     * If truthy, the forked ibGib will be a temporal junction point using
     * the specified
     * This will provide a UUID to encourage local uniqueness of the fork.
     *
     * For what a temporal junction point is, refer to
     * Back to the Future II (or ask me).
     */
    tpj?: TemporalJunctionPointOptions;
    /**
     * If true, retains parent/source's extrinsic rel8ns.
     */
    cloneRel8ns?: boolean;
    /**
     * If true, retains parent/source's intrinsic data.
     */
    cloneData?: boolean;
}
export interface TransformOpts_Mut8<TSrc extends IbGib = IbGib, TNewData = any> extends TransformOpts<TSrc> {
    type?: 'mut8';
    /**
     * Info to rename keys. Should be an object where each value should either be
     * a string or an object. If it's a string, then the corresponding key will
     * be renamed to that value. If it's an object, then it will recurse at that
     * key.
     *
     * @example
     * data = { a: 'aaa', b: { rename: 'me', ignore: 'me' }}
     * dataToRemove = { a: 'aRenamed', b: { rename: 'renamed' } }
     * data = { aRenamed: 'aaa', b: { renamed: 'me', ignore: 'me' }}
     */
    dataToRename?: {
        [key: string]: any;
    };
    /**
     * Info to remove keys. Should be an object where each value should either be
     * a string or an object. If it's a string, then the corresponding key will
     * be removed (the value is ignored). If it's an object, then it will recurse at that
     * key.
     *
     * @example
     * data = { a: 'aaa', b: { remove: 'me', ignore: 'me' }}
     * dataToRemove = { b: { remove: '' } }
     * data = { a: 'aaa', b: { ignore: 'me' }}
     */
    dataToRemove?: {
        [key: string]: any;
    };
    /**
     * Data object that contains only additive information for ibGib's intrinsic data.
     */
    dataToAddOrPatch?: TNewData;
    /**
     * If given, will mut8 the ib (without forking the entire ibGib).
     *
     * Often this will act as a 'rename', e.g. (if the ib is acting as the 'name')
     */
    mut8Ib?: string;
}
export interface TransformOpts_Rel8<TSrc extends IbGib = IbGib> extends TransformOpts<TSrc> {
    type?: 'rel8';
    /**
     * Relationships to add to an ibGib, either by creating new relationships or by
     * concatenating the arrays to existing ones.
     *
     * NOTES:
     *   - Moving relationships can be performed by combining add/remove rel8ns.
     *   - How the relations are actually represented in the ibGib record is
     *     left to the compiler. The same goes for how this information is
     *     recorded in the dna, if generating dna.
     */
    rel8nsToAddByAddr?: IbGibRel8ns;
    /**
     * Relationships to remove from an ibGib.
     *
     * NOTES:
     *   - Moving relationships can be performed by combining add/remove rel8ns.
     *   - Attempting to remove a non-existing relationship may or may not cause
     *     an error, depending on the compiler.
     */
    rel8nsToRemoveByAddr?: IbGibRel8ns;
}

export interface TransformResult<TOut extends IbGib> {
    /**
     * The final result of the transformation
     */
    newIbGib: TOut,
    /**
     * DNA side effects created in the transformation.
     */
    dnas?: TOut[],
    /**
     * If you're performing a transform with multiple steps,
     * then there will be intermediate ibGibs created.
     */
    intermediateIbGibs?: TOut[],
}
