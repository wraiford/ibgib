import {
  AfterViewInit, ChangeDetectorRef, Component, Input,
  ViewChild,
} from '@angular/core';

import { TransformResult } from 'ts-gib';

import * as c from '../../constants';
import { FormItemInfo } from '../../../ibgib-forms/types/form-items';
import { AppData_V1, AppIbGib_V1, AppRel8ns_V1 } from '../../types/app';
import { CommonService } from '../../../services/common.service';
import { getRegExp } from '../../helper/utils';
import { DynamicFormFactoryBase } from '../../../ibgib-forms/bases/dynamic-form-factory-base';
import { ModalDynamicFormComponentBase } from '../../bases/modal-dynamic-form-component-base';
import { WitnessFactoriesService } from '../../../services/witness-factories.service';
import { DynamicFormComponent } from '../../../ibgib-forms/dynamic-form/dynamic-form.component';
import { ChatApp_V1, } from '../../witnesses/apps/chat-app-v1';
import { RawApp_V1 } from '../../witnesses/apps/raw-app-v1';
import { TodoApp_V1 } from '../../witnesses/apps/todo-app-v1';
import { IbGibAppAny, } from '../../witnesses/apps/app-base-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export type AppModalResult = TransformResult<IbGibAppAny>;

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Component({
  selector: 'app-modal-form',
  templateUrl: './app-modal-form.component.html',
  styleUrls: ['./app-modal-form.component.scss'],
})
export class AppModalFormComponent
  extends ModalDynamicFormComponentBase<AppModalResult>
  implements AfterViewInit {

  protected lc: string = `[${AppModalFormComponent.name}]`;

  fields: { [name: string]: FormItemInfo } = {}

  @Input()
  appProviderNames: string[] = [];

  selectTypeItem: FormItemInfo = {
    name: "type",
    description: `Type of app`,
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
  ibGib: AppIbGib_V1;

  appFactories: DynamicFormFactoryBase<any, AppRel8ns_V1, IbGibAppAny>[];

  /**
   * Optional metaform used to select the app type.
   *
   * This is a hack that I used in implementing a app dynamic form. Ideally
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
      //   console.warn('setting default value to random app!!!')
      //   console.warn('setting default value to random app!!!')
      //   console.warn('setting default value to random app!!!')
      //   console.warn('setting default value to random app!!!')
      //   this.handleItemSelected(this.subformItems[0]);
      //   this.selectTypeItem.defaultValue = 'RandomApp_V1'; //debug only!
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

      this.appFactories = [
        // add our list of app classnames here,
        ChatApp_V1.name,
        RawApp_V1.name,
        TodoApp_V1.name,
      ].map(name => {
        return this.factories.getFactory<
          AppData_V1,
          AppRel8ns_V1,
          IbGibAppAny,
          DynamicFormFactoryBase<AppData_V1, AppRel8ns_V1, IbGibAppAny>
        >({
          name
        });
      });

      debugger;
      this.selectTypeItem.selectOptions = [
        ...this.appFactories.map(factory => factory.getName()),
      ];

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected async createImpl(): Promise<AppModalResult> {
    const lc = `${this.lc}[${this.createImpl.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }

      // get the relevant factory
      const factory = this.getFactory({ item: this.selectedItem });

      // convert the form to a new app witness
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
      const resApp = await factory.newUp({});

      // convert the blank to the form
      const subform = await factory.witnessToForm({ witness: resApp.newIbGib });

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
  }): DynamicFormFactoryBase<AppData_V1, AppRel8ns_V1, IbGibAppAny> {
    const lc = `${this.lc}[${this.getFactory.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      let factories =
        this.appFactories.filter(x => x.getName() === item.value)

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
