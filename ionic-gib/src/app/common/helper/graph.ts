import * as h from 'ts-gib/dist/helper';
import {
    Ib, IbGibAddr, TransformResult, V1,
} from 'ts-gib';
import {
    GIB, IbGib_V1, Rel8n,
    Factory_V1 as factory,
    isPrimitive,
    IBGIB_DELIMITER,
} from 'ts-gib/dist/V1';
import { getGib, } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../../common/constants';
import { getFromSpace, getLatestAddrs } from './space';
import { getTimelinesGroupedByTjp } from './ibgib';
import { validateIbGibAddr } from './validate';
import { TjpIbGibAddr } from '../types/ibgib';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { unique } from './utils';


const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Options when getting dependency graph for ibGib(s).
 *
 * Note that this is used both in local and outer space contexts.
 * When you want to default to the local user space in the local context,
 * i.e. in `IbgibsService` atow, pass in `null` for {@link space}.
 */
export interface GetGraphOptions {
    /**
     * source ibGib to grab dependencies of.
     *
     * caller can pass in `ibGib` or `ibGibs` or `ibGibAddr` or `ibGibAddrs`.
     */
    ibGib?: IbGib_V1,
    /**
     * source ibGibs to grab dependencies of.
     *
     * caller can pass in `ibGib` or `ibGibs` or `ibGibAddr` or `ibGibAddrs`.
     */
    ibGibs?: IbGib_V1[],
    /**
     * source ibGib address to grab dependencies of.
     *
     * caller can pass in `ibGib` or `ibGibs` or `ibGibAddr` or `ibGibAddrs`.
     */
    ibGibAddr?: IbGibAddr,
    /**
     * source ibGib addresses to grab dependencies of.
     *
     * caller can pass in `ibGib` or `ibGibs` or `ibGibAddr` or `ibGibAddrs`.
     */
    ibGibAddrs?: IbGibAddr[],
    /**
     * If true, for each timeline in each "frozen" ibgib graph we will get the
     * latest address in the timeline and recheck rel8d ibgibs for newly
     * added timeline branches.
     *
     * If false, this will only look in the past for each rel8d ibgib.
     *
     * ## notes
     *
     * Say you have a source ibgib with a comment "child" (relative to our
     * source ibgib).  Now say you add an ibgib to that child comment. The rel8d
     * addr in the source ibgib will still point to the child comment's initial
     * addr - before it was changed by adding its own "child" ("grandchild" to
     * the source). So if you get a live dependency graph on the parent, it will
     * come across the child's timeline and get the latest for that timeline
     * (and associated ibgibs like the child's dna transforms that add the
     * grandchild). This will include the grandchild.  If it's not a live graph,
     * then the parent will only have the child and will exclude the grandchild.
     */
    live: boolean,
    /**
     * object that will be populated through recursive calls to this function.
     *
     * First caller of this function should not provide this and I'm not atow
     * coding a separate implementation function to ensure this.
     *
     * @see {@link skipAddrs}
     */
    gotten?: { [addr: string]: IbGib_V1 },
    /**
     * used when doing {@link live} dependency graph gets. Same use as
     * {@link gotten}, but with regards to timelines.
     */
    tjpAddrsAlreadyAnalyzed?: TjpIbGibAddr[],
    /**
     * List of ibgib addresses to skip not retrive in the dependency graph.
     *
     * This will also skip any ibgib addresses that would have occurred in the
     * past of these ibgibs, as when skipping an ibgib, you are also skipping
     * its dependencies implicitly as well (unless those others are related via
     * another ibgib that is not skipped of course).
     *
     * ## driving use case
     *
     * We don't want to get ibgibs that we already have, and this is cleaner
     * than pre-populating the `gotten` parameter for double-duty. That property
     * should be strictly used within this call recursively.
     *
     * @see {@link gotten}
     */
    skipAddrs?: IbGibAddr[],
    /**
     * Skip these particular rel8n names.
     *
     * ## driving intent
     *
     * I'm adding this to be able to skip getting dna ibgibs.
     *
     * ## see also
     *
     * @see {@link onlyRel8nNames} for whitelist of rel8n names for traversal
     */
    skipRel8nNames?: string[],
    /**
     * whitelist of rel8nNames to traverse.
     *
     * ## see also
     *
     * @see {@link skipRel8nNames} for a blacklist of rel8n names for traversal
     */
    onlyRel8nNames?: string[],
    /**
     * If not found when getting dependency graph, do we retry? This is the
     * max number of retries.
     */
    maxRetries?: number,
    /**
     * If provided and {@link maxRetries} is non-zero, the next retry will be
     * delayed this amount of time if one or more addrs are not found.
     */
    msBetweenRetries?: number,
    /**
     * Space within which we should be looking for ibGibs.
     *
     * ## NOTE on providing space vs local user space
     *
     * I'm reusing this interface for both generic space function and ibgib service
     * function, which has an implicit default space of the local user space if this
     * is falsy. So just pass in `null` if you are using this with ibgibs service and
     * want it to default to the local user space.
     */
    space: IbGibSpaceAny | null,
    /**
     * If supplied, will make intermittent calls to console.timeLog using this name.
     */
    timeLogName?: string,
    /**
     * When getting the live dependency graph, this is used so we don't
     * duplicate work in recursive calls.
     *
     * IOW, in the first run of{@link getGraphProjection_Live}, we call
     * getLatestAddrs which maps some addrs to the latest addrs in the space. So
     * we now have a reference to the latest and if we need to call the function
     * {@link getGraphProjection_Live} recursively, then we can provide this
     * info to reduce unnecessary computation.
     */
    mapTjpAddrToLatestAddrsInSpace?: { [tjpAddr: string]: IbGibAddr }
}

