import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { Plugins, Camera, CameraResultType, ActionSheetOptionStyle, ActionSheetResult } from '@capacitor/core';
const { Modals } = Plugins;
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbGibAddr, IbGibRel8ns, V1 } from 'ts-gib';
import { ActionItem, PicData, CommentData } from '../types';
import { hash, getIbGibAddr, getTimestamp, getIbAndGib, pretty } from 'ts-gib/dist/helper';
import { Factory_V1 as factory, IbGibRel8ns_V1, Rel8n, IbGib_V1 } from 'ts-gib/dist/V1';
// import * as ionicons from 'ionicons/icons/index';
import { getBinAddr, validateIbGibAddr } from '../helper';

import * as h from 'ts-gib/dist/helper';
import * as c from '../constants';
import { ModalController } from '@ionic/angular';
import { ChooseIconModalComponent, IconItem } from '../choose-icon-modal/choose-icon-modal.component';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

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
      type: 'button',
      text: 'comment',
      icon: 'chatbox-outline',
      handler: async (event) => await this.actionAddComment(event),
    },
    {
      type: 'button',
      text: 'camera',
      icon: 'camera-outline',
      handler: async (event) => await this.actionAddPic(event),
    },
    {
      type: 'inputfile',
      text: 'image',
      icon: 'image-outline',
      filepicked: async (event) => await this.actionAddImage(event),
    },
    {
      type: 'button',
      text: 'tag',
      icon: 'pricetag-outline',
      handler: async (event) => await this.actionTag(event),
    },
    {
      type: 'button',
      text: 'add from space',
      icon: 'planet-outline',
      handler: async (event) => await this.addFromSpace(event),
    },
    {
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
    try {
      if (logalot) { console.log(`${lc} __`); }
      const resComment = await Modals.prompt({
        title: 'comment',
        message: 'add text',
        inputPlaceholder: 'text here',
      });
      if (resComment.cancelled || !resComment.value) { return; }
      const text = resComment.value.trim();
      if (logalot) { console.log(`${lc} text: ${text}`); }
      const data: CommentData = { text, textTimestamp: getTimestamp() };

      // create an ibgib with the filename and ext
      const opts:any = {
        parentIbGib: factory.primitive({ib: 'comment'}),
        ib: `comment ${text.length > 10 ? text.substring(0,10) : text}`,
        data,
        dna: true,
        tjp: { uuid: true, timestamp: true },
        nCounter: true,
      };

      if (this.addr) {
        opts.rel8ns = { 'comment on': [this.addr] };
      }

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

      const binAddr = getBinAddr({binHash, binExt: ext});
      const {ib, gib} = h.getIbAndGib({ibGibAddr: binAddr});
      const ibGib = { ib, gib, data: <any>imageBase64 };

      if (logalot) { console.log(`${lc} saving initial ibgib pic with data = imageBase64...`); }
      const resSaveBin = await this.common.ibgibs.put({ibGib});
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
        'pic on': [this.addr],
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
      const newPicAddr = getIbGibAddr({ibGib: newPic});
      await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newPic, linked: true});
      await this.common.ibgibs.registerNewIbGib({ibGib: newPic});
      // need to nav to picture if not in a context, or
      // or if in context need to rel8 to the context.

      // rel8 to context
      if (!this.ibGib) {
        await this.loadIbGib();
        await this.loadTjp();
      }
      const rel8nsToAddByAddr = { pic: [newPicAddr] };
      const resRel8ToContext =
        await V1.rel8({src: this.ibGib, rel8nsToAddByAddr, dna: true, nCounter: true});
      await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToContext});
      const { newIbGib: newContext } = resRel8ToContext;
      await this.common.ibgibs.registerNewIbGib({ibGib: newContext});

      // nav to either the pic we just added, or the new context "in time"
      // to which the pic was added.
      const navToAddr = this.isMeta ?
        getIbGibAddr({ibGib: newPic}) :
        getIbGibAddr({ibGib: newContext});
      await this.navTo({addr: navToAddr});
    } catch (error) {
      console.error(`${lc} ${error.message}`);
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
    try {
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
    }
  }

  async actionShowInfo(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionShowInfo.name}]`;
    try {
      let info = JSON.stringify(this.ibGib_Context, null, 2);
      let addr = getIbGibAddr({ibGib: this.ibGib_Context});
      await Modals.alert({title: addr, message: info});
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
    };
    reader.readAsDataURL(file);
  }

  async actionTag(_: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionTag.name}]`;
    try {
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
        return;

      } else if (resPrompt.index === 1) {

        if (logalot) { console.log(`${lc} create new tag`); }
        tagIbGib = await this.createNewTag();
        if (!tagIbGib) {
          if (logalot) { console.log(`${lc} aborting creating new tag.`); }
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

  async addFromSpace(_: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.addFromSpace.name}]`;
    try {
      if (!this.ibGib) { throw new Error(`There isn't a current ibGib loaded...?`); }
      if (!this.addr) { throw new Error(`There isn't a current ibGib addr loaded...?`); }

      // prompt for the ib^gib addr that we want to import
      const resAddr = await Modals.prompt({
        title: 'ibgib address',
        message: 'enter the ibgib address that you would like to import.',
        inputPlaceholder: 'some ibgib address^123here456',
      });
      if (resAddr.cancelled || !resAddr.value) { return; }
      const addr = resAddr.value.trim();
      const validationErrors = validateIbGibAddr({addr});
      if ((validationErrors ?? []).length > 0) { throw new Error(`Invalid address: ${validationErrors.join('\n')} (E: 343823cb6ab04e6e9a8f7e6de1cd12c8)`); }

      // get our outerspaces that we want to check
      // for the address that we will
      let outerspaceIbGibs: IbGib_V1[] =
        await this.common.ibgibs.getSpecialRel8dIbGibs({
          type: "outerspaces",
          rel8nName: c.SYNC_SPACE_REL8N_NAME,
        });
      if (outerspaceIbGibs.length === 0) {
        let created = await this.common.ibgibs.createOuterspaces();
        if (created) {
          outerspaceIbGibs =
            await this.common.ibgibs.getSpecialRel8dIbGibs({
              type: "outerspaces",
              rel8nName: c.SYNC_SPACE_REL8N_NAME,
            });
        } else {
          return; // returns
        }
      }

      // look in the outerspace(s) for the address

    } catch (error) {
      console.error(`${lc} ${error.message}`)
      await Modals.alert({title: 'something went wrong...', message: error.message});
    }
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => { setTimeout(() => { resolve(); }, ms); });
  }
}

interface TagInfo {
  title: string;
  addr: string;
}