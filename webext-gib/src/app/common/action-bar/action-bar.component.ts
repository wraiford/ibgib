import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import { Plugins, Camera, CameraResultType } from '@capacitor/core';
const { Modals } = Plugins;
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import { IbGibAddr, IbGibRel8ns, V1 } from 'ts-gib';
import { ActionItem, PicData, CommentData } from '../types';
import { hash, getIbGibAddr, getTimestamp, getIbAndGib, pretty } from 'ts-gib/dist/helper';
import { Factory_V1 as factory } from 'ts-gib/dist/V1';


@Component({
  selector: 'action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
})
export class ActionBarComponent
  extends IbgibComponentBase
  implements OnInit {

  protected lc = `[${ActionBarComponent.name}]`;

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) { super.addr = value; }

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
  ];

  @Input()
  items: ActionItem[] = this.DEFAULT_ACTIONS.concat();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  ngOnInit() { }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    console.log(`${lc} updating.`)
    await super.updateIbGib(addr);
    await this.updateActions();
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
      console.log(`${lc} 1`);
      if (resComment.cancelled || !resComment.value) { return; }
      const text = resComment.value.trim();
      console.log(`${lc} text: ${text}`);
      const data: CommentData = { text, textTimestamp: getTimestamp() };

      console.log(`${lc} 2a`);
      // create an ibgib with the filename and ext
      const opts:any = {
        parentIbGib: factory.primitive({ib: 'comment'}),
        ib: `comment ${text.length > 10 ? text.substring(0,10) : text}`,
        data,
        dna: true,
        tpj: { uuid: true }
      };

      if (this.addr) {
        opts.rel8ns = { 'comment on': [this.addr] };
      }

      console.log(`${lc} opts: ${pretty(opts)}`);
      const resCommentIbGib = await factory.firstGen(opts);
      console.log(`${lc} 2b`);
      await this.common.ibgibs.persistTransformResult({resTransform: resCommentIbGib});
      console.log(`${lc} 2c`);
      const { newIbGib: newComment } = resCommentIbGib;
      const newCommentAddr = getIbGibAddr({ibGib: newComment});
      // need to nav to picture if not in a context, or
      // or if in context need to rel8 to the context.

      console.log(`${lc} 3`);
      let navToAddr: string;
      if (this.addr) {
        // if we have a context, rel8 to it
        if (!this.ibGib) { await this.loadIbGib(); }
        const rel8nsToAddByAddr = { comment: [newCommentAddr] };
        const resRel8ToContext =
          await V1.rel8({src: this.ibGib, rel8nsToAddByAddr, dna: true});
        await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToContext});
        const { newIbGib: newContext } = resRel8ToContext;
        const newContextAddr = getIbGibAddr(newContext);

        console.log(`${lc} 4`);
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
        tpj: { uuid: true }
      });
      await this.common.ibgibs.persistTransformResult({resTransform: resPicIbGib});
      const { newIbGib: newPic } = resPicIbGib;
      const newPicAddr = getIbGibAddr({ibGib: newPic});
      // need to nav to picture if not in a context, or
      // or if in context need to rel8 to the context.

      // rel8 to context
      if (!this.ibGib) { await this.loadIbGib(); }
      const rel8nsToAddByAddr = { pic: [newPicAddr] };
      const resRel8ToContext =
        await V1.rel8({src: this.ibGib, rel8nsToAddByAddr, dna: true});
      await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToContext});
      const { newIbGib: newContext } = resRel8ToContext;
      const newContextAddr = getIbGibAddr(newContext);

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
      const tagsIbGib = await this.common.ibgibs.getTagsIbgib({initialize: false});
      const tagAddrs = tagsIbGib.rel8ns.tag;
      const tagOptions = tagAddrs.map(addr => {
        const { ib } = getIbAndGib({ibGibAddr: addr});
        const tag = ib.substring('tag '.length);
        return { title: tag };
      });
      let resPrompt = await Modals.showActions({
        title: 'Select tag',
        message: 'Select a tag to add this ibGib to',
        options: [{title: 'Cancel Tag'}, ...tagOptions]
      });

      if (resPrompt.index > 0) {
        await Plugins.Modals.alert({title: 'selected', message: tagOptions[resPrompt.index-1].title});
      } else {
        await Plugins.Modals.alert({title: 'nope', message: 'cancelled'});
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`)
    }
  }
}