export type GetGraphResult = { [addr: string]: IbGib_V1 };


export interface GetGraphProjectionOptions extends GetGraphOptions {
    // /**
    //  * max depth away from source ibgibs to traverse
    //  */
    // depth?: number;
}

export interface GetDependencyGraphOptions extends GetGraphProjectionOptions {
    // depth?: undefined;
}

/**
 *
 * @returns dependency graph, live or non-live depending on {@link GetDependencyGraphOptions}
 *
 * Getting a `live` dependency graph means that we will be looking in the given
 * @see {@link GetDependencyGraphOptions.space} for updates to ibGibs' timelines
 * (those ibGibs that have timelines/tjps). This is more costly computationally
 * in the short-term, but often cheaper in the long-term.
 */
export async function getDependencyGraph({
    ibGib, ibGibs, ibGibAddr, ibGibAddrs,
    live,
    gotten, tjpAddrsAlreadyAnalyzed,
    skipAddrs, skipRel8nNames, onlyRel8nNames,
    maxRetries, msBetweenRetries,
    space,
    timeLogName,
    mapTjpAddrToLatestAddrsInSpace,
}: GetGraphProjectionOptions): Promise<GetGraphResult> {
    const lc = `[${getGraphProjection.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: c2a4426c22e849611ca0cedabe683a22)`); }

        const graph = await getGraphProjection({
            ibGib, ibGibs, ibGibAddr, ibGibAddrs,
            live,
            gotten, tjpAddrsAlreadyAnalyzed,
            skipAddrs, skipRel8nNames, onlyRel8nNames,
            maxRetries, msBetweenRetries,
            space,
            timeLogName,
            mapTjpAddrToLatestAddrsInSpace,
        });

        Object.values(graph).filter(ibGib => ibGib.ib.startsWith('comment ')).forEach(ibGib => { console.table(ibGib); });
        const ibs =
            Object.values(graph).filter(ibGib => ibGib.ib.startsWith('comment '))
                .map(ibGib => ibGib.ib);
        unique(ibs).forEach(ib => console.log(ib));
        debugger;
        return graph;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

