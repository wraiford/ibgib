import {
  AfterViewInit, ChangeDetectorRef, Component, Input,
  ViewChild,
} from '@angular/core';

import { TransformResult } from 'ts-gib';

import * as c from '../../constants';
import { FormItemInfo } from '../../../ibgib-forms/types/form-items';
import { RobbotData_V1, RobbotIbGib_V1, RobbotRel8ns_V1 } from '../../types/robbot';
import { CommonService } from '../../../services/common.service';
import { getRegExp } from '../../helper/utils';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { IbGibRobbotAny, } from '../../witnesses/robbots/robbot-base-v1';
import { ModalDynamicFormComponentBase } from '../../bases/modal-dynamic-form-component-base';
import { WitnessFactoriesService } from '../../../services/witness-factories.service';
import { DynamicFormComponent } from '../../../ibgib-forms/dynamic-form/dynamic-form.component';
import { RandomRobbot_V1, } from '../../witnesses/robbots/random-robbot-v1';
import { WordyRobbot_V1 } from '../../witnesses/robbots/wordy-robbot/wordy-robbot-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export type RobbotPromptResult = TransformResult<IbGibRobbotAny>;

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
  extends ModalDynamicFormComponentBase<RobbotPromptResult>
  implements AfterViewInit {

  protected lc: string = `[${RobbotModalFormComponent.name}]`;

  fields: { [name: string]: FormItemInfo } = {}

  @Input()
  robbotProviderNames: string[] = [];

  selectTypeItem: FormItemInfo = {
    name: "type",
    description: `Type of robbot`,
    label: "Type",
    regexp: getRegExp({ min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS }),
    dataType: 'select',
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

  robbotFactories: DynamicFormFactoryBase<any, RobbotRel8ns_V1, IbGibRobbotAny>[];

  /**
   * Optional metaform used to select the robbot type.
   *
   * This is a hack that I used in implementing a robbot dynamic form. Ideally
   * it should have just been one large form, but I'm delaying dealing with
   * subforms.
   */
  @ViewChild('metaform')
  metaform: DynamicFormComponent;

  /**
   * @see {@link metaform}
   */
  @Input()
  metaformItems: FormItemInfo[];

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
    private factories: WitnessFactoriesService,
  ) {
    super(common, ref);
    const lc = `${this.lc}[ctor]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.metaformItems = [
        this.selectTypeItem,
      ];

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
        // add our list of robbot classnames here,
        RandomRobbot_V1.name,
        WordyRobbot_V1.name,
      ].map(name => {
        return this.factories.getFactory<
          RobbotData_V1,
          RobbotRel8ns_V1,
          IbGibRobbotAny,
          DynamicFormFactoryBase<RobbotData_V1, RobbotRel8ns_V1, IbGibRobbotAny>
        >({
          name
        });
      });

      this.selectTypeItem.selectOptions = [
        ...this.robbotFactories.map(factory => factory.getName()),
      ];

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<RobbotPromptResult> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }

      // get the relevant factory
      const factory = this.getFactory({ item: this.selectedItem });

      // convert the form to a new robbot witness
      const resNewIbGib = await factory.formToWitness({ form: this.form });

      // check...
      if (!resNewIbGib) { throw new Error(`creation failed... (E: ddc73faeb9d74eeca5f415d4b9e3f425)`); }

      // all good.
      return resNewIbGib;
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
      const factory = this.getFactory({ item });

      // ...new up a blank
      const resRobbot = await factory.newUp({});

      // convert the blank to the form
      const subform = await factory.witnessToForm({ witness: resRobbot.newIbGib });

      // update the ux
      this.formItems = subform.items;
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
        this.robbotFactories.filter(x => x.getName() === item.value)

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
    const lc = `${this.lc}[${this.handleValidatedSubform.name}]`;
    console.log(`${lc}`);
  }

}
