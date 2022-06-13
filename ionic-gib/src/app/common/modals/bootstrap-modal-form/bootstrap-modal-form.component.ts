import {
  AfterViewInit, ChangeDetectorRef, Component, Input,
  ViewChild,
} from '@angular/core';

import { TransformResult } from 'ts-gib';

import * as c from '../../constants';
import { FormItemInfo } from '../../../ibgib-forms/types/form-items';
import { IbGibSpaceData, IbGibSpaceRel8ns, IbGibSpace } from '../../types/space';
import { CommonService } from '../../../services/common.service';
// import { RandomSpace_V1, } from '../../witnesses/spaces/random-space-v1';
import { getRegExp } from '../../helper/utils';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { IbGibSpaceAny, } from '../../witnesses/spaces/space-base-v1';
import { DynamicModalFormComponentBase } from '../../bases/dynamic-modal-form-component-base';
import { WitnessFactoriesService } from '../../../services/witness-factories.service';
import { DynamicFormComponent } from '../../../ibgib-forms/dynamic-form/dynamic-form.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export type BootstrapModalResult = TransformResult<IbGibSpaceAny>;

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'bootstrap-modal-form',
  templateUrl: './bootstrap-modal-form.component.html',
  styleUrls: ['./bootstrap-modal-form.component.scss'],
})
export class BootstrapModalFormComponent
  extends DynamicModalFormComponentBase<BootstrapModalResult>
  implements AfterViewInit{

  protected lc: string = `[${BootstrapModalFormComponent.name}]`;

  fields: { [name: string]: FormItemInfo } = { }

  @Input()
  spaceProviderNames: string[] = [];

  selectTypeItem: FormItemInfo = {
      name: "type",
      description: `Type of space`,
      label: "Type",
      regexp: getRegExp({min: 0, max: 155, chars: c.SAFE_SPECIAL_CHARS}),
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
  ibGib: IbGibSpaceAny;

  spaceFactories: DynamicFormFactoryBase<any, IbGibSpaceRel8ns, IbGibSpaceAny>[];

  /**
   * Optional metaform used to select the space type.
   *
   * This is a hack that I used in implementing a space dynamic form. Ideally
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
      // setTimeout(() => {
      //   console.warn('setting default value to random space!!!')
      //   console.warn('setting default value to random space!!!')
      //   console.warn('setting default value to random space!!!')
      //   console.warn('setting default value to random space!!!')
      //   this.handleItemSelected(this.subformItems[0]);
      //   this.selectTypeItem.defaultValue = 'RandomSpace_V1'; //debug only!
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

      this.spaceFactories = [
        // add our list of space classnames here,
        // RandomSpace.name,
      ].map(name => {
        return this.factories.getFactory<
          IbGibSpaceData,
          IbGibSpaceRel8ns,
          IbGibSpaceAny,
          DynamicFormFactoryBase<IbGibSpaceData, IbGibSpaceRel8ns, IbGibSpaceAny>
        >({
          name
        });
      });

      this.selectTypeItem.selectOptions = [
        ...this.spaceFactories.map(factory => factory.getName()),
      ];

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<BootstrapModalResult> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }

      // get the relevant factory
      const factory = this.getFactory({item: this.selectedItem});

      // convert the form to a new space witness
      const resNewIbGib = await factory.formToWitness({form: this.form});

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
      const factory = this.getFactory({item});

      // ...new up a blank
      const resSpace = await factory.newUp({});

      // convert the blank to the form
      const subform = await factory.witnessToForm({witness: resSpace.newIbGib});

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
  }): DynamicFormFactoryBase<IbGibSpaceData, IbGibSpaceRel8ns, IbGibSpaceAny> {
    const lc = `${this.lc}[${this.getFactory.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      let factories =
        this.spaceFactories.filter(x => x.getName() === item.value)

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
