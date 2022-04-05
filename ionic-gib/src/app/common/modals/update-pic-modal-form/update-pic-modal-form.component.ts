import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { IonContent, ModalController } from '@ionic/angular';

import { IbGib_V1, Factory_V1 as factory } from 'ts-gib/dist/V1';

import { HashAlgorithm } from 'encrypt-gib';
import { IbGibAddr, TransformResult } from 'ts-gib';

import * as c from '../../constants';
import { getExpirationUTCString, getRegExp } from '../../helper';
import { ModalFormComponentBase } from '../../bases/modal-form-component-base';
import { FieldInfo, IbgibItem } from '../../types/ux';
import { PicIbGib_V1 } from '../../types';

const logalot = c.GLOBAL_LOG_A_LOT || false;

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
  extends ModalFormComponentBase<TransformResult<PicIbGib_V1>> {

  protected lc: string = `[${UpdatePicModalFormComponent.name}]`;

  /**
   * Address of the current pic ibgib
   */
  @Input()
  addr: IbGibAddr;

  @Input()
  item: IbgibItem;

  public fields: { [name: string]: FieldInfo } = {
    name: {
      name: "name",
      description: "It's the name for the pic. Make it short with only letters, underscores and hyphens.",
      label: "Name",
      placeholder: `e.g. "my_super_picture_name"`,
      regexp: getRegExp({min: 1, max: 32, chars: '-', noSpaces: true}),
      // required: true,
    },
    description: {
      name: "description",
      description: `Description/notes for this pic. Only letters, underscores and ${c.SAFE_SPECIAL_CHARS}`,
      label: "Description",
      placeholder: `Describe the pic here...`,
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
    },
  }

  @Input()
  name: string;
  @Input()
  description: string;

  @Input()
  initializing: boolean;

  @Input()
  validationErrors: string[] = super.validationErrors
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

  @Input()
  showHelp: boolean;

  constructor(
    protected modalController: ModalController,
  ) {
    super(modalController);

    this.addNewImageField();
    this.initialize();
  }

  async initialize(): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.initializing = true;



      this.initializing = false;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * I need access to `this` object when creating the new image field.
   */
  addNewImageField(): void {
    const lc = `${this.lc}[${this.addNewImageField.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      let fnValid = (_value: string) => {
        return false; // debug
      };

      let fieldNewImage = <FieldInfo>{
        name: "newImage",
        description: `The updated image that will replace the current pic's image.`,
        label: "Updated Image: ",
        fnValid,
        fnErrorMsg: `Take a pic with the camera or select a new image from a file.`,
        required: true,
      };

      this.fields['newImage'] = fieldNewImage;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<TransformResult<PicIbGib_V1>> {
    const lc = `${this.lc}[${this.handleSaveClick.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      this.showHelp = false;
      const validationErrors = await this.validateForm();
      if (validationErrors.length > 0) {
        console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
        return;
      }

      let resNewIbGib: TransformResult<PicIbGib_V1>;

      // create the new pic

      if (!resNewIbGib) { throw new Error(`creation failed...`); }

      return resNewIbGib;
      // await this.modalController.dismiss(resNewIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

}
