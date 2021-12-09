import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { Plugins, Camera, CameraResultType, ActionSheetOptionStyle, ActionSheetResult } from '@capacitor/core';
const { Modals } = Plugins;
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbGibAddr, IbGibRel8ns, V1 } from 'ts-gib';
import { ActionItem, PicData, CommentData } from '../types';
import { hash, getIbGibAddr, getTimestamp, getIbAndGib, pretty } from 'ts-gib/dist/helper';
import { Factory_V1 as factory, IbGibRel8ns_V1, Rel8n, IbGib_V1 } from 'ts-gib/dist/V1';
import * as ionicons from 'ionicons/icons/index';
import { getBinAddr } from '../helper';

import * as h from 'ts-gib/dist/helper';
import * as c from '../constants';

const logALot = c.GLOBAL_LOG_A_LOT || false;;

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
      text: 'info',
      icon: 'information',
      handler: async (event) => await this.actionShowInfo(event),
    },
  ];

  @Input()
  items: ActionItem[] = this.DEFAULT_ACTIONS.concat();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  ngOnInit() {
    if (logALot) { console.log(`${this.lc} addr: ${this.addr}`); }
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logALot) { console.log(`${lc} updating...`); }
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.updateActions();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logALot) { console.log(`${lc} updated.`); }
    }
  }

  async updateActions(): Promise<void> {
    this.items = this.DEFAULT_ACTIONS.concat(); // dev only
  }

  async actionAddComment(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddComment.name}]`;
    try {
      if (logALot) { console.log(`${lc} __`); }
      const resComment = await Modals.prompt({
        title: 'comment',
        message: 'add text',
        inputPlaceholder: 'text here',
      });
      if (resComment.cancelled || !resComment.value) { return; }
      const text = resComment.value.trim();
      if (logALot) { console.log(`${lc} text: ${text}`); }
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

      if (logALot) { console.log(`${lc} opts: ${pretty(opts)}`); }
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
        // const newContextAddr = getIbGibAddr(newContext);
        await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newContext, linked: true});
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

    const binAddr = getBinAddr({binHash, binExt: ext});
    const {ib, gib} = h.getIbAndGib({ibGibAddr: binAddr});
    const ibGib = { ib, gib, data: <any>imageBase64 };
    const resSaveBin = await this.common.ibgibs.put({ibGib});
      // await this.ibgibs.put({binData: image.base64String, binExt: ext});
    if (!resSaveBin.success) { throw new Error(resSaveBin.errorMsg || 'error saving pic'); }

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

    if (logALot) { console.log(`${lc} binHash: ${binHash}`); }
    if (logALot) { console.log(`${lc} ext: ${ext}`); }
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
    // const newContextAddr = getIbGibAddr(newContext);
    await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newContext, linked: true});
    await this.common.ibgibs.registerNewIbGib({ibGib: newContext});

    // nav to either the pic we just added, or the new context "in time"
    // to which the pic was added.
    const navToAddr = this.isMeta ?
      getIbGibAddr({ibGib: newPic}) :
      getIbGibAddr({ibGib: newContext});
    await this.navTo({addr: navToAddr});
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
      if (logALot) { console.log('File format not supported'); }
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

        if (logALot) { console.log(`${lc} cancelled`); }
        await Plugins.Modals.alert({ title: 'nope', message: 'cancelled' });
        return;

      } else if (resPrompt.index === 1) {

        if (logALot) { console.log(`${lc} create new tag`); }
        tagIbGib = await this.createNewTag();

      } else {

        if (logALot) { console.log(`${lc} tag with existing tag, but may not be latest addr`); }
        const tagInfo: TagInfo = tagInfos[resPrompt.index - 2];
        const resTagIbGib = await this.common.ibgibs.get({addr: tagInfo.addr});
        if (resTagIbGib.success && resTagIbGib.ibGibs?.length === 1) {
          const rel8dTagIbGibAddr = getIbGibAddr({ibGib: resTagIbGib.ibGibs[0]});
          if (logALot) { console.log(`${lc} the rel8d tag may not be the latest: ${rel8dTagIbGibAddr}`); }
          const latestTagAddr = await this.common.ibgibs.getLatestAddr({ibGib: resTagIbGib.ibGibs[0]});
          if (logALot) { console.log(`${lc} latestTagAddr: ${latestTagAddr}`); }
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

      if (logALot) { console.log(`${lc} tag successful.`); }
      await Modals.alert({title: 'yess', message: `Tagged.`});
    } catch (error) {
      console.error(`${lc} ${error.message}`)
      await Modals.alert({title: 'something went wrong...', message: error.message});
    }

  }

  async createNewTag(): Promise<IbGib_V1> {
    const lc = `${this.lc}[${this.createNewTag.name}]`;
    let icon: string;
    let tagText: string;

    let options = IONICONS.map(iconText => {
      if (logALot) { console.log(`${lc} ${iconText}`); }
      return {
        title: iconText,
        icon: iconText,
      };
    });

    for (let i = 0; i < 10; i++) {
      let resTagText = await Plugins.Modals.prompt({
        title: 'Tag Text?',
        message: `What's the tag called?`,
        cancelButtonTitle: 'Cancel',
        okButtonTitle: 'Create Tag',
      });

      if (resTagText.cancelled || !resTagText.value) {
        if (logALot) { console.log(`${lc} cancelled? no value?`) }
        return;
      }

      if (c.ILLEGAL_TAG_TEXT_CHARS.some(x => resTagText.value.includes(x))) {
        await Plugins.Modals.alert({
          title: 'Nope...',
          message: `Tag Text can't contain spaces or ${c.ILLEGAL_TAG_TEXT_CHARS}`,
        });
      } else {
        tagText = resTagText.value;
        if (logALot) { console.log(`${lc} tagText: ${tagText}`); }
        break;
      }
    }

    if (logALot) { console.log(`${lc} resIcon stuff`) }

      let resIcon: ActionSheetResult;
      try {
        await this.delay(200); // some problem with ionic showing the modal too soon.
        resIcon = await Plugins.Modals.showActions({
          title: 'Tag Icon?',
          message: 'Type in the icon',
          options: [{title: 'Cancel'}, ...options],
        });
        if (logALot) { console.log(`${lc} whaaaa`) }
      } catch (error) {
        console.error(`${lc} error: ${error.message}`);
        return;
      }

      // cancel index
      if (resIcon.index === 0) {
        if (logALot) { console.log(`${lc} (cancelling) resIcon.index: ${resIcon.index}`); }
        return;
      } else {
        if (logALot) { console.log(`${lc} resIcon.index: ${resIcon.index}`); }
      }
      icon = options[resIcon.index-1].icon;


      const resNewTag =
        await this.common.ibgibs.createTagIbGib({text: tagText, icon, description: ''});
      return resNewTag.newTagIbGib;
    // });


  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => { setTimeout(() => { resolve(); }, ms); });
  }
}

