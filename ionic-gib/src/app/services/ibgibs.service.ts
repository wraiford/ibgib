import { Storage, Modals } from '@capacitor/core';
import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';

import { IbGib_V1, Rel8n, GIB } from 'ts-gib/dist/V1';
import { IbGibAddr, V1, Ib } from 'ts-gib';
import * as h from 'ts-gib/dist/helper';
import { Factory_V1 as factory } from 'ts-gib/dist/V1';
import { getIbGibAddr } from 'ts-gib/dist/helper';

import { FilesService } from './files.service';
import {
  TAG_REL8N_NAME, DEFAULT_ROOT_DESCRIPTION, DEFAULT_ROOT_ICON,
  ROOT_REL8N_NAME, DEFAULT_TAG_ICON, DEFAULT_TAG_DESCRIPTION,
  DEFAULT_ROOT_TEXT, DEFAULT_ROOT_REL8N_NAME,
} from '../common/constants';
import { TagData, SpecialIbGibType, RootData, LatestEventInfo } from '../common/types';
import { IonicSpaceOptionsData, IonicSpace_V1 } from '../common/spaces/ionic-space-v1';
import { argy_ } from '../common/witnesses';
import * as c from '../common/constants';


/**
 * All-purpose mega service (todo: which we'll need to break up!) to interact
 * with ibgibs at the app/device level.
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
 * it's like the birthday for an ibGib.
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
  private lc = `[${IbgibsService.name}]`;

  private _initializing: boolean;

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
  currentSpace: IonicSpace_V1;

  constructor(
    private files: FilesService,
  ) {

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
  async initializeSpaces(): Promise<void> {
    const lc = `${this.lc}[${this.initializeSpaces.name}]`;
    let defaultSpace: IonicSpace_V1;
    try {
      // we're going to use the default space first to find/load the actual user's space (if it exists)
      defaultSpace = new IonicSpace_V1(/*initialData*/ null, /*initialRel8ns*/ null);
      const result = await defaultSpace.witness(await argy_<IonicSpaceOptionsData>({
        argData: {
          cmd: 'get',
          ibGibAddrs: [c.BOOTSTRAP_SPACE_ADDR],
          isMeta: true,
        },
        timestamp: true,
      }));
      if (result?.data?.success) {
        // bootstrap space
        const bootstrapSpace = result!.ibGibs![0]!;
        if (await this.validateBootstrapSpace(bootstrapSpace)) {
          const userSpaceAddr = bootstrapSpace.rel8ns![c.BOOTSTRAP_USER_SPACE_REL8N_NAME][0];
          const resUserSpace = await defaultSpace.witness(await argy_<IonicSpaceOptionsData>({
            argData: {
              cmd: 'get',
              ibGibAddrs: [userSpaceAddr],
              isMeta: true,
            },
            timestamp: true,
          }));
          if (resUserSpace?.data?.success) {
            this.currentSpace = <IonicSpace_V1>resUserSpace.ibGibs[0];
          } else {
            throw new Error(`Could not load user space addr (${userSpaceAddr}) specified in bootstrap space (${c.BOOTSTRAP_SPACE_ADDR}).`);
          }
        } else {
          throw new Error(`Invalid bootstrap space. It should be a primitive ibGib with a single rel8n named "${c.BOOTSTRAP_USER_SPACE_REL8N_NAME}" with a single ibGib address.`);
        }
      } else {
        // bootstrap space ibgib not found, so first run probably for user.
        await this.createNewBootstrapSpace();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      console.error(`space.data: ${h.pretty(defaultSpace?.data)}`)
      throw error;
    }
  }

  private async validateBootstrapSpace(bootstrapSpace: IbGib_V1): Promise<boolean> {
    const lc = `${this.lc}[${this.validateBootstrapSpace.name}]`;
    const errors: string[] = [];
    try {
      let addr = getIbGibAddr({ibGib: bootstrapSpace});
      if (addr !== c.BOOTSTRAP_SPACE_ADDR) {
        errors.push(`invalid bootstrapSpace addr. Should equal "${c.BOOTSTRAP_SPACE_ADDR}"`);
      }
      if (Object.keys(bootstrapSpace.data || {}).length > 0) {
        errors.push(`invalid bootstrapSpace data. Data should be falsy/empty`);
      }
      if (Object.keys(bootstrapSpace.rel8ns || {}).length === 0) {
        errors.push(`invalid bootstrapSpace rel8ns (empty). Should have one rel8n, with rel8nName ${c.BOOTSTRAP_USER_SPACE_REL8N_NAME}`);
      }
      if (Object.keys(bootstrapSpace.rel8ns || {}).length > 1) {
        errors.push(`invalid bootstrapSpace rel8ns (more than 1). Should have only one rel8n, with rel8nName ${c.BOOTSTRAP_USER_SPACE_REL8N_NAME}`);
      }
      if (errors.length === 0) {
        return true;
      } else {
        console.error(`${lc} errors: ${errors.join('|')}`);
        return false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return false;
    }
  }

  private async createNewBootstrapSpace(): Promise<void> {
    const lc = `${this.lc}[${this.createNewBootstrapSpace.name}]`;
    try {
      let spaceName: string;
      const validateName: (name: string) => boolean = (name: string) => {
        const lcv = `${lc}[validateName]`;
        // non-falsy
        if (!name) {
          console.error(`${lcv} name is falsy`)
          return false;
        }

        // valid characters are alphanumerics, numbers, underscores, hyphens
        const regexOnlyIncluded = /[\w-]+/;
        const matchOnlyIncluded = name.match(regexOnlyIncluded);
        if (matchOnlyIncluded?.length !== 1 || matchOnlyIncluded[0].length !== name.length) {
          console.error(`${lcv} name can only contain letters, numbers, underscores, hyphens`);
          return false;
        }

        // start with alphanumeric
        const regexStart = /[a-zA-Z\d]/;
        const matchStart = name[0].match(regexStart);
        if (!matchStart) {
          console.error(`${lcv} name must start with a letter or number`);
          return false;
        }

        return true;
      }

      const promptName: () => Promise<void> = async () => {
        // create a new user space
        const resName = await Modals.prompt({title: 'Enter a Name...', message: `
        We need to create a space for you.

        Spaces are kinda like usernames, but they dont need to be unique.

        So enter a name for your space and choose OK to get started. Or if you just want a random bunch of letters, hit Cancel.`});

        if (resName.cancelled) {
          spaceName = 'space_' + (await h.getUUID()).slice(16);
        } else {
          if (resName.value && validateName(resName.value)) {
            spaceName = resName.value;
          }
        }
      };
      // create the bootstrap^gib space that points to user space
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets a value from "storage".
   *
   * This is actually getting from the current bootstrap
   *
   * @param key storage key
   * @returns value in storage if exists, else undefined
   */
  async storageGet({key}: {key: string}): Promise<string | undefined> {
    const lc = `${this.lc}[${this.storageGet.name}]`;
    try {
      const result = await Storage.get({key});
      if (result) {
        if (result!.value) {
          return result!.value;
        } else {
          throw new Error(`falsy result.value from Storage`);
        }
      } else {
        throw new Error(`falsy result from Storage`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }

  async storageSet({key, value}: {key: string, value: string}): Promise<void> {
    const lc = `${this.lc}[${this.storageSet.name}]`;
    try {
      await Storage.set({key, value});
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  private _currentRoot: IbGib_V1<RootData> | undefined;
  async getCurrentRoot(): Promise<IbGib_V1<RootData> | undefined> {
    if (this._currentRoot) { return this._currentRoot; }

    const lc = `${this.lc}[${this.getCurrentRoot.name}]`;
    try {
      const roots = await this.getSpecialIbgib({type: "roots"});
      if (!roots) { throw new Error(`Roots not initialized.`); }
      if (!roots.rel8ns) { throw new Error(`Roots not initialized properly. No rel8ns.`); }
      if (!roots.rel8ns.current) { throw new Error(`Roots not initialized properly. No current root.`); }
      if (roots.rel8ns.current.length === 0) { throw new Error(`Invalid Roots: empty current root rel8n.`); }
      if (roots.rel8ns.current.length > 1) { throw new Error(`Invalid Roots: multiple current roots selected.`); }

      const currentRootAddr = roots.rel8ns.current[0]!;
      const resCurrentRoot = await this.files.get({addr: currentRootAddr, isMeta: true});
      if (resCurrentRoot.ibGib) {
        return <IbGib_V1<RootData>>resCurrentRoot.ibGib;
      } else {
        throw new Error(`could not get current root. addr: ${currentRootAddr}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return undefined;
    }
  }
  async setCurrentRoot(root: IbGib_V1<RootData>): Promise<void> {
    const lc = `${this.lc}[${this.setCurrentRoot.name}]`;
    try {
      if (!root) { throw new Error(`root required.`); }
      const rootAddr = getIbGibAddr({ibGib: root});

      // get the roots and update its "current" rel8n
      const roots = await this.getSpecialIbgib({type: "roots"});
      if (!roots) { throw new Error(`Roots not initialized.`); }
      // if (!roots.rel8ns) { throw new Error(`Roots not initialized properly. No rel8ns.`); }
      // if (!roots.rel8ns.current) { throw new Error(`Roots not initialized properly. No current root.`); }
      // if (roots.rel8ns.current.length === 0) { throw new Error(`Invalid Roots: empty current root rel8n.`); }
      // if (roots.rel8ns.current.length > 1) { throw new Error(`Invalid Roots: multiple current roots selected.`); }

      // remove any existing current root value

      const rel8nsToRemoveByAddr = roots?.rel8ns?.current && roots?.rel8ns?.current.length > 0 ?
        { current: roots!.rel8ns!.current, } :
        undefined;
      const rel8nsToAddByAddr = { current: [rootAddr] };

      const resNewRoots = await V1.rel8({
        src: roots,
        dna: false,
        linkedRel8ns: ["past", "ancestor"],
        rel8nsToRemoveByAddr,
        rel8nsToAddByAddr,
        nCounter: true,
      });
      await this.files.persistTransformResult({isMeta: true, resTransform: resNewRoots});

      const storageKey = this.getSpecialStorageKey({type: "roots"});
      let newRootsAddr = getIbGibAddr({ibGib: resNewRoots.newIbGib});
      await this.storageSet({key: storageKey, value: newRootsAddr});

      this._currentRoot = root;

      // how to let others know roots has changed?
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  getSpecialIbgibIb({type}: {type: SpecialIbGibType}): Ib {
    return `meta special ${type}`;
  }

  getSpecialIbgibAddr({type}: {type: SpecialIbGibType}): string {
    const ib = this.getSpecialIbgibIb({type});
    return `${ib}^${GIB}`;
  }

  getSpecialStorageKey({type}: {type: SpecialIbGibType}): string {
    return `storage_key ${this.getSpecialIbgibAddr({type})}`;
  }

  async rel8ToCurrentRoot({
    ibGib,
    linked,
    rel8nName,
  }: {
    ibGib: IbGib_V1,
    linked?: boolean,
    rel8nName?: string,
  }): Promise<void> {
    const lc = `${this.lc}[${this.rel8ToCurrentRoot.name}]`;

    try {
      let currentRoot = await this.getCurrentRoot();
      if (!currentRoot) { throw new Error('currentRoot undefined'); }

      let ibGibAddr = getIbGibAddr({ibGib});

      // check to see if it's already rel8d. If so, we're done.
      // NOTE: (very) naive!
      if (currentRoot.rel8ns[rel8nName] &&
          currentRoot.rel8ns[rel8nName].includes(ibGibAddr)) {
        // already rel8d
        return;
      }

      rel8nName = rel8nName || DEFAULT_ROOT_REL8N_NAME;

      // we only need to add the ibgib itself to the root, not the tjp
      // and not any dependent ibgibs. ...wakka doodle.
      const resNewRoot = await V1.rel8({
        src: currentRoot,
        dna: false,
        linkedRel8ns: linked ? ["past", "ancestor", rel8nName] : ["past", "ancestor"],
        rel8nsToAddByAddr: { [rel8nName]: [ibGibAddr] },
        nCounter: true,
      });
      await this.files.persistTransformResult({isMeta: true, resTransform: resNewRoot});
      console.log(`${lc} updating _currentRoot root`);
      await this.setCurrentRoot(<IbGib_V1<RootData>>resNewRoot.newIbGib);

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
   * @see {@link initializeSpecial}
   * @see {@link initializeTags}
   */
  async getSpecialIbgib({
    type,
    initialize,
  }: {
    type: SpecialIbGibType,
    initialize?: boolean,
  }): Promise<IbGib_V1 | null> {
    const lc = `${this.lc}[${this.getSpecialIbgib.name}]`;
    try {
      let key = this.getSpecialStorageKey({type});
      let addr = await this.storageGet({key});
      if (!addr) {
        if (initialize && !this._initializing) {
          this._initializing = true;
          try {
            addr = await this.initializeSpecial({type});
          } catch (error) {
            console.error(`${lc} error initializing: ${error.message}`);
          } finally {
            this._initializing = false;
          }
        }
        if (!addr) { throw new Error(`Special address not in storage and couldn't initialize it either.`); }
      }
      console.log(`addr: ${addr}`);

      let resSpecial = await this.files.get({addr: addr, isMeta: true});
      if (!resSpecial.success) { throw new Error(resSpecial.errorMsg); }
      if (!resSpecial.ibGib) { throw new Error(`no ibGib in result`); }
      return resSpecial.ibGib
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return null;
    }
  }

  async initializeSpecial({
    type,
  }: {
    type: SpecialIbGibType,
  }): Promise<IbGibAddr | null> {
    const lc = `${this.lc}[${this.initializeSpecial.name}]`;
    try {
      switch (type) {
        case "tags":
          return this.initializeTags();

        case "roots":
          return this.initializeRoots();

        case "latest":
          return this.initializeLatest();

        default:
          throw new Error(`not implemented. type: ${type}`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  /**
   * Creates a new tags^gib instance (uniquely reified), as well as default initial
   * tags, e.g. "home", "favorites", etc., and relates these individual tags to
   * the tags ibGib itself.
   *
   * Stores the tags ibGib's addr in storage.
   */
  async initializeTags(): Promise<IbGibAddr | null> {
    const lc = `${this.lc}[${this.initializeTags.name}]`;
    try {
      const storageKey = this.getSpecialStorageKey({type: "tags"});
      const special = await this.initializeSpecialIbGib({type: "tags"});
      let addr = getIbGibAddr({ibGib: special});
      await this.storageSet({key: storageKey, value: addr});

      // at this point, our tags ibGib has no associated tag ibGibs.
      // add home, favorite tags
      const initialTagDatas: TagData[] = [
        { text: 'home', icon: 'home-outline' },
        { text: 'favorite', icon: 'heart-outline' },
      ];
      for (const data of initialTagDatas) {
        const resCreate = await this.createTagIbGib(data);
        addr = resCreate.newTagsAddr;
        await this.storageSet({key: storageKey, value: addr});
      }

      return addr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return null;
    }
  }

  // private async initializeNewTagsIbGib(): Promise<IbGib_V1> {
  //   const lc = `${this.lc}[${this.initializeNewTagsIbGib.name}]`;
  //   try {
  //     const tagsIb = this.getSpecialIbgibIb({type: "tags"});
  //     const src = factory.primitive({ib: tagsIb });
  //     const resNewTags = await V1.fork({
  //       src,
  //       destIb: tagsIb,
  //       linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
  //       tjp: { uuid: true, timestamp: true },
  //       dna: true,
  //       nCounter: true,
  //     });
  //     await this.files.persistTransformResult({
  //       resTransform: resNewTags,
  //       isMeta: true
  //     });
  //     await this.rel8ToCurrentRoot({ibGib: resNewTags.newIbGib, linked: true});
    //     await this.common.ibgibs.registerNewIbGib({ibGib: result.newIbGib});
  //     return resNewTags.newIbGib;
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   }
  // }

  async initializeRoots(): Promise<IbGibAddr | null> {
    const lc = `${this.lc}[${this.initializeRoots.name}]`;
    try {
      const storageKey = this.getSpecialStorageKey({type: "roots"});
      const special = await this.initializeSpecialIbGib({type: "roots"});
      let specialAddr = getIbGibAddr({ibGib: special});
      await this.storageSet({key: storageKey, value: specialAddr});

      // at this point, our tags ibGib has no associated tag ibGibs.
      // add home, favorite tags
      const rootNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

      let firstRoot: IbGib_V1<RootData> = null;
      const initialDatas: RootData[] = rootNames.map(n => {
        return {
          text: `${n}root`,
          icon: DEFAULT_ROOT_ICON,
          description: DEFAULT_ROOT_DESCRIPTION
        };
      });
      for (const data of initialDatas) {
        const resCreate = await this.createRootIbGib(data);
        if (!firstRoot) { firstRoot = resCreate.newRootIbGib; }
        specialAddr = resCreate.newRootsAddr;
        // update the storage for the updated **roots** ibgib.
        // that roots ibgib is what points to the just created new root.
        await this.storageSet({key: storageKey, value: specialAddr});
      }

      // initialize current root
      await this.setCurrentRoot(firstRoot);
      // hack: the above line updates the roots in storage. so get **that** addr.

      specialAddr = await this.storageGet({key: storageKey});

      if (!specialAddr) { throw new Error('no roots address in storage?'); }

      return specialAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return null;
    }
  }

  async initializeLatest(): Promise<IbGibAddr | null> {
    const lc = `${this.lc}[${this.initializeLatest.name}]`;
    try {
      const storageKey = this.getSpecialStorageKey({type: "latest"});
      const special =
        await this.initializeSpecialIbGib({type: "latest", skipRel8ToRoot: true});
      let specialAddr = getIbGibAddr({ibGib: special});
      await this.storageSet({key: storageKey, value: specialAddr});

      // right now, the latest ibgib doesn't have any more initialization,
      // since it is supposed to be as ephemeral and non-tracked as possible.

      return specialAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return null;
    }
  }

  // private async initializeNewRootsIbGib(): Promise<IbGib_V1> {
  //   const lc = `${this.lc}[${this.initializeNewRootsIbGib.name}]`;
  //   try {
  //     const specialIb = this.getSpecialIbgibIb({type: "roots"});
  //     const src = factory.primitive({ib: specialIb});
  //     const resNewTags = await V1.fork({
  //       src,
  //       destIb: specialIb,
  //       linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
  //       tjp: { uuid: true, timestamp: true },
  //       dna: true,
  //       nCounter: true,
  //     });
  //     await this.files.persistTransformResult({
  //       resTransform: resNewTags,
  //       isMeta: true
  //     });
  //     await this.rel8ToCurrentRoot({ibGib: resNewTags.newIbGib, linked: true});
    //     await this.common.ibgibs.registerNewIbGib({ibGib: result.newIbGib});
  //     return resNewTags.newIbGib;
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   }
  // }

  async initializeSpecialIbGib({
    type,
    skipRel8ToRoot,
  }: {
    type: SpecialIbGibType,
    skipRel8ToRoot?: boolean,
  }): Promise<IbGib_V1> {
    const lc = `${this.lc}[${this.initializeSpecialIbGib.name}]`;
    try {
      const specialIb = this.getSpecialIbgibIb({type});
      const src = factory.primitive({ib: specialIb});
      const resNewSpecial = await V1.fork({
        src,
        destIb: specialIb,
        linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
        tjp: { uuid: true, timestamp: true },
        dna: false,
        nCounter: true,
      });
      await this.files.persistTransformResult({
        resTransform: resNewSpecial,
        isMeta: true
      });
      if (type !== 'roots' && !skipRel8ToRoot) {
        await this.rel8ToCurrentRoot({ibGib: resNewSpecial.newIbGib, linked: true});
      }
      return resNewSpecial.newIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Tags for this app have the form: tag [tagText]
   *
   * @param tagText e.g. "Favorites"
   *
   * @example
   * For the Favorites tag, the ib would be "tag Favorites"
   */
  tagTextToIb(tagText: string): string {
    const lc = `${this.lc}[${this.tagTextToIb.name}]`;
    if (!tagText) { throw new Error(`${lc} tag required.`)}
    return `tag ${tagText}`;
  }

  async createTagIbGib({
    text,
    icon,
    description,
  }: TagData): Promise<{newTagIbGib: IbGib_V1, newTagsAddr: string}> {
    const lc = `${this.lc}[${this.createTagIbGib.name}]`;
    try {
      if (!text) { throw new Error(`${lc} text required`); }
      icon = icon || DEFAULT_TAG_ICON;
      description = description || DEFAULT_TAG_DESCRIPTION;
      const tagIb = this.tagTextToIb(text);
      const tagPrimitive = factory.primitive({ib: "tag"});
      const resNewTag = await factory.firstGen({
        parentIbGib: tagPrimitive,
        ib: tagIb,
        data: { text, icon, description },
        linkedRel8ns: [ Rel8n.past, Rel8n.ancestor ],
        tjp: { uuid: true, timestamp: true },
        dna: true,
        nCounter: true,
      });
      const { newIbGib: newTag } = resNewTag;
      await this.files.persistTransformResult({resTransform: resNewTag, isMeta: true});
      await this.registerNewIbGib({ibGib: newTag});
      const newTagsAddr = await this.rel8TagToTagsIbGib(newTag);
      return { newTagIbGib: newTag, newTagsAddr };
    } catch (error) {
      console.log(`${lc} ${error.message}`);
      throw error;
    }
  }

  async createRootIbGib({
    text,
    icon,
    description,
  }: RootData): Promise<{newRootIbGib: IbGib_V1<RootData>, newRootsAddr: string}> {
    const lc = `${this.lc}[${this.createRootIbGib.name}]`;
    try {
      text = text || DEFAULT_ROOT_TEXT;
      icon = icon || DEFAULT_ROOT_ICON;
      description = description || DEFAULT_ROOT_DESCRIPTION;
      const ib = this.rootTextToIb(text);
      const parentIbGib = factory.primitive({ib: "root"});
      const resNewIbGib = await factory.firstGen({
        parentIbGib,
        ib,
        data: { text, icon, description },
        linkedRel8ns: [ Rel8n.past, Rel8n.ancestor ],
        tjp: { uuid: true, timestamp: true },
        dna: true,
      });
      const { newIbGib } = resNewIbGib;
      await this.files.persistTransformResult({resTransform: resNewIbGib, isMeta: true});
      const newRootsAddr = await this.rel8ToSpecialIbGib({
        type: "roots",
        rel8nName: ROOT_REL8N_NAME,
        ibGibToRel8: newIbGib,
        // isMeta: true,
      });
      return { newRootIbGib: <IbGib_V1<RootData>>newIbGib, newRootsAddr };
    } catch (error) {
      console.log(`${lc} ${error.message}`);
      throw error;
    }
  }

  rootTextToIb(text: string): string {
    const lc = `${this.lc}[${this.rootTextToIb.name}]`;
    if (!text) { throw new Error(`${lc} text required.`)}
    return `root ${text}`;
  }

  /**
   * Relates the given tag to the TagsIbGib, saves the generated
   * TagsIbGib and updates the settings to point to the new TagsIbGib.
   *
   * @param tagIbGib to add to Tags
   */
  rel8TagToTagsIbGib(tagIbGib: IbGib_V1): Promise<IbGibAddr> {
    return this.rel8ToSpecialIbGib({
      type: "tags",
      rel8nName: TAG_REL8N_NAME,
      ibGibToRel8: tagIbGib,
      // isMeta: true,
    });
  }

  async rel8ToSpecialIbGib({
    type,
    rel8nName,
    ibGibToRel8,
    // isMeta,
    linked,
    skipRel8ToRoot,
    severPast,
    deletePreviousSpecialIbGib,
  }: {
    type: SpecialIbGibType,
    rel8nName: string,
    ibGibToRel8: IbGib_V1,
    // isMeta: boolean,
    linked?: boolean,
    skipRel8ToRoot?: boolean,
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
  }): Promise<IbGibAddr> {
    const lc = `${this.lc}[${this.rel8ToSpecialIbGib.name}][{type: ${type}, rel8nName: ${rel8nName}]`;
    try {
      const newAddr = getIbGibAddr({ibGib: ibGibToRel8});

      // get the special ibgib
      const storageKey = this.getSpecialStorageKey({type});
      let specialAddr = await this.storageGet({key: storageKey});
      if (!specialAddr) { throw new Error(`addr not found`) };
      let resGetSpecial = await this.files.get({addr: specialAddr, isMeta: true});
      if (!resGetSpecial.success) { throw new Error(`couldn't get special`) }
      if (!resGetSpecial.ibGib) { throw new Error(`resGetSpecial.ibGib falsy`) }

      // rel8 the new tag to the special ibgib.
      const resNewSpecial = await V1.rel8({
        src: resGetSpecial.ibGib!,
        rel8nsToAddByAddr: { [rel8nName]: [newAddr] },
        dna: false,
        linkedRel8ns: linked ? [Rel8n.past, rel8nName] : [Rel8n.past],
        nCounter: true,
      });

      if (severPast) { resNewSpecial.newIbGib.rel8ns.past = []; }

      if (resNewSpecial.intermediateIbGibs) {
        throw new Error('new special creates intermediate ibgibs. so severing past is harder.');
      }

      // persist
      await this.files.persistTransformResult({resTransform: resNewSpecial, isMeta: true});

      // rel8 the new special ibgib to the root, but only if it's not a root itself.
      if (type !== 'roots' && !skipRel8ToRoot) {
        await this.rel8ToCurrentRoot({ibGib: resNewSpecial.newIbGib, linked: true});
      }

      // return the new special address (not the incoming new ibGib)
      const { newIbGib: newSpecialIbGib } = resNewSpecial;
      let newSpecialAddr = getIbGibAddr({ibGib: newSpecialIbGib});

      await this.storageSet({key: storageKey, value: newSpecialAddr});

      // delete if required, only after updating storage with the new special addr.
      if (deletePreviousSpecialIbGib) {
        await this.files.delete({addr: specialAddr, isMeta: true});
      }

      return newSpecialAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Returns true if the given {@param ibGib} is the temporal junction
   * point for a given ibGib timeline.
   */
  async isTjp_Naive({
    ibGib,
    naive = true,
  }: {
    ibGib: IbGib_V1<any>,
    naive?: boolean,
  }): Promise<boolean> {
    const lc = `${this.lc}[${this.isTjp_Naive.name}]`;
    try {
      if (!ibGib) { throw new Error('ibGib required.'); }
      if (naive) {
        if (ibGib.data) {
          if (ibGib.data!.isTjp) { return true; }
          if (!ibGib.rel8ns) { throw new Error('ibGib.rel8ns required.'); }
          if (ibGib.rel8ns.past && ibGib.rel8ns.past.length > 0) { return false; }
          if (ibGib.rel8ns.past && ibGib.rel8ns.past.length === 0) { return true; }
          return false;
        } else {
          throw new Error('loaded ibGib required (data).');
        }
      } else {
        throw new Error('only naive implemented right now.');
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async getTjp({
    ibGib,
    naive = true,
  }: {
    ibGib: IbGib_V1<any>,
    naive?: boolean,
  }): Promise<IbGib_V1<any>> {
    const lc = `${this.lc}[${this.isTjp_Naive.name}]`;

    try {
      if (!ibGib) { throw new Error('ibGib required.'); }
      let isTjp = await this.isTjp_Naive({ibGib, naive});
      if (isTjp) { return ibGib; }

      // the given ibGib arg isn't itself the tjp
      if (!ibGib.rel8ns) { throw new Error('ibGib.rel8ns required.'); }

      if (ibGib.rel8ns!.tjp && ibGib.rel8ns!.tjp.length > 0) {
        let firstTjpAddr = ibGib.rel8ns!.tjp[0];
        let resGetTjpIbGib = await this.files.get({addr: firstTjpAddr});
        if (resGetTjpIbGib.success) { return resGetTjpIbGib.ibGib }
      }

      // couldn't get the tjp from the rel8ns.tjp, so look for manually in past.
      // but we can't just get the earliest in the 'past', because the tjp
      // may be one of the intermediates!
      // So, check the immediate past ibGib recursively.

      let past = ibGib.rel8ns.past || [];
      if (past.length === 0) {
        console.warn(`${lc} past.length === 0, but assumption atow is that code wouldnt reach here if that were the case.`)
        return ibGib;
      }
      let pastIbGibAddr = past[past.length-1];
      let resGetPastIbGib = await this.files.get({addr: pastIbGibAddr});
      let pastIbGib = resGetPastIbGib.ibGib;

      // call this method recursively!
      return await this.getTjp({ibGib: pastIbGib, naive});
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
  }: {
    ibGib: IbGib_V1,
  }): Promise<void> {
    let lc = `${this.lc}[${this.registerNewIbGib.name}]`;
    try {
      const ibGibAddr: IbGibAddr = getIbGibAddr({ibGib});
      lc = `${lc}[${ibGibAddr}]`;

      console.log(`${lc} starting...`);

      // this is the latest index ibGib. It's just the mapping of tjp -> latestAddr.
      // Other refs to "latest" in this function
      // will refer to the actual/attempted latest of the ibGib arg.
      let specialLatest = await this.getSpecialIbgib({type: "latest"});
      if (!specialLatest.rel8ns) { specialLatest.rel8ns = {}; }

      // get the tjp for the rel8nName mapping, and also for some checking logic
      let tjp = await this.getTjp({ibGib});
      if (!tjp) {
        console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself.`);
        tjp = ibGib;
      }
      let tjpAddr = getIbGibAddr({ibGib: tjp});

      // either we're adding the given ibGib, replacing the existing with the ibGib,
      // or doing nothing. We can do this with our current vars in a closure at this point.
      const replaceLatest: () => Promise<void> = async () => {
        console.log(`${lc} adding/replacing latest. tjp: ${tjpAddr}`);
        await this.rel8ToSpecialIbGib({
          type: "latest",
          rel8nName: tjpAddr,
          ibGibToRel8: ibGib,
          linked: true, // this ensures only one latest ibGib mapped at a time
          deletePreviousSpecialIbGib: true, // the latest mapping is ephemeral
          severPast: true,
          skipRel8ToRoot: true,
        });
        this._latestSubj.next({tjpAddr, latestAddr: ibGibAddr, latestIbGib: ibGib});
      }

      let existingMapping = specialLatest.rel8ns[tjpAddr] || [];
      if (existingMapping.length > 0) {
        console.log(`${lc} tjp mapping exists. Checking which is newer.`)
        let existingLatestAddr = existingMapping[0];
        let resExistingLatest = await this.files.get({addr: existingLatestAddr});
        if (!resExistingLatest.success || !resExistingLatest.ibGib) {
          if (
            this.alwaysReplaceLatestNotFound ||
            await this.promptReplaceLatest({existingLatestAddr, ibGibAddr})
          ) {
            console.error(`Didn't find existing latest ibGib (${existingLatestAddr}). I haven't implemented more robust multi-node/distributed strategies for this scenario yet. User chose YES to replace.`);
            await replaceLatest();
            return;
          } else {
            console.error(`Didn't find existing latest ibGib (${existingLatestAddr}). I haven't implemented more robust multi-node/distributed strategies for this scenario yet. User chose NO DON'T replace.`);
            return;
          }
        }

        let existingLatest = resExistingLatest.ibGib!;

        // if there is an nCounter, then we can go by that. Otherwise, we'll have to
        // brute force it.
        const ibGibHasNCounter =
          ibGib.data?.n &&
          typeof ibGib.data!.n! === 'number' &&
          ibGib.data!.n! >= 0;
        if (ibGibHasNCounter) {
          // #region ibGib.data.n counter method
          console.log(`found ibGib.data.n (version counter), using this to determine latest ibGib: ${ibGib.data!.n!}`);
          const n_ibGib = <number>ibGib.data!.n!;

          const existingLatestHasNCounter =
            existingLatest.data?.n &&
            typeof existingLatest.data!.n! === 'number' &&
            existingLatest.data!.n! >= 0;

          if (existingLatestHasNCounter) {
            // both have counters, so compare by those.
            const n_existingLatest = <number>existingLatest.data!.n!;
            if (n_ibGib > n_existingLatest) {
              // is newer
              await replaceLatest();
            } else {
              // is not newer, so we don't need to do anything else.
              return;
            }
          } else {
            // only the new one has the counter, so that wins by default
            await replaceLatest();
          }
          // #endregion

        } else {
          console.log(`${lc} no nCounter found. Trying brute force method.`);
          // #region brute force latest
          let latestAddr = await this.getLatestAddr_Brute({
            ibGib, ibGibAddr,
            existingLatest, existingLatestAddr,
            tjpAddr
          });
          if (latestAddr === ibGibAddr) {
            await replaceLatest();
          } else {
            return;
          }
          // #endregion
        }
      } else {
        // no existing mapping, so go ahead and add.
        console.log(`${lc} no existing tjp mapping. ${tjpAddr} -> ${ibGibAddr}`);
        await replaceLatest();
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      console.log(`${lc} complete.`);
    }
  }

  private async promptReplaceLatest({
    existingLatestAddr,
    ibGibAddr,
  }: {
    existingLatestAddr: IbGibAddr,
    ibGibAddr: IbGibAddr,
  }): Promise<boolean> {
    const lc = `${this.lc}[${this.promptReplaceLatest.name}]`;
    try {
      let resReplace = await Modals.confirm({
        title: `Can't find ibGib data...`,
        message:
          `
            Can't find the ibGib locally for latest address: ${existingLatestAddr}.
            Do you want to replace it and point to the new address?

            Existing "latest" address for which we don't have the corresponding record (locally): ${existingLatestAddr}

            "New" Address that we do have: ${ibGibAddr}

            Yes, replace:
              Will replace the local reference on this device to point to the "new" address.

            No, keep old:
              Will NOT replace but I don't know how it will work going forward.
              The ibGib may be frozen in time until we load that record and things may get out of sync.
          `,
          okButtonTitle: 'Yes, replace',
          cancelButtonTitle: 'No, keep old',
      });
      if (resReplace.value) {
        //
        let resAlwaysReplace = await Modals.confirm({
          title: `Always replace?`,
          message: `Do want to always replace address not found locally? This applies only to this session.`,
          okButtonTitle: 'Yes, always replace',
          cancelButtonTitle: 'No, ask me every time',
        });
        if (resAlwaysReplace.value) {
          console.warn(`${lc} user chose YES, always replace latest not found for this session.`);
          this.alwaysReplaceLatestNotFound = true;
        }
        return true;
      } else {
        // don't do nuffin'
        return false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return false;
    }
  }

  // async isLatest({ibGib}: {ibGib: IbGib_V1}): Promise<boolean> {
  //   const lc = `${this.lc}[${this.isLatest.name}]`;
  //   try {

  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   }
  // }

  /**
   * We are NOT searching through all of our data looking for a needle in a haystack.
   * What we ARE doing is we are looking through the past of the existing latest and
   * the prospective latest (the given ibGib param) and comparing between the two.
   *
   * Since `past` rel8n is usually a linked rel8n now, we may have to traverse it all
   * the way to its beginning for each possibility.
   *
   * @returns either {@param ibGibAddr} or {@param existingLatestAddr}
   */
  private async getLatestAddr_Brute({
    ibGib, ibGibAddr,
    existingLatest, existingLatestAddr,
    tjpAddr,
  }: {
    ibGib: IbGib_V1<any>, ibGibAddr: string,
    existingLatest: IbGib_V1<any>, existingLatestAddr: string,
    tjpAddr: string,
  }): Promise<string> {
    const lc = `${this.lc}[${this.getLatestAddr_Brute.name}][${ibGibAddr}]`;
    try {
      console.log(`${lc} starting...`);
      // no nCounter, so we need to brute force.
      // The easiest way is to check each's past, as the most common
      // scenario would be registering a newer one, or less likely, a timing issue
      // with registering a previous ibGib frame.

      let ibGibPast = ibGib.rel8ns?.past || [];
      let existingLatestPast = existingLatest.rel8ns?.past || [];

      // going to check a bunch of specific, easy cases to narrow things down.

      if (ibGibPast.length === 1 && existingLatestPast.length === 0) {
        console.log(`prospective has a past, so it "must" be newer. (won't quote "must" anymore)`);
        return ibGibAddr;
      } else if (existingLatestPast.length === 1 && ibGibPast.length === 0) {
        console.log(`existing has a past, so it must be newer.`);
        return existingLatestAddr;
      } else if (existingLatestPast.length === 0 && ibGibPast.length === 0) {
        console.warn(`${lc} neither existing latest nor prospective new ibGib has a past, so keeping existing.`);
        return existingLatestAddr;
      } else if (existingLatestPast.includes(ibGibAddr)) {
        console.log(`existing by definition is newer`);
        return existingLatestAddr;
      } else if (ibGibPast.includes(existingLatestAddr)) {
        console.log(`ibGib by definition is newer`);
        return ibGibAddr;
      } else if (existingLatestAddr === ibGibAddr) {
        console.log(`they're the same!`);
        return existingLatestAddr;
      } else if (existingLatestAddr === tjpAddr && existingLatest.rel8ns?.tjp?.length === 1) {
        console.log(`ibGib must be newer because the existingLatestAddr is the tjp, which is by definition first in unique past.`);
        return ibGibAddr;
      } else if (ibGibAddr === tjpAddr && ibGib.rel8ns?.tjp?.length === 1) {
        console.log(`existing must be newer because the ibGibAddr is the tjp, which is by definition first in unique past.`);
        return existingLatestAddr;
      }

      // well, neither one really gives us any indicator alone
      // so load each one in the past
      console.log(`${lc} brute forcing through iterating the pasts.`);
      let newerAddr: string | undefined;
      let firstIterationCount = -1; // klugy hack, but is an ugly method anyway (brute after all!)

      let getPastCount: (x: IbGib_V1<any>, n: number, otherAddr: string) => Promise<number> =
        async (x, n, otherAddr) => {
          let xPast = x.rel8ns?.past || [];
          if (xPast.includes(otherAddr)) {
            // no need to proceed further, since the other is found in the past of x, so x is newer
            newerAddr = getIbGibAddr({ibGib: x});
            return -1;
          }
          if (xPast.length === 0) { return n; } // no more past to increment
          let newCount = n + xPast.length;
          if (firstIterationCount !== -1 && newCount > firstIterationCount) {
            // we've determined that the second iteration has a longer past,
            // so we don't need to look further
            newerAddr = getIbGibAddr({ibGib: x});
            return -1;
          }
          // load up the earliest one and call recursively
          let resNextX = await this.files.get({addr: xPast[0]});
          if (!resNextX.success || !resNextX.ibGib) {
            throw new Error(`Couldn't load past addr (xPast[0]): ${xPast[0]}`);
          }
          return getPastCount(resNextX.ibGib, n + xPast.length, otherAddr);
        }

      console.log(`${lc} doing ibGibPastCount`);
      let ibGibPastCount = await getPastCount(ibGib, 0, existingLatestAddr);
      if (newerAddr) { return newerAddr; }

      // we didn't hit upon it, so set the firstIterationCount so we don't spend unnecessary cycles
      console.log(`${lc} Doing existingPastCount`);
      firstIterationCount = ibGibPastCount;
      let existingPastCount = await getPastCount(existingLatest, 0, ibGibAddr);
      if (newerAddr) { return newerAddr; }

      // we didn't yet determine it, so whichever has the longer past is newer
      if (ibGibPastCount > existingPastCount) {
        console.log(`${lc} ibGibPastCount (${ibGibPastCount}) is longer than existingPastCount (${existingPastCount}), so ibGib is newer.`);
        newerAddr = ibGibAddr;
      } else {
        console.log(`${lc} existingPastCount (${existingPastCount}) is longer than ibGibPastCount (${ibGibPastCount}), so ibGib is newer.`);
        newerAddr = existingLatestAddr;
      }
      return newerAddr;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      console.log(`${lc} complete.`);
    }
  }

  /**
   * Will trigger a latest info event to be fired.
   * @param param0
   */
  async pingLatest({
    ibGib,
    tjp,
  }: {
    ibGib: IbGib_V1<any>,
    tjp: IbGib_V1<any>
  }): Promise<void> {
    let lc = `${this.lc}[${this.pingLatest.name}]`;
    console.log(`${lc} starting...`);
    try {
      let latestAddr = await this.getLatestAddr({ibGib, tjp});
      let ibGibAddr = getIbGibAddr({ibGib});

      // // get the tjp for the rel8nName mapping, and also for some checking logic
      if (!tjp) {
        tjp = await this.getTjp({ibGib});
        if (!tjp) {
          console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself.`);
          tjp = ibGib;
        }
      }
      let tjpAddr = getIbGibAddr({ibGib: tjp});

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
        let resLatestIbGib = await this.files.get({addr: latestAddr});
        if (!resLatestIbGib.success || !resLatestIbGib.ibGib) {
          throw new Error('latest not found');
        }
        let latestIbGib = resLatestIbGib.ibGib;
        this._latestSubj.next({
          latestIbGib,
          latestAddr,
          tjpAddr
        });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      console.log(`${lc} complete.`);
    }
  }

  async getLatestAddr({
    ibGib,
    tjp,
  }: {
    ibGib: IbGib_V1<any>,
    tjp?: IbGib_V1<any>,
  }): Promise<IbGibAddr> {
    let lc = `${this.lc}[${this.getLatestAddr.name}]`;
    console.log(`${lc} starting...`);
    try {
      let ibGibAddr = getIbGibAddr({ibGib});
      let specialLatest = await this.getSpecialIbgib({type: "latest"});
      if (!specialLatest.rel8ns) { specialLatest.rel8ns = {}; }

      // get the tjp for the rel8nName mapping, and also for some checking logic
      console.log(`${lc} tjp: ${JSON.stringify(tjp)}`);
      if (!tjp) {
        tjp = await this.getTjp({ibGib});
        if (!tjp) {
          console.warn(`${lc} tjp not found for ${ibGibAddr}? Should at least just be the ibGib's address itself.`);
          tjp = ibGib;
        }
      }
      let tjpAddr = getIbGibAddr({ibGib: tjp});
      console.log(`${lc} tjp (${tjpAddr})...`);

      console.log(`${lc} specialLatest addr: ${getIbGibAddr({ibGib: specialLatest})}`);
      let latestAddr = specialLatest.rel8ns[tjpAddr]?.length > 0 ?
        specialLatest.rel8ns[tjpAddr][0] :
        ibGibAddr;
      return latestAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      console.log(`${lc} complete.`);
    }
  }

}
