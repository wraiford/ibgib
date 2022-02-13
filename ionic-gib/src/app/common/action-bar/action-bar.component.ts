import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { Plugins, Camera, CameraResultType, ActionSheetOptionStyle } from '@capacitor/core';
const { Modals } = Plugins;

import { IbGibAddr, IbGibRel8ns, V1 } from 'ts-gib';
import { hash, getIbGibAddr, getTimestamp, getIbAndGib, pretty } from 'ts-gib/dist/helper';
import { Factory_V1 as factory, IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';
import * as h from 'ts-gib/dist/helper';

import { CommonService } from 'src/app/services/common.service';
import {
  ActionItem, PicData, CommentData, SyncSpaceResultIbGib,
} from '../types';
import { ChooseIconModalComponent, IconItem } from '../choose-icon-modal/choose-icon-modal.component';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import {
  getBinIb, getCommentIb, getDependencyGraph,
  getFnAlert, getFnPrompt,
  getFromSpace, validateIbGibAddr,
} from '../helper';
import * as c from '../constants';
import { getGib } from 'ts-gib/dist/V1/transforms/transform-helper';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;
// const debugBorder = c.GLOBAL_DEBUG_BORDER || false;
const debugBorder = false;

@Component({
  selector: 'action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
})
export class ActionBarComponent extends IbgibComponentBase
  implements OnInit {

  protected lc = `[${ActionBarComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) {
    let lc = `${this.lc}[set addr(value: ${value})]`;
    super.addr = value;
  }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1 ) { super.ibGib_Context = value; }

  /**
   * temporary hack
   */
  DEFAULT_ACTIONS: ActionItem[] = [
    {
      name: 'comment',
      type: 'button',
      text: 'comment',
      icon: 'chatbox-outline',
      handler: async (event) => await this.actionAddComment(event),
    },
    {
      name: 'camera',
      type: 'button',
      text: 'camera',
      icon: 'camera-outline',
      handler: async (event) => await this.actionAddPic(event),
    },
    {
      name: 'file',
      type: 'inputfile',
      text: 'image',
      icon: 'image-outline',
      filepicked: async (event) => await this.actionAddImage(event),
    },
    {
      name: 'tag',
      type: 'button',
      text: 'tag',
      icon: 'pricetag-outline',
      handler: async (event) => await this.actionTag(event),
    },
    {
      name: 'import',
      type: 'button',
      text: 'add from space',
      icon: 'planet-outline',
      handler: async (event) => await this.addImport(event),
    },
    {
      name: 'info',
      type: 'button',
      text: 'info',
      icon: 'information',
      handler: async (event) => await this.actionShowInfo(event),
    },
  ];

  @Input()
  items: ActionItem[] = this.DEFAULT_ACTIONS.concat();

  public debugBorderWidth: string = debugBorder ? "22px" : "0px"
  public debugBorderColor: string = "#FFAABB";
  public debugBorderStyle: string = "solid";

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  ngOnInit() {
    if (logalot) { console.log(`${this.lc} addr: ${this.addr}`); }
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.updateActions();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async updateActions(): Promise<void> {
    this.items = this.DEFAULT_ACTIONS.concat(); // dev only
  }

  async actionAddComment(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddComment.name}]`;
    let actionItem: ActionItem;
    try {
      actionItem = this.items.filter(x => x.name === 'comment')[0];
      actionItem.busy = true;

      if (logalot) { console.log(`${lc} starting...`); }

      const alert = getFnAlert();

      const resComment = await Modals.prompt({
        title: 'comment',
        message: 'add text',
        inputPlaceholder: 'text here',
      });
      if (resComment.cancelled || !resComment.value) { return; }
      const text = resComment.value.trim();
      if (logalot) { console.log(`${lc} text: ${text}`); }
      if (text === '') {
        await alert({title: 'no comment text entered', msg: 'Comment cannot contain only whitespace. Cancelling...'});
        return;
      }
      const data: CommentData = { text, textTimestamp: getTimestamp() };

      // create an ibgib with the filename and ext
      const opts:any = {
        parentIbGib: factory.primitive({ib: 'comment'}),
        ib: getCommentIb(text),
        data,
        dna: true,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      };

      // this makes it more difficult to share/sync ibgibs...
      // if (this.addr) { opts.rel8ns = { 'comment on': [this.addr] }; }

      if (logalot) { console.log(`${lc} opts: ${pretty(opts)}`); }
      const resCommentIbGib = await factory.firstGen(opts);
      await this.common.ibgibs.persistTransformResult({resTransform: resCommentIbGib});
      const { newIbGib: newComment } = resCommentIbGib;
      const newCommentAddr = getIbGibAddr({ibGib: newComment});
      await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newComment, linked: true});
      await this.common.ibgibs.registerNewIbGib({ibGib: newComment});
      // need to nav to picture if not in a context, or
      // or if in context need to rel8 to the context.

      let navToAddr: string;
      if (this.addr) {
        // if we have a context, rel8 to it
        if (!this.ibGib) {
          await this.loadIbGib();
          await this.loadTjp();
        }
        const rel8nsToAddByAddr = { comment: [newCommentAddr] };
        const resRel8ToContext =
          await V1.rel8({src: this.ibGib, rel8nsToAddByAddr, dna: true, nCounter: true});
        await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToContext});
        const { newIbGib: newContext } = resRel8ToContext;
        await this.common.ibgibs.registerNewIbGib({ibGib: newContext});

        // nav to either the pic we just added, or the new context "in time"
        // to which the pic was added.
        navToAddr = this.isMeta ?
          getIbGibAddr({ibGib: newComment}) :
          getIbGibAddr({ibGib: newContext});
      } else {
        navToAddr = getIbGibAddr({ibGib: newComment});
      }
      await this.navTo({addr: navToAddr});

    } catch (error) {
      console.error(`${lc} ${error.message}`)
    } finally {
      if (actionItem) {
        actionItem.busy = false;
        this.ref.detectChanges();
      }
    }
  }

  /**
   * shared pic code between camera and loading image via picking a file.
   */
  async doPic({
    imageBase64,
    binHash,
    filename,
    ext,
  }: {
    imageBase64: string,
    binHash: string,
    filename?: string,
    ext?: string,
  }): Promise<void> {
    const lc = `${this.lc}[${this.doPic.name}]`;

    if (logalot) { console.log(`${lc} starting...`); }
    try {

      const binIb = getBinIb({binHash, binExt: ext});
      const binIbGib: IbGib_V1 = { ib: binIb, data: <any>imageBase64 };
      const binGib = await getGib({ibGib: binIbGib, hasTjp: false});
      binIbGib.gib = binGib;
      const binAddr = h.getIbGibAddr({ibGib: binIbGib});

      if (logalot) { console.log(`${lc} saving initial ibgib pic with data = imageBase64...`); }
      const resSaveBin = await this.common.ibgibs.put({ibGib: binIbGib});
        // await this.ibgibs.put({binData: image.base64String, binExt: ext});
      if (!resSaveBin.success) { throw new Error(resSaveBin.errorMsg || 'error saving pic'); }
      if (logalot) { console.log(`${lc} saving initial ibgib pic with data = imageBase64 complete.`); }

      // todo: do thumbnail also

      // NOTE: This is not the same filename that is saved in the bin folder!
      // This is for when the picture is downloaded outside of the ibGib system
      // or for display purposes.
      const timestamp = (new Date).toUTCString();
      filename = filename || timestamp
        .replace(':', '-')
        .replace(':', '-')
        .replace(',', '')
        // .replace(new RegExp(/\W/), '') // any remaining-non-word chars
        ; // temporary eek.

      if (logalot) { console.log(`${lc} binHash: ${binHash}`); }
      if (logalot) { console.log(`${lc} ext: ${ext}`); }
      const data: PicData = { binHash, ext, filename, timestamp };
      const rel8ns: IbGibRel8ns = {
        // 'pic on': [this.addr], // makes it more difficult to share/sync ibgibs
        'bin': [binAddr],
      };

      // create an ibgib with the filename and ext
      const resPicIbGib = await factory.firstGen({
        parentIbGib: factory.primitive({ib: 'pic'}),
        ib: `pic ${binHash}`,
        data,
        rel8ns,
        dna: true,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      });
      await this.common.ibgibs.persistTransformResult({resTransform: resPicIbGib});
      const { newIbGib: newPic } = resPicIbGib;
      await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newPic, linked: true});
      await this.common.ibgibs.registerNewIbGib({ibGib: newPic});
      // need to nav to picture if not in a context, or
      // or if in context need to rel8 to the context.

      // rel8 to context and nav
      await this._rel8ToCurrentContext({
        ibGibToRel8: newPic,
        rel8nNames: ['pic'],
        navigateAfter: true,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  private async _rel8ToCurrentContext({
    ibGibToRel8,
    rel8nNames,
    navigateAfter,
  }: {
    ibGibToRel8: IbGib_V1,
    rel8nNames: string[],
    navigateAfter: boolean,
  }): Promise<void> {
    const lc = `${this.lc}[${this._rel8ToCurrentContext.name}]`;
    try {
      // load the context if not already
      if (!this.ibGib) { await this.loadIbGib(); await this.loadTjp(); }

      // set up the rel8ns to add
      const rel8nsToAddByAddr: IbGibRel8ns_V1 = {};
      const ibGibToRel8Addr = h.getIbGibAddr({ibGib: ibGibToRel8});
      rel8nNames.forEach((rel8nName) => { rel8nsToAddByAddr[rel8nName] = [ibGibToRel8Addr]; });

      // perform the rel8 transform and...
      const resRel8ToContext =
        await V1.rel8({
          src: this.ibGib,
          rel8nsToAddByAddr,
          dna: true,
          nCounter: true
        });

      // ...persist it and...
      await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToContext});

      // ...register it.
      const { newIbGib: newContext } = resRel8ToContext;
      await this.common.ibgibs.registerNewIbGib({ibGib: newContext});

      // nav to either the ibGib we just added, or the new context frame that we
      // just created via the rel8 transform
      if (navigateAfter) {
        const navToAddr = this.isMeta ?
          getIbGibAddr({ibGib: ibGibToRel8}) :
          getIbGibAddr({ibGib: newContext});
        await this.navTo({addr: navToAddr});
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  /**
   * Horrifically large function to add a picture,
   * create the ibgib, save, etc.
   *
   * Must refactor this at a later time though.
   */
  async actionAddPic(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddPic.name}]`;
    let actionItem: ActionItem;
    try {
      actionItem = this.items.filter(x => x.name === 'camera')[0];
      actionItem.busy = true;

      // get the image from the camera
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
      });
      // save the image bin data
      // get the hash of the image
      const binHash = await hash({s: image.base64String});
      const ext = image.format;

      await this.doPic({imageBase64: image.base64String, binHash, ext});
    } catch (error) {
      console.error(`${lc} ${error.message}`)
    } finally {
      if (actionItem) {
        actionItem.busy = false;
        this.ref.detectChanges();
      }
    }
  }

  async actionShowInfo(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionShowInfo.name}]`;
    try {
      let info = JSON.stringify(this.ibGib_Context, null, 2);
      let addr = getIbGibAddr({ibGib: this.ibGib_Context});
      await Modals.alert({title: addr, message: info});
      console.log(info);
    } catch (error) {
      console.error(`${lc} ${error.message}`)
    }
  }

  getExt(path: string): { filename: string, ext: string } {
    const pathPieces = path.split('/');
    const fullFilename = pathPieces[pathPieces.length-1];
    if (fullFilename.includes('.') && !fullFilename.endsWith('.')) {
      const lastDotIndex = fullFilename.lastIndexOf('.');
      return {
        filename: fullFilename.slice(0, lastDotIndex),
        ext: fullFilename.slice(lastDotIndex+1),
      };
    } else {
      return {filename: fullFilename, ext: ""}
    }
  }

  async actionAddImage(event: any): Promise<void> {
    const lc = `${this.lc}[${this.actionAddImage.name}]`;
    let actionItem: ActionItem;
    try {
      actionItem = this.items.filter(x => x.name === 'file')[0];
      actionItem.busy = true;

      // await Modals.alert({title: 'file', message: `picked a file yo`});
      // thanks https://edupala.com/capacitor-camera-example/
      const file = (event.target as HTMLInputElement).files[0];
      const pattern = /image-*/;
      const reader = new FileReader();

      if (!file.type.match(pattern)) {
        if (logalot) { console.log('File format not supported'); }
        return;
      }

      reader.onload = async (_: any) => {
        let imageBase64 = reader.result.toString().split('base64,')[1];
        let binHash = await hash({s: imageBase64});
        const filenameWithExt = file.name;
        const filenamePieces = filenameWithExt.split('.');
        const filename = filenamePieces.slice(0, filenamePieces.length-1).join('.');
        const ext = filenamePieces.slice(filenamePieces.length-1)[0];

        await this.doPic({imageBase64, binHash, filename, ext});
        if (actionItem) {
          actionItem.busy = false;
          this.ref.detectChanges();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      if (actionItem) {
        actionItem.busy = false;
        this.ref.detectChanges();
      }
    }
  }

  async actionTag(_: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionTag.name}]`;
    let actionItem: ActionItem;
    try {
      actionItem = this.items.filter(x => x.name === 'tag')[0];
      actionItem.busy = true;
      if (!this.ibGib) { throw new Error(`There isn't a current ibGib loaded...?`); }
      if (!this.addr) { throw new Error(`There isn't a current ibGib addr loaded...?`); }
      // const contextAddr = getIbGibAddr({ibGib: this.ibGib});
      // console.log(`${lc} contextAddr: ${contextAddr}`);


      const tagsIbGib = await this.common.ibgibs.getSpecialIbgib({type: "tags"});
      const tagAddrs = tagsIbGib.rel8ns.tag;
      const tagInfos: TagInfo[] = tagAddrs.map(addr => {
        const { ib } = getIbAndGib({ibGibAddr: addr});
        const tag = ib.substring('tag '.length);
        const tagInfo: TagInfo = { title: tag, addr };
        return tagInfo;
      });

      const resPrompt = await Modals.showActions({
        title: 'Select tag',
        message: 'Select a tag to add this ibGib to',
        options: [
          {
            // index 0
            title: 'Cancel',
            style: ActionSheetOptionStyle.Cancel
          },
          {
            // index 1
            title: 'New Tag...',
            style: ActionSheetOptionStyle.Default
          },

          // index = i-2
          ...tagInfos,
        ]
      });

      let tagIbGib: IbGib_V1;
      if (resPrompt.index === 0) {

        if (logalot) { console.log(`${lc} cancelled`); }
        await Plugins.Modals.alert({ title: 'nope', message: 'cancelled' });
        actionItem.busy = false;
        this.ref.detectChanges();
        return;

      } else if (resPrompt.index === 1) {

        if (logalot) { console.log(`${lc} create new tag`); }
        tagIbGib = await this.createNewTag();
        if (!tagIbGib) {
          if (logalot) { console.log(`${lc} aborting creating new tag.`); }
          actionItem.busy = false;
          this.ref.detectChanges();
          return;
        }

      } else {

        if (logalot) { console.log(`${lc} tag with existing tag, but may not be latest addr`); }
        const tagInfo: TagInfo = tagInfos[resPrompt.index - 2];
        const resTagIbGib = await this.common.ibgibs.get({addr: tagInfo.addr});
        if (resTagIbGib.success && resTagIbGib.ibGibs?.length === 1) {
          const rel8dTagIbGibAddr = getIbGibAddr({ibGib: resTagIbGib.ibGibs[0]});
          if (logalot) { console.log(`${lc} the rel8d tag may not be the latest: ${rel8dTagIbGibAddr}`); }
          const latestTagAddr = await this.common.ibgibs.getLatestAddr({ibGib: resTagIbGib.ibGibs[0]});
          if (logalot) { console.log(`${lc} latestTagAddr: ${latestTagAddr}`); }
          if (rel8dTagIbGibAddr === latestTagAddr) {
            console.error(`${lc} tag is already the latest`);
            tagIbGib = resTagIbGib.ibGibs[0]!;
          } else {
            console.error(`${lc} tag is NOT the latest`);
            const resTagIbGibLatest = await this.common.ibgibs.get({addr: latestTagAddr});
            if (resTagIbGibLatest.success && resTagIbGibLatest.ibGibs?.length === 1) {
              console.error(`${lc} tag is NOT the latest and we got a new ibgib`);
              tagIbGib = resTagIbGibLatest.ibGibs![0];
            } else {
              console.error(`${lc} couldn't find latest tag addr (${latestTagAddr}). using previous tag (${rel8dTagIbGibAddr})`);
              tagIbGib = resTagIbGib.ibGibs![0];
            }
          }
        } else {
          throw new Error(`${resTagIbGib.errorMsg || 'there was a problem getting the tag ibGib.'}`);
        }

      }

      // relate context to tag
      const rel8nsToAddByAddr = { target: [this.addr] };
      const resRel8ToTag =
        await V1.rel8({src: tagIbGib, rel8nsToAddByAddr, dna: true, nCounter: true});
      await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToTag});
      const { newIbGib: newTag } = resRel8ToTag;
      await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newTag, linked: true});
      await this.common.ibgibs.registerNewIbGib({ibGib: newTag});

      if (logalot) { console.log(`${lc} tag successful.`); }
      await Modals.alert({title: 'yess', message: `Tagged.`});
    } catch (error) {
      console.error(`${lc} ${error.message}`)
      await Modals.alert({title: 'something went wrong...', message: error.message});
    } finally {
      if (actionItem) {
        actionItem.busy = false;
        this.ref.detectChanges();
      }
    }

  }

  async createNewTag(): Promise<IbGib_V1 | undefined> {
    const lc = `${this.lc}[${this.createNewTag.name}]`;

    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const text = await this.chooseTagText();
      if (!text) { return; }
      const icon = await this.chooseTagIcon();
      if (!icon) { return; }
      const description = await this.chooseTagDescription(text);
      if (!description) { return; }

      const resNewTag = await this.common.ibgibs.createTagIbGib({text, icon, description});

      return resNewTag.newTagIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      return;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Returns the text/title of the tag.
   * @returns
   */
  async chooseTagText(): Promise<string | undefined> {
    const lc = `${this.lc}[${this.chooseTagText.name}]`;
    let tagText: string;
    try {
      for (let i = 0; i < 10; i++) {
        let resTagText = await Plugins.Modals.prompt({
          title: 'Tag Text?',
          message: `What's the tag called?`,
          cancelButtonTitle: 'Cancel',
          okButtonTitle: 'Next...',
        });

        if (resTagText.cancelled || !resTagText.value) {
          if (logalot) { console.log(`${lc} cancelled? no value?`) }
          return;
        }

        if (c.ILLEGAL_TAG_TEXT_CHARS.some(x => resTagText.value.includes(x))) {
          await Plugins.Modals.alert({
            title: 'Nope...',
            message: `Tag Text can't contain spaces or ${c.ILLEGAL_TAG_TEXT_CHARS}`,
          });
        } else {
          tagText = resTagText.value;
          if (logalot) { console.log(`${lc} tagText: ${tagText}`); }
          break;
        }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      tagText = undefined;
    }

    return tagText;
  }

  async chooseTagIcon(): Promise<string | undefined> {
    const lc = `${this.lc}[${this.chooseTagIcon.name}]`;
    try {
      const modal = await this.common.modalController.create({
        component: ChooseIconModalComponent,
      });
      await modal.present();
      let resModal = await modal.onWillDismiss();
      const iconItem: IconItem = resModal.data;
      if (!iconItem) {
        if (logalot) { console.log(`${lc} cancelled.`) }
        return;
      }
      if (logalot) { console.log(`${lc} icon: ${iconItem.icon}`); }
      return iconItem!.icon;
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Returns the description of the tag.
   * @returns
   */
  async chooseTagDescription(tagText: string): Promise<string | undefined> {
    const lc = `${this.lc}[${this.chooseTagDescription.name}]`;
    let tagDesc: string;
    try {
      for (let i = 0; i < 10; i++) {
        let resTagDesc = await Plugins.Modals.prompt({
          title: 'Tag Description?',
          message: `What's the tag description?`,
          inputPlaceholder: tagText,
          cancelButtonTitle: 'Cancel',
          okButtonTitle: 'Create Tag',
        });

        if (resTagDesc.cancelled) {
          if (logalot) { console.log(`${lc} cancelled? no value?`) }
          return;
        }

        if (c.ILLEGAL_TAG_DESC_CHARS.some(x => resTagDesc.value.includes(x))) {
          await Plugins.Modals.alert({
            title: 'Nope...',
            message: `Description can't contain ${c.ILLEGAL_TAG_DESC_CHARS}`,
          });
        } else {
          tagDesc = resTagDesc.value || `${tagText} is cool tag.`;
          if (logalot) { console.log(`${lc} tagText: ${tagDesc}`); }
          break;
        }
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      tagDesc = undefined;
    }

    return tagDesc;
  }

  /**
   * Import an ibgib from either the local space or our sync spaces to our
   * current context ibgib.
   */
  async addImport(_: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.addImport.name}]`;
    let actionItem: ActionItem;
    try {
      actionItem = this.items.filter(x => x.name === 'import')[0];
      actionItem.busy = true;

      if (!this.ibGib) { throw new Error(`There isn't a current ibGib loaded...?`); }
      if (!this.addr) { throw new Error(`There isn't a current ibGib addr loaded...?`); }

      const fnAlert = getFnAlert();
      const fnPrompt = getFnPrompt();

      if (logalot) { console.log(`${lc} prompting for address to import.`); }

      // prompt for the ib^gib addr that we want to import and validate result
      const resAddr = (await fnPrompt({
        title: 'ibgib address',
        msg: 'enter the ibgib address that you would like to import.',
      }))?.trim();
      if (!resAddr) { return; } // returns
      const addr = resAddr;
      const validationErrors = validateIbGibAddr({addr});
      if ((validationErrors ?? []).length > 0) { throw new Error(`Invalid address: ${validationErrors.join('\n')} (E: 343823cb6ab04e6e9a8f7e6de1cd12c8)`); }

      // now we have a valid address, but maybe we have this locally?  if we do,
      // add to the current context and go ahead and return because we should
      // already have the entire dependency graph
      if (logalot) { console.log(`${lc} checking locally.`); }
      let resGet_Local = await this.common.ibgibs.get({addr});
      if (resGet_Local.success && resGet_Local.ibGibs?.length === 1) {
        if (logalot) { console.log(`${lc} found ibgib locally with addr: ${addr}.`); }
        await fnAlert({title: "We have it locally!", msg: "We have it locally! We'll relate it to the current ibgib..."});
        await this._rel8ToCurrentContext({
          ibGibToRel8: resGet_Local.ibGibs[0],
          rel8nNames: ['import'],
          navigateAfter: true,
        });
        return;
      }

      // we don't have it locally, so we'll look in our sync spaces.
      if (logalot) { console.log(`${lc} did NOT find ibgib locally with addr: ${addr}. checking sync space(s)...`); }

      // So get our sync spaces and...
      const appSyncSpaces = await this.common.ibgibs.getAppSyncSpaces({
        unwrapEncrypted: true,
        createIfNone: true,
      });
      // ...if not cancelled...
      if (appSyncSpaces.length === 0) {
        const msg = `Can't sync without sync spaces. Cancelled.`;
        if (logalot) { console.log(`${lc} ${msg}`) };
        const fnAlert = getFnAlert();
        await fnAlert({title: "Cancelled", msg});
        return; // returns
      }

      // ...iterate and look inside each space.
      let gotIbGib: IbGib_V1;
      let space: IbGibSpaceAny;
      let spaceAddr: IbGibAddr;
      for (let i = 0; i < appSyncSpaces.length; i++) {
        space = appSyncSpaces[i];
        spaceAddr = h.getIbGibAddr({ibGib: space});

        if (logalot) { console.log(`${lc} Checking space (${spaceAddr}) for ibgib (${addr}).`); }

        let resGet = await getFromSpace({addr, space});
        if (resGet.success) {
          if (resGet.ibGibs?.length === 1) {
            if (logalot) { console.log(`${lc} found ibgib (${addr}) in space (${spaceAddr}).`); }
            // let rawResult = <SyncSpaceResultIbGib>resGet.rawResultIbGib;
            // at this point, we have a copy of the ibGib, but what about the entire dependency graph?
            // we need to sync up the ibGib
            gotIbGib = resGet.ibGibs[0];

          } else {
            // not found
            debugger; // look at rawResult if you wish
            if (logalot) { console.log(`${lc} NOT found ibgib (${addr}) in space (${spaceAddr}).`); }
            let rawResult = <SyncSpaceResultIbGib>resGet.rawResultIbGib;
          }
        } else {
          debugger;
          throw new Error(`resGet.success falsy, but get should not be throwing... addr: (${addr}) in space (${spaceAddr}). (UNEXPECTED) (E: b200973da68343b58bddb48c2274a6e1)`);
        }
      }

      if (gotIbGib) {
        // we found it in `space` with `spaceAddr`
        // but we may not (probably don't) have the entire dependency graph.
        let graph = await getDependencyGraph({ibGib: gotIbGib, space});
        let resPutGraph =
          await this.common.ibgibs.put({ibGibs: Object.values(graph)});
        if (resPutGraph.success) {
          // now that we've stored the dependency graph, we can rel8 the import
          // to the current context
          await this._rel8ToCurrentContext({
            ibGibToRel8: gotIbGib,
            rel8nNames: ['import'],
            navigateAfter: true,
          });

        } else {
          debugger;
          throw new Error(`error(s) saving in local space: ${resPutGraph.errorMsg}`);
        }

      } else {
        // we didn't find it, so we can't import it
        await fnAlert({
          title: `Couldn't find it...`,
          msg:
            `Couldn't locate ibgib. We looked in your local space,
            as well as your ${appSyncSpaces.length} sync space(s), but no dice.

            Did you enter the correct address?
            Address: ${addr}

            Have you added the right sync space where it should be located?
            Sync Spaces: ${appSyncSpaces.map(x => x.data.name).join(', ')}

            Did you enter the right password(s) for your space(s)?
            To re-enter the right password, atm you need to restart the app (or
            browser if you're using a browser extension) to clear your entered
            passwords.
            `.replace(/  +/g, '')
        });
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`)
      await Modals.alert({title: 'something went wrong...', message: error.message});
    } finally {
      actionItem.busy = false;
      this.ref.detectChanges();
    }
  }

}

interface TagInfo {
  title: string;
  addr: string;
}

// comment some comme^7BA39343AB46ED03EC50EBE86D03E2BC9BB478C2E5B14BE16041CF6D84429E86.8D2E66D2F96EC083C33381CC2789D8F940D55BACBD9AED7E2CFC17FAC0ED3480

// comment some comme^B68445877C53E94DBC318B1DC80A7B2166CB9430073D2AD9E764FCE40D365F06.8D2E66D2F96EC083C33381CC2789D8F940D55BACBD9AED7E2CFC17FAC0ED3480

/*

comment some comme^3192993596B9B206CE62C885E3033AEA3B73F8F8123917C402F5A158E813A1D7.8D2E66D2F96EC083C33381CC2789D8F940D55BACBD9AED7E2CFC17FAC0ED3480

comment some comme^DAE9FE9D741EA361287065716B9C73D1A902DDC9ACE98C37EC6576F58CB19202.8D2E66D2F96EC083C33381CC2789D8F940D55BACBD9AED7E2CFC17FAC0ED3480
*/