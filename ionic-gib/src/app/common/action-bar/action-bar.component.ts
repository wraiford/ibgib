import { Component, OnInit, ChangeDetectorRef, Input } from '@angular/core';
import {
  Plugins, Camera, CameraResultType,
} from '@capacitor/core';
const { Modals } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, V1 } from 'ts-gib';
import { hash, getIbGibAddr, getTimestamp, pretty } from 'ts-gib/dist/helper';
import { Factory_V1 as factory, IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { CommonService } from 'src/app/services/common.service';
import {
  ActionItem, CommentData, SyncSpaceResultIbGib, ActionItemName,
} from '../types';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import {
  getCommentIb, getDependencyGraph,
  getFnAlert, getFnPrompt,
  getFromSpace, validateIbGibAddr,
} from '../helper';
import { createAndAddPicIbGib } from '../helper/pic';


const logalot = c.GLOBAL_LOG_A_LOT || false;
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
      name: 'comment',
      type: 'button',
      text: 'comment',
      icons: ['chatbox-outline'],
      handler: async (event) => await this.actionAddComment(event),
    },
    {
      name: 'camera',
      type: 'inputfile-camera',
      text: 'camera',
      icons: ['camera-outline'],
      filepicked: async (event) => await this.handleHtml5PicButton(event),
    },
    {
      name: 'file',
      type: 'inputfile',
      text: 'image',
      icons: ['image-outline'],
      filepicked: async (event) => await this.actionAddImage(event, 'file'),
    },
    {
      name: 'import',
      type: 'button',
      text: 'add from space',
      icons: ['sparkles-outline', 'download-outline'],
      handler: async (event) => await this.addImport(event),
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
      // await this.common.ibgibs.rel8ToCurrentRoot({ibGib: newComment, linked: true});
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
      // await this.go({
      //   toAddr: navToAddr,
      //   fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
      // });

    } catch (error) {
      console.error(`${lc} ${error.message}`)
    } finally {
      if (actionItem) {
        actionItem.busy = false;
        this.ref.detectChanges();
      }
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

      // ...persist it...
      await this.common.ibgibs.persistTransformResult({resTransform: resRel8ToContext});

      // ...register the context.
      const { newIbGib: newContext } = resRel8ToContext;
      await this.common.ibgibs.registerNewIbGib({ibGib: newContext});

      // nav to either the ibGib we just added, or the new context frame that we
      // just created via the rel8 transform
      if (navigateAfter) {
        const navToAddr = this.isMeta ?
          getIbGibAddr({ibGib: ibGibToRel8}) :
          getIbGibAddr({ibGib: newContext});
        await this.go({
          toAddr: navToAddr,
          fromAddr: h.getIbGibAddr({ibGib: this.ibGib_Context}),
        });
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

      const newPic = await createAndAddPicIbGib({
        imageBase64: image.base64String,
        binHash,
        ext,
        common: this.common
      });

      // rel8 to context and nav
      await this._rel8ToCurrentContext({
        ibGibToRel8: newPic,
        rel8nNames: ['pic'],
        navigateAfter: true,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`)
    } finally {
      if (actionItem) {
        actionItem.busy = false;
        this.ref.detectChanges();
      }
    }
  }

  async handleHtml5PicButton(event: any): Promise<void> {
    await this.actionAddImage(event, 'camera');
  }

  async actionAddImage(event: any, actionItemName: ActionItemName): Promise<void> {
    const lc = `${this.lc}[${this.actionAddImage.name}]`;
    let actionItem: ActionItem;
    try {
      actionItem = this.items.filter(x => x.name === actionItemName)[0];
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
        const lc2 = `${lc}[reader.onload]`;
        try {
          if (logalot) { console.log(`${lc2} starting... (I: 1e948476ca86b328a12700dc57be0a22)`); }
          let imageBase64 = reader.result.toString().split('base64,')[1];
          let binHash = await hash({s: imageBase64});
          const filenameWithExt = file.name;
          const filenamePieces = filenameWithExt.split('.');
          const filename = filenamePieces.slice(0, filenamePieces.length-1).join('.');
          const ext = filenamePieces.slice(filenamePieces.length-1)[0];

          const newPic = await createAndAddPicIbGib({
            imageBase64: imageBase64,
            binHash,
            filename,
            ext,
            common: this.common
          });

          // rel8 to context and nav
          await this._rel8ToCurrentContext({
            ibGibToRel8: newPic,
            rel8nNames: ['pic'],
            navigateAfter: true,
          });
        } catch (error) {
          console.error(`${lc2} ${error.message}`);
          throw error;
        } finally {
          if (actionItem) {
            actionItem.busy = false;
            this.ref.detectChanges();
          }
          if (logalot) { console.log(`${lc2} complete. (I: d88dcaeb874c4f049d51d58655dc2b62)`); }
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
          await this.common.ibgibs.registerNewIbGib({ibGib: gotIbGib});
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
      await Modals.alert({title: 'something went awry...', message: error.message});
    } finally {
      actionItem.busy = false;
      this.ref.detectChanges();
    }
  }

}
