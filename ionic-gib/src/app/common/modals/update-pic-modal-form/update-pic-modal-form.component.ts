import { ChangeDetectorRef, Component, Input, } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult, V1 } from 'ts-gib';

import * as c from '../../constants';
import { ModalFormComponentBase } from '../../bases/modal-form-component-base';
import { IbGibItem } from '../../types/ux';
import { FormItemInfo } from '../../../ibgib-forms/types/form-items';
import { PicIbGib_V1 } from '../../types/pic';
import { BinIbGib_V1 } from '../../types/bin';
import { createPicAndBinIbGibsFromInputFilePickedEvent } from '../../helper/pic';
import { CommonService } from '../../../services/common.service';
import { IbGibSpaceAny } from '../../witnesses/spaces/space-base-v1';
import { getRegExp } from '../../helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

export type UpdatePicModalResult = [TransformResult<PicIbGib_V1>, TransformResult<BinIbGib_V1>];

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'update-pic-modal-form',
  templateUrl: './update-pic-modal-form.component.html',
  styleUrls: ['./update-pic-modal-form.component.scss'],
})
export class UpdatePicModalFormComponent
  extends ModalFormComponentBase<UpdatePicModalResult> {

  protected lc: string = `[${UpdatePicModalFormComponent.name}]`;

  @Input()
  space: IbGibSpaceAny;

  /**
   * Address of the current pic ibgib
   */
  @Input()
  addr: IbGibAddr;

  _picIbGib: PicIbGib_V1;
  @Input()
  get picIbGib(): PicIbGib_V1 {
    return this._picIbGib;
  }
  set picIbGib(ibGib: PicIbGib_V1) {
    this.initialize({ibGib});
  }

  /**
   * item containing information about the current pic ibgib.
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
      description: "It's the filename for the pic (excluding the dot + extension). Make it short with only letters, underscores and hyphens.",
      label: "Name",
      placeholder: `e.g. "my_super_picture_name"`,
      regexp: getRegExp({min: 1, max: 1024, chars: c.FILENAME_SPECIAL_CHARS, noSpaces: false}),
      readonly: true,
    },
    extension: {
      name: "extension",
      description: "It's the extension part of the filename (the part that comes after the last dot).",
      label: "Extension",
      placeholder: `e.g. "jpg"`,
      regexp: getRegExp({min: 1, max: 8, chars: '-', noSpaces: true}),
      readonly: true,
    },
    binHash: {
      name: "binHash",
      description: "It's the hash of the file of the image data.",
      label: "Hash",
      readonly: true,
    },
    timestamp: {
      name: "timestamp",
      description: "It's the hash of the file of the image data.",
      label: "Timestamp",
      readonly: true,
    },
    newImage: {
      name: "newImage",
      fnValid: (_value) => { return true; },
      defaultErrorMsg: `Take a pic with the camera or select a new image from a file.`,
    }
  }

  @Input()
  get cameraUnicode(): string { return '/u1F4F7'; }

  @Input()
  name: string;
  @Input()
  extension: string;
  @Input()
  binHash: string;
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
  handlingInputFileClick: boolean;

  /**
   * Transform result for the new pic ibgib candidate .
   *
   * This is populated when the user picks/captures an image
   */
  resCreatePic: TransformResult<PicIbGib_V1>;
  /**
   * The actual binary file of the pic.
   *
   * This is populated when the user picks/captures an image
   */
  resCreateBin: TransformResult<BinIbGib_V1>;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common);

    // this.addNewImageField();
  }

  async initialize({
    ibGib,
  }: {
    ibGib: PicIbGib_V1,
  }): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.initializing) {
        console.error(`${lc} (UNEXPECTED) already initializing. (E: 4f5cf5940b9f4f3f827f6f03a8c84ce1)`);
        return;
      }
      this.initializing = true;

      this._picIbGib = ibGib;
      this.addr = ibGib ? h.getIbGibAddr({ibGib}) : undefined;
      this.name = ibGib.data.filename;
      this.extension = ibGib.data.ext;
      this.binHash = ibGib.data.binHash;
      this.timestamp = ibGib.data.timestamp;

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
      if (!this.resCreateBin || !this.resCreatePic) {
        const emsg = `Where's the new image to update? New pic requires a new image!`;
        validationErrors.push(emsg);
        this.validationErrors.push(emsg);
        this.erroredFields.push('newImage');
      }
      return validationErrors;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<UpdatePicModalResult> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }

      // the new binary ibgib(s) are already created, but the
      // pic ibgib is as if it's created anew. We need to mutate
      // the current pic ibgib to use the new binary

      // current code when creating new pic ibgibs
      // const data: PicData_V1 = { binHash, ext, filename, timestamp };
      // const rel8ns: IbGibRel8ns_V1 = {
      //   // 'pic on': [addr], // makes it more difficult to share/sync ibgibs
      //   [c.BINARY_REL8N_NAME]: [binAddr],
      // };

      // // create an ibgib with the filename and ext
      // const resPicIbGib = <TransformResult<PicIbGib_V1>>await factory.firstGen({
      //   parentIbGib: factory.primitive({ib: 'pic'}),
      //   ib: `pic ${binHash}`,
      //   data,
      //   rel8ns,
      //   dna: true,
      //   tjp: { uuid: true, timestamp: true },
      //   nCounter: true,
      // });

      /** This was created as if the pic were brand new (not mutated) */
      const newPicFromScratchIbGib = this.resCreatePic.newIbGib;

      // do the update in two phases: 1) mut8 data & ib, and 2) rel8 new binary
      const resMut8DataAndIb = <TransformResult<PicIbGib_V1>>await V1.mut8({
        src: this._picIbGib,
        mut8Ib: newPicFromScratchIbGib.ib,
        dataToAddOrPatch: {
          binHash: newPicFromScratchIbGib.data.binHash,
          filename: newPicFromScratchIbGib.data.filename,
          ext: newPicFromScratchIbGib.data.ext,
          timestamp: newPicFromScratchIbGib.data.timestamp,
        },
        dna: true,
        nCounter: true,
        noTimestamp: true,
      });

      const binAddr = h.getIbGibAddr({ibGib: this.resCreateBin.newIbGib});
      const resRel8Bin = <TransformResult<PicIbGib_V1>>await V1.rel8({
        src: resMut8DataAndIb.newIbGib,
        // linkedRel8ns: [c.BINARY_REL8N_NAME],
        rel8nsToAddByAddr: {
          [c.BINARY_REL8N_NAME]: [binAddr],
        },
        dna: true,
        nCounter: true,
        noTimestamp: true,
      });

      /**
       * Combined transform result of the two transform results, which probably
       * should be some kind of helper util.
       */
      const resCombined: TransformResult<PicIbGib_V1> = {
        newIbGib: resRel8Bin.newIbGib,
        intermediateIbGibs: [
          resMut8DataAndIb.newIbGib,
          // atow no intermediateIbGibs...
          ...(resMut8DataAndIb.intermediateIbGibs ?? []),
          ...(resRel8Bin.intermediateIbGibs ?? []),
        ],
        dnas: [
          ...resMut8DataAndIb.dnas,
          ...resRel8Bin.dnas,
        ],
      }

      return [resCombined, this.resCreateBin];
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handlePicClicked(): Promise<void> {
    const lc = `${this.lc}[${this.handlePicClicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (logalot) { console.log(`${lc} yes, this is pic...you have clicked it. wtg. (I: 03141e30d828384908dd259cd7518e22)`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async filepicked(event: any): Promise<void> {
    const lc = `${this.lc}[${this.filepicked.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.handlingInputFileClick) {
        console.error(`${lc} (UNEXPECTED) already handling inputfile click. This button should be disabled when already picking. (E: d7417182d5534cb1994dc20336b79342)`);
        return; /* <<<< returns early */
      }
      this.handlingInputFileClick = true;

      const space = await this.common.ibgibs.getLocalUserSpace({lock: true});

      // create the pic (and all other dependency ibgibs), but do not save yet.
      // we will save when the user chooses save update.
      const [resCreatePic, resCreateBin] = await createPicAndBinIbGibsFromInputFilePickedEvent({
        event, saveInSpace: false, space,
      });


      // populate our fields for the updated pic candidate
      this.resCreatePic = resCreatePic;
      this.resCreateBin = resCreateBin;

      // update our item
      await this.loadUpdatedItem();

      this.handlingInputFileClick = false;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      this.handlingInputFileClick = false;
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Builds what the updated ibgib item would be based on the values in
   * `resCreatePic` and `resCreateBin`.
   *
   * @see {@link resCreatePic}
   * @see {@link resCreateBin}
   */
  async loadUpdatedItem(): Promise<void> {
    const lc = `${this.lc}[${this.loadUpdatedItem.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const newPicIbGib = this.resCreatePic.newIbGib;
      const data = newPicIbGib.data;
      const binIbGib = this.resCreateBin.newIbGib;
      this.updatedItem = {
        addr: h.getIbGibAddr({ibGib: newPicIbGib}),
        binExt: data.ext,
        binId: data.binHash,
        filenameWithExt: `${data.filename || data.binHash}.${data.ext}`,
        ib: newPicIbGib.ib,
        gib: newPicIbGib.gib,
        timestamp: data.timestamp,
        text: data.filename ?? `pic ${newPicIbGib.gib.slice(0,5)}...`, // no idea why I'm setting this in loadPic
        ibGib: newPicIbGib,
        type: 'pic',
        picSrc: `data:image/jpeg;base64,${binIbGib.data!}`,
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