interface TagInfo {
  title: string;
  addr: string;
}

const IONICONS = [
  'add',
  'add-circle',
  'alert',
  'alert-circle',
  'add',
  'airplane',
  'alarm',
  'albums',
  'alert',
  'alertCircle',
  'americanFootball',
  'analytics',
  'aperture',
  'apps',
  'archive',
  'arrowBack',
  'arrowBackCircle',
  'arrowDown',
  'arrowDownCircle',
  'arrowForward',
  'arrowForwardCircle',
  'arrowRedo',
  'arrowRedoCircle',
  'arrowUndo',
  'arrowUndoCircle',
  'arrowUp',
  'arrowUpCircle',
  'at',
  'atCircle',
  'attach',
  'backspace',
  'bandage',
  'barChart',
  'barbell',
  'barcode',
  'baseball',
  'basket',
  'basketball',
  'batteryCharging',
  'batteryDead',
  'batteryFull',
  'batteryHalf',
  'beaker',
  'bed',
  'beer',
  'bicycle',
  'bluetooth',
  'boat',
  'body',
  'bonfire',
  'book',
  'bookmark',
  'bookmarks',
  'briefcase',
  'browsers',
  'brush',
  'bug',
  'build',
  'bulb',
  'bus',
  'business',
  'cafe',
  'calculator',
  'calendar',
  'call',
  'camera',
  'cameraReverse',
  'car',
  'carSport',
  'card',
  'caretBack',
  'caretBackCircle',
  'caretDown',
  'caretDownCircle',
  'caretForward',
  'caretForwardCircle',
  'caretUp',
  'caretUpCircle',
  'cart',
  'cash',
  'cellular',
  'chatbox',
  'chatboxEllipses',
  'chatbubble',
  'chatbubbleEllipses',
  'chatbubbles',
  'checkbox',
  'checkmark',
  'checkmarkCircle',
  'checkmarkDone',
  'checkmarkDoneCircle',
  'chevronBack',
  'chevronBackCircle',
  'chevronDown',
  'chevronDownCircle',
  'chevronForward',
  'chevronForwardCircle',
  'chevronUp',
  'chevronUpCircle',
  'clipboard',
  'close',
  'closeCircle',
  'cloud',
  'cloudCircle',
  'cloudDone',
  'cloudDownload',
  'cloudOffline',
  'cloudUpload',
  'cloudy',
  'cloudyNight',
  'code',
  'codeDownload',
  'codeSlash',
  'codeWorking',
  'cog',
  'colorFill',
  'colorFilter',
  'colorPalette',
  'colorWand',
  'compass',
  'construct',
  'contract',
  'contrast',
  'copy',
  'create',
  'crop',
  'cube',
  'cut',
  'desktop',
  'disc',
  'document',
  'documentAttach',
  'documentText',
  'documents',
  'download',
  'duplicate',
  'ear',
  'earth',
  'easel',
  'egg',
  'ellipse',
  'ellipsisHorizontal',
  'ellipsisHorizontalCircle',
  'ellipsisVertical',
  'ellipsisVerticalCircle',
  'enter',
  'exit',
  'expand',
  'eye',
  'eyeOff',
  'eyedrop',
  'fastFood',
  'female',
  'fileTray',
  'fileTrayFull',
  'fileTrayStacked',
  'film',
  'filter',
  'fingerPrint',
  'fitness',
  'flag',
  'flame',
  'flash',
  'flashOff',
  'flashlight',
  'flask',
  'flower',
  'folder',
  'folderOpen',
  'football',
  'funnel',
  'gameController',
  'gift',
  'gitBranch',
  'gitCommit',
  'gitCompare',
  'gitMerge',
  'gitNetwork',
  'gitPullRequest',
  'glasses',
  'globe',
  'golf',
  'grid',
  'hammer',
  'handLeft',
  'handRight',
  'happy',
  'hardwareChip',
  'headset',
  'heart',
  'heartCircle',
  'heartDislike',
  'heartDislikeCircle',
  'heartHalf',
  'help',
  'helpBuoy',
  'helpCircle',
  'home',
  'hourglass',
  'iceCream',
  'image',
  'images',
  'infinite',
  'information',
  'informationCircle',
  'journal',
  'key',
  'keypad',
  'language',
  'laptop',
  'layers',
  'leaf',
  'library',
  'link',
  'list',
  'listCircle',
  'locate',
  'location',
  'lockClosed',
  'lockOpen',
  'logIn',
  'magnet',
  'mail',
  'mailOpen',
  'mailUnread',
  'male',
  'maleFemale',
  'man',
  'map',
  'medal',
  'medical',
  'medkit',
  'megaphone',
  'menu',
  'mic',
  'micCircle',
  'micOff',
  'micOffCircle',
  'moon',
  'move',
  'musicalNote',
  'musicalNotes',
  'navigate',
  'navigateCircle',
  'newspaper',
  'notifications',
  'notificationsCircle',
  'notificationsOff',
  'notificationsOffCircle',
  'nuclear',
  'nutrition',
  'open',
  'options',
  'paperPlane',
  'partlySunny',
  'pause',
  'pauseCircle',
  'paw',
  'pencil',
  'people',
  'peopleCircle',
  'person',
  'personAdd',
  'personCircle',
  'personRemove',
  'phoneLandscape',
  'phonePortrait',
  'pieChart',
  'pin',
  'pint',
  'pizza',
  'planet',
  'play',
  'playBack',
  'playBackCircle',
  'playCircle',
  'playForward',
  'playForwardCircle',
  'playSkipBack',
  'playSkipBackCircle',
  'playSkipForward',
  'playSkipForwardCircle',
  'podium',
  'power',
  'pricetag',
  'pricetags',
  'print',
  'pulse',
  'push',
  'qrCode',
  'radio',
  'radioButtonOff',
  'radioButtonOn',
  'rainy',
  'reader',
  'receipt',
  'recording',
  'refresh',
  'refreshCircle',
  'reload',
  'reloadCircle',
  'remove',
  'removeCircle',
  'reorderFour',
  'reorderThree',
  'reorderTwo',
  'repeat',
  'resize',
  'restaurant',
  'returnDownBack',
  'returnDownForward',
  'returnUpBack',
  'returnUpForward',
  'ribbon',
  'rocket',
  'rose',
  'sad',
  'save',
  'scan',
  'scanCircle',
  'school',
  'search',
  'searchCircle',
  'send',
  'server',
  'settings',
  'shapes',
  'share',
  'shareSocial',
  'shield',
  'shieldCheckmark',
  'shirt',
  'shuffle',
  'skull',
  'snow',
  'speedometer',
  'square',
  'star',
  'starHalf',
  'statsChart',
  'stop',
  'stopCircle',
  'stopwatch',
  'subway',
  'sunny',
  'swapHorizontal',
  'swapVertical',
  'sync',
  'syncCircle',
  'tabletLandscape',
  'tabletPortrait',
  'tennisball',
  'terminal',
  'text',
  'thermometer',
  'thumbsDown',
  'thumbsUp',
  'thunderstorm',
  'time',
  'timer',
  'today',
  'toggle',
  'trailSign',
  'train',
  'transgender',
  'trash',
  'trashBin',
  'trendingDown',
  'trendingUp',
  'triangle',
  'trophy',
  'tv',
  'umbrella',
  'videocam',
  'volumeHigh',
  'volumeLow',
  'volumeMedium',
  'volumeMute',
  'volumeOff',
  'walk',
  'wallet',
  'warning',
  'watch',
  'water',
  'wifi',
  'wine',
  'woman',
];
