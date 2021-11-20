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
import { ILLEGAL_TAG_TEXT_CHARS } from '../constants';

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
    console.log(`${this.lc} addr: ${this.addr}`);
  }

  // async updateIbGib(addr: IbGibAddr): Promise<void> {
  //   const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
  //   console.log(`${lc} updating.`)
  //   await super.updateIbGib(addr);
  //   await this.updateActions();
  // }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc} updating...`);
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.updateActions();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      console.log(`${lc} updated.`);
    }
  }

  async updateActions(): Promise<void> {
    this.items = this.DEFAULT_ACTIONS.concat(); // dev only
  }

  async actionAddComment(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddComment.name}]`;
    try {
      console.log(`${lc} __`);
      const resComment = await Modals.prompt({
        title: 'comment',
        message: 'add text',
        inputPlaceholder: 'text here',
      });
      if (resComment.cancelled || !resComment.value) { return; }
      const text = resComment.value.trim();
      console.log(`${lc} text: ${text}`);
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

      console.log(`${lc} opts: ${pretty(opts)}`);
      const resCommentIbGib = await factory.firstGen(opts);
      await this.common.files.persistTransformResult({resTransform: resCommentIbGib});
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
        await this.common.files.persistTransformResult({resTransform: resRel8ToContext});
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

      const resSavePic =
        await this.files.put({binData: imageBase64, binExt: ext});
        // await this.files.put({binData: image.base64String, binExt: ext});
      if (!resSavePic.success) { throw new Error(resSavePic.errorMsg || 'error saving pic'); }
      if (!resSavePic.binHash) { throw new Error(resSavePic.errorMsg || 'no bin hash created'); }

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

      console.log(`${lc} binHash: ${binHash}`);
      console.log(`${lc} ext: ${ext}`);
      const data: PicData = { binHash, ext, filename, timestamp };
      const rel8ns: IbGibRel8ns = { 'pic on': [this.addr] };

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
      await this.common.files.persistTransformResult({resTransform: resPicIbGib});
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
      await this.common.files.persistTransformResult({resTransform: resRel8ToContext});
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
      console.log('File format not supported');
      return;
    }

    reader.onload = async (f: any) => {
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

  async actionTag(event: MouseEvent): Promise<void> {
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

        // cancelled
        await Plugins.Modals.alert({ title: 'nope', message: 'cancelled' });
        return;

      } else if (resPrompt.index === 1) {

        // create new tag
        tagIbGib = await this.createNewTag();

      } else {

        // tag with existing tag
        const tagInfo: TagInfo = tagInfos[resPrompt.index - 2];
        const resTagIbGib = await this.common.files.get({addr: tagInfo.addr});
        if (resTagIbGib.success && resTagIbGib.ibGib) {
          tagIbGib = resTagIbGib.ibGib!;
        } else {
          throw new Error(`${resTagIbGib.errorMsg || 'there was a problem getting the tag ibGib.'}`);
        }

      }

      // relate context to tag
      const rel8nsToAddByAddr = { target: [this.addr] };
      const resRel8ToTag =
        await V1.rel8({src: tagIbGib, rel8nsToAddByAddr, dna: true, nCounter: true});
      await this.common.files.persistTransformResult({resTransform: resRel8ToTag});
      const { newIbGib: newTag } = resRel8ToTag;
      await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newTag, linked: true});
      await this.common.ibgibs.registerNewIbGib({ibGib: newTag});

      console.log(`${lc} tag successful.`);

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
      console.log(`${lc} ${iconText}`);
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
        console.log(`${lc} cancelled? no value?`)
        return; 
      }

      if (ILLEGAL_TAG_TEXT_CHARS.some(x => resTagText.value.includes(x))) {
        await Plugins.Modals.alert({
          title: 'Nope...', 
          message: `Tag Text can't contain spaces or ${ILLEGAL_TAG_TEXT_CHARS}`,
        });
      } else {
        tagText = resTagText.value;
        console.log(`${lc} tagText: ${tagText}`);
        break;
      }
    }

    console.log(`${lc} resIcon stuff`)

      let resIcon: ActionSheetResult;
      try {
        await this.delay(200); // some problem with ionic showing the modal too soon.
        resIcon = await Plugins.Modals.showActions({
          title: 'Tag Icon?',
          message: 'Type in the icon',
          options: [{title: 'Cancel'}, ...options],
        });
        console.log(`${lc} whaaaa`)
      } catch (error) {
        console.error(`${lc} error: ${error.message}`);
        return;
      }

      // cancel index
      if (resIcon.index === 0) { 
        console.log(`${lc} (cancelling) resIcon.index: ${resIcon.index}`);
        return; 
      } else {
        console.log(`${lc} resIcon.index: ${resIcon.index}`);
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

// ionicons.add,
// ionicons.airplane,
// ionicons.alarm,
// ionicons.albums,
// ionicons.alert,
// ionicons.alertCircle,
// ionicons.americanFootball,
// ionicons.analytics,
// ionicons.aperture,
// ionicons.apps,
// ionicons.archive,
// ionicons.arrowBack,
// ionicons.arrowBackCircle,
// ionicons.arrowDown,
// ionicons.arrowDownCircle,
// ionicons.arrowForward,
// ionicons.arrowForwardCircle,
// ionicons.arrowRedo,
// ionicons.arrowRedoCircle,
// ionicons.arrowUndo,
// ionicons.arrowUndoCircle,
// ionicons.arrowUp,
// ionicons.arrowUpCircle,
// ionicons.at,
// ionicons.atCircle,
// ionicons.attach,
// ionicons.backspace,
// ionicons.bandage,
// ionicons.barChart,
// ionicons.barbell,
// ionicons.barcode,
// ionicons.baseball,
// ionicons.basket,
// ionicons.basketball,
// ionicons.batteryCharging,
// ionicons.batteryDead,
// ionicons.batteryFull,
// ionicons.batteryHalf,
// ionicons.beaker,
// ionicons.bed,
// ionicons.beer,
// ionicons.bicycle,
// ionicons.bluetooth,
// ionicons.boat,
// ionicons.body,
// ionicons.bonfire,
// ionicons.book,
// ionicons.bookmark,
// ionicons.bookmarks,
// ionicons.briefcase,
// ionicons.browsers,
// ionicons.brush,
// ionicons.bug,
// ionicons.build,
// ionicons.bulb,
// ionicons.bus,
// ionicons.business,
// ionicons.cafe,
// ionicons.calculator,
// ionicons.calendar,
// ionicons.call,
// ionicons.camera,
// ionicons.cameraReverse,
// ionicons.car,
// ionicons.carSport,
// ionicons.card,
// ionicons.caretBack,
// ionicons.caretBackCircle,
// ionicons.caretDown,
// ionicons.caretDownCircle,
// ionicons.caretForward,
// ionicons.caretForwardCircle,
// ionicons.caretUp,
// ionicons.caretUpCircle,
// ionicons.cart,
// ionicons.cash,
// ionicons.cellular,
// ionicons.chatbox,
// ionicons.chatboxEllipses,
// ionicons.chatbubble,
// ionicons.chatbubbleEllipses,
// ionicons.chatbubbles,
// ionicons.checkbox,
// ionicons.checkmark,
// ionicons.checkmarkCircle,
// ionicons.checkmarkDone,
// ionicons.checkmarkDoneCircle,
// ionicons.chevronBack,
// ionicons.chevronBackCircle,
// ionicons.chevronDown,
// ionicons.chevronDownCircle,
// ionicons.chevronForward,
// ionicons.chevronForwardCircle,
// ionicons.chevronUp,
// ionicons.chevronUpCircle,
// ionicons.clipboard,
// ionicons.close,
// ionicons.closeCircle,
// ionicons.cloud,
// ionicons.cloudCircle,
// ionicons.cloudDone,
// ionicons.cloudDownload,
// ionicons.cloudOffline,
// ionicons.cloudUpload,
// ionicons.cloudy,
// ionicons.cloudyNight,
// ionicons.code,
// ionicons.codeDownload,
// ionicons.codeSlash,
// ionicons.codeWorking,
// ionicons.cog,
// ionicons.colorFill,
// ionicons.colorFilter,
// ionicons.colorPalette,
// ionicons.colorWand,
// ionicons.compass,
// ionicons.construct,
// ionicons.contract,
// ionicons.contrast,
// ionicons.copy,
// ionicons.create,
// ionicons.crop,
// ionicons.cube,
// ionicons.cut,
// ionicons.desktop,
// ionicons.disc,
// ionicons.document,
// ionicons.documentAttach,
// ionicons.documentText,
// ionicons.documents,
// ionicons.download,
// ionicons.duplicate,
// ionicons.ear,
// ionicons.earth,
// ionicons.easel,
// ionicons.egg,
// ionicons.ellipse,
// ionicons.ellipsisHorizontal,
// ionicons.ellipsisHorizontalCircle,
// ionicons.ellipsisVertical,
// ionicons.ellipsisVerticalCircle,
// ionicons.enter,
// ionicons.exit,
// ionicons.expand,
// ionicons.eye,
// ionicons.eyeOff,
// ionicons.eyedrop,
// ionicons.fastFood,
// ionicons.female,
// ionicons.fileTray,
// ionicons.fileTrayFull,
// ionicons.fileTrayStacked,
// ionicons.film,
// ionicons.filter,
// ionicons.fingerPrint,
// ionicons.fitness,
// ionicons.flag,
// ionicons.flame,
// ionicons.flash,
// ionicons.flashOff,
// ionicons.flashlight,
// ionicons.flask,
// ionicons.flower,
// ionicons.folder,
// ionicons.folderOpen,
// ionicons.football,
// ionicons.funnel,
// ionicons.gameController,
// ionicons.gift,
// ionicons.gitBranch,
// ionicons.gitCommit,
// ionicons.gitCompare,
// ionicons.gitMerge,
// ionicons.gitNetwork,
// ionicons.gitPullRequest,
// ionicons.glasses,
// ionicons.globe,
// ionicons.golf,
// ionicons.grid,
// ionicons.hammer,
// ionicons.handLeft,
// ionicons.handRight,
// ionicons.happy,
// ionicons.hardwareChip,
// ionicons.headset,
// ionicons.heart,
// ionicons.heartCircle,
// ionicons.heartDislike,
// ionicons.heartDislikeCircle,
// ionicons.heartHalf,
// ionicons.help,
// ionicons.helpBuoy,
// ionicons.helpCircle,
// ionicons.home,
// ionicons.hourglass,
// ionicons.iceCream,
// ionicons.image,
// ionicons.images,
// ionicons.infinite,
// ionicons.information,
// ionicons.informationCircle,
// ionicons.journal,
// ionicons.key,
// ionicons.keypad,
// ionicons.language,
// ionicons.laptop,
// ionicons.layers,
// ionicons.leaf,
// ionicons.library,
// ionicons.link,
// ionicons.list,
// ionicons.listCircle,
// ionicons.locate,
// ionicons.location,
// ionicons.lockClosed,
// ionicons.lockOpen,
// ionicons.logIn,
// ionicons.magnet,
// ionicons.mail,
// ionicons.mailOpen,
// ionicons.mailUnread,
// ionicons.male,
// ionicons.maleFemale,
// ionicons.man,
// ionicons.map,
// ionicons.medal,
// ionicons.medical,
// ionicons.medkit,
// ionicons.megaphone,
// ionicons.menu,
// ionicons.mic,
// ionicons.micCircle,
// ionicons.micOff,
// ionicons.micOffCircle,
// ionicons.moon,
// ionicons.move,
// ionicons.musicalNote,
// ionicons.musicalNotes,
// ionicons.navigate,
// ionicons.navigateCircle,
// ionicons.newspaper,
// ionicons.notifications,
// ionicons.notificationsCircle,
// ionicons.notificationsOff,
// ionicons.notificationsOffCircle,
// ionicons.nuclear,
// ionicons.nutrition,
// ionicons.open,
// ionicons.options,
// ionicons.paperPlane,
// ionicons.partlySunny,
// ionicons.pause,
// ionicons.pauseCircle,
// ionicons.paw,
// ionicons.pencil,
// ionicons.people,
// ionicons.peopleCircle,
// ionicons.person,
// ionicons.personAdd,
// ionicons.personCircle,
// ionicons.personRemove,
// ionicons.phoneLandscape,
// ionicons.phonePortrait,
// ionicons.pieChart,
// ionicons.pin,
// ionicons.pint,
// ionicons.pizza,
// ionicons.planet,
// ionicons.play,
// ionicons.playBack,
// ionicons.playBackCircle,
// ionicons.playCircle,
// ionicons.playForward,
// ionicons.playForwardCircle,
// ionicons.playSkipBack,
// ionicons.playSkipBackCircle,
// ionicons.playSkipForward,
// ionicons.playSkipForwardCircle,
// ionicons.podium,
// ionicons.power,
// ionicons.pricetag,
// ionicons.pricetags,
// ionicons.print,
// ionicons.pulse,
// ionicons.push,
// ionicons.qrCode,
// ionicons.radio,
// ionicons.radioButtonOff,
// ionicons.radioButtonOn,
// ionicons.rainy,
// ionicons.reader,
// ionicons.receipt,
// ionicons.recording,
// ionicons.refresh,
// ionicons.refreshCircle,
// ionicons.reload,
// ionicons.reloadCircle,
// ionicons.remove,
// ionicons.removeCircle,
// ionicons.reorderFour,
// ionicons.reorderThree,
// ionicons.reorderTwo,
// ionicons.repeat,
// ionicons.resize,
// ionicons.restaurant,
// ionicons.returnDownBack,
// ionicons.returnDownForward,
// ionicons.returnUpBack,
// ionicons.returnUpForward,
// ionicons.ribbon,
// ionicons.rocket,
// ionicons.rose,
// ionicons.sad,
// ionicons.save,
// ionicons.scan,
// ionicons.scanCircle,
// ionicons.school,
// ionicons.search,
// ionicons.searchCircle,
// ionicons.send,
// ionicons.server,
// ionicons.settings,
// ionicons.shapes,
// ionicons.share,
// ionicons.shareSocial,
// ionicons.shield,
// ionicons.shieldCheckmark,
// ionicons.shirt,
// ionicons.shuffle,
// ionicons.skull,
// ionicons.snow,
// ionicons.speedometer,
// ionicons.square,
// ionicons.star,
// ionicons.starHalf,
// ionicons.statsChart,
// ionicons.stop,
// ionicons.stopCircle,
// ionicons.stopwatch,
// ionicons.subway,
// ionicons.sunny,
// ionicons.swapHorizontal,
// ionicons.swapVertical,
// ionicons.sync,
// ionicons.syncCircle,
// ionicons.tabletLandscape,
// ionicons.tabletPortrait,
// ionicons.tennisball,
// ionicons.terminal,
// ionicons.text,
// ionicons.thermometer,
// ionicons.thumbsDown,
// ionicons.thumbsUp,
// ionicons.thunderstorm,
// ionicons.time,
// ionicons.timer,
// ionicons.today,
// ionicons.toggle,
// ionicons.trailSign,
// ionicons.train,
// ionicons.transgender,
// ionicons.trash,
// ionicons.trashBin,
// ionicons.trendingDown,
// ionicons.trendingUp,
// ionicons.triangle,
// ionicons.trophy,
// ionicons.tv,
// ionicons.umbrella,
// ionicons.videocam,
// ionicons.volumeHigh,
// ionicons.volumeLow,
// ionicons.volumeMedium,
// ionicons.volumeMute,
// ionicons.volumeOff,
// ionicons.walk,
// ionicons.wallet,
// ionicons.warning,
// ionicons.watch,
// ionicons.water,
// ionicons.wifi,
// ionicons.wine,
// ionicons.woman,
];
