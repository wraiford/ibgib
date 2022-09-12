import {
  Component, OnInit, ChangeDetectorRef,
  Input, ViewChild, AfterViewInit, EventEmitter, Output, ElementRef,
} from '@angular/core';
import { IonInput, IonText, IonTextarea } from '@ionic/angular';
import { Plugins, } from '@capacitor/core';
const { Modals } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult, V1 } from 'ts-gib';
import { IbGibRel8ns_V1, IbGib_V1, isDna } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { ActionItem, ActionItemName } from '../types/ux';
import { createPicAndBinIbGibsFromInputFilePickedEvent } from '../helper/pic';
import { createCommentIbGib } from '../helper/comment';
import { createLinkIbGib } from '../helper/link';
import { getFnAlert, getFnPrompt } from '../helper/prompt-functions';
import { getFromSpace, putInSpace } from '../helper/space';
import { getDependencyGraph, } from '../helper/graph';
import { validateIbGibAddr, validateIbGibIntrinsically } from '../helper/validate';
import { PicIbGib_V1 } from '../types/pic';
import { BinIbGib_V1 } from '../types/bin';
import { RawExportIbGib_V1 } from '../types/import-export';
import { getTimelinesGroupedByTjp, } from '../helper/ibgib';


const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'action-bar',
  templateUrl: './action-bar.component.html',
  styleUrls: ['./action-bar.component.scss'],
})
export class ActionBarComponent extends IbgibComponentBase
  implements OnInit, AfterViewInit {

  protected lc = `[${ActionBarComponent.name}]`;

  // @Input()
  // get addr(): IbGibAddr { return super.addr; }
  // set addr(value: IbGibAddr) {
  //   let lc = `${this.lc}[set addr(value: ${value})]`;
  //   super.addr = value;
  // }

  // @Input()
  // get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  // set ibGib_Context(value: IbGib_V1) { super.ibGib_Context = value; }

  /**
   * temporary hack
   */
  DEFAULT_ACTIONS: ActionItem[] = [
    {
      name: 'comment',
      type: 'button',
      text: 'comment',
      icons: ['chatbox-outline'],
      handler: async (event) => await this.handleClick_Comment(event),
    },
    {
      name: 'file',
      type: 'inputfile',
      text: 'image',
      icons: ['image-outline'],
      handler: async (event) => await this.handleClick_Image(event),
    },
    {
      name: 'link',
      type: 'button',
      text: 'link',
      icons: ['link-outline'],
      handler: async (event) => await this.handleClick_Link(event),
    },
    {
      name: 'import',
      type: 'button',
      text: 'add an existing ibgib',
      icons: ['sparkles-outline', 'download-outline'],
      handler: async (event) => await this.handleClick_Import(event),
    },
  ];

  @Input()
  items: ActionItem[] = this.DEFAULT_ACTIONS.concat();

  /**
   * Action detail, e.g., textarea for making a comment.
   *
   * So when you click the comment button, it shows the action detail
   * and sets the mode to 'comment'.
   */
  @Input()
  actionDetailMode: ActionItemName = 'comment';
  /**
   * @see {@link actionDetailMode}
   */
  @Input()
  actionDetailVisible: boolean;
  /**
   * Text bound do comment text detail.
   */
  @Input()
  actionDetailCommentText: string;
  /**
   * Text bound do link text detail.
   */
  @Input()
  actionDetailLinkText: string;
  @Input()
  get linkTextIsValid(): boolean {
    // could do a regex but i'm just doing some simplified checking here.
    const text = (this.actionDetailLinkText ?? '').trimEnd();
    const includesADot = text.includes('.');
    const doesntEndWithDot = !text.endsWith('.');
    const hasNoLineBreaks = !text.includes('\n');
    let isValidHttpsUrl: boolean;
    try {
      const url = new URL(this.actionDetailLinkText);
      isValidHttpsUrl = url.protocol === 'https:';
    } catch (error) {
      isValidHttpsUrl = false;
    }
    return isValidHttpsUrl && includesADot && hasNoLineBreaks && doesntEndWithDot;
  }

  /**
   * Text bound do import ibgib addr detail.
   */
  @Input()
  actionDetailImportText: string;

  @ViewChild('textareaComment')
  textareaComment: IonTextarea;

  @ViewChild('textareaLink')
  textareaLink: IonTextarea;

  @ViewChild('inputImport')
  inputImport: IonTextarea;

  @ViewChild('inputFileImport')
  inputFileImport: ElementRef;

  @Input()
  debounceMs: number = 100;

  /**
   * flag that drives busy indicator of send button
   */
  @Input()
  sending: boolean;

  @Input()
  get addingPic(): boolean { return this._addingPicRefCount > 0; }
  private _addingPicRefCount: number = 0;

  @Input()
  get canSend(): boolean {
    return !this.sending && !this.addingPic;
  }

  @Output()
  actionBtnClick = new EventEmitter<ActionItem>();

  public debugBorderWidth: string = debugBorder ? "22px" : "0px"
  public debugBorderColor: string = "#FFAABB";
  public debugBorderStyle: string = "solid";

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async ngOnInit(): Promise<void> {
    if (logalot) { console.log(`${this.lc} addr: ${this.addr}`); }
    await super.ngOnInit();
  }

  ngAfterViewInit() {
    this.focusDetail();
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

  async handleClick_Comment(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Comment.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.actionDetailVisible) {
        this.actionDetailMode = 'comment';
        this.actionDetailVisible = true;
        this.focusDetail({ force: true });
      } else if (this.actionDetailMode !== 'comment') {
        this.actionDetailMode = 'comment';
        this.focusDetail({ force: true });
      } else if (this.actionDetailMode === 'comment') {
        this.actionDetailVisible = false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_Link(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Link.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.actionDetailVisible) {
        this.actionDetailMode = 'link';
        this.actionDetailVisible = true;
        this.focusDetail({ force: true });
      } else if (this.actionDetailMode !== 'link') {
        this.actionDetailMode = 'link';
        this.focusDetail({ force: true });
      } else if (this.actionDetailMode === 'link') {
        this.actionDetailVisible = false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async send_AddComment(): Promise<void> {
    const lc = `${this.lc}[${this.send_AddComment.name}]`;
    let actionItem: ActionItem;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.sending = true;

      // they've clicked the comment button and there is text in the comment
      // text area.

      actionItem = this.items.filter(x => x.name === 'comment')[0];
      actionItem.busy = true;

      await h.delay(this.debounceMs + 50); // to allow for debounce in binding
      let text = this.actionDetailCommentText ?? ''; // already trimmed
      while (text.endsWith('\n')) {
        text = text.slice(0, text.length - 1);
        text.trimEnd();
      }
      if (!text) { console.log(`${lc} text is empty.`); return; /* <<<< returns early */ }


      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });
      const resCommentIbGib = await createCommentIbGib({
        text,
        saveInSpace: true,
        space,
      });

      const { newIbGib: newComment } = resCommentIbGib;
      const newCommentAddr = h.getIbGibAddr({ ibGib: newComment });
      await this.common.ibgibs.registerNewIbGib({ ibGib: newComment });

      if (!this.ibGib) {
        await this.loadIbGib();
        await this.loadTjp();
      }
      const rel8nsToAddByAddr = { comment: [newCommentAddr] };
      const resRel8ToContext =
        await V1.rel8({ src: this.ibGib, rel8nsToAddByAddr, dna: true, nCounter: true });
      await this.common.ibgibs.persistTransformResult({ resTransform: resRel8ToContext });
      const { newIbGib: newContext } = resRel8ToContext;
      await this.common.ibgibs.registerNewIbGib({ ibGib: newContext });

      this.actionDetailVisible = true;
    } catch (error) {
      console.error(`${lc} ${error.message}`)
    } finally {
      this.actionDetailCommentText = '';
      this.focusDetail();
      if (actionItem) { actionItem.busy = false; }
      this.ref.detectChanges();
      // hack to try to minimize still showing comment text very briefly after sending...
      // not a big deal i don't think
      setTimeout(() => { this.sending = false; this.ref.detectChanges(); }, 500);
    }
  }

  async send_AddLink(): Promise<void> {
    const lc = `${this.lc}[${this.send_AddLink.name}]`;
    let actionItem: ActionItem;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.sending = true;

      // they've clicked the link button and there is text in the link
      // text area.

      actionItem = this.items.filter(x => x.name === 'link')[0];
      actionItem.busy = true;

      await h.delay(this.debounceMs + 50); // to allow for debounce in binding
      const text = this.actionDetailLinkText; // already trimmed
      if (!this.linkTextIsValid) {
        const emsg = `Link text is invalid. it has to be a regular link that starts with https, like "https://ibgib.space"`;
        await (getFnAlert()({ title: 'doh', msg: emsg }));
        throw new Error(`${emsg} (E: d8532b4212b7e528bef384d81f9b5722)`);
      }

      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });
      const resLinkIbGib = await createLinkIbGib({
        text,
        saveInSpace: true,
        space,
      });

      const { newIbGib: newLink } = resLinkIbGib;
      const newLinkAddr = h.getIbGibAddr({ ibGib: newLink });
      await this.common.ibgibs.registerNewIbGib({ ibGib: newLink });

      if (!this.ibGib) {
        await this.loadIbGib();
        await this.loadTjp();
      }
      const rel8nsToAddByAddr = { link: [newLinkAddr] };
      const resRel8ToContext =
        await V1.rel8({ src: this.ibGib, rel8nsToAddByAddr, dna: true, nCounter: true });
      await this.common.ibgibs.persistTransformResult({ resTransform: resRel8ToContext });
      const { newIbGib: newContext } = resRel8ToContext;
      await this.common.ibgibs.registerNewIbGib({ ibGib: newContext });

      this.actionDetailVisible = true;
    } catch (error) {
      console.error(`${lc} ${error.message}`)
    } finally {
      this.actionDetailLinkText = '';
      this.focusDetail();
      if (actionItem) { actionItem.busy = false; }
      this.ref.detectChanges();
      // hack to try to minimize still showing comment text very briefly after sending...
      // not a big deal i don't think
      setTimeout(() => { this.sending = false; this.ref.detectChanges(); }, 500);
      // this.actionDetailLinkText = '';
      // this.focusDetail();
      // if (actionItem) { actionItem.busy = false; }
      // this.sending = false;
      // this.ref.detectChanges();
    }
  }

  /**
   * Performs a rel8 transform, relating the given `ibGibToRel8` to
   * `this.ibGib`. Persists the transform and registers the new
   * ibgib produced (`transform.newIbGib`).
   */
  protected async rel8ToThisIbGib({
    ibGibToRel8,
    rel8nNames,
  }: {
    ibGibToRel8: IbGib_V1,
    rel8nNames: string[],
  }): Promise<void> {
    const lc = `${this.lc}[${this.rel8ToThisIbGib.name}]`;
    try {
      // load the context if not already
      if (!this.ibGib) { await this.loadIbGib(); await this.loadTjp(); }

      // set up the rel8ns to add
      const rel8nsToAddByAddr: IbGibRel8ns_V1 = {};
      const ibGibToRel8Addr = h.getIbGibAddr({ ibGib: ibGibToRel8 });
      rel8nNames.forEach((rel8nName) => {
        rel8nsToAddByAddr[rel8nName] = [ibGibToRel8Addr];
      });

      // perform the rel8 transform and...
      const resRel8ToContext =
        await V1.rel8({
          src: this.ibGib,
          rel8nsToAddByAddr,
          dna: true,
          nCounter: true
        });

      // ...persist it...
      await this.common.ibgibs.persistTransformResult({ resTransform: resRel8ToContext });

      // ...register the context.
      const { newIbGib: newContext } = resRel8ToContext;
      await this.common.ibgibs.registerNewIbGib({ ibGib: newContext });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async handleClick_Image(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Image.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.actionDetailVisible) {
        this.actionDetailMode = 'file';
        this.actionDetailVisible = true;
      } else if (this.actionDetailMode !== 'file') {
        this.actionDetailMode = 'file';
      } else if (this.actionDetailMode === 'file') {
        this.actionDetailVisible = false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAddFileCamClick(event: any, actionItemName: ActionItemName): Promise<void> {
    const lc = `${this.lc}[${this.handleAddFileCamClick.name}]`;
    let actionItem: ActionItem;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d9ef296eec29433fba5d7fd07e9f4a99)`); }

      actionItem = this.items.filter(x => x.name === 'file')[0];
      actionItem.busy = true;
      this._addingPicRefCount++;

      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });

      await h.delay(100);

      const resCreatePicBins =
        await createPicAndBinIbGibsFromInputFilePickedEvent({
          event,
          saveInSpace: false,
          space,
        });

      for (let i = 0; i < resCreatePicBins.length; i++) {
        const [resCreatePic, resCreateBin] = resCreatePicBins[i];
        const binData = resCreateBin.newIbGib.data;
        const picSrc = `data:image/jpeg;base64,${binData}`;
        if (!this.resCreatePicCandidates.some(x => x.picSrc === picSrc)) {
          this.resCreatePicCandidates.push({
            resCreatePic,
            resCreateBin,
            picSrc,
          });
        } else {
          console.warn(`${lc} tried to add duplicate pic`);
        }
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      // doesn't rethrow at this level
    } finally {
      if (actionItem) { actionItem.busy = false; }
      this._addingPicRefCount--;
      if (logalot) { console.log(`${lc} complete. (I: d88dcaeb874c4f049d51d58655dc2b62)`); }
      this.ref.detectChanges();
    }
  }

  async send_AddPics(): Promise<void> {
    const lc = `${this.lc}[${this.send_AddPics.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: e3d4a4d3a388bdd65ecb029dcc5d9f22)`); }
      this.sending = true;

      // do i need to get the space every iteration? hmm...
      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });

      for (let i = 0; i < this.resCreatePicCandidates.length; i++) {

        if (i > 0) { await h.delay(50); } // helps process messages/UI thread

        // get our transform results and manually save/register them
        const { resCreatePic, resCreateBin } = this.resCreatePicCandidates[i];

        // do the bin first
        // persist...
        await this.common.ibgibs.persistTransformResult({
          resTransform: resCreateBin,
          space,
        });
        // ...then register
        await this.common.ibgibs.registerNewIbGib({
          ibGib: resCreateBin.newIbGib,
          space
        });

        // do the pic next...
        // persist...
        await this.common.ibgibs.persistTransformResult({
          resTransform: resCreatePic,
          space,
        });
        // ...then register
        await this.common.ibgibs.registerNewIbGib({
          ibGib: resCreatePic.newIbGib,
          space,
        });

        // rel8 to context, but only register the absolute last context
        // in order to avoid navigating to each interim context.
        await this.rel8ToThisIbGib({
          ibGibToRel8: resCreatePic.newIbGib,
          rel8nNames: ['pic'],
          // only register on the last context
          // registerNewContext: i === this.resCreatePicCandidates.length-1,
        });

      }

      this.resCreatePicCandidates = [];

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.sending = false;
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * we're creating pic/bin ibgibs when user adds one via
   * file picker or camera. But we don't save/register it yet.
   * These are just the candidate infos, that when the user presses
   * the send button, we will add these candidates.
   */
  @Input()
  resCreatePicCandidates: PicCandidate[] = [];

  async handleClick_Import(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Import.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.actionDetailVisible) {
        this.actionDetailMode = 'import';
        this.actionDetailVisible = true;
        this.focusDetail({ force: true });
      } else if (this.actionDetailMode !== 'import') {
        this.actionDetailMode = 'import';
        this.focusDetail({ force: true });
      } else if (this.actionDetailMode === 'import') {
        this.actionDetailVisible = false;
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  async promptForImportAddr(): Promise<IbGibAddr> {
    const lc = `${this.lc}[${this.promptForImportAddr.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const fnPrompt = getFnPrompt();

      // prompt for the ib^gib addr that we want to import and validate result
      const resAddr = (await fnPrompt({
        title: 'ibgib address',
        msg: 'enter the ibgib address that you would like to import.',
      }))?.trim();
      // if (!resAddr) { return; } // <<<< returns early
      return resAddr;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async send_AddImport(): Promise<void> {
    const lc = `${this.lc}[${this.send_AddImport.name}]`;
    let actionItem: ActionItem;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 58a31bb618e8a470afd424b8b74a2822)`); }

      actionItem = this.items.filter(x => x.name === 'import')[0];
      actionItem.busy = true;
      this.sending = true;

      if (!this.ibGib) { throw new Error(`(UNEXPECTED) There isn't a current ibGib loaded...? (E: a683530d0e4246fc9d3f3e3e8eb0737a)`); }
      if (!this.addr) { throw new Error(`(UNEXPECTED) There isn't a current ibGib addr loaded...? (E: 7ca9d32efe164538ad25cda65f23e13d)`); }

      if (this.selectedExportIbGib) {
        await this.send_AddImport_ByFile();
      } else if (this.actionDetailImportText) {
        await this.send_AddImport_ByAddr({ addr: this.actionDetailImportText });
      } else {
        throw new Error(`(UNEXPECTED) either selectedExportIbGib or actionDetailImportText required (E: 28898640fc76e5e549f0f8ed18a38622)`);
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      actionItem.busy = false;
      this.sending = false;
      this.ref.detectChanges();
    }
  }

  /**
   * Import an ibgib from either the local space or our sync spaces to our
   * current context ibgib.
   */
  async send_AddImport_ByAddr({ addr }: { addr: IbGibAddr }): Promise<void> {
    const lc = `${this.lc}[${this.send_AddImport_ByAddr.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 4533c0805fc04df2b9b2cfaccc91579d)`); }

      const fnAlert = getFnAlert();

      if (logalot) { console.log(`${lc} prompting for address to import.`); }

      // const addr = ;

      const validationErrors = validateIbGibAddr({ addr });
      if ((validationErrors ?? []).length > 0) { throw new Error(`Invalid address: ${validationErrors.join('\n')} (E: 343823cb6ab04e6e9a8f7e6de1cd12c8)`); }

      // now we have a valid address, but maybe we have this locally?  if we do,
      // add to the current context and go ahead and return because we should
      // already have the entire dependency graph
      if (logalot) { console.log(`${lc} checking locally.`); }
      let resGet_Local = await this.common.ibgibs.get({ addr });
      if (resGet_Local.success && resGet_Local.ibGibs?.length === 1) {
        if (logalot) { console.log(`${lc} found ibgib locally with addr: ${addr}.`); }
        await fnAlert({ title: "We have it locally!", msg: "We have it locally! We'll relate it to the current ibgib..." });
        await this.rel8ToThisIbGib({
          ibGibToRel8: resGet_Local.ibGibs[0],
          rel8nNames: ['import'],
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
        const msg = `Can't sync without sync spaces...wrong password? Cancelling. Restart app to retry password (I know it sucks!...just me coding this thing right now)`;
        if (logalot) { console.log(`${lc} ${msg}`) };
        const fnAlert = getFnAlert();
        await fnAlert({ title: "Cancelled", msg });
        return; /* <<<< returns early */
      }

      // ...iterate and look inside each space.
      let gotIbGib: IbGib_V1;
      let space: IbGibSpaceAny;
      let spaceAddr: IbGibAddr;
      for (let i = 0; i < appSyncSpaces.length; i++) {
        space = appSyncSpaces[i];
        spaceAddr = h.getIbGibAddr({ ibGib: space });

        if (logalot) { console.log(`${lc} Checking space (${spaceAddr}) for ibgib (${addr}).`); }

        let resGet = await getFromSpace({ addr, space });
        if (resGet.success) {
          if (resGet.ibGibs?.length === 1) {
            if (logalot) { console.log(`${lc} found ibgib (${addr}) in space (${spaceAddr}).`); }
            // at this point, we have a copy of the ibGib, but what about the entire dependency graph?
            // we need to sync up the ibGib
            gotIbGib = resGet.ibGibs[0];

          } else {
            // not found
            if (logalot) { console.log(`${lc} NOT found ibgib (${addr}) in space (${spaceAddr}).`); }
            // let rawResult = <SyncSpaceResultIbGib>resGet.rawResultIbGib;
          }
        } else {
          throw new Error(`(UNEXPECTED) resGet.success falsy, but get should not be throwing... addr: (${addr}) in space (${spaceAddr}). (E: b200973da68343b58bddb48c2274a6e1)`);
        }
      }

      if (gotIbGib) {
        // we found it in `space` with `spaceAddr`
        // but we may not (probably don't) have the entire dependency graph.
        let graph = await getDependencyGraph({
          ibGib: gotIbGib,
          live: true,
          maxRetries: c.DEFAULT_MAX_RETRIES_GET_DEPENDENCY_GRAPH_OUTERSPACE,
          msBetweenRetries: c.DEFAULT_MS_BETWEEN_RETRIES_GET_DEPENDENCY_GRAPH_OUTERSPACE,
          space,
        });
        let resPutGraph =
          await this.common.ibgibs.put({ ibGibs: Object.values(graph) });
        if (resPutGraph.success) {
          await this.common.ibgibs.registerNewIbGib({ ibGib: gotIbGib });
          // now that we've stored the dependency graph, we can rel8 the import
          // to the current context
          await this.rel8ToThisIbGib({
            ibGibToRel8: gotIbGib,
            rel8nNames: ['import'],
          });

        } else {
          throw new Error(`(UNEXPECTED) error(s) saving in local space: ${resPutGraph.errorMsg} (E: 5c5a7bf28cc84ea0b03239f4c4c4e4d4)`);
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
      await Modals.alert({ title: 'something went awry...', message: error.message });
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async send_AddImport_ByFile(): Promise<void> {
    const lc = `${this.lc}[${this.send_AddImport_ByFile.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 716faa48d7646bbff5c8dac37ad4fd22)`); }
      const exportIbGib = this.selectedExportIbGib;
      delete this.selectedExportIbGib;

      // validate it
      let resValidate = await validateIbGibIntrinsically({ ibGib: exportIbGib });
      if (resValidate?.length > 0) {
        const emsg = `There was a problem with the raw export file and it does not validate properly. Here are the errors: ${resValidate.join('; ')}`;
        throw new Error(`${emsg} (E: 78e697a6d83362b10b0af1e785b55622)`);
      }

      // parse and validate exportIbGib.data ibgibs
      // for speed, also sort into dna/non-dna ibgibs (put all the
      // fork/mut8/rel8 ibgibs in one bucket)
      let dependencyGraph = <{ [addr: string]: IbGib_V1 }>JSON.parse(exportIbGib.data.dependencyGraphAsString);
      let ibGibsToImport = Object.values(dependencyGraph);
      const invalidMsgs: string[] = [];
      const dnaIbGibs: IbGib_V1[] = [];
      const nonDnaIbGibs: IbGib_V1[] = [];
      for (let i = 0; i < ibGibsToImport.length; i++) {
        const ibGib = ibGibsToImport[i];
        const addr = h.getIbGibAddr({ ibGib });
        resValidate = await validateIbGibIntrinsically({ ibGib });
        if (resValidate?.length > 0) {
          const emsg = `${addr} errors: ${resValidate.join('; ')}`;
          invalidMsgs.push(emsg);
        } else {
          if (isDna({ ibGib })) { dnaIbGibs.push(ibGib); } else { nonDnaIbGibs.push(ibGib); }
        }
      }
      if (invalidMsgs?.length > 0) { throw new Error(`There were invalid ibgibs contained in the import:\n${invalidMsgs.join('\n')} (E: f28725ac30aab1ccdf926de27eaa3d22)`); }

      // todo: validate further with guaranteeing that the import is a
      // fully-contained graph, meaning that all ibgibs have all of their
      // related ibgibs. I need to add a "validateDependencyGraph" function to
      // the validate.ts, and also should probably go ahead and create my
      // "InnerSpace" that I can pass to the `getDependencyGraph` `space` param.

      // before storing anything, be sure that our
      // exportIbGib.data.contextIbGibAddr is found in the incoming ibgibs to be
      // imported.
      const exportContextIbGib = dependencyGraph[exportIbGib.data.contextIbGibAddr];
      if (!exportContextIbGib) { throw new Error(`The export file is invalid. data.contextIbGibAddr (${exportIbGib.data.contextIbGibAddr}) is not contained in the dependency graph. (E: ac012394d29ea79e936ba6a594379322)`); }

      // store ibgibs in local space, register new if not already stored.
      // do dna first and non-dna second, because if there is a problem, having
      // loose dna around seems like less of a big deal than having larger
      // macro-ibgibs that won't have their corresponding dna floating around.
      const space = await this.common.ibgibs.getLocalUserSpace({});
      let resPutDna = await putInSpace({ ibGibs: dnaIbGibs, space, isDna: true });
      if (!resPutDna.success || resPutDna.errorMsg) { throw new Error(`There was a problem storing dna ibgibs in the local space. (E: 09ad8bc93019cbe1ff32f39f5a674722)`); }
      let resPutNonDna = await putInSpace({ ibGibs: nonDnaIbGibs, space, });
      if (!resPutNonDna.success || resPutNonDna.errorMsg) { throw new Error(`There was a problem storing NON-dna ibgibs in the local space. (E: 05f30df2a9c1400494ac2c6da1eda516)`); }


      // register latest in timelines as new
      // const { mapWithTjp_NoDna, mapWithTjp_YesDna, mapWithoutTjps } =
      //   splitPerTjpAndOrDna({ ibGibs: ibGibsToImport, filterPrimitives: true });
      const timelinesByTjp_Ascending = getTimelinesGroupedByTjp({ ibGibs: nonDnaIbGibs });
      const latestIbGibsPerTimeline =
        Object.values(timelinesByTjp_Ascending)
          .flatMap(timeline => timeline[timeline.length - 1]);

      for (let i = 0; i < latestIbGibsPerTimeline.length; i++) {
        const latestIbGib = latestIbGibsPerTimeline[i];
        await this.common.ibgibs.registerNewIbGib({ ibGib: latestIbGib, space });
      }

      // at this point, we can reuse code that imports via the addr
      await this.send_AddImport_ByAddr({ addr: exportIbGib.data.contextIbGibAddr });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      getFnAlert()({ title: 'invalid export file', msg: error.message ?? 'there was an error importing.' }); // spins off
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleCommentDetailChange(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleCommentDetailChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const text: string = event.target.textContent || '';
      this.actionDetailCommentText = text.trim();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleLinkDetailChange(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleLinkDetailChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const text: string = event.target.textContent || '';
      this.actionDetailLinkText = text.trim();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  async handleImportDetailChange(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleImportDetailChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.selectedExportIbGib && !this.settingExportIbGib) {
        this.inputImport.value = '';
        delete this.selectedExportIbGib;
      }
      const text: string = event.detail.value || '';
      this.actionDetailImportText = text.trim();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleCommentDetailInput(event: KeyboardEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleCommentDetailInput}]`;
    if (!this.actionDetailVisible) { this.actionDetailVisible = true; }
    if ((!event.shiftKey) &&
      this.platform === 'web' &&
      event.key === 'Enter' &&
      this.actionDetailCommentText
    ) {
      event.stopPropagation(); // doesn't work
      event.stopImmediatePropagation(); // doesn't work
      await this.send_AddComment();
    }
  }

  async handleLinkDetailInput(event: KeyboardEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleLinkDetailInput}]`;
    if (!this.actionDetailVisible) { this.actionDetailVisible = true; }
    if ((!event.shiftKey) &&
      this.platform === 'web' &&
      event.key === 'Enter' &&
      this.actionDetailLinkText
    ) {
      event.stopPropagation(); // doesn't work
      event.stopImmediatePropagation(); // doesn't work
      await this.send_AddLink();
    }
  }

  /**
   * Focuses the action bar detail, deciding if it's comment/import or whatever.
   */
  focusDetail({
    force
  }: {
    /**
     * I'm adding this because when the user presses the button, you want to
     * force focus even if on mobile. But if it's trying to auto-focus because
     * of, e.g., the page refreshing automatically, then it's annoying on the
     * mobile because the keyboard pops up.
     */
    force?: boolean,
  } = {}): void {
    const lc = `${this.lc}[${this.focusDetail.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: ac1f5b8b1233c033b1ada16f5a3d0d22)`); }
      // this is usually only convenient if on a large screen.
      // platforms (atow):
      //  android capacitor cordova ios ipad iphone phablet tablet electron pwa
      //  mobile mobileweb desktop hybrid
      const autoFocusPlatforms = ['ipad', 'phablet', 'tablet', 'electron', 'desktop'];
      const platforms = this.common.platform.platforms();
      const doAutoFocus = autoFocusPlatforms.some(x => platforms.includes(x));
      if (!doAutoFocus && !force) { return; }

      if (this.actionDetailMode === 'comment') {
        setTimeout(() => this.textareaComment?.setFocus());
      } else if (this.actionDetailMode === 'link') {
        setTimeout(() => this.textareaLink?.setFocus());
      } else if (this.actionDetailMode === 'import') {
        setTimeout(() => this.inputImport?.setFocus());
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (!this.actionDetailVisible) { this.actionDetailVisible = true; }
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async reset(): Promise<void> {
    const lc = `${this.lc}[${this.reset.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.textareaComment) { this.textareaComment.value = ''; }
      if (this.textareaLink) { this.textareaLink.value = ''; }
      if (this.inputImport) { this.inputImport.value = ''; }
      this.actionDetailCommentText = '';
      this.actionDetailLinkText = '';
      this.actionDetailImportText = '';
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async cancelPic(candidateToCancel: PicCandidate): Promise<void> {
    const lc = `${this.lc}[${this.cancelPic.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: ba5628348b6a05d9e14e9cb6e48c3b22)`); }
      // for (let i = 0; i < this.resCreatePicCandidates.length; i++) {
      //   const candidate = this.resCreatePicCandidates[i];
      // }

      this.resCreatePicCandidates = this.resCreatePicCandidates.filter(x => {
        return x.picSrc !== candidateToCancel.picSrc;
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  trackByPicSrc(index: number, item: PicCandidate): any {
    return item.picSrc;
  }

  async handleActionBtnClick(event: any, item: ActionItem): Promise<void> {
    const lc = `${this.lc}[${this.handleActionBtnClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d78a9b3d3e2eefe29a13551ea6210222)`); }

      // fire off the event before (?) the handler (maybe doesn't matter)
      this.actionBtnClick.emit(item);

      // fire off the handler
      await item.handler(event);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * for some reason the inner textarea doesn't grow with ion-textarea
   * wrapper.
   *
   * So this is a hack to focus the inner text area
   * @param event
   */
  handleTextAreaClick(event: any): void {
    const lc = `${this.lc}[${this.handleTextAreaClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 61bdea9e93f2cc911bc4c0fac2fc5222)`); }
      const textArea = event?.target?.firstChild?.firstChild;
      if (textArea) { setTimeout(() => textArea.focus()); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  @Input()
  selectedExportIbGib: RawExportIbGib_V1;
  settingExportIbGib: boolean;

  async handleImportFileInputClick(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleImportFileInputClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: ffded66ecc6b3f56bfa73ee429b55722)`); }

      const input = <HTMLInputElement>this.inputFileImport.nativeElement;
      if (input.files.length !== 1) { throw new Error(`(UNEXPECTED) input.files.length !== 1 (E: 5a8ab96779aa3c399e6a87dd30ed4c22)`); }


      const file = input.files[0];
      this.settingExportIbGib = true;
      this.inputImport.value = 'FILE: ' + file.name;
      setTimeout(() => this.settingExportIbGib = false, 1000);
      let reader = new FileReader();

      reader.addEventListener('load', async () => {
        let exportIbGib = <RawExportIbGib_V1>JSON.parse(<string>reader.result);
        if (exportIbGib) {
          this.selectedExportIbGib = exportIbGib;
        } else {
          delete this.selectedExportIbGib;
        }
      });

      reader.readAsText(file);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}

interface PicCandidate {
  resCreatePic: TransformResult<PicIbGib_V1>;
  resCreateBin: TransformResult<BinIbGib_V1>;
  picSrc: string;
}
