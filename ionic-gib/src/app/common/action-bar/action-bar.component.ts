import {
  Component, OnInit, ChangeDetectorRef,
  Input, ViewChild, AfterViewInit, EventEmitter, Output,
} from '@angular/core';
import { IonInput, IonTextarea } from '@ionic/angular';
import { Plugins, } from '@capacitor/core';
const { Modals } = Plugins;

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult, V1 } from 'ts-gib';
import { IbGibRel8ns_V1, IbGib_V1 } from 'ts-gib/dist/V1';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbGibSpaceAny } from '../witnesses/spaces/space-base-v1';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { ActionItem, ActionItemName } from '../types/ux';
import { createPicAndBinIbGibsFromInputFilePickedEvent } from '../helper/pic';
import { createCommentIbGib } from '../helper/comment';
import { createLinkIbGib } from '../helper/link';
import { getFnAlert, getFnPrompt } from '../helper/prompt-functions';
import { getFromSpace, getDependencyGraph } from '../helper/space';
import { validateIbGibAddr } from '../helper/validate';
import { PicIbGib_V1 } from '../types/pic';
import { BinIbGib_V1 } from '../types/bin';


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

  @Input()
  get addr(): IbGibAddr { return super.addr; }
  set addr(value: IbGibAddr) {
    let lc = `${this.lc}[set addr(value: ${value})]`;
    super.addr = value;
  }

  @Input()
  get ibGib_Context(): IbGib_V1 { return super.ibGib_Context; }
  set ibGib_Context(value: IbGib_V1) { super.ibGib_Context = value; }

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
      name: 'file',
      type: 'inputfile',
      text: 'image',
      icons: ['image-outline'],
      handler: async (event) => await this.actionAddImage(event),
    },
    {
      name: 'link',
      type: 'button',
      text: 'link',
      icons: ['link-outline'],
      handler: async (event) => await this.actionAddLink(event),
    },
    {
      name: 'import',
      type: 'button',
      text: 'add from space',
      icons: ['sparkles-outline', 'download-outline'],
      handler: async (event) => await this.actionAddImport(event),
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
  /**
   * Text bound do import ibgib addr detail.
   */
  @Input()
  actionDetailImportText: string;

  @ViewChild('textareaComment')
  textareaComment: IonTextarea;

  @ViewChild('inputLink')
  inputLink: IonInput;

  @ViewChild('inputImport')
  inputImport: IonInput;

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

  // async promptForCommentText(): Promise<string> {
  //   const lc = `${this.lc}[${this.promptForCommentText.name}]`;
  //   try {
  //     if (logalot) { console.log(`${lc} starting...`); }

  //     const resComment = await Modals.prompt({
  //       title: 'comment',
  //       message: 'add text',
  //       inputPlaceholder: 'text here',
  //     });
  //     if (resComment.cancelled || !resComment.value) { return; } // <<<< returns early
  //     const text = resComment.value.trim();
  //     if (logalot) { console.log(`${lc} text: ${text}`); }
  //     if (text === '') {
  //       return;
  //     } else {
  //       return text;
  //     }
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   } finally {
  //     if (logalot) { console.log(`${lc} complete.`); }
  //   }
  // }

  // async promptForLinkText(): Promise<string> {
  //   const lc = `${this.lc}[${this.promptForLinkText.name}]`;
  //   try {
  //     if (logalot) { console.log(`${lc} starting...`); }

  //     const resLink = await Modals.prompt({
  //       title: 'link',
  //       message: 'add text',
  //       inputPlaceholder: 'text here',
  //     });
  //     if (resLink.cancelled || !resLink.value) { return; } // <<<< returns early
  //     const text = resLink.value.trim();
  //     if (logalot) { console.log(`${lc} text: ${text}`); }
  //     if (text === '') {
  //       return;
  //     } else {
  //       return text;
  //     }
  //   } catch (error) {
  //     console.error(`${lc} ${error.message}`);
  //     throw error;
  //   } finally {
  //     if (logalot) { console.log(`${lc} complete.`); }
  //   }
  // }

  async actionAddComment(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddComment.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.actionDetailVisible) {
        this.actionDetailMode = 'comment';
        this.actionDetailVisible = true;
        this.focusDetail({ force: true });
        // setTimeout(() => this.textareaComment.setFocus());
      } else if (this.actionDetailMode !== 'comment') {
        this.actionDetailMode = 'comment';
        // this.ref.detectChanges();
        // while (!this.textareaComment) { await h.delay(100); }
        this.focusDetail({ force: true });
        // setTimeout(() => this.textareaComment.setFocus());
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

  async actionAddLink(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddLink.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.actionDetailVisible) {
        this.actionDetailMode = 'link';
        this.actionDetailVisible = true;
        this.focusDetail({ force: true });
        // setTimeout(() => this.textareaLink.setFocus());
      } else if (this.actionDetailMode !== 'link') {
        this.actionDetailMode = 'link';
        // this.ref.detectChanges();
        // while (!this.textareaLink) { await h.delay(100); }
        this.focusDetail({ force: true });
        // setTimeout(() => this.textareaLink.setFocus());
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
      const text = this.actionDetailCommentText; // already trimmed

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
      this.sending = false;
      this.actionDetailCommentText = '';
      this.focusDetail();
      if (actionItem) { actionItem.busy = false; }
      this.ref.detectChanges();
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
      this.sending = false;
      this.actionDetailLinkText = '';
      this.focusDetail();
      if (actionItem) { actionItem.busy = false; }
      this.ref.detectChanges();
    }
  }

  private async _rel8ToCurrentContext({
    ibGibToRel8,
    rel8nNames,
    // registerNewContext,
  }: {
    ibGibToRel8: IbGib_V1,
    rel8nNames: string[],
    // registerNewContext?: boolean,
  }): Promise<void> {
    const lc = `${this.lc}[${this._rel8ToCurrentContext.name}]`;
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
      // if (registerNewContext) {
      const { newIbGib: newContext } = resRel8ToContext;
      await this.common.ibgibs.registerNewIbGib({ ibGib: newContext });
      // }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async actionAddImage(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddImage.name}]`;
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
        await this._rel8ToCurrentContext({
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

  async actionAddImport(_event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.actionAddImport.name}]`;
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

  /**
   * Import an ibgib from either the local space or our sync spaces to our
   * current context ibgib.
   */
  async send_AddImport(): Promise<void> {
    const lc = `${this.lc}[${this.send_AddImport.name}]`;
    let actionItem: ActionItem;
    try {
      actionItem = this.items.filter(x => x.name === 'import')[0];
      actionItem.busy = true;
      this.sending = true;

      if (!this.ibGib) { throw new Error(`There isn't a current ibGib loaded...?`); }
      if (!this.addr) { throw new Error(`There isn't a current ibGib addr loaded...?`); }

      const fnAlert = getFnAlert();

      if (logalot) { console.log(`${lc} prompting for address to import.`); }

      const addr = this.actionDetailImportText;

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
        await this._rel8ToCurrentContext({
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
          await this._rel8ToCurrentContext({
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
      actionItem.busy = false;
      this.sending = false;
      this.ref.detectChanges();
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
   * Focuses the action bar detail, deciding if it's
   * comment/import or whatever.
   */
  focusDetail({
    force
  }: {
    /**
     * I'm adding this because when the user presses the button, you want to set
     * the focus even if on mobile. But if it's auto-focusing because of, e.g.,
     * the page refreshing automatically, then it's annoying on the mobile
     * because the keyboard pops up.
     */
    force?: boolean,
  } = {}): void {
    // this is usually only convenient if on the web browser proper.
    if (this.platform !== 'web' && !force) { return; }

    if (this.actionDetailMode === 'comment') {
      setTimeout(() => this.textareaComment.setFocus());
    } else if (this.actionDetailMode === 'link') {
      setTimeout(() => this.inputLink?.setFocus());
    } else if (this.actionDetailMode === 'import') {
      setTimeout(() => this.inputImport.setFocus());
    }

    if (!this.actionDetailVisible) { this.actionDetailVisible = true; }
  }

  async reset(): Promise<void> {
    const lc = `${this.lc}[${this.reset.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.textareaComment) { this.textareaComment.value = ''; }
      if (this.inputLink) { this.inputLink.value = ''; }
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
}

interface PicCandidate {
  resCreatePic: TransformResult<PicIbGib_V1>;
  resCreateBin: TransformResult<BinIbGib_V1>;
  picSrc: string;
}
