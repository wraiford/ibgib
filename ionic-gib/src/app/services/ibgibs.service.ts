/**
 * Gigantic file with a bunch of shift in it. Needs to be refactored when we
 * have a clearer picture and the prototype is up and limping along...
 */

import { Injectable } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { ReplaySubject, } from 'rxjs';

import { IbGib_V1, GIB, GIB_DELIMITER, } from 'ts-gib/dist/V1';
import { Gib, IbGibAddr, TransformResult, } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { Factory_V1 as factory } from 'ts-gib/dist/V1';
import { getGib, getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { encrypt, decrypt, } from 'encrypt-gib';

import {
  RootData,
  SpecialIbGibType,
  LatestEventInfo,
  SecretData_V1, SecretInfo_Password, SecretIbGib_V1,
  EncryptionInfo_EncryptGib, EncryptionData_V1,
  CiphertextData, CiphertextRel8ns, CiphertextIbGib_V1,
  SyncSpaceResultIbGib, StatusCode, SyncStatusIbGib,
  ParticipantInfo, SyncSpaceOptionsIbGib, SyncSpaceOptionsData,
  SyncSagaInfo,
  BootstrapIbGib,
} from '../common/types';
import {
  IonicSpace_V1,
  IonicSpaceData_V1
} from '../common/witnesses/spaces/ionic-space-v1';
import * as c from '../common/constants';
import { IbGibSpaceAny } from '../common/witnesses/spaces/space-base-v1';
import { AWSDynamoSpace_V1 } from '../common/witnesses/spaces/aws-dynamo-space-v1';
import {
  createSpecial, createTagIbGib, deleteFromSpace, getFromSpace, getFnAlert,
  getFnPrompt, getFnPromptPassword_AlertController,
  getDependencyGraph, getSpecialIbGib, getSpecialRel8dIbGibs, getTjpIbGib,
  groupBy, hasTjp, isSameSpace, persistTransformResult, putInSpace,
  registerNewIbGib, rel8ToCurrentRoot, rel8ToSpecialIbGib, setConfigAddr,
  setCurrentRoot, validateUserSpaceName, getConfigAddr,
  getValidatedBootstrapIbGib, getLocalSpace, execInSpaceWithLocking,
  updateBootstrapIbGib,
  getSpaceArgMetadata,
  getLatestAddrs,
} from '../common/helper';
import { AppSpaceData, AppSpaceRel8ns } from '../common/types/app';
import {
  DeleteIbGibOpts, DeleteIbGibResult,
  GetIbGibOpts, GetIbGibResult,
  PutIbGibOpts, PutIbGibResult
} from '../common/types/legacy';
import { concatMap, } from 'rxjs/operators';

const logalot = c.GLOBAL_LOG_A_LOT || false;

interface TempCacheEntry {
  /**
   * Password to the user's password.
   */
  tempMetaPassword: string;
  /**
   * Encrypted user password
   */
  encryptedPassword: string;
  /**
   * salt used in cached encryption.
   */
  salt: string;
}


/**
 * All-purpose mega service (todo: which we'll need to break up!) to interact
 * with ibgibs at the app/device level.
 *
 * This works with the local app user space.
 *
 * ## regarding special ibgibs
 *
 * Special ibgibs' behaviors are what hold in other apps configuration data.
 * Of course the difference is that most special ibgibs can leverage the "on-chain"
 * functionality of "regular" ibgibs.
 *
 * There are a couple meta ibgibs (which I also call "special"):
 *   * roots^gib
 *     * tracks other special root^gib ibgibs, which are like local app-level indexes.
 *   * tags^gib
 *     * tracks other special tag^gib ibgibs, which you can apply to any ibgib
 *   * latest^gib
 *     * tracks mappings between tjp -> latest ib^gib address
 *     * ephemeral (deletes past rel8ns and past ibGib frames)
 *
 * ## regarding latest ibgibs
 *
 * The tjp (temporal junction point) defines atow the beginning of an ibGib timeline.
 * it's like the birthday for an ibGib. (Or you can think if it as the id for the
 * stream of ibgib frames in a given timeline.)
 *
 * The latest ibGib in that timeline is also special, because it's often what you
 * want to work with.
 *
 * So ideally, when an ibgib, A, has a tjp A1, and it is updated to A2, A3, An
 * via `mut8` and/or `rel8` transforms, that ibgib creates a single timeline.
 * This service attempts to track the relationship between that starting
 * tjp address and its corresponding latest frame in that timeline, i.e., A1 -> An.
 *
 * ### mapping persistence implementation details
 *
 * The latest ibGib service is backed by a special ibgib that maintains the mapping index.
 * It does this by rel8-ing that special backing ibgib via the tjp pointer,
 * e.g. [special latest ibgib^XXX000].rel8ns[A^TJP123] === [A^N12345]
 * It does this via the ib^gib content address pointer, so this becomes
 * a mapping from A^TJP123 to A^N12345.
 *
 * This backing ibGib is special (even for special ibGibs) in that:
 *   * it does not relate itself with the current root of the application
 *   * it does not maintain references to its past (i.e. rel8ns['past'] === [])
 *   * it DELETES its previous incarnation from the files service
 *
 * In other words, this service is meant to be as ephemeral as possible. I am keeping it
 * as an ibGib and not some other data format (like straight in storage/some other db)
 * because I've found this is often useful and what I end up doing anyway to leverage other
 * ibgib behavior. For example, in the future it may be good to take snapshots, which is a
 * simple copy operation of the file persistence.
 *
 * ### current naive implementation notes
 *
 * questions:
 *   * What do we want to do if we can't locate an ibGib record?
 *   * How/when do we want to alert the user/our own code that we've found multiple timelines for an ibGib with a tjp (usually
 * a thing we want to avoid)?
 *   * Who do we want to notify when new ibGibs arrive?
 *   * How often do we want to check external sources for latest?
 *   * When do we get to merging ibGib timelines?
 *
 * This is behavior that is somewhat taken care of, e.g. in git, with the HEAD pointer for a repo.
 * But we're talking about here basically as a metarepo or "repo of repos", and unlike git,
 * we don't want our HEAD metadata living "off chain" (outside of the DLT itself that it's modifying).
 * So eventually, what we want is just like what we want with ALL ibGibs: perspective. From "the app"'s
 * perspective, the latest is mapped. But really, apps can't view slices of ibGib graphs in all sorts
 * of interesting ways and still be productive & beneficial to the ecosystem as a whole.
 */
@Injectable({
  providedIn: 'root'
})
export class IbgibsService {

  // we won't get an object back, only a DTO ibGib essentially
  private lc: string = `[${IbgibsService.name}]`;

  private _instanceId: string;

  private _initialized: boolean;
  get initialized(): boolean { return this._initialized; }


  private _initializing: boolean;
  get initializing(): boolean { return this._initializing; }

  private _latestSubj = new ReplaySubject<LatestEventInfo>();
  latestObs = this._latestSubj.asObservable();

  /**
   * Used with tracking the tjp -> latest ib^gib mapping.
   *
   * If we have an addr for an ibGib that we can't find locally, we
   * will prompt the user if we want to replace the address in the tjp -> latest mapping.
   * If they say yes, then we'll then ask if they always want to do so.
   *
   * This flag represents the answer to that "always replace" prompt.
   */
  private alwaysReplaceLatestNotFound = false;

  /**
   * Contains the configuration metadata for where ibgibs are looked for by default.
   */
  // _localUserSpace: IonicSpace_V1<AppSpaceData, AppSpaceRel8ns> | undefined;
  // get localUserSpace(): IonicSpace_V1<AppSpaceData, AppSpaceRel8ns> | undefined {
  //   return this._localUserSpace;
  // }
  // set localUserSpace(value: IonicSpace_V1<AppSpaceData, AppSpaceRel8ns> | undefined) {
  //   if (value) {
  //     if (value.witness) {
  //       this._localUserSpace = value;
  //     } else {
  //       // if we've done a transform on the space,
  //       // we won't get an object back, only a DTO ibGib essentially
  //       this._localUserSpace = IonicSpace_V1.createFromDto<AppSpaceData, AppSpaceRel8ns>(value);
  //     }
  //   } else {
  //     delete this._localUserSpace;
  //   }
  // }
  private async getLocalUserSpace({
    skipLock,
  }: {
    /**
     * If true, SKIPS locking bootstrap/spaceId before trying to retrieve.
     */
    skipLock?: boolean,
  }): Promise<IonicSpace_V1<AppSpaceData, AppSpaceRel8ns> | undefined> {
    const lc = `${this.lc}[${this.getLocalUserSpace.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const bootstrapIbGib =
        await getValidatedBootstrapIbGib({ zeroSpace: this.zeroSpace });

      const localSpace =
        await getLocalSpace<IonicSpace_V1<AppSpaceData, AppSpaceRel8ns>>({
          zeroSpace: this.zeroSpace,
          bootstrapIbGib,
          lock: !skipLock,
          callerInstanceId: this._instanceId,
          fnDtoToSpace: (spaceDto: IbGib_V1<AppSpaceData, AppSpaceRel8ns>) => {
            return Promise.resolve(IonicSpace_V1.createFromDto(spaceDto));
          },
        });

      return localSpace;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  // private _zeroSpace: IonicSpace_V1<AppSpaceData, AppSpaceRel8ns> | undefined;
  private get zeroSpace(): IonicSpace_V1<AppSpaceData, AppSpaceRel8ns> {
    const zeroSpace = new IonicSpace_V1(/*initialData*/ null, /*initialRel8ns*/ null);
    zeroSpace.gib = 'gib';
    return zeroSpace;
  }

  // private _localUserSpaceCurrentRoot: IbGib_V1<RootData> | undefined;

  /**
   * Just to prevent plaintext passwords from just sitting in memory,
   * this is a slight layer of indirection for caching.
   */
  private passwordCache: {[addr: string]: TempCacheEntry } = {};

  private fnPromptSecret: () => Promise<IbGib_V1 | undefined>;
  private fnPromptEncryption: () => Promise<IbGib_V1 | undefined>;
  private fnPromptOuterSpace: () => Promise<IbGib_V1 | undefined>;

  /**
   * non-encapsulated hack...
   */
  tjpGibsWithAutosyncTurnedOn: Set<IbGibAddr>= new Set<Gib>([]);

  private _syncing: boolean;
  /**
   * should only syncIbGibs when not already syncing.
   */
  get syncing(): boolean {
    return this._syncing;
  }
  // set syncing(value: boolean) {
  //   this._syncing = value;
  // }

  // private _syncSagaInfos: { [spaceGib: string]: SyncSagaInfo } = {};
  private sagaInfoMap: { [sagaId: string]: SyncSagaInfo } = {};


  constructor(
    public modalController: ModalController,
    public alertController: AlertController,
  ) {
    if (logalot) { console.log(`${this.lc}[ctor] doodle `); }
  }

  async initialize({
    fnPromptSecret,
    fnPromptEncryption,
    fnPromptOuterSpace,
  }: {
    fnPromptSecret: () => Promise<IbGib_V1 | undefined>,
    fnPromptEncryption: () => Promise<IbGib_V1 | undefined>,
    fnPromptOuterSpace: () => Promise<IbGib_V1 | undefined>,
  }): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      this._instanceId = await h.getUUID();

      this.fnPromptSecret = fnPromptSecret;
      this.fnPromptEncryption = fnPromptEncryption;
      this.fnPromptOuterSpace = fnPromptOuterSpace;

      await this.initializeLocalSpaces();

      await this.getSpecialIbGib({type: "latest", initialize: true});

      await this.getSpecialIbGib({type: "roots", initialize: true});

      await this.getSpecialIbGib({type: "tags", initialize: true});

      await this.getSpecialIbGib({type: "secrets", initialize: true});

      await this.getSpecialIbGib({type: "encryptions", initialize: true});

      await this.getSpecialIbGib({type: "outerspaces", initialize: true});

      await this.getSpecialIbGib({type: "outerspaces", initialize: true});

      this._initialized = true;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Make sure we have a bootstrapped space. This is like a node...kinda in peer
   * to peer systems.
   *
   * For all intents and purposes here to begin with, I'm using this initially
   * as where to put the settings ibGib that will contain pointers for this app, be it an
   * ionic android/web app or a browser extension. This is because the initial
   * intent of doing the spaces, besides it being necessary for the distributed
   * nature of the architecture, is to obviate the use of ionic Storage.
   * That is currently where we are storing things like the pointers to special
   * ibGibs like tags^ibgib, roots ibgibs, etc.
   */
  private async initializeLocalSpaces(): Promise<void> {
    const lc = `${this.lc}[${this.initializeLocalSpaces.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      // we're going to use the default space first to find/load the actual user's space (if it exists)
      let zeroSpace = this.zeroSpace;
      if (!zeroSpace.gib) {
        zeroSpace.gib = await getGib({ibGib: zeroSpace, hasTjp: false});
      }

      if (logalot) { console.log(`${lc} getting bootstrap ibgib (I: a4ad1cfd5c6f895e879d9e6a5f607b22)`); }
      // first call without locking, because we just want to see if it exists.
      // note that because of race conditions, this may be out of date though.
      const bootstrapAddr = c.BOOTSTRAP_IBGIB_ADDR;
      let bootstrapIbGib = await getValidatedBootstrapIbGib({zeroSpace});
      if (bootstrapIbGib) {
        // re-get it using locking to ensure we've gotten the correct one.
        if (logalot) { console.log(`${lc} getting bootstrap ibgib with locking from zero space...`)}
        bootstrapIbGib = await execInSpaceWithLocking<BootstrapIbGib>({
          space: zeroSpace,
          scope: bootstrapAddr,
          secondsValid: c.DEFAULT_SECONDS_VALID_LOCAL,
          fn: () => { return getValidatedBootstrapIbGib({zeroSpace}); },
          callerInstanceId: this._instanceId,
        });
        if (logalot) { console.log(`${lc} got bootstrap ibgib with locking from zero space.`)}
      } else {
        if (logalot) { console.log(`${lc} getting from default space...not found. bootstrap space not found.`); }
        // bootstrap space ibgib not found, so first run probably for user.
        // so create a new bootstrapGib and user space
        await this.createNewLocalSpaceAndBootstrapGib({zeroSpace});
      }

    } catch (error) {
      if (logalot) { console.log(`${lc} getting from default space...not found. bootstrap space not found.`); }
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  // #region create functions

  private async createNewLocalSpaceAndBootstrapGib({
    zeroSpace,
  }: {
    zeroSpace: IonicSpace_V1,
  }): Promise<void> {
    const lc = `${this.lc}[${this.createNewLocalSpaceAndBootstrapGib.name}]`;
    try {
      let spaceName: string;

      const promptName: () => Promise<void> = async () => {
        const fnPrompt = getFnPrompt();
        const resName = await fnPrompt({title: 'Enter a Name...', msg: `
        We need to create a space for you.

        Spaces are kinda like usernames, but they dont need to be unique.

        So enter a name for your space and choose OK to get started. Or if you just want a random bunch of letters, hit Cancel.`});

        if (resName === null) {
          spaceName = (await h.getUUID()).slice(10);
        } else {
          if (resName && validateUserSpaceName(resName)) {
            spaceName = resName;
          }
        }
      };

      // create a new user space
      while (!spaceName) { await promptName(); }

      const newLocalSpace = new IonicSpace_V1(/*initialData*/ <IonicSpaceData_V1>{
        version: '1',
        uuid: await h.getUUID(),
        name: spaceName,
        baseDir: c.IBGIB_BASE_DIR,
        spaceSubPath: spaceName,
        baseSubPath: c.IBGIB_BASE_SUBPATH,
        binSubPath: c.IBGIB_BIN_SUBPATH,
        dnaSubPath: c.IBGIB_DNA_SUBPATH,
        ibgibsSubPath: c.IBGIB_IBGIBS_SUBPATH,
        metaSubPath: c.IBGIB_META_SUBPATH,
        encoding: c.IBGIB_ENCODING,
        persistOptsAndResultIbGibs: c.PERSIST_OPTS_AND_RESULTS_IBGIBS_DEFAULT,
        validateIbGibAddrsMatchIbGibs: true,
        trace: false,
        description: c.DEFAULT_LOCAL_SPACE_DESCRIPTION,
        allowPrimitiveArgs: false,
        catchAllErrors: true,
        longPollingIntervalMs: c.DEFAULT_LOCAL_SPACE_POLLING_INTERVAL_MS,
      }, /*initialRel8ns*/ null);
      if (logalot) { console.log(`${lc} localSpace.ib: ${newLocalSpace.ib}`); }
      if (logalot) { console.log(`${lc} localSpace.gib: ${newLocalSpace.gib} (before sha256v1)`); }
      if (logalot) { console.log(`${lc} localSpace.data: ${h.pretty(newLocalSpace.data || 'falsy')}`); }
      if (logalot) { console.log(`${lc} localSpace.rel8ns: ${h.pretty(newLocalSpace.rel8ns || 'falsy')}`); }
      // localSpace.gib = await sha256v1(localSpace);
      newLocalSpace.gib = await getGib({ibGib: newLocalSpace, hasTjp: false});
      if (newLocalSpace.gib === GIB) { throw new Error(`localSpace.gib not updated correctly.`); }
      if (logalot) { console.log(`${lc} localSpace.gib: ${newLocalSpace.gib} (after sha256v1)`); }

      // creates bootstrap
      if (logalot) { console.log(`${lc} creating new bootstrap ibgib (I: ecc58dd4af21a0c69a16b3d71dad9c22)`); }
      await updateBootstrapIbGib({
        space: newLocalSpace,
        zeroSpace,
        setSpaceAsDefault: true,
        createIfNotFound: true,
      });

      const argPutUserSpace = await zeroSpace.argy({
        ibMetadata: getSpaceArgMetadata({space: newLocalSpace}),
        argData: {
          cmd: 'put',
          isMeta: true,
          ibGibAddrs: [h.getIbGibAddr({ibGib: newLocalSpace})],
        },
        ibGibs: [newLocalSpace],
      });

      // save the localSpace in default space
      if (logalot) { console.log(`${lc} save the localSpace in default space`); }
      const resDefaultSpace = await zeroSpace.witness(argPutUserSpace);
      if (resDefaultSpace?.data?.success) {
        if (logalot) { console.log(`${lc} default space witnessed the user space`); }
      } else {
        throw new Error(`${resDefaultSpace?.data?.errors?.join('|') || "There was a problem with zeroSpace witnessing the new localSpace"}`);
      }

      // save the localSpace in its own space?
      if (logalot) { console.log(`${lc} save the localSpace in its own space`); }
      const resPutUserSpaceInUserSpace = await newLocalSpace.witness(argPutUserSpace);
      if (resPutUserSpaceInUserSpace?.data?.success) {
        // we now have saved the localSpace ibgib "in" its own space.
        // but atow, this does NOT change the space's gib hash, so no
        // need to update the space
        if (logalot) { console.log(`${lc} user space witnessed itself`); }
      } else {
        throw new Error(`${resPutUserSpaceInUserSpace?.data?.errors?.join('|') || "There was a problem with localSpace witnessing itself. (E: 33d4b1ffcca64160afe67046531958b5)"}`);
      }

      // update the bootstrap ibgib to point to the new local space
      await updateBootstrapIbGib({space: newLocalSpace, zeroSpace: this.zeroSpace});
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      const alert = getFnAlert();
      alert({title: 'failed', msg: `failed to initialize the local space. error: ${error.message}`});
      throw error;
    }
  }

  /**
   * Routing function to various `create_____` functions.
   *
   * @returns address of newly created special.
   */
  private async createSpecial({
    type,
    space,
  }: {
    type: SpecialIbGibType,
    space?: IbGibSpaceAny,
  }): Promise<IbGibAddr | null> {
    const lc = `${this.lc}[${this.createSpecial.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized. (E: 00e27678754e4d3a92b5cdd9fe9610ef)`); }

      return createSpecial({
        type, space, defaultSpace: this.zeroSpace,
        fnBroadcast: (x) => this.fnBroadcast(x),
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async createTagIbGib({
    text,
    icon,
    description,
    space,
  }: {
    text: string,
    icon?: string,
    description?: string,
    space?: IbGibSpaceAny,
  }): Promise<{newTagIbGib: IbGib_V1, newTagsAddr: string}> {
    const lc = `${this.lc}[${this.createTagIbGib.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (E: 18f846b645124210a2ff1611641a8daf)`); }

      return createTagIbGib({
        text,
        icon,
        description,
        space,
        defaultSpace: this.zeroSpace,
        fnBroadcast: (x) => this.fnBroadcast(x),
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  // #endregion

  /**
   * Gets a config addr from the current space via the given key
   * as the space's rel8n name.
   *
   * For example, for `key = tags`, a space may look like:
   *
   * ```json
   * {
   *    ib: space xyz,
   *    gib: e89ff8a1c4954db28432007615a78952,
   *    rel8ns: {
   *      past: [space xyz^21cb29cc353f45a491d2b49ff2f130db],
   *      ancestor: [space^gib],
   *      tags: [tags^99b388355f8f4a979ca30ba284d3a686], // <<< rel8n with name specified by key
   *    }
   * }
   * ```
   *
   * @param key config key
   * @returns addr in config if exists, else undefined
   */
  async getConfigAddr({
    key,
    space,
  }: {
    key: string,
    space?: IbGibSpaceAny,
  }): Promise<string | undefined> {
    const lc = `${this.lc}[${this.getConfigAddr.name}](${key})`;
    try {
      if (logalot) { console.log(`${lc} getting...`) }

      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and could not get local space. (E: b6e7fcc09c6244b99b2e6e6ece398db0)`); }

      return getConfigAddr({key, space});

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }

  private fnUpdateBootstrap = async (newSpace: IbGibSpaceAny) => {
    const space = await this.getLocalUserSpace({});
    await updateBootstrapIbGib({space: newSpace, zeroSpace: this.zeroSpace});
  }

  private fnBroadcast = (info: LatestEventInfo) => {
    // this._latestSubj.next({tjpAddr, latestAddr: ibGibAddr, latestIbGib: ibGib});
    this._latestSubj.next(info);
  }

  async setConfigAddr({
    key,
    addr,
    space,
  }: {
    key: string,
    addr: string,
    space?: IbGibSpaceAny,
  }): Promise<IbGibSpaceAny> {
    const lc = `${this.lc}[${this.setConfigAddr.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: 2149c59ebd584a118304dd54656aa800)`); }

      return await setConfigAddr({
        key, addr, space, zeroSpace: this.zeroSpace,
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async getCurrentRoot({
    space,
  }: {
    space?: IbGibSpaceAny,
  }): Promise<IbGib_V1<RootData> | undefined> {
    const lc = `${this.lc}[${this.getCurrentRoot.name}]`;

    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: 1f4dc5e9560341a993bf0b28accd75fe)`); }

      while (this.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 5fd759510e584cb69b232259b891cca1)`); }
        await h.delay(100);
      }
      const roots = await this.getSpecialIbGib({type: "roots", space});
      if (!roots) {
        throw new Error(`Roots not initialized. (E: e7712dc3d183487e98cd44a2b4324bc2)`);
      }
      if (!roots.rel8ns) { throw new Error(`Roots not initialized properly. No rel8ns. (E: 689f47f5d1da4a868d1c1ddd2ff13e17)`); }
      if (!roots.rel8ns.current) { throw new Error(`Roots not initialized properly. No current root. (E: 962acd3f60474a329bfbd7682c003916)`); }
      if (roots.rel8ns.current.length === 0) { throw new Error(`Invalid Roots: empty current root rel8n. (E: fbdc13c157514efa86ade1bf9a38bbd6)`); }
      if (roots.rel8ns.current.length > 1) { throw new Error(`Invalid Roots: multiple current roots selected. (E: 370fe6e3920a4a1299f879e6fcbbc448)`); }

      const currentRootAddr = roots.rel8ns.current[0]!;
      const resCurrentRoot =
        await this.get({addr: currentRootAddr, isMeta: true, space});
      if (resCurrentRoot.ibGibs?.length === 1) {
        return <IbGib_V1<RootData>>resCurrentRoot.ibGibs![0];
      } else {
        throw new Error(`could not get current root. addr: ${currentRootAddr}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }

  async setCurrentRoot({
    root,
    space,
  }: {
    root: IbGib_V1<RootData>,
    space?: IbGibSpaceAny,
  }): Promise<void> {
    const lc = `${this.lc}[${this.setCurrentRoot.name}]`;
    try {
      if (!root) { throw new Error(`root required.`); }

      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: 222a3f5b39fc47ccb2a4aa3ddcd49969)`); }

      return setCurrentRoot({
        root,
        space,
        defaultSpace: this.zeroSpace,
        fnBroadcast: (x) => this.fnBroadcast(x),
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
      });

      // how to let others know roots has changed?
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Every tjp should be related to one of the roots in a space.
   *
   * You should NOT relate every ibgib frame of a given ibGib.
   */
  async rel8ToCurrentRoot({
    ibGib,
    linked,
    rel8nName,
    space,
  }: {
    ibGib: IbGib_V1,
    linked?: boolean,
    rel8nName?: string,
    space?: IbGibSpaceAny,
  }): Promise<void> {
    const lc = `${this.lc}[${this.rel8ToCurrentRoot.name}]`;

    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: cbc4e519414a405eab7fe470eadbf8f0)`); }

      return rel8ToCurrentRoot({
        ibGib,
        linked,
        rel8nName,
        space,
        defaultSpace: this.zeroSpace,
        fnBroadcast: (x) => this.fnBroadcast(x),
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return;
    }
  }

  /**
   * Gets one of the app's special ibGibs, e.g., TagsIbGib.
   *
   * When initializing tags, this will generate some boilerplate tags.
   * I'm going to be doing roots here also, and who knows what else, but each
   * one will have its own initialize specifics.
   *
   * @param initialize initialize (i.e. create) ONLY IF IbGib not found. Used for initializing app (first run).
   *
   * @see {@link createSpecial}
   * @see {@link createTags}
   */
  async getSpecialIbGib({
    type,
    initialize,
    space,
  }: {
    type: SpecialIbGibType,
    initialize?: boolean,
    space?: IbGibSpaceAny,
  }): Promise<IbGib_V1 | null> {
    const lc = `${this.lc}[${this.getSpecialIbGib.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: e08e85d8422e479f9d101194fd26cbda)`); }

      while (this.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 497d4becb94f4515a2ec389630420d6c)`); }
        await h.delay(100);
      }

      return getSpecialIbGib({
        type,
        initialize,
        space,
        defaultSpace: this.zeroSpace,
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
        fnBroadcast: (x) => this.fnBroadcast(x),
        fnGetInitializing: () => { return this._initializing; },
        fnSetInitializing: (value: boolean) => { this._initializing = value; }
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return null;
    }
  }

  async getSpecialRel8dIbGibs<TIbGib extends IbGib_V1 = IbGib_V1>({
    type,
    rel8nName,
    space,
  }: {
    type: SpecialIbGibType,
    rel8nName: string,
    space?: IbGibSpaceAny,
  }): Promise<TIbGib[]> {
    const lc = `${this.lc}[${this.getSpecialRel8dIbGibs.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: 476c7d7c68f34197b740be5df09238a2)`); }

      return getSpecialRel8dIbGibs({ type, rel8nName, space });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async rel8ToSpecialIbGib({
    type,
    rel8nName,
    ibGibsToRel8,
    linked,
    severPast,
    deletePreviousSpecialIbGib,
    space,
  }: {
    type: SpecialIbGibType,
    rel8nName: string,
    /**
     * multiple ibgibs to rel8
     */
    ibGibsToRel8: IbGib_V1[],
    linked?: boolean,
    /**
     * Clears out the special.rel8ns.past array to an empty array.
     *
     * {@see deletePreviousSpecialIbGib} for driving use case.
     */
    severPast?: boolean,
    /**
     * Deletes the previous special ibGib.
     *
     * ## driving use case
     *
     * the latest ibGib is one that is completely ephemeral. It doesn't get attached
     * to the current root, and it only has the current instance. So we don't want to
     * keep around past incarnations.
     */
    deletePreviousSpecialIbGib?: boolean,
    space?: IbGibSpaceAny,
  }): Promise<IbGibAddr> {
    const lc = `${this.lc}[${this.rel8ToSpecialIbGib.name}](type:${type},rel8nName:${rel8nName})`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: af863928bbc945549ffc4dcca830a70a)`); }

      return rel8ToSpecialIbGib({
        type,
        rel8nName,
        ibGibsToRel8,
        linked,
        severPast,
        deletePreviousSpecialIbGib,
        space,
        defaultSpace: this.zeroSpace,
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
        fnBroadcast: (x) => this.fnBroadcast(x),
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }


  async getTjpIbGib({
    ibGib,
    naive = true,
    space,
  }: {
    ibGib: IbGib_V1<any>,
    naive?: boolean,
    space?: IbGibSpaceAny,
  }): Promise<IbGib_V1<any>> {
    const lc = `${this.lc}[${this.getTjpIbGib.name}]`;

    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: 0ec806bd2c5641c4844a3698c922e1f6)`); }
      if (!space) {
        console.warn(`${lc} space falsy and localUserSpace not initialized.`);
        return ibGib;
      }

      return getTjpIbGib({ibGib, naive, space});
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Used for tracking tjpAddr -> latest ibGibAddr.
   *
   * Call this when you create a new ibGib.
   *
   * Need to put this in another service at some point, but crunch crunch
   * like pacman's lunch.
   */
  async registerNewIbGib({
    ibGib,
    space,
  }: {
    ibGib: IbGib_V1,
    space?: IbGibSpaceAny,
  }): Promise<void> {
    let lc = `${this.lc}[${this.registerNewIbGib.name}]`;
    try {
      const ibGibAddr: IbGibAddr = h.getIbGibAddr({ibGib});
      lc = `${lc}[${ibGibAddr}]`;

      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: d7e6d609a784449087cbaf1bbfb6b0c2)`); }

      if (logalot) { console.log(`${lc} starting...`); }

      return registerNewIbGib({
        ibGib,
        space,
        defaultSpace: this.zeroSpace,
        fnBroadcast: (x) => this.fnBroadcast(x),
        fnUpdateBootstrap: (x) => this.fnUpdateBootstrap(x),
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Will trigger a latest info event to be fired.
   * @param param0
   */
  async pingLatest_Local({
    ibGib,
    tjp,
    space,
  }: {
    ibGib: IbGib_V1<any>,
    tjp: IbGib_V1<any>,
    space?: IbGibSpaceAny,
  }): Promise<void> {
    let lc = `${this.lc}[${this.pingLatest_Local.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {
      if (!ibGib) {
        if (logalot) { console.log(`${lc} ibGib falsy.`); }
        return;
      }
      space = space ?? await this.getLocalUserSpace({});
      if (!space) {
        console.warn(`${lc} space falsy and localUserSpace not initialized. (W: e6708e58618947a6b66f6a49406cbf35)`);
        return;
      }

      let latestAddr = await this.getLatestAddr({ibGib, tjp, space});
      let ibGibAddr = h.getIbGibAddr({ibGib});

      // // get the tjp for the rel8nName mapping, and also for some checking logic
      if (!tjp) {
        tjp = await this.getTjpIbGib({ibGib, space});
        if (!tjp) {
          console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself.`);
          tjp = ibGib;
        }
      }
      let tjpAddr = h.getIbGibAddr({ibGib: tjp});

      // console.log(`${lc} ping it out`);
      if (latestAddr === ibGibAddr) {
        // console.log(`${lc} no (different) latest exists`);
        this._latestSubj.next({
          latestIbGib: ibGib,
          latestAddr: ibGibAddr,
          tjpAddr,
        });
      } else {
        // console.log(`${lc} there is a later version`);
        let resLatestIbGib = await this.get({addr: latestAddr, space});
        if (!resLatestIbGib.success || resLatestIbGib.ibGibs?.length !== 1) {
          throw new Error('latest not found');
        }
        const latestIbGib = resLatestIbGib.ibGibs![0];
        this._latestSubj.next({
          latestIbGib,
          latestAddr,
          tjpAddr
        });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Wrapper for getting the latest addr in the given space.
   *
   * ## warnings
   *
   * * This was written early and makes many assumptions.
   * * Meant to work with Ionic space atow.
   *
   * @returns latest addr in a given space (or localUserSpace)
   */
  async getLatestAddr({
    ibGib,
    tjpAddr,
    tjp,
    space,
  }: {
    ibGib?: IbGib_V1<any>,
    tjpAddr?: IbGibAddr,
    tjp?: IbGib_V1<any>,
    space?: IbGibSpaceAny,
  }): Promise<IbGibAddr|undefined> {
    let lc = `${this.lc}[${this.getLatestAddr.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {
      if (!ibGib && !tjp && !tjpAddr) {
        throw new Error(`ibGib && tjp && tjpAddr falsy (E: fe725654342c4d80a33219160b5d81d3)`);
      }

      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: fd01bb85e91f4c54bfe8b35714d48a38)`); }

      const resGetLatest = await getLatestAddrs({
        ibGibs: ibGib ? [ibGib] : undefined,
        tjpAddrs: tjpAddr ? [tjpAddr] : undefined,
        tjps: tjp ? [tjp] : undefined,
        space,
      });

      if (!resGetLatest) { throw new Error(`resGetLatest falsy (E: 3851bbe4427ae11771f222234e8c6622)`); }
      if (!resGetLatest.data) { throw new Error(`invalid resGetLatest: data falsy (E: 134e0f1f65edc69c6951c32e00a4bb22)`); }
      if (resGetLatest.data.success) {
        if (resGetLatest.data.addrs?.length === 1) {
          return resGetLatest.data.addrs[0];
        } else if (resGetLatest.data.addrsNotFound?.length === 1) {
          return undefined;
        } else if (resGetLatest.data.addrsErrored?.length === 1) {
          debugger;
          const emsg = resGetLatest.data.errors?.join('|') ?? "[unspecified error(s)] (E: 24f338036aa84ac99e3c39a660207222)";
          throw new Error(`resGetLatest had error(s): ${emsg}`);
        } else {
          debugger;
          throw new Error(`unknown error, invalid resGetLatest: ${h.pretty(resGetLatest)} (E: 6aa5aa225ebf49b588664370cb8feb22)`);
        }
      } else {
        debugger;
        const emsg = resGetLatest.data.errors?.join('|') ?? "[unspecified error(s)] (E: dcd6dcd6ec052fd112a4d48f1afa2922)";
        throw new Error(`resGetLatest had error(s): ${emsg}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Convenience function for persisting a transform result, which has
   * a newIbGib and optionally intermediate ibGibs and/or dnas.
   *
   * it persists these ibgibs into the given space, else the current space.
   */
  async persistTransformResult({
    resTransform,
    isMeta,
    force,
    space,
  }: {
    resTransform: TransformResult<IbGib_V1>,
    isMeta?: boolean,
    force?: boolean,
    space?: IbGibSpaceAny,
  }): Promise<void> {
    const lc = `${this.lc}[${this.persistTransformResult.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: f8b3d06006874b479240eb45f4015628)`); }

      return persistTransformResult({
        resTransform,
        isMeta,
        force,
        space,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Wrapper for retrieving ibgib from a given space, else the current space.
   */
  async get({
    addr,
    isMeta,
    isDna,
    space,
  }: GetIbGibOpts): Promise<GetIbGibResult> {
    let lc = `${this.lc}[${this.get.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: 86ccdcf3417a45b4a3a8c280fb9a6df7)`); }

      return getFromSpace({ addr, isMeta, isDna, space });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return Promise.resolve({ errorMsg: error.message });
    }
  }

  /**
   * Wrapper for saving ibgib in a given space, else the current space.
   */
  async put({
    ibGib,
    ibGibs,
    isMeta,
    isDna,
    force,
    space,
  }: PutIbGibOpts): Promise<PutIbGibResult> {
    const lc = `${this.lc}[${this.put.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: a00eebe0e3d348d09fda62a6be486b6c)`); }

      return putInSpace({ ibGib, ibGibs, isMeta, isDna, force, space });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return Promise.resolve({ errorMsg: error.message });
    }
  }

  /**
   * Wrapper for removing ibgib from the a given space, else the current space.
   */
  async delete({
    addr,
    isMeta,
    isDna,
    space,
  }: DeleteIbGibOpts): Promise<DeleteIbGibResult> {
    const lc = `${this.lc}[${this.delete.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: b4250b0045dc40629447f2cbd162faaa)`); }

      return deleteFromSpace({ addr, isMeta, isDna, space });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return Promise.resolve({ errorMsg: error.message });
    }
  }

  /**
   * Wrapper for `getDependencyGraph` fn in `helper/space.ts`, but using
   * `this.localUserSpace` as default space.
   *
   * (refactoring!)
   *
   * ## warning
   *
   * This does not (YET) have a flag that gets the latest ibgibs for the graph.
   * It only climbs the current graph, which may not cover all ibgibs when you
   * deal with ibGibs with tjps (timelines). We're going to eventually
   * combat this with auto-updating our rel8ns, but for now we're just going
   * to earmark this for the future.
   *
   * todo: auto-update or better
   */
  async getDependencyGraph({
    ibGib,
    ibGibs,
    ibGibAddr,
    ibGibAddrs,
    gotten,
    skipAddrs,
    skipRel8nNames,
    space,
  }: {
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
     * object that will be populated through recursive calls to this function.
     *
     * First caller of this function should not (doesn't need to?) provide this
     * and I'm not atow coding a separate implementation function to ensure
     * this.
     */
    gotten?: { [addr: string]: IbGib_V1 },
    /**
     * NOT IMPLEMENTED ATOW
     *
     * List of ibgib addresses to skip not retrive in the dependency graph.
     *
     * This will also skip any ibgib addresses that would have occurred in the
     * past of these ibgibs, as when skipping an ibgib, you are also skipping
     * its dependencies implicitly as well (unless those others are related via
     * another ibgib that is not skipped of course).
     *
     * ## driving use case
     *
     * We don't want to get ibgibs that we already have, and this is
     * cleaner than using the `gotten` parameter for double-duty.
     */
    skipAddrs?: IbGibAddr[],
    /**
     * Skip these particular rel8n names.
     *
     * ## driving intent
     *
     * I'm adding this to be able to skip getting dna ibgibs.
     */
    skipRel8nNames?: string[],
    /**
     * Space within which we should be looking for ibGibs.
     */
    space?: IbGibSpaceAny,
  }): Promise<{ [addr: string]: IbGib_V1 }> {
    const lc = `${this.lc}[${this.getDependencyGraph.name}]`;
    try {
      space = space ?? await this.getLocalUserSpace({});
      if (!space) { throw new Error(`space falsy and localUserSpace not initialized (?) (E: e2a35a23d12d48ebadcfd4f1a396d6c1)`); }

      return getDependencyGraph({
        ibGib, ibGibs,
        ibGibAddr, ibGibAddrs,
        gotten,
        skipAddrs, skipRel8nNames,
        space,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async getSyncSpaces({space}: {space: IbGibSpaceAny}): Promise<IbGibSpaceAny[]> {
    const lc = `${this.lc}[${this.getSyncSpaces.name}]`;
    try {
      if (!space) { throw new Error(`space required. (E: c03f80eca6b045b9a73b0aafa44cdf26)`); }
      let syncSpaces = await this.getSpecialRel8dIbGibs<IbGibSpaceAny>({
        type: "outerspaces",
        rel8nName: c.SYNC_SPACE_REL8N_NAME,
        space
      });
      return syncSpaces;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Feels klugy.
   */
  async promptForSecrets({
    secretIbGibs,
    fnPromptPassword,
    checkCacheFirst,
    cacheAfter,
  }: {
    secretIbGibs: IbGib_V1<SecretData_V1>[],
    fnPromptPassword: (title: string, msg: string) => Promise<string|null>,
    checkCacheFirst?: boolean,
    cacheAfter?: boolean,
  }): Promise<string|null> {
    const lc = `${this.lc}[${this.promptForSecrets.name}]`;
    try {
      // used if we `checkCacheFirst` AND/OR if we `cacheAfter`
      const secretsCacheKey =
        secretIbGibs.map(ibGib => h.getIbGibAddr({ibGib})).join('');

      if (checkCacheFirst) {
        const cachedPassword =
          await this.getCachedSecretPassword({cacheKey: secretsCacheKey});

        if (cachedPassword) {
          // do NOT log the actual cachedPassword!!
          if (logalot) { console.log(`${lc} using cachedPassword.`); }
          return cachedPassword;
        }
      }

      // build prompt message
      let secretInfos: SecretInfo_Password[] = [];
      for (let i = 0; i < secretIbGibs.length; i++) {
        const secretIbGib = secretIbGibs[i];
        if (!secretIbGib.data) { throw new Error(`invalid secretIbGib. data falsy.`); }
        if (secretIbGib.data!.type === 'password') {
          const secretInfo = <SecretInfo_Password>secretIbGib.data;
          secretInfos.push(secretInfo);
        } else {
          throw new Error(`Only password secrets are implemented atm.`);
        }
      }
      const separator = '-------------';
      const secretInfosMsgBlock = secretInfos.map(secretInfo => {
        return `name:        ${secretInfo.name}
                description: ${secretInfo.description}
                hint:        ${secretInfo.hint}`;
      }).join('\n' + separator + '\n');

      // prompt user
      const title = `Gimme a password.`;
      const msg =
        `Enter the password corresponding to the following secret(s):\n
        ${separator}\n\n
        ${secretInfosMsgBlock}
        `;
      let password = await fnPromptPassword(title, msg);

      // cache if applicable
      if (password && cacheAfter) {
        await this.setCachedSecretPassword({
          cacheKey: secretsCacheKey,
          secretPassword: password,
        });
      }

      // we're done
      return password;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async getCiphertextIbGib<TEncryptionIbGib extends IbGib_V1<EncryptionData_V1>, TMetadata = any>({
    plaintext,
    password,
    encryptionIbGib,
    confirm,
    persist,
    ibRoot,
    publicIbMetadata,
    publicMetadata,
  }: {
    /**
     * Um...data...to...erm...encrypt...(as a string)
     */
    plaintext: string,
    /**
     * Password to perform the encryption.
     */
    password: string,
    /**
     * Information about encryption, i.e. encryption settings.
     */
    encryptionIbGib: TEncryptionIbGib,
    /**
     * Decrypts and checks against original data
     */
    confirm?: boolean,
    /**
     * If true, will persist the ibgib
     */
    persist?: boolean,
    /**
     * If you provide this, the resulting ibgib will have the following format:
     * `${ibRoot} ${publicIbMetadata}`. Otherwise, this will default to:
     * `ciphertext ${publicIbMetadata}`, or just `ciphertext` if
     * `publicIbMetadata` is falsy.
     */
    ibRoot?: string,
    /**
     * If you want to include metadata in the ib itself of the
     * ciphertext ibgib. This will of course make this metadata
     * available without loading the full ibgib, but will increase
     * storage size because every address linking to the ibgib will
     * include this as well.
     */
    publicIbMetadata?: string,
    /**
     * If you want to include public, unencrypted metadata in the ibgib's
     * data body itself.
     */
    publicMetadata?: TMetadata,
  }): Promise<TransformResult<CiphertextIbGib_V1>> {
    const lc = `${this.lc}[${this.getCiphertextIbGib.name}]`;
    try {
      const encryptionInfo = encryptionIbGib.data;
      if (encryptionInfo?.method !== 'encrypt-gib (weak)') {
        throw new Error('only encrypt-gib is implemented.');
      }
      const info: EncryptionInfo_EncryptGib = <any>encryptionInfo;
      const resEncrypt = await encrypt({
        dataToEncrypt: plaintext,
        secret: password,
        initialRecursions: info.initialRecursions,
        recursionsPerHash: info.recursionsPerHash,
        salt: info.salt,
        saltStrategy: info.saltStrategy,
        hashAlgorithm: info.hashAlgorithm,
        encryptedDataDelimiter: info.encryptedDataDelimiter,
        confirm,
      });

      if (resEncrypt.warnings?.length > 0) { console.warn(`${lc} warnings: ${resEncrypt.warnings.join('\n')}`); }
      if (resEncrypt.errors?.length > 0) { throw new Error(resEncrypt.errors!.join('\n')); }
      if (!resEncrypt.encryptedData) { throw new Error(`encryptedData is falsy`) }

      const data: CiphertextData = { ciphertext: resEncrypt.encryptedData, };
      if (publicMetadata) { data.metadata = publicMetadata; }

      const rel8ns: CiphertextRel8ns = {
        encryption: [h.getIbGibAddr({ibGib: encryptionIbGib})],
      }

      const resCiphertext = <TransformResult<CiphertextIbGib_V1>>(
        await factory.firstGen({
          parentIbGib: factory.primitive({ib: ibRoot || 'ciphertext'}),
          ib:
            publicIbMetadata ?
              `${ibRoot || 'ciphertext'} ${publicIbMetadata}` :
              `${ibRoot || 'ciphertext'}`,
          data,
          rel8ns,
          dna: false,
          tjp: { uuid: true, timestamp: true },
          nCounter: true,
        })
      );

      if (!resCiphertext.newIbGib) { throw new Error('Error creating ciphertext ibgib.'); }

      if (persist) {
        await this.persistTransformResult({resTransform: resCiphertext});
      }

      return resCiphertext;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }

  }

  /**
   * Brings together a ciphertext and secretIbGibs to decrypt
   * the `ciphertextIbGib.data.ciphertext`
   * @returns plaintext string of `ciphertextIbGib.data.ciphertext`
   */
  async getPlaintextString({
    ciphertextIbGib,
    secretIbGibs,
    fnPromptPassword,
    space,
  }: {
    ciphertextIbGib: CiphertextIbGib_V1,
    secretIbGibs: SecretIbGib_V1[],
    fnPromptPassword: (title: string, msg: string) => Promise<string|null>,
    space: IbGibSpaceAny,
  }): Promise<string> {
    const lc = `${this.lc}[${this.getPlaintextString.name}]`;
    try {
      // validate
      if ((secretIbGibs || []).length === 0) { throw new Error(`secretIbGibs required.`); }
      if (!ciphertextIbGib.rel8ns?.encryption) { throw new Error(`ciphertextIbGib.rel8ns.encryption falsy`) }
      if (ciphertextIbGib.rel8ns!.encryption!.length !== 1) { throw new Error(`ciphertextIbGib.rel8ns!.encryption!.length !== 1`); }

      // get corresponding encryption ibgib for encryption settings
      const encryptionAddr = ciphertextIbGib.rel8ns!.encryption![0];
      const resEncryption = await this.get({addr: encryptionAddr, space});
      if (!resEncryption.success) { throw new Error(`get encryption failed`); }
      if ((resEncryption.ibGibs || []).length !== 1) { throw new Error(`get encryption retrieved non-1 length (eesh)`); }
      const encryptionIbGib = <IbGib_V1<EncryptionData_V1>>resEncryption.ibGibs[0];
      if (!encryptionIbGib.data) { throw new Error('encryptionIbGib.data falsy'); }

      // prompt user for the password
      const password = await this.promptForSecrets({
        secretIbGibs,
        fnPromptPassword,
        checkCacheFirst: true,
        cacheAfter: true,
      });

      // we're about the decrypt, but maybe the data doesn't have everything.
      // So WARN for any defaults we're using.
      if (!encryptionIbGib.data.initialRecursions) { console.warn(`${lc} using default initialRecursions`); }
      if (!encryptionIbGib.data.recursionsPerHash) { console.warn(`${lc} using default recursionsPerHash`); }
      if (!encryptionIbGib.data.saltStrategy) { console.warn(`${lc} using default saltStrategy`); }
      if (!encryptionIbGib.data.hashAlgorithm) { console.warn(`${lc} using default hashAlgorithm`); }

      // do actual decryption
      if (logalot) { console.log(`${lc} starting decrypt...`); }
      const resDecrypt = await decrypt({
        encryptedData: ciphertextIbGib.data.ciphertext,
        secret: password,
        initialRecursions:
          encryptionIbGib.data.initialRecursions || c.DEFAULT_ENCRYPTION_INITIAL_RECURSIONS,
        recursionsPerHash:
          encryptionIbGib.data.recursionsPerHash || c.DEFAULT_ENCRYPTION_RECURSIONS_PER_HASH,
        salt: encryptionIbGib.data.salt,
        saltStrategy:
          encryptionIbGib.data.saltStrategy || c.DEFAULT_ENCRYPTION_SALT_STRATEGY,
        hashAlgorithm:
          encryptionIbGib.data.hashAlgorithm || c.DEFAULT_ENCRYPTION_HASH_ALGORITHM,
        encryptedDataDelimiter: encryptionIbGib.data.encryptedDataDelimiter,
      });
      if (logalot) { console.log(`${lc} decrypt complete.`); }
      if (resDecrypt.errors?.length > 0) { throw new Error(resDecrypt.errors.join('|')); }

      // we're done
      return resDecrypt.decryptedData;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async unwrapEncryptedSyncSpace({
    encryptedSpace,
    fnPromptPassword,
    space,
  }: {
    encryptedSpace: IbGibSpaceAny,
    fnPromptPassword: (title: string, msg: string) => Promise<string|null>,
    space?: IbGibSpaceAny,
  }): Promise<IbGibSpaceAny> {
    const lc = `${this.lc}[${this.unwrapEncryptedSyncSpace.name}]`;
    try {
      // validation
      if (!encryptedSpace.rel8ns?.ciphertext) { throw new Error(`space is not a ciphertext`); }
      if (encryptedSpace.rel8ns!.ciphertext!.length !== 1) { throw new Error(`only 1 ciphertext rel8n allowed...`); }

      // get ciphertext ibgib
      const ciphertextAddr = encryptedSpace.rel8ns!.ciphertext![0];
      const resCiphertext = await this.get({addr: ciphertextAddr, space});
      if (!resCiphertext.success) { throw new Error(`get ciphertext failed`); }
      if ((resCiphertext.ibGibs || []).length !== 1) { throw new Error(`get ciphertext retrieved non-1 length (eesh)`); }
      const ciphertextIbGib = <CiphertextIbGib_V1>resCiphertext.ibGibs[0];

      // get secrets associated with enciphered space
      if (!encryptedSpace.rel8ns?.secret) { throw new Error('!encryptionIbGib.rel8ns?.secret'); }
      const secretAddrs = encryptedSpace.rel8ns!.secret!;
      const localUserSpace = await this.getLocalUserSpace({});
      const argGetSecrets = await localUserSpace.argy({
        argData: { ibGibAddrs: secretAddrs, cmd: 'get', }
      });
      const resSecrets = await localUserSpace.witness(argGetSecrets);
      if (!resSecrets.data?.success || (resSecrets.ibGibs || []).length === 0)  {
        throw new Error(`couldn't get secret ibgibs`);
      }
      const secretIbGibs = <IbGib_V1<SecretData_V1>[]>resSecrets.ibGibs.concat();

      // get plaintext now that we have the ciphertext ibgib and secret ibgib(s)
      const plaintextString = await this.getPlaintextString({
        ciphertextIbGib: ciphertextIbGib,
        fnPromptPassword,
        secretIbGibs,
        space,
      });

      const syncSpaceData = JSON.parse(plaintextString);
      if (syncSpaceData.type !== 'sync') { throw new Error(`syncSpaceData.type !== 'sync'...this is the only one implemented right now`); }
      if (syncSpaceData.subtype !== 'aws-dynamodb') { throw new Error(`syncSpaceData.subtype !== 'aws-dynamodb'...only one right now dude`); }

      // so we have a syncspace data (only aws-dynamodb space right now).
      // load this data into a space class with behavior (not just the dto).
      const awsSpace = new AWSDynamoSpace_V1(syncSpaceData, null);
      awsSpace.gib = await getGib({ibGib: awsSpace, hasTjp: false});
      if (logalot) { console.log(`awsSpace.gib: ${awsSpace.gib}`); }
      return awsSpace;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Caching user password secret in memory only.
   *
   * Just to prevent plaintext passwords from just sitting in memory,
   * this is a slight layer of indirection for caching
   *
   * @returns user password
   */
  private async getCachedSecretPassword({
    cacheKey,
  }: {
    cacheKey: string,
  }): Promise<string | undefined> {
    const lc = `${this.lc}[${this.getCachedSecretPassword.name}]`;
    try {
      if (!cacheKey) { throw new Error(`secretAddr required`); }
      let entry = this.passwordCache[cacheKey];
      if (!entry) {
        if (logalot) { console.log(`${lc} secretAddr not cached: ${cacheKey}`); }
        return undefined;
      }

      // settings must match, but I'm feeling lazy on DRYing

      if (logalot) { console.log(`${lc} starting decrypt...`); }
      let resDecrypt = await decrypt({
        encryptedData: entry.encryptedPassword,
        secret: entry.tempMetaPassword,
        initialRecursions: 10000,
        recursionsPerHash: 5,
        salt: entry.salt,
        saltStrategy: 'appendPerHash',
        hashAlgorithm: 'SHA-512',
      });
      if (logalot) { console.log(`${lc} decrypt complete.`); }

      if (!resDecrypt.decryptedData) { throw new Error(`resDecrypt.decryptedData falsy`); }

      return resDecrypt.decryptedData;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }

  private async setCachedSecretPassword({
    cacheKey,
    secretPassword,
    force,
  }: {
    cacheKey: string,
    secretPassword: string,
    force?: boolean,
  }): Promise<void> {
    const lc = `${this.lc}[${this.getCachedSecretPassword.name}]`;
    try {
      if (!cacheKey) { throw new Error(`secretAddr required`); }

      if (this.passwordCache[cacheKey]) {
        if (force) {
          if (logalot) { console.log(`already cached, but force is true: ${cacheKey}`); }
          delete this.passwordCache[cacheKey];
        } else {
          if (logalot) { console.log(`already cached: ${cacheKey}`); }
          return undefined;
        }
      }

      const tempMetaPassword = await h.getUUID(256);
      const salt = await h.getUUID();
      // settings must match, but I'm feeling lazy on DRYing
      let resEncrypt = await encrypt({
        dataToEncrypt: secretPassword,
        secret: tempMetaPassword,
        initialRecursions: 10000,
        recursionsPerHash: 5,
        salt: salt,
        saltStrategy: 'appendPerHash',
        hashAlgorithm: 'SHA-512',
      });
      if (!resEncrypt.encryptedData) { throw new Error(`resEncrypt.encryptedData falsy`); }
      const encryptedPassword = resEncrypt.encryptedData!;

      let entry: TempCacheEntry =
        { tempMetaPassword, salt, encryptedPassword, };

      this.passwordCache[cacheKey] = entry;
      if (logalot) { console.log(`${lc} entry added for ${cacheKey}.`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }

  /**
   * If we don't have outerspaces/cloud endpoints, we'll do that here.
   *
   * @returns true if creation was successfully created, else false.
   */
  private async _createOuterspaceEndpointStuff(): Promise<boolean> {
    const lc = `${this.lc}[${this._createOuterspaceEndpointStuff.name}]`;
    try {
      let secretIbGibs: IbGib_V1[] = await this.getSpecialRel8dIbGibs({
        type: "secrets",
        rel8nName: c.SECRET_REL8N_NAME,
      });
      const alert = getFnAlert();
      if (secretIbGibs.length === 0) {
        await alert({
          title: 'first create some stuff...',
          msg: "First we'll need to do a couple things, like create a secret password, an encryption setting, and a cloud endpoint.",
        });
      }
      while (secretIbGibs.length === 0) {
        let secretIbGib = await this.fnPromptSecret();
        if (secretIbGib === undefined) {
          await alert({title: 'cancelled', msg: 'Cancelled.'});
          return false;
        }
        await this.registerNewIbGib({ ibGib: secretIbGib, });
        await this.rel8ToSpecialIbGib({
          type: "secrets",
          rel8nName: c.SECRET_REL8N_NAME,
          ibGibsToRel8: [secretIbGib],
        });
        secretIbGibs = await this.getSpecialRel8dIbGibs({
          type: "secrets",
          rel8nName: c.SECRET_REL8N_NAME,
        });
      }

      let encryptionIbGibs: IbGib_V1[] = await this.getSpecialRel8dIbGibs({
        type: "encryptions",
        rel8nName: c.ENCRYPTION_REL8N_NAME,
      });
      if (encryptionIbGibs.length === 0) {
        alert({
          title: 'next create an encryption...',
          msg: "Now we need to create an encryption setting. If you don't know what this is, just fill in the requirements and leave the others as defaults.",
        });
      }
      while (encryptionIbGibs.length === 0) {
        let encryptionIbGib = await this.fnPromptEncryption();
        if (encryptionIbGib === undefined) {
          await alert({title: 'cancelled', msg: 'Cancelled.'});
          return false;
        }
        await this.registerNewIbGib({ ibGib: encryptionIbGib, });
        await this.rel8ToSpecialIbGib({
          type: "encryptions",
          rel8nName: c.ENCRYPTION_REL8N_NAME,
          ibGibsToRel8: [encryptionIbGib],
        });
        encryptionIbGibs = await this.getSpecialRel8dIbGibs({
          type: "encryptions",
          rel8nName: c.ENCRYPTION_REL8N_NAME,
        });
      }

      let createdOuterspaces = await this._createOuterspaces();
      return createdOuterspaces;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return false;
    }
  }

  private async _createOuterspaces(): Promise<boolean> {
    const lc = `${this.lc}[${this._createOuterspaces.name}]`;
    try {
      const alert = getFnAlert();
      let outerspaceIbGibs: IbGib_V1[] = await this.getSpecialRel8dIbGibs({
        type: "outerspaces",
        rel8nName: c.SYNC_SPACE_REL8N_NAME,
      });
      if (outerspaceIbGibs.length === 0) {
        await alert({
          title: 'Now to outerspace...',
          msg: `Great! Now we can create an outerspace ibgib, which is like a connection from this local space to other spaces (like the cloud).`,
        });
      }
      while (outerspaceIbGibs.length === 0) {
        let outerspaceIbGib = await this.fnPromptOuterSpace();
        if (outerspaceIbGib === undefined) { break; }
        await this.registerNewIbGib({ ibGib: outerspaceIbGib, });
        await this.rel8ToSpecialIbGib({
          type: "outerspaces",
          rel8nName: c.SYNC_SPACE_REL8N_NAME,
          ibGibsToRel8: [outerspaceIbGib],
        });
        await alert({
          title: 'create another space...',
          msg: `Great! Now we can use this space to synchronize & import ibgibs.`,
        });
        outerspaceIbGibs = await this.getSpecialRel8dIbGibs({
          type: "outerspaces",
          rel8nName: c.SYNC_SPACE_REL8N_NAME,
        });
      }
      if (outerspaceIbGibs.length > 0) {
        return true;
      } else {
        await alert({title: 'cancelled', msg: 'Cancelled.'});
        return false;
      }
    } catch (error) {

    }
  }

  async getAppSyncSpaces({
    unwrapEncrypted,
    createIfNone,
  }: {
    unwrapEncrypted: boolean,
    createIfNone: boolean,
  }): Promise<IbGibSpaceAny[]> {
    const lc = `${this.lc}[${this.getAppSyncSpaces.name}]`;
    try {
      // get existing
      let appSyncSpaces: IbGibSpaceAny[] = await this.getSpecialRel8dIbGibs<IbGibSpaceAny>({
        type: "outerspaces",
        rel8nName: c.SYNC_SPACE_REL8N_NAME
      });

      // create if applicable
      if (appSyncSpaces.length === 0 && createIfNone) {
        let created = await this._createOuterspaceEndpointStuff();
        if (created) {
          appSyncSpaces = await this.getSpecialRel8dIbGibs<IbGibSpaceAny>({
            type: "outerspaces",
            rel8nName: c.SYNC_SPACE_REL8N_NAME
          });
        }
      }

      // unwrap if requested
      let resSpaces: IbGibSpaceAny[] = [];
      if (unwrapEncrypted) {
        for (let i = 0; i < appSyncSpaces.length; i++) {
          let syncSpace = appSyncSpaces[i];

          if (syncSpace.rel8ns.ciphertext) {
            syncSpace = await this.unwrapEncryptedSyncSpace({
              encryptedSpace: syncSpace,
              fnPromptPassword: getFnPromptPassword_AlertController({
                alertController: this.alertController,
              }),
            });
          }

          resSpaces.push(syncSpace);
        }
      } else {
        // still (probably) encrypted
        resSpaces = appSyncSpaces;
      }

      return resSpaces;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return [];
    }
  }

  async syncIbGibs({
    dependencyGraphIbGibs,
    // confirm,
    watch,
  }: {
    dependencyGraphIbGibs?: IbGib_V1[],
    // confirm?: boolean,
    /**
     * If true, will watch ibgibs in dependency graph that have timelines
     * (tjps).
     */
    watch?: boolean,
  }): Promise<SyncSagaInfo[]|undefined> {
    const lc = `${this.lc}[${this.syncIbGibs.name}]`;
    // map of saga infos across all spaces
    // const sagaInfoMap: { [spaceGib: string]: SyncSagaInfo } = {};
    try {
      if (this.syncing) { throw new Error(`already syncing. (E: dfa3ad58e97f4b18b4e4d7dc252208fb)`); }
      if (Object.values(this.sagaInfoMap).length > 0) { throw new Error(`this._syncing is false but sagaInfoMap not cleaned up(?). (E: bb69c808877c4931b5481585043c18e7)(UNEXPECTED)`); }

      this._syncing = true;

      // #region validate
      if (logalot) { console.log(`${lc} starting...`); }
      if (!dependencyGraphIbGibs || dependencyGraphIbGibs.length === 0) { throw new Error(`ibGibs required. (E: 404c36475fb84fc285a23a67c0b8fcb2)`); }
      // #endregion

      // #region get sync spaces and build participant infos
      if (logalot) { console.log(`${lc} get sync spaces (returns if none)`); }
      const appSyncSpaces: IbGibSpaceAny[] = await this.getAppSyncSpaces({
        unwrapEncrypted: true,
        createIfNone: true,
      });
      if (appSyncSpaces.length === 0) {
        const msg = `Can't sync without sync spaces. Cancelled.`;
        if (logalot) { console.log(`${lc} ${msg}`) };
        const fnAlert = getFnAlert();
        await fnAlert({title: "Cancelled", msg});
        this._syncing = false;
        return;
      }
      const localUserSpace = await this.getLocalUserSpace({});
      const participants: ParticipantInfo[] = [
        // local user space
        { id: localUserSpace.data.uuid, gib: localUserSpace.gib, s_d: 'src', },


        // sync spaces
        ...appSyncSpaces.map(s => {
          if (!s.data) { throw new Error(`space.data required. (E: 3c192771e84445a4b6476d5193b07e9d)`); }
          if (!s.data.uuid) { throw new Error(`space.data.uuid required. (E: d27e9998227840f99d45a3ed245f3196)`); }
          if (!s.gib) { throw new Error(`space.gib required. (E: db73aceb2f8445d8964ae49b59957072)`); }
          return <ParticipantInfo>{ id: s.data.uuid, gib: s.gib, s_d: 'dest', };
        }),
      ];
      // #endregion

      // get **ALL** ibgibs that we'll need to put/merge
      const allIbGibsToSync =
        await this._getAllIbGibsToSyncFromGraph({dependencyGraphIbGibs});

      // _NOW_ we can finally put/merge into sync spaces.
      // this returns to us the most recent versions which we can update
      // our local timelines if we so choose (which we will).
      // NOTE: we won't worry about what if different sync spaces have different
      // versions atm. We're just going to do this assuming sync spaces
      // are nice and coordinated (which they aren't).

      if (logalot) { console.log(`${lc} syncing to spaces in parallel...`); }
      const multiSpaceOpId = await h.getUUID();
      const allSagaInfos: SyncSagaInfo[] = [];
      const startSyncPromises: Promise<void>[] = appSyncSpaces.map(async syncSpace => {

        // create the info that will track progress over entire sync saga
        const sagaInfo =
          await this._createNewSyncSagaInfo({
            multiSpaceOpId,
            allIbGibsToSync,
            syncSpace,
            participants,
          });
        this.sagaInfoMap[sagaInfo.sagaId] = sagaInfo;
        allSagaInfos.push(sagaInfo);
        try {
          // _startSync creates a status observable that can keep us up to date
          // on the status updates throughout the sync saga. We can handle
          // updating our own local space based on those status updates.
          // await this._startSync({syncSagaInfo: sagaInfo, confirm});
          await this._startSync({syncSagaInfo: sagaInfo, watch});
        } catch (error) {
          // if this throws, then that is unexpected. The above result should
          // always be returned, and if it's errored then it should indicate as
          // such.
          console.error(`${lc} (UNEXPECTED) ${error.message}`);
          throw error;
        }
      });

      // await just the initial starting of each space's sync operation.  when
      // this promise is awaited, the sync operation is not done, only the
      // starting of all sync sagas across all spaces.
      await Promise.all(startSyncPromises);

      // at this point, all spaces have prepared and are going. the sync saga
      // info attached to each arg/result ibgib has the observable syncStatus$
      // that will produce the status updates which can be interpreted &
      // responded to.
      await this._handleSagaUpdates();
      return allSagaInfos;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.finalizeAllSyncSagas_NoThrow({error});
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  private finalizeSyncSaga({
    sagaInfo,
    error,
  }: {
    sagaInfo: SyncSagaInfo,
    error?: any,
  }): void {
    const lc = `${this.lc}[${this.finalizeSyncSaga.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (sagaInfo.complete) { return; }
      if (!sagaInfo.syncStatus$.complete) {
        if (error) {
          const emsg =
            typeof(error) === 'string' ?  error : error.message ??
              `${lc} something went wrong (E: d7db873d9e8b4f14b5b490cadd9730f4)`;
          console.error(emsg);
          sagaInfo.syncStatus$.error(emsg);
        }
        sagaInfo.syncStatus$.complete();
      }
      // I think $.complete() closes subscriptions, but to be double sure...
      (sagaInfo.syncStatusSubscriptions ?? [])
        .filter(sub => sub && !sub.closed)
        .forEach(sub => { sub.unsubscribe(); });

      if (logalot) { console.log(`${lc} complete.`); }
    } catch (error) {
       console.error(`${lc} ${error.message}`);
       throw error;
    } finally {
      if (logalot) { console.log(`${lc} setting sagaInfo.complete to true`); }
      sagaInfo.complete = true;
    }

  }

  private finalizeAllSyncSagas_NoThrow({
    error,
  }: {
    error?: any,
  }): void {
    const lc = `${this.lc}[${this.finalizeAllSyncSagas_NoThrow.name}]`;
    try {
      const syncSagaInfos_NotComplete =
        Object.values(this.sagaInfoMap).filter(x => !x.complete);
      for (let i = 0; i < syncSagaInfos_NotComplete.length; i++) {
        const sagaInfo = syncSagaInfos_NotComplete[i];
        this.finalizeSyncSaga({sagaInfo, error});
      }
    } catch (error) {
      console.error(`${lc}(UNEXPECTED) ${error.message}`);
      // caller expects does NOT rethrow!
    } finally {
      this.sagaInfoMap = {};
      this._syncing = false;
      if (logalot) { console.log(`${lc} this._syncing is now false.`); }
    }
  }

  private async _createNewSyncSagaInfo({
    multiSpaceOpId,
    allIbGibsToSync,
    syncSpace: outerSpace,
    participants
  }: {
    multiSpaceOpId: string,
    allIbGibsToSync: IbGib_V1[],
    syncSpace: IbGibSpaceAny,
    participants: ParticipantInfo[],
  }): Promise<SyncSagaInfo> {
    const lc = `${this.lc}[${this._createNewSyncSagaInfo.name}]`;
    try {
      if (!multiSpaceOpId) { throw new Error(`multiSpaceOpId required. (E: a7e228dbd63948d784a67ddbb342e4f7)`); }

      // do the addrs outside of info initializer
      const syncAddrs_All = allIbGibsToSync.map(x => h.getIbGibAddr({ibGib: x}));
      const syncAddrs_All_WithTjps = allIbGibsToSync
        .filter(x => hasTjp({ibGib: x}))
        .map(x => h.getIbGibAddr({ibGib: x}));
      const syncAddrs_All_AreTjps = allIbGibsToSync
        .filter(x => x.gib !== GIB && x.data?.isTjp === true)
        .map(x => h.getIbGibAddr({ibGib: x}));
      const syncAddrs_All_WithoutTjps =
        syncAddrs_All.filter(addr => !syncAddrs_All_WithTjps.includes(addr));

      // do the info initializer
      const syncSagaInfo: SyncSagaInfo = {
        multiSpaceOpId,
        outerSpace,
        // spaceGib: syncSpace.gib,
        spaceId: outerSpace.data.uuid,
        sagaId: (await h.getUUID()).slice(0,24),
        participants,
        witnessFnArgsAndResults$: new ReplaySubject<SyncSpaceOptionsIbGib|SyncSpaceResultIbGib>(),

        syncStatus$: new ReplaySubject<SyncStatusIbGib>(),
        syncStatusSubscriptions: [],

        syncIbGibs_All: allIbGibsToSync,
        syncAddrs_All,
        syncAddrs_All_AreTjps,
        syncAddrs_All_WithTjps,
        syncAddrs_All_WithoutTjps,
        syncAddrs_Skipped: [],
        syncAddrs_ToDo: [],
        syncAddrs_InProgress: [],
        syncAddrs_Failed: [],
      };

      // return it
      return syncSagaInfo;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * this {@link IbGibsService} acts as the local app space intermediary,
   * a broker between the local space and the sync space(s). So this
   * function's job is to coordinate sending the given ibgibs
   * to a single sync space and return the observable (subject)
   * corresponding to the multi-step sync process.
   *
   * The caller will be responsible for coordinating among sync
   * space results and handling updates to local space ibgib's,
   * such as rebasing/updating/etc.
   *
   * @returns
   */
  private async _startSync({
    syncSagaInfo,
    watch,
    // confirm,
  }: {
    syncSagaInfo: SyncSagaInfo,
    watch?: boolean,
    /**
     * Will confirm via checking existence of ibgibs in sync space after
     * writing them.
     *
     * NOTE: IGNORED ATM
     */
    // confirm?: boolean,
  }): Promise<SyncSpaceResultIbGib> {
    const lc = `${this.lc}[${this._startSync.name}]`;
    try {
      const {
        multiSpaceOpId, participants, sagaId, outerSpace: syncSpace,
        syncIbGibs_All,
        syncAddrs_All, syncAddrs_All_WithTjps: syncAddrs_All_Tjps, syncAddrs_All_WithoutTjps: syncAddrs_All_NonTjps,
      } = syncSagaInfo;

      // first we want to get the ball rolling
      // we will get back an ibGib that we can use to track the progress of the
      // entire operation wrt this space.
      const localUserSpace = await this.getLocalUserSpace({});
      const argStartSync: SyncSpaceOptionsIbGib = await syncSpace.argy({
        argData: <SyncSpaceOptionsData>{
          cmd: 'put', cmdModifiers: watch ? ['sync', 'watch'] : ['sync'],
          sagaId,
          participants,
          ibGibAddrs: syncAddrs_All,
          ibGibAddrs_All_Tjps: syncAddrs_All_Tjps,
          ibGibAddrs_All_NonTjps: syncAddrs_All_NonTjps,
        },
        ibGibs: syncIbGibs_All, // do we need to do this yet?
        ibMetadata: `sync src ${localUserSpace.data.name} srcId ${localUserSpace.data.uuid}`,
      });
      argStartSync.syncSagaInfo = syncSagaInfo;

      // atow we only have one cycle. in the future, I think we will be having the possibility
      // of multiple cycles, which is why I have this structured as an observable
      // and not hard-coding a single arg/result in the saga info.
      syncSagaInfo.witnessFnArgsAndResults$.next(argStartSync);
      const resStartSync: SyncSpaceResultIbGib = await syncSpace.witness(argStartSync);
      if (!resStartSync.data?.statusTjpAddr) { throw new Error(`resStartSync.data.statusTjpAddr is falsy. sagaId: ${sagaId} (E: 727b5cc1a0254497bc6e06e9c6760564)`); }
      syncSagaInfo.witnessFnArgsAndResults$.next(resStartSync);

      // in our return, we can check for updates since our last communication.
      if (Object.keys(resStartSync.data.watchTjpUpdateMap ?? {}).length > 0) {
        if (logalot) { console.log(`${lc} resStartSync.data.watchTjpUpdateMap: ${h.pretty(resStartSync.data.watchTjpUpdateMap)}`); }
        await this.handleWatchTjpUpdates({
          outerSpace: syncSpace,
          updates: resStartSync.data.watchTjpUpdateMap
        });
      }

      // most of our handling will be in subscription to syncStatus$ updates.
      return resStartSync;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Coming in to this function, we have results from one or more
   * sync spaces. Here are the combinations of expected outcomes:
   *
   * 1. All success, each returns the exact same new ib^gib address(es).
   * 2. All success, but different spaces return different ib^gib address(es).
   * 3. Some success, which returns exact same new ib^gib, some error.
   * 4. Some success, more than one ib^gib address(es), some error.
   * 5. All error.
   *
   * For the first naive implementation, we will always be optimistic,
   * assuming that errors will be resolved with enough attempts. This
   * is closely related to our initial optimistic strategy of
   * "access is authorization" + "unordered dna equivalence". These
   * strategies mean that we are simply, optimistically, and
   * naively applying incoming dna transforms to ibgib timelines.
   * So failure should only result from a failure at the communication
   * layer, assuming non-adversarial conditions.
   *
   * ## future
   *
   * The handling of this should absolutely be generalized to the
   * requirements for interspatial relationships. This is the language
   * that must be implemented to deal with this in a dynamic fashion.
   *
   * This does not equate to only "ad hoc" in the sense of untested/untried.
   * This means that we have an "on-chain", public linked requirement
   * for consensus as opposed to a hard-coded consensus as is defined
   * in this function.
   *
   * It is in this generalization that byzantine resolution can be
   * achieved through whichever mechanism is correct for the use case.
   */
  private async _handleSagaUpdates(): Promise<void> {
    const lc = `${this.lc}[${this._handleSagaUpdates.name}]`;
    try {
      // at this point in execution, each space has returned the result ibgib
      // which has a syncStatus$ observable.

      const infos = Object.values(this.sagaInfoMap);
      for (let i = 0; i < infos.length; i++) {
        const sagaInfo = infos[i];

        let sub = sagaInfo.syncStatus$
          .pipe(
            concatMap(async (status: SyncStatusIbGib) => {
              if (logalot) { console.log(`${lc}(sagaId: ${sagaInfo.sagaId}) status received. ${status?.data?.statusCode ?? 'no status'}`)}
              await this._handleSyncStatusIbGib({status, sagaInfo});
              return status;
            })
          ).subscribe(
            (status: SyncStatusIbGib) => {
              if (logalot) { console.log(`${lc}(sagaId: ${sagaInfo.sagaId}) subscribe next triggered.`); }
            },
            async (error: string) => {
              const emsg = `${lc}(sagaId: ${sagaInfo.sagaId}) syncStatus$.error: ${error}`;
              console.error(emsg);
              await getFnAlert()({title: 'couldnt this.syncIbGibs...', msg: emsg});
            },
            /*complete*/ () => {
              if (logalot) { console.log(`${lc}(sagaId: ${sagaInfo.sagaId}) syncStatus$.complete.`); }
            }
          );
        // if (sagaInfo.syncStatusSubscriptions) { sagaInfo.syncStatusSubscriptions.push(sub); }
        if (!sagaInfo.syncStatusSubscriptions) { throw new Error(`sagaInfo.syncStatusSubscriptions array falsy? (E: f6d834beaa164c6ea1073d35b9fecd01)`)}
        sagaInfo.syncStatusSubscriptions.push(sub);
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  private async _handleSyncStatusIbGib({
    status,
    sagaInfo,
  }: {
    status: SyncStatusIbGib,
    sagaInfo: SyncSagaInfo,
  }): Promise<void> {
    const lc = `${this.lc}[${this._handleSyncStatusIbGib.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      // #region validate
      if (!status) { throw new Error(`falsy status. (E: 8da370a9f3df48a98cc08f1cccf5f2dc)`); }
      if (!status.data) { throw new Error(`falsy status.data. (E: 996d458c5cde4622ba1ed54c7e188815)`); }
      if (!status.data.statusCode) { throw new Error(`falsy status.data.statusCode (E: 7f2bec6b9dd0484eb7ef97966e6dd027)`); }
      // #endregion validate

      let resStoreStatusLocally =
        await this.put({ibGibs: status.statusIbGibGraph, isMeta: true});
      if (!resStoreStatusLocally.success) {
        // just log for now...the saving is supposed to the the log in the first place.
        console.error(`${lc}(UNEXPECTED) couldn't save status graph locally? sagaId: ${sagaInfo.sagaId} (E: b472101897824195b96b658c441dfb55)`);
      }
      const statusCode = status.data.statusCode;
      if (logalot) { console.log(`${lc} status update received. statusCode: ${statusCode}. sagaId: ${sagaInfo.sagaId}. spaceId: ${sagaInfo.spaceId}`); }

      switch (statusCode) {
        case StatusCode.started:
          // nothing to do on start? hmm...
          break;

        case StatusCode.inserted:
          // await this.handleSyncComplete_Inserted({sagaInfo, status});
          // nothing further to do? hmm...
          break;

        case StatusCode.updated:
          // await this.handleSyncComplete_Updated({sagaInfo, status});
          // nothing further to do? hmm...
          break;

        case StatusCode.merged_dna:
          await this.handleSyncStatus_Merged({status});
          break;

        case StatusCode.merged_state:
          await this.handleSyncStatus_Merged({status});
          break;

        case StatusCode.already_synced:
          // await this.handleSyncComplete_AlreadySynced({sagaInfo, status});
          // nothing further to do? hmm...
          break;

        case StatusCode.completed:
          await this.handleSyncStatus_Complete({sagaInfo});
          break;

        case StatusCode.undefined:
          // atow undefined is used in primitive status parentage
          throw new Error(`statusCode is "undefined". Maybe published a primitive? sagaId: ${sagaInfo.sagaId} (E: c98376f35b194adf9bf12ff9259a2569)`);

        default:
          // ?
          throw new Error(`(UNEXPECTED) unknown status.data.statusCode (${status.data.statusCode}). sagaId: ${sagaInfo.sagaId} (E: e4872abfc1ae4c27905793ca0f937a9b)`);
      }
      if (logalot) { console.log(`${lc} complete.`); }
    } catch (error) {
      const emsg = `${lc} ${error.message}`;
      console.error(emsg);
      sagaInfo.syncStatus$.error(emsg);
    }
  };

  private async handleSyncStatus_Merged({
    status,
  }: {
    status: SyncStatusIbGib,
  }): Promise<void> {
    const lc = `${this.lc}[${this.handleSyncStatus_Merged.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      // #region validate

      // not necessarily the case, if we only have changes on the store side, we apply no dna and create no side effects
      if ((status.createdIbGibs ?? []).length === 0 &&
          (status.storeOnlyIbGibs ?? []).length === 0
      ) { throw new Error('status.createdIbGibs and/or status.storeOnlyIbGibs required when merging. (E: d118bde47fb9434fa95d747f8e4f6b33)'); }

      if (Object.keys(status.ibGibsMergeMap ?? {}).length === 0) { throw new Error('status.ibGibsMergeMap required when merging. (E: 0f06238e5535408f8980e0f9f82cf564)'); }

      // #endregion validate

      if (logalot) { console.log(`${lc} validated.`); }

      // first, we will store the newly created ibgibs in the local space. Then
      // we want to rebase our local timeline to point to the new one. I believe
      // we can do this simply by registering the latest created ibgib which
      // will record it as the local latest ibgib in the tjp timeline. It may be
      // best to somehow tag the rebased ibgib, which would enable us to
      // optionally see this later without modifying the ibgib timeline by a
      // mut8 or rel8 function directly on the now-vestigial/abandoned timeline.

      // first, we will store the newly created ibgibs (if any) in the local space.
      // created ibgibs may not exist if only the sync space branch has changed.
      if (status.createdIbGibs?.length > 0) {
        if (logalot) { console.log(`${lc} putting createdIbGibs (${status.createdIbGibs.length}): ${status.createdIbGibs.map(x => h.getIbGibAddr({ibGib: x})).join('\n')}.`); }
        const resPutCreated = await this.put({ibGibs: status.createdIbGibs});
        if (!resPutCreated.success) { throw new Error(`Couldn't save created ibGibs locally? (E: f8bc91259c5043d589cd2e7ad2220c1f)`); }
      } else {
        if (logalot) { console.log(`${lc} no createdIbGibs`); }
      }
      if (status.storeOnlyIbGibs?.length > 0) {
        if (logalot) { console.log(`${lc} putting storeOnlyIbGibs (${status.storeOnlyIbGibs.length}): ${status.storeOnlyIbGibs.map(x => h.getIbGibAddr({ibGib: x})).join('\n')}.`); }
        const resPutStoreOnly = await this.put({ibGibs: status.storeOnlyIbGibs});
        if (!resPutStoreOnly.success) { throw new Error(`Couldn't save storeonly ibGibs locally? (E: c5ab044718ab42bba27f5852149b7ddc)`); }
      } else {
        if (logalot) { console.log(`${lc} no storeOnlyIbGibs`); }
      }

      // download any dependency ibgibs from the new latest ibgib that we don't have already.

      // register the new latest ibgib.
      // merge map goes from old latest addr -> latest ibGib that was the result of the merge.
      let newLatestIbGibs = Object.values(status.ibGibsMergeMap);
      for (let i = 0; i < newLatestIbGibs.length; i++) {
        const latestIbGib = newLatestIbGibs[i];
        if (logalot) { console.log(`${lc} registering latestIbGib in localUserSpace: ${h.getIbGibAddr({ibGib: latestIbGib})}`); }
        await this.registerNewIbGib({ibGib: latestIbGib});
      }
      if (logalot) { console.log(`${lc} complete.`); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  private async handleSyncStatus_Complete({
    sagaInfo,
  }: {
    sagaInfo: SyncSagaInfo,
  }): Promise<void> {
    const lc = `${this.lc}[${this.handleSyncStatus_Complete.name}]`;
    try {
      // cleanup just this saga, which corresponds to a single sync space.
      this.finalizeSyncSaga({sagaInfo});

      // if this is the last saga across all spaces, clean up the rest.
      const allSagaInfos = Object.values(this.sagaInfoMap);
      if (allSagaInfos.every(x => x.complete)) {
        this.finalizeAllSyncSagas_NoThrow({});
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.finalizeAllSyncSagas_NoThrow({error});
    }
  }

  /**
   * Searches through timelines and gets every single one of them
   * in the local space. (ideally)
   *
   * ## notes
   *
   * So if you pass in an ibgib with a reference to old ibgibs that
   * have not been updated to the latest, this will get those latest.
   *
   * @returns all ibgibs related to given ibgibs
   */
  private async _getAllIbGibsToSyncFromGraph({
    dependencyGraphIbGibs,
  }: {
    dependencyGraphIbGibs: IbGib_V1[],
  }): Promise<IbGib_V1[]> {
    const lc = `${this.lc}[${this._getAllIbGibsToSyncFromGraph.name}]`;
    try {

      // need to get the ibgibs with tjps,
      // then filter these to just the latest of given dependency graph ibgibs
      // then get the latest for each of these in the local space.
      let latestIbGibsWithTjps = await this._getLatestIbGibsWithTjps({ibGibs: dependencyGraphIbGibs});
      if (latestIbGibsWithTjps.length === 0) {
        // we have no ibgib timelines, so the incoming dependency graph is complete.
        return dependencyGraphIbGibs;
      }

      // An issue arises that each time we get updates to tjp ibgibs, then there is the
      // possibility of having additional tjps that weren't in the original graph.
      // So we need to call multiple times until we get the same number in as out.
      let latestIbGibsWithTjps_CHECK = await this._getLatestIbGibsWithTjps({ibGibs: latestIbGibsWithTjps});
      while (latestIbGibsWithTjps_CHECK.length > latestIbGibsWithTjps.length) {
        console.warn(`${lc} another tjp found. calling getLatestIbGibsWithTjps again to check for more. (W: 9735c4194d1243269d4fe4a4ed93cf59)`);
        latestIbGibsWithTjps = latestIbGibsWithTjps_CHECK;
        latestIbGibsWithTjps_CHECK = await this._getLatestIbGibsWithTjps({ibGibs: latestIbGibsWithTjps});
      }

      // at this point, we have all of the latest tjp ibgibs, but not their
      // dependency graphs. We need to get all dependencies from these and
      // combine them with our given dependency graph.

      // we're going to translate the given dependencyGraphIbGibs that we already have to
      // a map that `getDependencyGraph` understands so we don't waste time re-getting them.
      let allIbGibsToMergeMap: { [addr: string]: IbGib_V1 } = {};
      dependencyGraphIbGibs.forEach(x => { allIbGibsToMergeMap[h.getIbGibAddr(x)] = x; });

      // now we can combine both these latest ibGibs with the incoming ibgibs
      for (let i = 0; i < latestIbGibsWithTjps.length; i++) {
        const latestIbGibWithTjp = latestIbGibsWithTjps[i];
        // anything that we have in the incoming dependency
        // graph already has been fully traversed, so we put this in `gotten`
        allIbGibsToMergeMap = await this.getDependencyGraph({
          ibGib: latestIbGibWithTjp,
          gotten: allIbGibsToMergeMap
        });
      }

      const allIbGibsToMerge = Object.values(allIbGibsToMergeMap);

      return allIbGibsToMerge;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  private async _getLatestIbGibsWithTjps({
    ibGibs,
    warnIfMultipleLocalTimelines,
  }: {
    ibGibs: IbGib_V1[],
    /**
     * I've already written the code to check for this. But I think
     * this will be normal when put/merging.
     */
    warnIfMultipleLocalTimelines?: boolean,
  }): Promise<IbGib_V1[]> {
    const lc = `${this.lc}[${this._getLatestIbGibsWithTjps.name}]`;
    try {
      const result: IbGib_V1[] = [];
      const ibGibsWithTjp_Ungrouped = ibGibs.filter(x =>
        x.data?.isTjp || x.rel8ns?.tjp?.length > 0 || x.gib.includes(GIB_DELIMITER)
      );
      // group them by tjp
      const ibGibsWithTjp_GroupedByTjpGib =
        groupBy({items: ibGibsWithTjp_Ungrouped, keyFn: x => getGibInfo({gib: x.gib}).tjpGib});
      const tjpGibs = Object.keys(ibGibsWithTjp_GroupedByTjpGib);
      for (let i = 0; i < tjpGibs.length; i++) {
        const group = ibGibsWithTjp_GroupedByTjpGib[tjpGibs[i]];
        if (warnIfMultipleLocalTimelines) {
          // quick check to warn if we have multiple n's for a tjpGib (multi-timeline)
          let nCounts: { [key: number]: number } = {};
          for (const ibGibFrame of group) {
            let n = ibGibFrame.data.isTjp ? -1 : (ibGibFrame.data.n ?? -2);
            if (n === -2) { throw new Error(`ibGibFrame.data.n is undefined. We're only working with those with n right now!`); }
            nCounts[n] = (nCounts[n] ?? 0) + 1;
          }
          if (Object.values(nCounts).some(count => count > 1)) {
            console.warn(`${lc} we have multiple local timelines.`)
          }
        }

        // sort by n (ascending) and then grab the latest one
        const latestIbGibInGroup =
          group.sort((a, b) => a.data.n > b.data.n ? 1 : -1)[group.length-1];
        result.push(latestIbGibInGroup);

        // we're done
        return result;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  private async handleWatchTjpUpdates({
    updates,
    outerSpace,
  }: {
    updates: { [tjpAddr: string]: IbGibAddr; }
    outerSpace: IbGibSpaceAny,
  }): Promise<void> {
    const lc = `${this.lc}[${this.handleWatchTjpUpdates.name}]`;
    if (logalot) { console.log(`${lc} starting...`); }
    try {
      /**
       * compile list of addrs we have locally for all updates, so we don't try
       * to download them from outer space unnecessarily.
       */
      const latestAddrsLocallyWithUpdate: IbGibAddr[] = [];
      const tjpAddrs = Object.keys(updates);
      const latestAddrs_Store = Object.values(updates);
      for (let i = 0; i < tjpAddrs.length; i++) {
        const tjpAddr = tjpAddrs[i];
        if (logalot) { console.log(`${lc} tjpAddr: ${tjpAddr}`); }
        const latestAddrLocally = await this.getLatestAddr({tjpAddr});
        if (
          !latestAddrs_Store.includes(latestAddrLocally) &&
          !latestAddrsLocallyWithUpdate.includes(latestAddrLocally)
        ) {
          latestAddrsLocallyWithUpdate.push(latestAddrLocally);
        }
      }
      if (latestAddrsLocallyWithUpdate.length === 0) {
        if (logalot) { console.log(`${lc} latestAddrsLocallyWithUpdate.length === 0. We already had all of the updates locally perhaps. Returning early. (I: 844193c515084d0ebc348349f1ac41f4)`); }
        return; // <<<< returns early
      }

      /**
       * LOCAL dependencies for latest LOCAL addrs for all tjpAddrs in updates.
       */
      const localDependencyGraphs = await this.getDependencyGraph({
        ibGibAddrs: latestAddrsLocallyWithUpdate,
      });

      /** all addrs we already have locally */
      const addrsAlreadyStoredLocally = Object.keys(localDependencyGraphs);

      // get dependency graph from outer space, skipping all addrs in local already
      const newerAddrsFromOuterSpace: IbGibAddr[] = Object.values(updates);
      const newerIbGibDependencyGraphFromOuterSpace = await getDependencyGraph({
        ibGibAddrs: newerAddrsFromOuterSpace,
        space: outerSpace,
        skipAddrs: addrsAlreadyStoredLocally,
      });
      const newerIbGibsFromOuterSpace: IbGib_V1[] =
        Object.values(newerIbGibDependencyGraphFromOuterSpace);

      if (logalot) { console.log(`${lc} got ${newerIbGibsFromOuterSpace.length} ibGibs from outerspace`); }

      // save locally
      if (logalot) { console.log(`${lc} saving new ibgibs from outerspace in local space...`); }
      await this.put({ibGibs: newerIbGibsFromOuterSpace});

      // register the newest tjp ibGibs locally
      if (logalot) { console.log(`${lc} registering "new" updated tjp ibgibs locally...`); }
      for (let i = 0; i < tjpAddrs.length; i++) {
        const tjpAddr = tjpAddrs[i];
        const updatedAddr = updates[tjpAddr];
        const updatedIbGib = newerIbGibDependencyGraphFromOuterSpace[updatedAddr];
        if (!updatedIbGib) {
          debugger;
          throw new Error(`did not get updatedIbGib (${updatedAddr}) from outerspace (${outerSpace.data.uuid}) (E: 818de70f5b444a3ba198ba6480a15b04)`);
        }
        await this.registerNewIbGib({ibGib: updatedIbGib});
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // does not rethrow
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
