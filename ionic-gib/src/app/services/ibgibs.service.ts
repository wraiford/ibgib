import { Injectable } from '@angular/core';
import { IbGib_V1, Rel8n, GIB } from 'ts-gib/dist/V1';
import { IbGibAddr, V1, Ib } from 'ts-gib';
import { Storage } from '@capacitor/core';
import { FilesService } from './files.service';
import { 
  TAG_REL8N_NAME, DEFAULT_ROOT_DESCRIPTION, DEFAULT_ROOT_ICON, 
  ROOT_REL8N_NAME, DEFAULT_TAG_ICON, DEFAULT_TAG_DESCRIPTION, 
  DEFAULT_ROOT_TEXT, DEFAULT_ROOT_REL8N_NAME,
} from '../common/constants';
import { Factory_V1 as factory } from 'ts-gib/dist/V1';
import { getIbGibAddr } from 'ts-gib/dist/helper';
import { TagData, SpecialIbGibType, RootData } from '../common/types';
// import { IbGibWitnessScheduler } from 'keystone-gib/src/V1/witnesses/scheduler';
// import { InMemoryRepo } from 'keystone-gib/src/V1/witnesses/in-memory-repo';

/**
 * Get/update/work with special ibgibs, such as the current root, tags, etc.
 */
@Injectable({
  providedIn: 'root'
})
export class IbgibsService {
  private lc = `[${IbgibsService.name}]`;

  private _initializing: boolean;

  constructor(
    private files: FilesService,
  ) { }

  // private _inMemoryRepo = new InMemoryRepo(/*includeAddrs*/ false, /*optimisticPut*/ true);
  /**
   * Primary scheduler (execution loop) for this service. When it witnesses
   * any ibGib, it adds it to the list of 
   */
  // private _scheduler = new IbGibWitnessScheduler(this._inMemoryRepo);

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
      await Storage.set({key: storageKey, value: newRootsAddr});

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
      if (!currentRoot) { 
        throw new Error('currentRoot undefined'); 
      }

      let ibGibAddr = getIbGibAddr({ibGib});

      // check to see if it's already rel8d. If so, we're done.
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
      let addr = (await Storage.get({key}))?.value;
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
      await Storage.set({key: storageKey, value: addr});

      // at this point, our tags ibGib has no associated tag ibGibs.
      // add home, favorite tags
      const initialTagDatas: TagData[] = [
        { text: 'home', icon: 'home-outline' },
        { text: 'favorite', icon: 'heart-outline' },
      ];
      for (const data of initialTagDatas) {
        const resCreate = await this.createTagIbGib(data);
        addr = resCreate.newTagsAddr;
        await Storage.set({key: storageKey, value: addr});
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
  //       tjp: { uuid: true },
  //       dna: true,
  //       nCounter: true,
  //     });
  //     await this.files.persistTransformResult({
  //       resTransform: resNewTags,
  //       isMeta: true
  //     });
  //     await this.rel8ToCurrentRoot({ibGib: resNewTags.newIbGib, linked: true});
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
      await Storage.set({key: storageKey, value: specialAddr});

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
        await Storage.set({key: storageKey, value: specialAddr});
      }

      // initialize current root
      await this.setCurrentRoot(firstRoot);
      // hack: the above line updates the roots in storage. so get **that** addr.

      specialAddr = (await Storage.get({key: storageKey})).value;

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
      const special = await this.initializeSpecialIbGib({type: "latest"});
      let specialAddr = getIbGibAddr({ibGib: special});
      await Storage.set({key: storageKey, value: specialAddr});

      // initialize the initial data
      // right now, the latest ibgib doesn't have data

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
  //       tjp: { uuid: true },
  //       dna: true,
  //       nCounter: true,
  //     });
  //     await this.files.persistTransformResult({
  //       resTransform: resNewTags,
  //       isMeta: true
  //     });
  //     await this.rel8ToCurrentRoot({ibGib: resNewTags.newIbGib, linked: true});
  //     return resNewTags.newIbGib;
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   }
  // }

  async initializeSpecialIbGib({
    type,
  }: {
    type: SpecialIbGibType,
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
        dna: true,
        nCounter: true,
      });
      await this.files.persistTransformResult({
        resTransform: resNewSpecial,
        isMeta: true
      });
      if (type !== 'roots') {
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
        dna: true,
        nCounter: true,
      });
      const { newIbGib: newTagIbGib } = resNewTag;
      await this.files.persistTransformResult({resTransform: resNewTag, isMeta: true});
      const newTagsAddr = await this.rel8TagToTagsIbGib(newTagIbGib);
      return { newTagIbGib, newTagsAddr };
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
        isMeta: true,
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
      isMeta: true,
    });
  }

  async rel8ToSpecialIbGib({
    type,
    rel8nName,
    ibGibToRel8,
    isMeta,
  }: {
    type: SpecialIbGibType,
    rel8nName: string,
    ibGibToRel8: IbGib_V1,
    isMeta: boolean,
  }): Promise<IbGibAddr> {
    const lc = `${this.lc}[${this.rel8ToSpecialIbGib.name}({type: ${type}, rel8nName: ${rel8nName}, isMeta: ${isMeta}})]`;
    try {
      const newAddr = getIbGibAddr({ibGib: ibGibToRel8});

      // get the special ibgib
      const storageKey = this.getSpecialStorageKey({type});
      let specialAddr = (await Storage.get({key: storageKey}))?.value;
      if (!specialAddr) { throw new Error(`addr not found`) };
      let resGetSpecial = await this.files.get({addr: specialAddr, isMeta: true});
      if (!resGetSpecial.success) { throw new Error(`couldn't get special`) }
      if (!resGetSpecial.ibGib) { throw new Error(`resGetSpecial.ibGib falsy`) }

      // rel8 the new tag to the special ibgib.
      const resNewSpecial = await V1.rel8({
        src: resGetSpecial.ibGib!,
        rel8nsToAddByAddr: { [rel8nName]: [newAddr] },
        dna: true,
        linkedRel8ns: [Rel8n.past],
        nCounter: true,
      });

      // persist
      await this.files.persistTransformResult({resTransform: resNewSpecial, isMeta});

      // rel8 the new special ibgib to the root, but only if it's not a root itself.
      if (type !== 'roots') {
        await this.rel8ToCurrentRoot({ibGib: resNewSpecial.newIbGib, linked: true});
      }

      // return the new special address (not the incoming new tag)
      const { newIbGib: newSpecialIbGib } = resNewSpecial;
      let newSpecialAddr = getIbGibAddr({ibGib: newSpecialIbGib});

      await Storage.set({key: storageKey, value: newSpecialAddr});

      return newSpecialAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

}
