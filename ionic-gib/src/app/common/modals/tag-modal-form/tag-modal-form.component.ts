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
import { FormItemInfo, SelectOptionWithIcon } from '../../../ibgib-forms/types/form-items';
import { CommonService } from '../../../services/common.service';
import { getRegExp } from '../../helper/utils';
import { ModalDynamicFormComponentBase } from '../../bases/modal-dynamic-form-component-base';
import { TagData_V1, TagIbGib_V1 } from '../../types/tag';
import { DynamicFormBuilder } from '../../helper/form';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export type TagModalResult = TagData_V1;

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
  extends ModalDynamicFormComponentBase<TagModalResult>
  implements AfterViewInit {

  protected lc: string = `[${TagModalFormComponent.name}]`;

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
      this.formItems = new DynamicFormBuilder()
        .forA({ what: 'Tag' })
        .with({})
        .customItem({
          name: 'text',
          label: 'Text',
          dataType: 'text',
          description: 'This is the text part of your tag',
          regexp: c.TAG_TEXT_REGEXP,
          regexpErrorMsg: c.TAG_TEXT_REGEXP_DESCRIPTION,
          required: true,
        })
        .customItem({
          name: 'icon',
          label: 'Icon',
          dataType: 'select',
          description: 'This is the icon part of your tag',
          required: true,
          selectOptionsWithIcons: [
            ...c.IONICONS.map(x => { return <SelectOptionWithIcon>{ label: x, icon: x, value: x }; })
          ],
        })
        .description({
          of: '',
          defaultValue: c.DEFAULT_TAG_DESCRIPTION,
        })
        .outputItems();
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

      let data: TagData_V1 = {
        text: <string>this.formItems.filter(x => x.name === 'text')[0].value,
        icon: (<SelectOptionWithIcon><any>this.formItems.filter(x => x.name === 'icon')[0].value).value,
      }
      const description =
        <string>this.formItems.filter(x => x.name === 'description')[0].value ?
          <string>this.formItems.filter(x => x.name === 'description')[0].value :
          undefined;
      if (description) { data.description = description; }

      return data;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    }
  }

  async handleItemSelected(item: FormItemInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleItemSelected.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      console.log(`${lc} item selected: ${h.pretty(item)}`);

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

  getTitleHint(): string { return `we're making a tag...`; }
  getTitleText(): string { return `Enter Tag Info...`; }
}
