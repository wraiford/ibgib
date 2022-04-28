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
import { RobbotData_V1, RobbotIbGib_V1, RobbotRel8ns_V1 } from '../../types/robbot';
import { CommonService } from '../../../services/common.service';
import {
  RandomRobbotData_V1, RandomRobbot_V1,
  RandomRobbot_V1_Factory,
} from '../../witnesses/robbots/random-robbot-v1';
import { getRobbotIb } from '../../helper/robbot';
import { getRegExp } from '../../helper/utils';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { IbGibRobbotAny, RobbotBase_V1 } from '../../witnesses/robbots/robbot-base-v1';
import { DynamicFormComponent } from 'src/app/ibgib-forms/dynamic-form/dynamic-form.component';
import { DynamicModalFormComponentBase } from '../../bases/dynamic-modal-form-component-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export interface RobbotModalResult {

}

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'robbot-modal-form',
  templateUrl: './robbot-modal-form.component.html',
  styleUrls: ['./robbot-modal-form.component.scss'],
})
export class RobbotModalFormComponent
  extends DynamicModalFormComponentBase<TransformResult<RobbotIbGib_V1>>
  implements AfterViewInit{

  protected lc: string = `[${RobbotModalFormComponent.name}]`;

  fields: { [name: string]: FormItemInfo } = { }

  @Input()
  robbotProviderNames: string[] = [];

  selectTypeItem: FormItemInfo = {
      name: "type",
      description: `Type of robbot`,
      label: "Type",
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
      dataType: 'checkbox',
      multiple: false,
      required: true,
    };

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
  ibGib: RobbotIbGib_V1;

  robbotFactories: DynamicFormFactoryBase<RobbotData_V1, RobbotRel8ns_V1, IbGibRobbotAny>[];

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private randomRobbotFactory: RandomRobbot_V1_Factory,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.metaformItems = [
        this.selectTypeItem,
      ];
      // setTimeout(() => {
      //   console.warn('setting default value to random robbot!!!')
      //   console.warn('setting default value to random robbot!!!')
      //   console.warn('setting default value to random robbot!!!')
      //   console.warn('setting default value to random robbot!!!')
      //   this.handleItemSelected(this.subformItems[0]);
      //   this.selectTypeItem.defaultValue = 'RandomRobbot_V1'; //debug only!
      // }, 1000);
      // spin off initialize (can't await in ctor)
      // this.initialize();

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

      this.robbotFactories = [
        this.randomRobbotFactory,
      ];

      this.selectTypeItem.selectOptions = [
        ...this.robbotFactories.map(factory => factory.getInjectionName()),
      ];

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<TransformResult<RobbotIbGib_V1>> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }

      let resNewIbGib: TransformResult<RobbotIbGib_V1>;

      // create the robbot
      const factory = this.getFactory({item: this.selectedItem});

      resNewIbGib = await factory.formToWitness({form: this.form});

      if (!resNewIbGib) { throw new Error(`creation failed... (E: ddc73faeb9d74eeca5f415d4b9e3f425)`); }

      return resNewIbGib;
      // await this.modalController.dismiss(resNewIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handleItemSelected(item: FormItemInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleItemSelected.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.selectedItem = item;

      // get the coresponding factory to...
      const factory = this.getFactory({item});

      // ...new up a blank
      const resRobbot = await factory.newUp({});

      // convert the blank to the form
      const subform = await factory.witnessToForm({witness: resRobbot.newIbGib});

      // update the ux
      this.formItems = subform.children;
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  getFactory({
    item,
  }: {
    item: FormItemInfo,
  }): DynamicFormFactoryBase<RobbotData_V1, RobbotRel8ns_V1, IbGibRobbotAny> {
    const lc = `${this.lc}[${this.getFactory.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      let factories =
        this.robbotFactories.filter(x => x.getInjectionName() === item.value)

      if (factories.length !== 1) { throw new Error(`(UNEXPECTED) factory not found? (E: 0e9a21e7e9456e946eded8ea76715222)`); }

      return factories[0];
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  handleValidatedSubform(event: any): void {
    debugger;
  }

}