export async function getGraphProjection({
    ibGib, ibGibs, ibGibAddr, ibGibAddrs,
    live,
    gotten, tjpAddrsAlreadyAnalyzed,
    skipAddrs, skipRel8nNames, onlyRel8nNames,
    maxRetries, msBetweenRetries,
    space,
    timeLogName,
    mapTjpAddrToLatestAddrsInSpace,
}: GetDependencyGraphOptions): Promise<GetGraphResult> {
    const lc = `[${getDependencyGraph.name}]`;
    try {
        if (logalot) { console.log(`${lc} starting... (I: 70508d7a5c63eae1f22ae851b32b3d22)`); }

        // #region validate & initialize

        if (!space) { throw new Error(`space required. (E: 9f38166ab70340cb919174f8d26af909)`); }
        if (!ibGib && !ibGibAddr && (ibGibs ?? []).length === 0 && (ibGibAddrs ?? []).length === 0) {
            throw new Error(`either ibGib/s or ibGibAddr/s required. (E: b6d08699651f455697f0d05a41edb039)`);
        }
        if (timeLogName) { console.timeLog(timeLogName, `${lc} starting...`) }

        skipRel8nNames = skipRel8nNames || [];
        // do NOT initialize onlyRel8nNames because we do logic based on falsy value
        skipAddrs = skipAddrs || [];
        gotten = gotten || {};
        tjpAddrsAlreadyAnalyzed = tjpAddrsAlreadyAnalyzed || [];

        // convert single args (ibGib, ibGibAddr) into the array args, filtering
        // out primitives that we don't want. The `filter` function creates the
        // copy here, so we won't mutate the incoming arrays. (The ibgibs and
        // addrs themselves are immutable).
        ibGibAddrs = (ibGibAddrs ?? [])
            .filter(x => !isPrimitive({ gib: h.getIbAndGib({ ibGibAddr: x }).gib })) // no primitives
            .filter(x => !skipAddrs.includes(x));
        ibGibs =
            (ibGibs ?? [])
                .filter(x => !isPrimitive({ ibGib: x })) // no primitives
                .filter(x => !skipAddrs.includes(h.getIbGibAddr({ ibGib: x })));
        // if we're passed in a single ibGib, add it to the ibGibs array because
        // we're going to work off of that.
        if (ibGib &&
            !isPrimitive({ ibGib }) &&
            !ibGibs.some(x => x.gib === ibGib.gib) &&
            !skipAddrs.includes(h.getIbGibAddr({ ibGib }))
        ) {
            ibGibs.push(ibGib);
        }
        // if we're passed in a single ibGibAddr, add it to the ibGibAddrs array because
        // we're going to work off of that.
        if (ibGibAddr &&
            !isPrimitive({ gib: h.getIbAndGib({ ibGibAddr }).gib }) &&
            !ibGibAddrs.includes(ibGibAddr) &&
            !skipAddrs.includes(ibGibAddr)
        ) {
            ibGibAddrs.push(ibGibAddr);
        }

        // #endregion validate & initialize

        // #region retrieve any associated ibGibs from the space that we don't already have (if any)

        const addrsWeDontHaveAlready_IncomingIbGibAddrs: IbGibAddr[] = [];
        const gottenAddrs: IbGibAddr[] = Object.keys(gotten); // compute once in this closure
        const incomingIbGibAddrs = ibGibs.map(x => h.getIbGibAddr({ ibGib: x }));
        const noNeedAddrs = [...gottenAddrs, ...incomingIbGibAddrs, ...skipAddrs,];
        for (let i = 0; i < ibGibAddrs.length; i++) {
            if (!noNeedAddrs.includes(ibGibAddrs[i])) {
                addrsWeDontHaveAlready_IncomingIbGibAddrs.push(ibGibAddrs[i]);
            }
        }

        if (addrsWeDontHaveAlready_IncomingIbGibAddrs.length > 0) {
            // delete this related code when I'm done testing .
            // const primaryKeysDebug: { [addr: string]: string } = {};
            // for (let i = 0; i < addrsWeDontHaveAlready_IncomingIbGibAddrs.length; i++) {
            //     const addr = addrsWeDontHaveAlready_IncomingIbGibAddrs[i];
            //     primaryKeysDebug[addr] = await h.hash({s: addr, algorithm: 'SHA-256'});
            // }

            // get from space those we don't already have, with retries if applicable

            // do multiple retry attempts if necessary and caller sets it.
            let addrsToGet = addrsWeDontHaveAlready_IncomingIbGibAddrs.concat();
            let retryCount = 0;
            maxRetries = maxRetries ?? 0;
            while (retryCount <= maxRetries && addrsToGet.length > 0) {
                if (timeLogName && retryCount === 0) { console.timeLog(timeLogName, `${lc} FIRST try starting...`) }
                if (timeLogName && retryCount > 0) { console.timeLog(timeLogName, `${lc} RETRY starting...`) }
                // delay if applicable
                if (retryCount > 0 && msBetweenRetries) {
                    if (timeLogName) { console.timeLog(timeLogName, `${lc} delaying ${msBetweenRetries}ms for retry`); }
                    if (logalot) { console.log(`${lc} retrying. addrsToGet (${addrsToGet.length}): ${addrsToGet} (I: 8460694cdd5518472680784c3b96a822)`); }
                    await h.delay(msBetweenRetries);
                }

                // do the get
                if (timeLogName) { console.timeLog(timeLogName, `${lc} getFromSpace (${addrsToGet?.length}) starting...`); }
                let resGetThese = await getFromSpace({ addrs: addrsToGet, space });
                if (timeLogName) { console.timeLog(timeLogName, `${lc} getFromSpace complete.`); }
                if (resGetThese.success && resGetThese.ibGibs?.length > 0) {
                    resGetThese.ibGibs.forEach(x => ibGibs.push(x));
                    const gottenAddrs = resGetThese.ibGibs.map(x => h.getIbGibAddr({ ibGib: x }));
                    if (gottenAddrs.length === addrsToGet.length) {
                        if (timeLogName) { console.timeLog(timeLogName, `${lc} got all.`) }
                        // got them all, so we're done
                        addrsToGet = [];
                        break;
                    } else {
                        if (timeLogName) { console.timeLog(timeLogName, `${lc} got some.`) }
                        // got only some, prune addrsToGet for next retry (if any)
                        addrsToGet = addrsToGet.filter(x => !gottenAddrs.includes(x));
                    }
                } else {
                    // failed, addrsToGet stays the same
                    if (timeLogName) { console.timeLog(timeLogName, `${lc} failed. addrs: ${addrsToGet?.join(',')}`) }
                }
                retryCount++;
            }
            if (addrsToGet?.length > 0) {
                // console.dir(primaryKeysDebug);
                throw new Error(`unable to retrieve dependency ibgibs from space.\n\nThis is often because downloading failed due to the sync space's server getting temporarily overloaded, OR...it sometimes happens when an ibgib doesn't get fully published to the sync space in the first place.\n\nYou could retry immediately or later, but if the problem persists, then retry from the publishers end (have the publisher sync again). (E: 8413594b6c1b447988781cf3f3e1729d)`);
            }
        }

        // #endregion retrieve any associated ibGibs from the space that we don't already have (if any)

        // at this point, there are two different strategies for diving deeper,
        // depending on if we are building a `live` graph or not.

        if (live) {
            return getGraphProjection_Live({
                ibGib, ibGibs, ibGibAddr, ibGibAddrs: [],
                live,
                gotten, tjpAddrsAlreadyAnalyzed,
                skipAddrs, skipRel8nNames, onlyRel8nNames,
                maxRetries, msBetweenRetries,
                space, timeLogName,
                mapTjpAddrToLatestAddrsInSpace,
            });
        } else {
            return getGraphProjection_NonLive({
                ibGib, ibGibs, ibGibAddr, ibGibAddrs: [],
                live,
                gotten, /* tjpAddrsAlreadyAnalyzed not used */
                skipAddrs, skipRel8nNames, onlyRel8nNames,
                maxRetries, msBetweenRetries,
                space, timeLogName,
            });
        }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        throw error;
    } finally {
        if (logalot) { console.log(`${lc} complete.`); }
    }
}

