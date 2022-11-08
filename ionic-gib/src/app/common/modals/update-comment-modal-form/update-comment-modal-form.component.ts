import { ChangeDetectorRef, Component, Input, ViewChild, } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult, V1 } from 'ts-gib';

import * as c from '../../constants';
import { ModalFormComponentBase } from '../../bases/modal-form-component-base';
import { IbGibItem } from '../../types/ux';
import { FormItemInfo } from '../../../ibgib-forms/types/form-items';
import { CommentIbGib_V1 } from '../../types/comment';
import { BinIbGib_V1 } from '../../types/bin';
import { CommonService } from '../../../services/common.service';
import { IbGibSpaceAny } from '../../witnesses/spaces/space-base-v1';
import { getRegExp, getTimestampInTicks } from '../../helper/utils';
import { IonText, IonTextarea, LoadingController } from '@ionic/angular';
import { createCommentIbGib } from '../../helper/comment';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

export type UpdateCommentModalResult = TransformResult<CommentIbGib_V1>;

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'update-comment-modal-form',
  templateUrl: './update-comment-modal-form.component.html',
  styleUrls: ['./update-comment-modal-form.component.scss'],
})
export class UpdateCommentModalFormComponent
  extends ModalFormComponentBase<UpdateCommentModalResult> {

  protected lc: string = `[${UpdateCommentModalFormComponent.name}]`;

  @Input()
  space: IbGibSpaceAny;

  /**
   * Address of the current comment ibgib
   */
  @Input()
  addr: IbGibAddr;

  _commentIbGib: CommentIbGib_V1;
  @Input()
  get commentIbGib(): CommentIbGib_V1 {
    return this._commentIbGib;
  }
  set commentIbGib(ibGib: CommentIbGib_V1) {
    this.initialize({ ibGib });
  }

  /**
   * item containing information about the current comment ibgib.
   */
  @Input()
  item: IbGibItem;
  /**
   * Item corresponding to what the updated ibgib would look like (before it is
   * saved).
   */
  @Input()
  updatedItem: IbGibItem;

  public fields: { [name: string]: FormItemInfo } = {
    name: {
      name: "name",
      description: "It's the optional name of the comment...not sure what I'm using this for atow.",
      label: "Name",
      placeholder: `e.g. "my_super_comment_name"`,
      regexp: getRegExp({ min: 1, max: 1024, chars: c.FILENAME_SPECIAL_CHARS, noSpaces: false }),
      readonly: true,
    },
    timestamp: {
      name: "timestamp",
      description: "It's the timestamp of the edit.",
      label: "Timestamp",
      readonly: true,
    },
    text: {
      name: "text",
      fnValid: (_value) => { return true; },
      defaultErrorMsg: `Enter valid edited text`,
    }
  }

  @Input()
  get cameraUnicode(): string { return '/u1F4F7'; }

  @Input()
  name: string;
  @Input()
  timestamp: string;

  @Input()
  initializing: boolean;

  @Input()
  validationErrors: string[];
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

  @Input()
  showHelp: boolean;

  public debugBorderWidth: string = debugBorder ? "22px" : "0px"
  public debugBorderColor: string = "#FFDA6B";
  public debugBorderStyle: string = "solid";

  @Input()
  handlingCommentUpdate: boolean;

  /**
   * Transform result for the new comment ibgib candidate .
   *
   * This is populated when the user picks/captures an image
   */
  resCreateComment: TransformResult<CommentIbGib_V1>;

  private _editTextarea: IonTextarea;
  @ViewChild('editTextarea')
  get editTextarea(): IonTextarea { return this._editTextarea; }
  set editTextarea(value: IonTextarea) {
    this._editTextarea = value;
    this.editTextarea.value = this.commentIbGib.data.text;
  }

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    protected loadingCtrl: LoadingController,
  ) {
    super(common, loadingCtrl);
    // this.addNewImageField();
  }

  async initialize({
    ibGib,
  }: {
    ibGib: CommentIbGib_V1,
  }): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.initializing) {
        console.error(`${lc} (UNEXPECTED) already initializing. (E: 4f5cf5940b9f4f3f827f6f03a8c84ce1)`);
        return;
      }
      this.initializing = true;

      this._commentIbGib = ibGib;
      this.addr = ibGib ? h.getIbGibAddr({ ibGib }) : undefined;
      this.name = ibGib.data.name ?? '';
      this.timestamp = ibGib.data.timestamp;

      // this.editTextarea.value = this._commentIbGib.data.text;

      setTimeout(() => this.ref.detectChanges());
      this.initializing = false;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.initializing = false;
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async validateForm(): Promise<string[]> {
    const lc = `${this.lc}[${this.validateForm.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      let validationErrors = await super.validateForm();
      if (!this.resCreateComment) {
        const emsg = `Where's the new comment to update? Update comment requires new text!`;
        validationErrors.push(emsg);
        this.validationErrors.push(emsg);
        this.erroredFields.push('text');
      }
      return validationErrors;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<UpdateCommentModalResult> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }

      // the new binary ibgib(s) are already created, but the
      // pic ibgib is as if it's created anew. We need to mutate
      // the current pic ibgib to use the new binary

      /** This was created as if the pic were brand new (not mutated) */
      const newCommentFromScratchIbGib = this.resCreateComment.newIbGib;

      const ibIsDifferent = this.commentIbGib.ib !== newCommentFromScratchIbGib.ib;

      // do the update in two phases: 1) mut8 data & ib, and 2) rel8 new binary
      const resMut8Data = <TransformResult<CommentIbGib_V1>>await V1.mut8({
        src: this.commentIbGib,
        mut8Ib: ibIsDifferent ? newCommentFromScratchIbGib.ib : undefined,
        dataToAddOrPatch: {
          text: newCommentFromScratchIbGib.data.text,
          textTimestamp: newCommentFromScratchIbGib.data.timestamp,
          editTimestamp: newCommentFromScratchIbGib.data.timestamp, // just throwing this in here...eesh
        },
        dna: true,
        nCounter: true,
        noTimestamp: true,
      });

      return resMut8Data;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handleCommentEdited(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleCommentEdited.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.handlingCommentUpdate) {
        console.error(`${lc} (UNEXPECTED) already handling handleCommentEdited. (E: 720a0fa3cab047f69a70eba467b5e737)`);
        return; /* <<<< returns early */
      }
      if (!event?.detail?.value) { throw new Error(`text required (event.detail.value is falsy) (E: d541d9a4abf8a8464b400a69f5153622)`); }
      const text = event?.detail?.value ?? '';
      this.handlingCommentUpdate = true;

      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });

      // create the pic (and all other dependency ibgibs), but do not save yet.
      // we will save when the user chooses save update.
      const resTempComment = await createCommentIbGib({
        text,
        addlMetadataText: getTimestampInTicks(),
        saveInSpace: false,
        space,
      });

      // populate our fields for the updated pic candidate
      this.resCreateComment = resTempComment;

      await this.validateForm();
      if (text === this.commentIbGib.data.text) {
        // text is not different/changed
        delete this.resCreateComment;
      }

      const errors = await this.validateForm();
      if (errors.length > 0) {
        throw new Error(`errors: ${errors} (E: 94b10b927ce1122b872316a308babe22)`);
      }

      // update our item
      await this.loadUpdatedItem();

      this.handlingCommentUpdate = false;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.handlingCommentUpdate = false;
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleCommentClicked(): Promise<void> {
    const lc = `${this.lc}[${this.handleCommentClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (logalot) { console.log(`${lc} yes, this is comment...you have clicked it. wtg. (I: 03141e30d828384908dd259cd7518e22)`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Builds what the updated ibgib item would be based on the values in
   * `resCreateComment` and `resCreateBin`.
   *
   * @see {@link resCreateComment}
   * @see {@link resCreateBin}
   */
  async loadUpdatedItem(): Promise<void> {
    const lc = `${this.lc}[${this.loadUpdatedItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const newCommentIbGib = this.resCreateComment.newIbGib;
      const data = newCommentIbGib.data;
      this.updatedItem = {
        addr: h.getIbGibAddr({ ibGib: newCommentIbGib }),
        ib: newCommentIbGib.ib,
        gib: newCommentIbGib.gib,
        timestamp: data.timestamp,
        text: data.text,
        ibGib: newCommentIbGib,
        type: 'comment',
      };

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
      setTimeout(() => this.ref.detectChanges());
    }
  }

}
