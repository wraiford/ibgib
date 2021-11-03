import { Injectable } from '@angular/core';
import { IbGib_V1, Rel8n } from 'ts-gib/dist/V1';
import { IbGibAddr, V1, TransformResult } from 'ts-gib';
import { Storage } from '@capacitor/core';
import { FilesService } from './files.service';
import { TAGS_IBGIB_ADDR_KEY, TAGS_IB, TAG_REL8N_NAME } from '../common/constants';
import { Factory_V1 as factory } from 'ts-gib/dist/V1';
import { getIbGibAddr } from 'ts-gib/dist/helper';
import { TagData } from '../common/types';

@Injectable({
  providedIn: 'root'
})
export class IbgibsService {
  private lc = `[${IbgibsService.name}]`;

  private _initializing: boolean;

  constructor(
    private files: FilesService,
  ) { }



  /**
   * Gets the apps TagsIbGib.
   *
   * Initializes if asked to, which will create a new TagsIbGib as well
   * as create some initial tags as well.
   *
   * @param initialize initialize (i.e. create) if TagsIbGib not found. Used for initializing app (first run).
   */
  async getTagsIbgib({
    initialize
  }: {
    initialize: boolean
  }): Promise<IbGib_V1 | null> {
    const lc = `${this.lc}[${this.getTagsIbgib.name}]`;
    try {
      let tagsAddr = (await Storage.get({key: TAGS_IBGIB_ADDR_KEY}))?.value;
      if (!tagsAddr) {
        if (initialize && !this._initializing) {
          this._initializing = true;
          try {
            tagsAddr = await this.initializeTags();
          } catch (error) {
            console.error(`${lc} error initializing: ${error.message}`);
          } finally {
            this._initializing = false;
          }
        } else {
          return null;
        }
      }
      console.log(`tagsAddr: ${tagsAddr}`);

      let resTags = await this.files.get({addr: tagsAddr, isMeta: true});
      if (!resTags.success) { throw new Error(resTags.errorMsg); }
      if (!resTags.ibGib) { throw new Error(`no ibGib in result`); }

      return resTags.ibGib
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return null;
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
      const tagsIbGib = await this.initializeNewTagsIbGib();
      let tagsAddr = getIbGibAddr({ibGib: tagsIbGib});
      await Storage.set({key: TAGS_IBGIB_ADDR_KEY, value: tagsAddr});

      // at this point, our tags ibGib has no associated tag ibGibs.
      // add home, favorite tags
      const initialTagDatas: TagData[] = [
        { tagText: 'home', icon: 'home-outline' },
        { tagText: 'favorite', icon: 'heart-outline' },
      ];
      for (let tagData of initialTagDatas) {
        const resCreate = await this.createTagIbGib(tagData);
        tagsAddr = resCreate.newTagsAddr;
        await Storage.set({key: TAGS_IBGIB_ADDR_KEY, value: tagsAddr});
      }

      return tagsAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return null;
    }
  }

  private async initializeNewTagsIbGib(): Promise<IbGib_V1> {
    const lc = `${this.lc}[${this.initializeNewTagsIbGib.name}]`;
    try {
      const src = factory.primitive({ib: TAGS_IB });
      const resNewTags = await V1.fork({
        src,
        destIb: TAGS_IB,
        linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
        tpj: { uuid: true },
        dna: true,
      });
      await this.persistTransformResult({
        resTransform: resNewTags,
        isMeta: true
      });
      // for (let ibGib of [newTagsIbGib, ...(intermediateIbGibs || [])]) {
      //   let resPut = await this.files.put({ibGib, isMeta: true});
      //   if (!resPut.success) { throw new Error(resPut.errorMsg || 'error creating new tags ibGib'); }
      // }
      // for (let ibGib of dnas) {
      //   let resPut = await this.files.put({ibGib, isDna: true});
      //   if (!resPut.success) { throw new Error(resPut.errorMsg || 'error creating new tags ibGib'); }
      // }
      // return newTagsIbGib;
      return resNewTags.newIbGib;
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
    tagText,
    icon,
  }: {
    tagText: string,
    icon?: string,
  }): Promise<{newTagIbGib: IbGib_V1, newTagsAddr: string}> {
    const lc = `${this.lc}[${this.createTagIbGib.name}]`;
    try {
      if (!tagText) { throw new Error(`${lc} tag text required`); }
      const tagIb = this.tagTextToIb(tagText);
      const tagPrimitive = factory.primitive({ib: "tag"});
      const resNewTag = await factory.firstGen({
        parentIbGib: tagPrimitive,
        ib: tagIb,
        data: <TagData>{ tagText, icon: icon || '' },
        linkedRel8ns: [ Rel8n.past, Rel8n.ancestor ],
        dna: true,
      });
      const { newIbGib: newTagIbGib } = resNewTag;
      await this.persistTransformResult({resTransform: resNewTag, isMeta: true});
      const newTagsAddr = await this.rel8TagToTagsIbGib(newTagIbGib);
      return { newTagIbGib, newTagsAddr };
    } catch (error) {
      console.log(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Convenience function for persisting a transform result, which has
   * a newIbGib and optionally intermediate ibGibs and/or dnas.
   */
  async persistTransformResult({
    isMeta,
    resTransform,
  }: {
    isMeta?: boolean,
    resTransform: TransformResult<IbGib_V1>
  }): Promise<void> {
    const lc = `${this.lc}[${this.persistTransformResult.name}]`;
    try {
      const { newIbGib, intermediateIbGibs, dnas } = resTransform;
      const ibGibs = [newIbGib, ...(intermediateIbGibs || [])];
      for (let ibGib of ibGibs) {
        const resPut = await this.files.put({ibGib, isMeta});
        if (!resPut.success) { throw new Error(`${lc} ${resPut.errorMsg}`); }
      }
      if (dnas) {
        for (let ibGib of dnas) {
          const resPut = await this.files.put({ibGib, isDna: true});
          if (!resPut.success) { throw new Error(`${lc} ${resPut.errorMsg}`); }
        }
      }
    } catch (error) {
      console.log(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Relates the given tag to the TagsIbGib, saves the generated
   * TagsIbGib and updates the settings to point to the new TagsIbGib.
   *
   * @param newTagIbGib to add to Tags
   */
  async rel8TagToTagsIbGib(newTagIbGib: IbGib_V1): Promise<IbGibAddr> {
    const lc = `${this.lc}[${this.rel8TagToTagsIbGib.name}]`;
    try {
      const newTagAddr = getIbGibAddr({ibGib: newTagIbGib});

      // get the tags ibgib with rel8ns to all (local) tags
      let tagsAddr = (await Storage.get({key: TAGS_IBGIB_ADDR_KEY}))?.value;
      if (!tagsAddr) { throw new Error(`tagsAddr not found`) };
      let resGetTags = await this.files.get({addr: tagsAddr, isMeta: true});
      if (!resGetTags.success) { throw new Error(`couldn't get tags`) }
      if (!resGetTags.ibGib) { throw new Error(`resGetTags.ibGib falsy`) }

      // rel8 the new tag to the tags index.
      const resTransform = await V1.rel8({
        src: resGetTags.ibGib!,
        rel8nsToAddByAddr: { [TAG_REL8N_NAME]: [newTagAddr] },
        dna: true,
        linkedRel8ns: [Rel8n.past],
      });

      // persist
      await this.persistTransformResult({resTransform, isMeta: true});

      // return the new tagS address (not the incoming new tag)
      const { newIbGib: newTagsIbGib } = resTransform;
      tagsAddr = getIbGibAddr({ibGib: newTagsIbGib});

      return tagsAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

}