/**
 * NOT EXPORTED
 *
 * @see {@link getGraphProjection}
 * @see {@link getDependencyGraph}
 */
async function getGraphProjection_Live({
    ibGibs, ibGibAddrs,
    gotten, tjpAddrsAlreadyAnalyzed,
    mapTjpAddrToLatestAddrsInSpace,
    skipAddrs, skipRel8nNames, onlyRel8nNames,
    maxRetries, msBetweenRetries,
    space,
    timeLogName,
}: GetGraphProjectionOptions): Promise<GetGraphResult> {
    const lc = `[${getGraphProjection_Live.name}]`;
    try {
        mapTjpAddrToLatestAddrsInSpace = mapTjpAddrToLatestAddrsInSpace ?? {};
        tjpAddrsAlreadyAnalyzed = tjpAddrsAlreadyAnalyzed || [];

        // at this point, our incoming ibGibs are fully populated

        // live dependency graph searching requires a timeline-centric approach.
        // for each incoming ibGib, we must first determine if it has a
        // timeline.  if it does, then we get the latest in that timeline and
        // get all ibgibs in that lineage only. we do NOT YET go through any
        // rel8d ibgibs that also have timelines

        // what we can do is compile our list of ibGib addrs according to each
        // timeline and then call the nonlive version of the dependency graph.
        // but we must get the latest in the timeline, then get all associated
        // timelines and get the latest of those. Then we can call get
        // dependency graph on the non-live version, passing in all of those
        // latest ibgibs in the timelines (and everything we've gotten in the
        // interim so we don't waste time getting more).

        // const {mapWithTjp_NoDna, mapWithTjp_YesDna, mapWithoutTjps} =
        //     splitPerTjpAndOrDna({ibGibs})
        // const mapWithTjp: { [addr: IbGibAddr]: IbGib_V1 } = {
        //     ...mapWithTjp_YesDna,
        //     ...mapWithTjp_NoDna,
        // };
        // const ibGibsWithTjp = Object.values(mapWithTjp);
        // const ibGibsWithoutTjp = Object.values(mapWithoutTjps);
        const timelinesPerTjp = getTimelinesGroupedByTjp({
            ibGibs,
            // ibGibs: ibGibsWithTjp,
        });
        const mapTjpAddrToLatestIbGibInTimelineThatWeHaventAlreadyGotten: { [tjpAddr: IbGibAddr]: IbGib_V1 } = {};
        /**
         * Convience mapping back from latest addr already gotten back to the tjp addr.
         * Convenience = not strictly necessary, but makes it easier later.
         */
        const mapLatestAddrAlreadyGottenToTjpAddr: { [latestAddrAlreadyGotten: IbGibAddr]: IbGibAddr } = {};

        Object.keys(timelinesPerTjp)
            .filter(tjpAddr => !tjpAddrsAlreadyAnalyzed.includes(tjpAddr))
            .forEach(tjpAddr => {
                const timeline = timelinesPerTjp[tjpAddr];
                // add to the array we'll send below
                const latestIbGibAlreadyGotten = timeline[timeline.length - 1];
                mapTjpAddrToLatestIbGibInTimelineThatWeHaventAlreadyGotten[tjpAddr] = latestIbGibAlreadyGotten;
                // add to mapping back from addr to tjpaddr for convenience below
                const latestAddrAlreadyGotten = h.getIbGibAddr({ ibGib: latestIbGibAlreadyGotten });
                mapLatestAddrAlreadyGottenToTjpAddr[latestAddrAlreadyGotten] = tjpAddr;
            });
        let countOfTimelinesNotYetGotten =
            Object.keys(mapTjpAddrToLatestIbGibInTimelineThatWeHaventAlreadyGotten).length;

        if (countOfTimelinesNotYetGotten > 0) {
            // we have more timelines still to do. get the latest ibGib in each timeline,
            // add it, check for more timelines. But we may have already gotten a latestAddrsMap
            // in a previous call, so account for this.

            // query only latest ibgibs that we haven't already gotten AND whose
            // timelines we've not already analyzed, per
            // mapTjpAddrToLatestAddrsInSpace.
            /**
             * build this map of latest addr given -> latest addr in space (per timeline/tjp).
             */
            let latestAddrsMap: { [addr: string]: IbGibAddr | null } = {};
            Object.keys(mapTjpAddrToLatestAddrsInSpace).forEach(tjpAddr => {
                const latestIbGibCorrespondingToTjpAddr =
                    mapTjpAddrToLatestIbGibInTimelineThatWeHaventAlreadyGotten[tjpAddr];
                const latestAddrCorrespondingToTjpAddr =
                    h.getIbGibAddr({ ibGib: latestIbGibCorrespondingToTjpAddr });

                latestAddrsMap[latestAddrCorrespondingToTjpAddr] = mapTjpAddrToLatestAddrsInSpace[tjpAddr];
            });
            if (logalot) { console.log(`${lc} latestAddrsMap *before* getLatestAddrs: ${h.pretty(latestAddrsMap)} (I: 427b4bb78595e9e521ecf2c5e5c80722)`); }
            const ibGibsToQuery =
                Object.values(mapTjpAddrToLatestIbGibInTimelineThatWeHaventAlreadyGotten)
                    .filter(x => !Object.keys(latestAddrsMap).includes(h.getIbGibAddr({ ibGib: x })));

            let queriedLatestAddrsMap: { [addr: string]: IbGibAddr | null } = {};
            if (ibGibsToQuery.length > 0) {
                /** This is result with the map of the latest addrs in the space */
                const resLatestAddrsMapInEntireSpace = await getLatestAddrs({
                    ibGibs: ibGibsToQuery,
                    space,
                });
                queriedLatestAddrsMap = resLatestAddrsMapInEntireSpace?.data?.latestAddrsMap;
                if (!queriedLatestAddrsMap) { throw new Error(`(UNEXPECTED) getLatestAddrs result latestAddrsMap falsy (E: 088caa1fc95fd3b079108ab63ef33422)`); }
                if (Object.keys(queriedLatestAddrsMap).length !== countOfTimelinesNotYetGotten) {
                    // this happens when the space does not have the address, sometimes because of
                    // not pushing the most recent changes to the sync space...hmmm
                    throw new Error(`(UNEXPECTED) latestAddrsMap is not the same size as the incoming map (E: 666af512bbd44534983bb28ee8d43fed)`);
                }
                if (logalot) { console.log(`${lc} queriedLatestAddrsMap: ${h.pretty(queriedLatestAddrsMap)} (I: 7b39a5f7ce9e9d9fabae4be98ed44522)`); }
                latestAddrsMap = {
                    ...queriedLatestAddrsMap,
                    ...latestAddrsMap
                };
            }
            if (logalot) { console.log(`${lc} combined latestAddrsMap: ${h.pretty(latestAddrsMap)} (I: e3aedea63f29c5b06a79632f691aa522)`); }
            const newerAddrsFound: IbGibAddr[] = [];
            Object.values(mapTjpAddrToLatestIbGibInTimelineThatWeHaventAlreadyGotten)
                .forEach(latestIbGibAlreadyGotten => {
                    const latestAddrAlreadyGotten = h.getIbGibAddr({ ibGib: latestIbGibAlreadyGotten });
                    const tjpAddr = mapLatestAddrAlreadyGottenToTjpAddr[latestAddrAlreadyGotten];
                    const latestAddrInSpace = latestAddrsMap[latestAddrAlreadyGotten];
                    if (!latestAddrInSpace) { throw new Error(`(UNEXPECTED) latestAddrInSpace not found in latestAddrsMap (E: 095d2b3f88e3e8a2c3e7d3de4c6d5622)`); }
                    if (latestAddrInSpace === latestAddrAlreadyGotten) {
                        // we've already got the latest for this timeline. This
                        // means that we must have already at least queued all
                        // timelines possible, so nothing else to do.
                    } else {
                        // there is a newer "latest" in this timeline that we
                        // haven't gotten yet, so add that addr to the
                        newerAddrsFound.push(latestAddrInSpace);
                    }

                    tjpAddrsAlreadyAnalyzed.push(tjpAddr);
                });

            // at this point we can go through the rel8d ibgibs
            let rel8dAddrsNotYetGotten: IbGibAddr[] = [];
            for (let i = 0; i < ibGibs.length; i++) {
                const ibGib = ibGibs[i];
                const rel8ns = ibGib.rel8ns ?? {};
                const rel8nNames = Object.keys(rel8ns)
                    .filter(x => !skipRel8nNames.includes(x))
                    .filter(x => onlyRel8nNames ? onlyRel8nNames.includes(x) : true);
                rel8nNames.forEach(rel8nName => {
                    const rel8dAddrs = rel8ns[rel8nName];
                    rel8dAddrs.forEach(rel8dAddr => {
                        // only add todo if we don't already have the ibgib

                        if (!rel8dAddrsNotYetGotten.includes(rel8dAddr) &&
                            !ibGibs.some(x => h.getIbGibAddr({ ibGib: x }) === rel8dAddr)
                        ) {
                            rel8dAddrsNotYetGotten.push(rel8dAddr);
                        }
                    });
                });
            }

            if (newerAddrsFound.length === 0 && rel8dAddrsNotYetGotten.length === 0) {
                // there were no newer addrs found, necessitating that we have
                // no additional ibgibs that we don't know about.

                return await getGraphProjection_NonLive({
                    ibGibs, ibGibAddrs,
                    gotten, tjpAddrsAlreadyAnalyzed,
                    skipAddrs, skipRel8nNames, onlyRel8nNames,
                    maxRetries, msBetweenRetries,
                    space,
                    timeLogName,
                    live: false,
                });
            } else {
                // there are still newer ibgibs that must be included in the analysis, without yet
                // going into the direct rel8ns of
                // need to call recursively this _Live function, passing in
                // the already computated latest map in mapTjpAddrToLatestAddrsInSpace
                // I need to also adjust preceding code to use this map.
                // leaving off here
                // getDependencyGraph_Live({...})
                Object.keys(queriedLatestAddrsMap).forEach(latestAddrNotGotten => {
                    const tjpAddr = mapLatestAddrAlreadyGottenToTjpAddr[latestAddrNotGotten];
                    mapTjpAddrToLatestAddrsInSpace[tjpAddr] = latestAddrNotGotten;
                    ibGibAddrs.push(queriedLatestAddrsMap[latestAddrNotGotten]);
                });
                ibGibAddrs = [...ibGibAddrs, ...rel8dAddrsNotYetGotten];
                // if (ibGibAddrs.some(x => x.startsWith('comment doodle') || x.startsWith('comment wakkado'))) {
                debugger;
                // }
                return await getGraphProjection({
                    ibGibs, ibGibAddrs,
                    gotten, tjpAddrsAlreadyAnalyzed,
                    skipAddrs, skipRel8nNames, onlyRel8nNames,
                    maxRetries, msBetweenRetries,
                    space,
                    timeLogName,
                    live: true,
                    mapTjpAddrToLatestAddrsInSpace,
                });
            }

        } else {
            // we have no more timelines that we haven't already gotten, so we
            // can pass off to the non-live version
            return await getGraphProjection_NonLive({ /* <<<< returns early */
                ibGibs, ibGibAddrs,
                gotten, /* tjpAddrsAlreadyAnalyzed not used */
                skipAddrs, skipRel8nNames, onlyRel8nNames,
                maxRetries, msBetweenRetries,
                space,
                timeLogName,
                live: false,
            });
        }

    } catch (error) {
        const emsg = `${lc} ${error.message}`;
        console.error(emsg);
        if (timeLogName) { console.timeLog(timeLogName, `${lc} error: ${emsg}`); }
        throw error;
    } finally {
        if (timeLogName) { console.timeLog(timeLogName, `${lc} complete.`) }
    }
}

