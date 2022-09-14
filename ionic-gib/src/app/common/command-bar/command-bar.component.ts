import {
  Component, OnInit, ChangeDetectorRef,
  Input, EventEmitter, Output,
} from '@angular/core';
import { Capacitor, FilesystemDirectory, FilesystemEncoding, Plugins } from '@capacitor/core';
const { Clipboard, Modals } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, V1 } from 'ts-gib';
import { IbGib_V1, isPrimitive, } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { IbGibTimelineUpdateInfo } from '../types/ux';
import { getFnAlert, getFnConfirm, getFnPrompt } from '../helper/prompt-functions';
import { TagIbGib_V1 } from '../types/tag';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';
import { PicData_V1, PicIbGib_V1 } from '../types/pic';
import { ensureDirPath, pathExists, writeFile } from '../helper/ionic';
import { createNewTag } from '../helper/tag';


const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-command-bar',
  templateUrl: './command-bar.component.html',
  styleUrls: ['./command-bar.component.scss'],
})
export class CommandBarComponent
  extends IbgibComponentBase
  implements OnInit {

  protected lc = `[${CommandBarComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "22px" : "0px"
  public debugBorderColor: string = "#FFAABB";
  public debugBorderStyle: string = "solid";

  /**
   * Number of tjp timelines that have updates in outer space(s).
   */
  @Input()
  tjpUpdatesAvailableCount_Local: number = 0;

  @Input()
  updatingPic: boolean = false;

  @Input()
  downloadingPic: boolean = false;

  @Output()
  dismissMe = new EventEmitter<void>();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);

    const lc = `${this.lc}[ctor]`;
    if (logalot) { console.log(`${lc} addr: ${this.addr}`); }
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 645b3e272dd6ed43c703ad8845cb5b22)`); }
      await super.ngOnInit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async ngOnDestroy(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 5be3d9febce6afc68c26ab85f1cc2922)`); }
      await super.ngOnDestroy();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      let contextIbGib = this.ibGib_Context;
      let contextRel8nName = this.rel8nName_Context;
      await super.updateIbGib(addr);
      await this.loadType();
      await this.loadIbGib();
      await this.loadPic();
      await this.loadComment();
      await this.loadLink();
      await this.loadTimestamp();
      await this.loadTjp();
      await this.updateCommands();

      // reinstate the context ibgib...
      // major kluge here but I'm tired...
      this.ibGib_Context = contextIbGib;
      this.rel8nName_Context = contextRel8nName;

    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (this.updatingTimeline) {
        delete this.updatingTimeline;
      }
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  private updatingTimeline = false;
  async updateIbGib_NewerTimelineFrame({
    latestAddr,
    latestIbGib,
    tjpAddr,
  }: IbGibTimelineUpdateInfo): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: f67a7a947bec4906b5a940d724a26891)`); }

      let hasContext = !!this.ibGib_Context;
      console.log(`${lc} hasContext before update newer timeline: ${hasContext}`);

      this.updatingTimeline = true;
      await super.updateIbGib_NewerTimelineFrame({
        latestAddr,
        latestIbGib,
        tjpAddr,
      });

      hasContext = !!this.ibGib_Context;
      console.log(`${lc} hasContext after update newer timeline: ${hasContext}`);

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete. (I: f67a7a947bec4906b5a940d724a26891)`); }
    }
  }

  async updateCommands(): Promise<void> {
    const lc = `${this.lc}[${this.updateCommands.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 096e74b5bd7c267c029e6ce9a0db0622)`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  async handleClick_Refresh(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Refresh.name}]`;
    try {
      if (!this.ibGib) { throw new Error('this.ibGib falsy'); }
      if (isPrimitive({ ibGib: this.ibGib })) {
        if (logalot) { console.log(`${lc} refresh clicked for primitive. returning early. (I: af3e72b0a6288fd815a30f251f943f22)`); }
        return; /* <<<< returns early */
      }
      if (!this.tjp) { await this.loadTjp(); }

      if (this.paused) {
        this.paused = false;
        await this.go({
          toAddr: this.addr,
          fromAddr: this.addr,
          queryParams: { [c.QUERY_PARAM_PAUSED]: null },
          queryParamsHandling: 'merge',
          force: true,
        });
        return; /* <<<< returns early */
      }
      this.tjpUpdatesAvailableCount_Local = 0;
      if (this.item) { this.item.refreshing = true; }
      await this.common.ibgibs.pingLatest_Local({ ibGib: this.ibGib, tjpIbGib: this.tjp, useCache: false });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handleClick_Share(): Promise<void> {
    const alert = getFnAlert();
    try {
      await Clipboard.write({ string: this.addr });

      await alert({
        title: 'ibgib address copied', msg:
          `Copied to clipboard!

        "${this.addr}"

        You can add this to another ibgib by going to that and clicking import (the little sparkly stars icon atm.)
        `
      });
    } catch (error) {
      await alert({ title: 'ibgib address copied', msg: `clipboard failed...` });
    }
  }

  async handleClick_Archive(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Archive.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 35ffcc6e1a4f4c6b9259a949f8029a39)`); }
      if (!this.addr) { throw new Error(`this.addr required (E: e6d2d74c20ff4080a89de98029b6ee3b)`); }
      if (!this.ibGib) { throw new Error(`this.ibGib required (E: 0ad4bdac05034ae8bca650d485332633)`); }
      if (!this.ibGib_Context) { throw new Error(`this.ibGib_Context required (E: 4b9abfa9c45b4dd0b3ef63f3e33f8ef0)`); }

      // need to get the address actually associated with the context, which may
      // be in the past. this is not perfect but what can ya do.
      const addr = this.getAddrActuallyRel8edToContext();

      const resNewContext = await V1.rel8({
        src: this.ibGib_Context,
        rel8nsToAddByAddr: { [c.ARCHIVE_REL8N_NAME]: [addr] },
        rel8nsToRemoveByAddr: { [this.rel8nName_Context]: [addr] },
        dna: true,
        nCounter: true,
      });

      await this.common.ibgibs.persistTransformResult({ resTransform: resNewContext });
      await this.common.ibgibs.registerNewIbGib({ ibGib: resNewContext.newIbGib });

      this.dismissMe.emit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_Trash(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Trash.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 0cb8f4094bfba4640d463ea2f0b34e22)`); }
      if (!this.addr) { throw new Error(`this.addr required (E: c2de69bd99f7453880afe804989cb1e9)`); }
      if (!this.ibGib) { throw new Error(`this.ibGib required (E: 560031890368435c97c609c21ca44b0c)`); }
      if (!this.ibGib_Context) { throw new Error(`this.ibGib_Context required (E: 78908f20be7265f3987d408508dcad22)`); }

      // need to get the address actually associated with the context, which may
      // be in the past. this is not perfect but what can ya do.
      const addr = this.getAddrActuallyRel8edToContext();

      await this.common.ibgibs.trash({
        ibGib_Context: this.ibGib_Context,
        rel8nName_Context: this.rel8nName_Context,
        addr
      });

      this.dismissMe.emit();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_OpenInNewTab(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_OpenInNewTab.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 7f3b684be561491066932db5363efb22)`); }
      const { origin } = document.location;
      const newUrl = `${origin}/ibgib/${this.addr}`;
      window.open(newUrl, "_blank");
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_MakeTag(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_MakeTag.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: cac956070bae93da1bd6d867c685bf22)`); }

      // first check that we haven't already added this to the tags
      const tagsIbGib = <TagIbGib_V1>(await this.common.ibgibs.getSpecialIbGib({ type: "tags" }));
      let tagAddrs = (tagsIbGib.rel8ns?.tag ?? []);
      let tagTjpGibs = tagAddrs.map(x => getGibInfo({ ibGibAddr: x }).tjpGib);
      let thisIbGibTjpGib = getGibInfo({ gib: this.gib }).tjpGib;
      if (tagTjpGibs.includes(thisIbGibTjpGib)) {
        console.warn(`${lc} this.ibGib already registered as a tag. (W: 15efdc52a0174a5cbb8ef7f60764467d)`);
        return; /* <<<< returns early */
      }

      await this.common.ibgibs.rel8ToSpecialIbGib({
        type: "tags",
        rel8nName: c.TAG_REL8N_NAME,
        ibGibsToRel8: [this.ibGib],
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleUpdatePicClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleUpdatePicClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.updatingPic) {
        console.error(`${lc} (UNEXPECTED) already updating pic. this handler should be disabled yes? returning early. (E: 9cbb5388290a4f33bf8f2919aab9fdaa)`);
        return; /* <<<< returns early */
      }
      this.updatingPic = true;

      await this.common.ibgibs.updatePic({
        picIbGib: <PicIbGib_V1>this.ibGib,
        space: undefined, // local user space
      });

      this.updatingPic = false;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.updatingPic = false;
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      setTimeout(() => this.ref.detectChanges());
    }
  }

  async handleDownloadPicClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleDownloadPicClick.name}]`;
    const alert = getFnAlert();
    const prompt = getFnPrompt();
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const alert = getFnAlert();
      const confirm = getFnConfirm();
      const resConfirm = await confirm({
        title: 'Not implemented well on Android',
        msg: `On Android, this will download the file as base64-encoded data. This does not display correctly on some (all?) Android device galleries.\n\nDo you want to proceed?`
      });

      if (!resConfirm) {
        await alert({ title: 'K', msg: 'Cancelled' });
        return; /* <<<< returns early */
      }

      this.downloadingPic = true;
      const picIbGib = <IbGib_V1<PicData_V1>>this.ibGib;
      const { data } = picIbGib;
      if (!this.item?.picSrc) { throw new Error(`this.item?.picSrc is falsy...pic not loaded or not a pic? (E: e6c361e80cbd0f6221c51cd3f4b4fb22)`); }
      if (!data.binHash) { throw new Error(`invalid pic data. binHash is falsy. (E: f2ac49f8451c2054833069aac44b8222)`); }

      const filename =
        data.filename ||
        await prompt({
          title: `file name?`,
          msg: `What's the filename? ${data.filename ? `Leave blank to default to ${data.filename}` : ''}`,
        }) ||
        data.binHash;

      const ext =
        data.ext ||
        await prompt({
          title: `file extension?`,
          msg: `What's the file extension? Leave blank to default to ${c.DEFAULT_PIC_FILE_EXTENSION}`,
        }) ||
        c.DEFAULT_PIC_FILE_EXTENSION;

      const filenameWithExt = `${filename}.${ext}`;

      let directory: FilesystemDirectory;
      if (Capacitor.getPlatform() === 'ios') {
        directory = FilesystemDirectory.External;
      } else {
        directory = FilesystemDirectory.Documents;
      }

      // check to see if file already exists existing file
      let path: string;
      let dirPath: string = `${c.IBGIB_BASE_SUBPATH}/${c.IBGIB_DOWNLOADED_PICS_SUBPATH}`;
      await ensureDirPath({ dirPath, directory });
      let suffixNum: number = 0;
      let pathAlreadyExists: boolean;
      let attempts = 0;
      do {
        suffixNum++;
        path = suffixNum === 1 ?
          `${dirPath}/${filenameWithExt}` :
          `${dirPath}/${filename}(${suffixNum}).${ext}`;
        pathAlreadyExists = await pathExists({
          path,
          directory,
          encoding: FilesystemEncoding.UTF8,
        });
        attempts++;
      } while (pathAlreadyExists && attempts < 10); // just hard-coding this here, very edgy edge case.

      if (pathAlreadyExists) { throw new Error(`Tried 10 times and path ${filenameWithExt} (1-10) already exists. Last path tried: ${path}. (E: 09881b77a62747fbb0c2dd5057ae970a)`); }

      // path does not exist, so write it with our picture data.
      const dataToWrite = this.item.picSrc.replace(/^data\:image\/(jpeg|jpg|png)\;base64\,/i, '');
      // THIS DOES NOT "WORK". It successfully downloads the base64 encoded
      // string, but on my android testing this does not show the picture. I've
      // wasted enough time on this for now.

      await writeFile({ path, data: dataToWrite, directory: FilesystemDirectory.Documents });

      await h.delay(100); // so user can see visually that write happened
      await getFnAlert()({ title: 'file downloaded', msg: `Successfully downloaded to ${path} in ${directory}.` });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      await alert({ title: 'download pic...', msg: `hmm, something went wrong. error: ${error.message}` });
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      this.downloadingPic = false;
      setTimeout(() => this.ref.detectChanges());
    }
  }

  // #region tag modal related

  @Input()
  tagIbGibs: TagIbGib_V1[] = [];

  @Input()
  tagging: boolean;

  @Input()
  showModal_PromptForTag: boolean;

  async handleTagClick(_: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleTagClick.name}]`;
    try {
      this.tagging = true;
      setTimeout(() => this.ref.detectChanges());

      if (!this.ibGib) { throw new Error(`There isn't a current ibGib loaded...?`); }
      if (!this.addr) { throw new Error(`There isn't a current ibGib addr loaded...?`); }

      while (this.common.ibgibs.initializing) {
        if (logalot) { console.log(`${lc} hacky wait while initializing ibgibs service (I: 67e795e53b9c4732ab53837bcaa22c1f)`); }
        await h.delay(109);
      }
      this.tagIbGibs = await this.common.ibgibs.getSpecialRel8dIbGibs<TagIbGib_V1>({
        type: "tags",
        rel8nName: c.TAG_REL8N_NAME,
      });

      this.showModal_PromptForTag = !this.showModal_PromptForTag;

      return; /* <<<< returns early */
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      await Modals.alert({ title: 'something went awry...', message: error.message });
    } finally {
      this.ref.detectChanges();
    }
  }

  async rel8ToTag({
    tagIbGib,
  }: {
    tagIbGib: TagIbGib_V1,
  }): Promise<void> {
    const lc = `${this.lc}[${this.rel8ToTag.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const rel8nsToAddByAddr = { [c.TAGGED_REL8N_NAME]: [this.addr] };
      const resRel8ToTag =
        await V1.rel8({ src: tagIbGib, rel8nsToAddByAddr, dna: true, nCounter: true });
      await this.common.ibgibs.persistTransformResult({ resTransform: resRel8ToTag });
      const { newIbGib: newTag } = resRel8ToTag;
      await this.common.ibgibs.rel8ToCurrentRoot({ ibGib: newTag, linked: true });
      await this.common.ibgibs.registerNewIbGib({ ibGib: newTag });

      if (logalot) { console.log(`${lc} tag successful.`); }
      await Modals.alert({ title: 'yess', message: `Tagged.` });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSelectTag_ExistingTag(tagIbGib: TagIbGib_V1): Promise<void> {
    const lc = `${this.lc}[${this.handleSelectTag_ExistingTag.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.showModal_PromptForTag = false;
      setTimeout(() => this.ref.detectChanges());

      if (logalot) { console.log(`${lc} tag with existing tag, but may not be latest addr`); }
      const rel8dTagIbGibAddr = h.getIbGibAddr({ ibGib: tagIbGib });
      if (logalot) { console.log(`${lc} the rel8d tag may not be the latest: ${rel8dTagIbGibAddr}`); }
      const latestTagAddr = await this.common.ibgibs.getLatestAddr({ ibGib: tagIbGib });
      if (logalot) { console.log(`${lc} latestTagAddr: ${latestTagAddr}`); }
      if (rel8dTagIbGibAddr === latestTagAddr) {
        if (logalot) { console.log(`${lc} tag is already the latest (I: b98f190c9d6bc2f5575606ad0b7ff122)`); }
      } else {
        if (logalot) { console.log(`${lc} tag is NOT the latest (I: 1a8d0849cdb5b0fc652529146d81db22)`); }
        const resTagIbGibLatest = await this.common.ibgibs.get({ addr: latestTagAddr });
        if (resTagIbGibLatest.success && resTagIbGibLatest.ibGibs?.length === 1) {
          if (logalot) { console.log(`${lc} tag is NOT the latest and we got a new ibgib (I: 9391166b53577630697da4ff810b1b22)`); }
          tagIbGib = <TagIbGib_V1>resTagIbGibLatest.ibGibs![0];
        } else {
          console.warn(`${lc} couldn't find latest tag addr (${latestTagAddr}). using previous tag (${rel8dTagIbGibAddr})`);
        }
      }

      await this.rel8ToTag({ tagIbGib });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.tagging = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSelectTag_New(): Promise<void> {
    const lc = `${this.lc}[${this.handleSelectTag_New.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.showModal_PromptForTag = false;
      setTimeout(() => this.ref.detectChanges());

      if (logalot) { console.log(`${lc} create new tag`); }
      let tagIbGib = await createNewTag(this.common);
      if (!tagIbGib) {
        if (logalot) { console.log(`${lc} aborting creating new tag.`); }
        this.tagging = false;
        this.ref.detectChanges();
        return;
      }

      await this.rel8ToTag({ tagIbGib });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.tagging = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSelectTag_Cancel(): Promise<void> {
    const lc = `${this.lc}[${this.handleSelectTag_Cancel.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.showModal_PromptForTag = false;
      setTimeout(() => this.ref.detectChanges());

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.tagging = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }




  // #endregion tag modal related

}
