import {
  AfterViewInit, ChangeDetectorRef, Component, Input,
  OnDestroy, OnInit, ViewChild,
} from '@angular/core';
import { IonContent, ModalController } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGib_V1, Factory_V1 as factory, Rel8n } from 'ts-gib/dist/V1';

import { HashAlgorithm } from 'encrypt-gib';
import { TransformResult } from 'ts-gib';

import * as c from '../../constants';
import { FormItemInfo } from '../../../ibgib-forms/types/form-items';
import { CommonService } from '../../../services/common.service';
import { getRegExp } from '../../helper/utils';
import { DynamicModalFormComponentBase } from '../../bases/dynamic-modal-form-component-base';
import { TagIbGib_V1 } from '../../types/tag';
import { DynamicFormBuilder } from '../../helper/form';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export type TagModalResult = TransformResult<TagIbGib_V1>;

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'tag-modal-form',
  templateUrl: './tag-modal-form.component.html',
  styleUrls: ['./tag-modal-form.component.scss'],
})
export class TagModalFormComponent
  extends DynamicModalFormComponentBase<TagModalResult>
  implements AfterViewInit{

  protected lc: string = `[${TagModalFormComponent.name}]`;

  fields: { [name: string]: FormItemInfo } = { }

  @Input()
  robbotProviderNames: string[] = [];


  /**
   * The item that is currently selected in the metaform. (hack)
   */
  selectedItem: FormItemInfo;

  /**
   * If we are editing an ibGib, this will be populated and {@link createImpl}
   * will mutate it. Otherwise, this will be falsy, and {@link createImpl} will
   * create a new one.
   */
  @Input()
  ibGib: TagIbGib_V1;

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.formItems = [];
      //   {
      //     name: "text",
      //     description: `text of the tag`,
      //     label: "Text",
      //     regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
      //     dataType: 'select',
      //     multiple: false,
      //     required: true,
      //   }
      // ];

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Initializes to default space values.
   */
  protected async initializeImpl(): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      let form = new DynamicFormBuilder()
        .with({})
        .customItem({
          name: 'text',
          label: 'Text',
          dataType: 'text',
          description: 'This is the text part of your tag',
          required: true,
        })
        .customItem({
          name: 'icon',
          label: 'Icon',
          dataType: 'select',
          description: 'This is the icon part of your tag',
          required: true,
          selectOptions: [

          ],
        })
        .description({of: ''})
        .outputForm({
          formName: 'form',
          label: 'Random Robbot',
        });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<TagModalResult> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }

      // get the relevant factory
      // const factory = this.getFactory({item: this.selectedItem});

      // convert the form to a new robbot witness
      // const resNewIbGib = await factory.formToWitness({form: this.form});

      // check...
      // if (!resNewIbGib) { throw new Error(`creation failed... (E: ddc73faeb9d74eeca5f415d4b9e3f425)`); }

      // all good.
      // return resNewIbGib;
      throw new Error(`not implemented (E: d0a2aeb6fd9360ac0f14a73251c7b822)`);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async handleItemSelected(item: FormItemInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleItemSelected.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.selectedItem = item;

      // get the coresponding factory to...
      // const factory = this.getFactory({item});

      // ...new up a blank
      // const resTag = await factory.newUp({});

      // convert the blank to the form
      // const subform = await factory.witnessToForm({witness: resTag.newIbGib});

      // update the ux
      // this.formItems = subform.items;
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  handleValidatedSubform(event: any): void {
    const lc = `${this.lc}[${this.handleValidatedSubform.name}]`;
    console.log(`${lc}`);
  }

}