/**
 * NOT EXPORTED
 *
 * @see {@link getGraphProjection}
 * @see {@link getDependencyGraph}
 */
async function getGraphProjection_NonLive({
    ibGibs, ibGibAddrs,
    gotten, /* tjpAddrsAlreadyAnalyzed not used */
    skipAddrs, skipRel8nNames, onlyRel8nNames,
    maxRetries, msBetweenRetries,
    space,
    timeLogName,
}: GetGraphProjectionOptions): Promise<GetGraphResult> {
    const lc = `[${getGraphProjection_NonLive.name}]`;
    try {
        // const getAddrsThatWeDontHaveAlready: (addrs: IbGibAddr[]) => IbGibAddr[] =
        //     (addrs) => {
        //         const resAddrs: IbGibAddr[] = [];
        //         const gottenAddrs: IbGibAddr[] = Object.keys(gotten); // compute once in this closure
        //         const incomingIbGibAddrs = ibGibs.map(x => h.getIbGibAddr({ibGib: x}));
        //         const noNeedAddrs = [ ...gottenAddrs, ...incomingIbGibAddrs, ...skipAddrs, ];
        //         for (let i = 0; i < addrs.length; i++) {
        //             if (!noNeedAddrs.includes(addrs[i])) { resAddrs.push(addrs[i]); }
        //             // const addrToCheck = addrs[i];
        //             // if (!gottenAddrs.includes(addrToCheck) && !skipAddrs.includes(addrToCheck)) {
        //             //     const alreadyGivenIbGibMaybe =
        //             //         ibGibs.filter(x => h.getIbGibAddr({ibGib: x}) === addrToCheck);
        //             //     if (alreadyGivenIbGibMaybe.length === 0) {
        //             //         resAddrs.push(addrToCheck);
        //             //     }
        //             // }
        //         }
        //         return resAddrs;
        //     };

        // Sets of addrs that we have to get in this iteration:
        // 1. the passed in ibGib addrs that we haven't already gotten
        // 2. the rel8d addrs for the passed in ibgibs

        // So first, go ahead and do the passed in ibGibAddrs.  These are the
        // addrs that we need to not only get and load if we don't already have
        // them, but we will check their rel8ns as well.
        // const addrsWeDontHaveAlready_IncomingIbGibAddrs: IbGibAddr[] =
        //     getAddrsThatWeDontHaveAlready(ibGibAddrs);
        // we want to load ibGibs from the space, but not unnecessarily. So we
        // will add ibGibs that we have already been provided by the caller that
        // haven't already been added to gotten, and then we will cull the
        // ibGibAddrs to get to only include those we haven't already.

        // Sets of addrs that we have to get in this iteration:
        // 1. the passed in ibGib addrs that we haven't already gotten
        // 2. the rel8d addrs for the passed in ibgibs

        // So first, go ahead and do the passed in ibGibAddrs.  These are the
        // addrs that we need to not only get and load if we don't already have
        // them, but we will check their rel8ns as well.
        // const addrsWeDontHaveAlready_IncomingIbGibAddrs: IbGibAddr[] = [];
        // const gottenAddrs: IbGibAddr[] = Object.keys(gotten); // compute once in this closure
        // const incomingIbGibAddrs = ibGibs.map(x => h.getIbGibAddr({ibGib: x}));
        // const noNeedAddrs = [ ...gottenAddrs, ...incomingIbGibAddrs, ...skipAddrs, ];
        // for (let i = 0; i < ibGibAddrs.length; i++) {
        //     if (!noNeedAddrs.includes(ibGibAddrs[i])) {
        //         addrsWeDontHaveAlready_IncomingIbGibAddrs.push(ibGibAddrs[i]);
        //     }
        // }

        // // go ahead and retrieve any associated ibGibs from the space that we
        // // don't already have (if any)
        // if (addrsWeDontHaveAlready_IncomingIbGibAddrs.length > 0) {
        //     // // delete this related code when I'm done testing this.
        //     // const primaryKeysDebug: { [addr: string]: string } = {};
        //     // for (let i = 0; i < addrsWeDontHaveAlready_IncomingIbGibAddrs.length; i++) {
        //     //     const addr = addrsWeDontHaveAlready_IncomingIbGibAddrs[i];
        //     //     primaryKeysDebug[addr] = await h.hash({s: addr, algorithm: 'SHA-256'});
        //     // }

        //     // get from space those we don't already have, with retries if applicable

        //     // do multiple retry attempts if necessary and caller sets it.
        //     let addrsToGet = addrsWeDontHaveAlready_IncomingIbGibAddrs.concat();
        //     let retryCount = 0;
        //     maxRetries = maxRetries ?? 0;
        //     while (retryCount <= maxRetries && addrsToGet.length > 0) {
        //         if (timeLogName && retryCount === 0) { console.timeLog(timeLogName, `${lc} FIRST try starting...`)}
        //         if (timeLogName && retryCount > 0) { console.timeLog(timeLogName, `${lc} RETRY starting...`)}
        //         // delay if applicable
        //         if (retryCount > 0 && msBetweenRetries) {
        //             if (timeLogName) { console.timeLog(timeLogName, `${lc} delaying ${msBetweenRetries}ms for retry`); }
        //             if (logalot) { console.log(`${lc} retrying. addrsToGet (${addrsToGet.length}): ${addrsToGet} (I: 8460694cdd5518472680784c3b96a822)`); }
        //             await h.delay(msBetweenRetries);
        //         }

        //         // do the get
        //         if (timeLogName) { console.timeLog(timeLogName, `${lc} getFromSpace (${addrsToGet?.length}) starting...`); }
        //         let resGetThese = await getFromSpace({addrs: addrsToGet, space});
        //         if (timeLogName) { console.timeLog(timeLogName, `${lc} getFromSpace complete.`); }
        //         if (resGetThese.success && resGetThese.ibGibs?.length > 0) {
        //             resGetThese.ibGibs.forEach(x => ibGibs.push(x));
        //             const gottenAddrs = resGetThese.ibGibs.map(x => h.getIbGibAddr({ibGib: x}));
        //             if (gottenAddrs.length === addrsToGet.length) {
        //                 if (timeLogName) { console.timeLog(timeLogName, `${lc} got all.`)}
        //                 // got them all, so we're done
        //                 addrsToGet = [];
        //                 break;
        //             } else {
        //                 if (timeLogName) { console.timeLog(timeLogName, `${lc} got some.`)}
        //                 // got only some, prune addrsToGet for next retry (if any)
        //                 addrsToGet = addrsToGet.filter(x => !gottenAddrs.includes(x));
        //             }
        //         } else {
        //             // failed, addrsToGet stays the same
        //             if (timeLogName) { console.timeLog(timeLogName, `${lc} failed. addrs: ${addrsToGet?.join(',')}`)}
        //         }
        //         retryCount++;
        //     }
        //     if (addrsToGet?.length > 0) {
        //         // console.dir(primaryKeysDebug);
        //         throw new Error(`unable to retrieve dependency ibgibs from space.\n\nThis is often because downloading failed due to the sync space's server getting temporarily overloaded, OR...it sometimes happens when an ibgib doesn't get fully published to the sync space in the first place.\n\nYou could retry immediately or later, but if the problem persists, then retry from the publishers end (have the publisher sync again). (E: 8413594b6c1b447988781cf3f3e1729d)`);
        //     }
        // }

        // next, compile what could be a rather large list of rel8d ibgibAddrs
        // which must necessarily be in the past of the futuremost incoming
        // ibGib/ibGibAddr/s as rel8ns only work backwards (whereas tjp's can
        // refer to future timelines, the DAG substrate only looks backwards)
        const addrsWeDontHaveAlready_Rel8dAddrs = [];

        // so, we will iterate through all of our given and loaded ibGibs (not
        // the ones in gotten map though), look through all of their rel8ns, and
        // add any that haven't already been gotten
        if (timeLogName) { console.timeLog(timeLogName, `${lc} analyzing next step starting...`); }
        for (let i = 0; i < ibGibs.length; i++) {
            const ibGib = ibGibs[i];
            const ibGibAddr = h.getIbGibAddr({ ibGib });

            // do i need this?
            const { gib } = h.getIbAndGib({ ibGib });
            if (gib === GIB) { throw new Error(`cannot get dependency graph of primitive.`); }

            // ?
            // I believe I have this so we don't try to do this ibgib again on recursive call.
            // but should I be adding it at this point? hmm...
            if (!Object.keys(gotten).includes(ibGibAddr)) { gotten[ibGibAddr] = ibGib; }

            // iterate through rel8ns and compile list of ibgib addrs not yet gotten
            /** map of addr to validation errors array */
            const invalidAddrs: { [addr: string]: string[] } = {};
            const rel8ns = ibGib.rel8ns || {};
            let rel8nNames = (Object.keys(rel8ns) || []).filter(x => !skipRel8nNames.includes(x));
            if (onlyRel8nNames) {
                rel8nNames = rel8nNames.filter(x => onlyRel8nNames.includes(x));
            }
            const gottenKeys = Object.keys(gotten);
            for (let i = 0; i < rel8nNames.length; i++) {
                const rel8nName = rel8nNames[i];
                const rel8dAddrs = rel8ns[rel8nName];
                const falsyAddrs = rel8dAddrs.filter(addr =>
                    addr === '' ||
                    addr === undefined ||
                    addr === null ||
                    !addr.includes(IBGIB_DELIMITER)
                );
                if (falsyAddrs.length > 0) { console.warn(`${lc} (UNEXPECTED) has falsyAddrs: ${falsyAddrs} (W: da9505cb0a4db68a4aff7f279ad2d322)`); }
                const rel8dAddrsNotGottenYetThisRel8n =
                    rel8dAddrs
                        .filter(addr => !!addr)
                        .filter(addr => !gottenKeys.includes(addr))
                        .filter(addr => !skipAddrs.includes(addr))
                        .filter(addr => h.getIbAndGib({ ibGibAddr: addr }).gib !== GIB)
                        .filter(addr => !addrsWeDontHaveAlready_Rel8dAddrs.includes(addr));
                rel8dAddrsNotGottenYetThisRel8n.forEach(rel8dAddr => {
                    const validationErrors = validateIbGibAddr({ addr: rel8dAddr });
                    if ((validationErrors || []).length === 0) {
                        // valid addr. add it if we haven't gotten/queued it yet
                        addrsWeDontHaveAlready_Rel8dAddrs.push(rel8dAddr);
                    } else {
                        // invalid address
                        invalidAddrs[rel8dAddr] = validationErrors!;
                    }
                });
            }

            if (Object.keys(invalidAddrs).length > 0) {
                throw new Error(`invalid addresses found in dependency graph. Errors (clipped to 1kB): ${JSON.stringify(invalidAddrs).substring(0, 1024)}`);
            }
        }
        if (timeLogName) { console.timeLog(timeLogName, `${lc} analyzing next step complete.`); }

        if (addrsWeDontHaveAlready_Rel8dAddrs.length > 0) {
            if (timeLogName) { console.timeLog(timeLogName, `${lc} get addrsWeDontHaveAlready_Rel8dAddrs starting...`); }
            // execute the get on those addrs
            const resGet = await getFromSpace({ addrs: addrsWeDontHaveAlready_Rel8dAddrs, space });
            if (timeLogName) { console.timeLog(timeLogName, `${lc} get addrsWeDontHaveAlready_Rel8dAddrs complete.`); }
            if (resGet.success) {
                if (resGet.ibGibs?.length === addrsWeDontHaveAlready_Rel8dAddrs.length) {
                    if (logalot) { console.log(`${lc} got ALL of them (happy path)`); }
                    resGet.ibGibs.forEach(x => gotten[h.getIbGibAddr({ ibGib: x })] = x);
                    // return a recursive call for the newly-gotten ibgibs'
                    // dependencies, passing in the now-larger accumulating
                    // `gotten` map of ibgibs already processed.
                    if (timeLogName) { console.timeLog(timeLogName, `${lc} call getDependencyGraph recursively starting...`); }
                    const result = await getDependencyGraph({
                        ibGibs: resGet.ibGibs,
                        live: false,
                        gotten, /* tjpAddrsAlreadyAnalyzed not used */
                        skipAddrs, skipRel8nNames, onlyRel8nNames,
                        maxRetries, msBetweenRetries,
                        space,
                    });
                    if (timeLogName) { console.timeLog(timeLogName, `${lc} call getDependencyGraph recursively complete.`); }
                    return result; // <<<< returns early
                } else if (resGet.ibGibs?.length > 0 && resGet.ibGibs.length < addrsWeDontHaveAlready_Rel8dAddrs.length) {
                    if (logalot) { console.warn(`${lc} got SOME of them (happy-ish path?). not sure what to do here... (W: e3458f61a1ae4979af9e6b18ac935c14)`); }
                    throw new Error(`trouble getting dependency ibgibs (E: 8156bf65fd084ae4a4e8a0669db28b07)`);
                } else if (resGet.ibGibs?.length > 0 && resGet.ibGibs.length > addrsWeDontHaveAlready_Rel8dAddrs.length) {
                    // got more than our original list? not a good space behavior...
                    throw new Error(`(UNEXPECTED) got more ibGibs than addrs that we asked for. space not working properly. (E: 352219b3d18543bcbda957f2d60b78f3)`);
                } else {
                    // didn't get any...hmm...
                    throw new Error(`couldn't get dependency ibgibs from space. (E: 225f26b7d7f84911bb033753a062209b)`);
                }
            } else {
                // resGet.success falsy indicates an error in the space. If it wasn't found
                // then resGet.success would (should) still be truthy.
                throw new Error(`failure getting addrs in space ${space?.data?.name || '[no name?]'} (id: ${space?.data?.uuid || '[no uuid?]'}). (E: 60404e6e389249d9bbecf0039cd51878) addrs:\n${addrsWeDontHaveAlready_Rel8dAddrs.join('\n')} `);
            }
        } else {
            // no other rel8d addrs to get, so our job is done and the `gotten`
            // map of dependency ibgibs is complete (no need for another
            // recursive call).
            return gotten;
        }

    } catch (error) {
        const emsg = `${lc} ${error.message}`;
        console.error(emsg);
        if (timeLogName) { console.timeLog(timeLogName, `${lc} error: ${emsg}`); }
        throw error;
    } finally {
        if (timeLogName) { console.timeLog(timeLogName, `${lc} complete.`) }
    }
}
