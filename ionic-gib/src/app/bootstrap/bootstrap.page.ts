import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonService } from '../services/common.service';
import { Plugins } from '@capacitor/core';
const { Modals } = Plugins;

import * as c from '../common/constants';
import { getValidatedBootstrapIbGib, updateBootstrapIbGib } from '../common/helper/space';
import { BootstrapIbGib } from '../common/types/space';
import { IbGibSpaceAny } from '../common/witnesses/spaces/space-base-v1';
import { IonicSpace_V1 } from '../common/witnesses/spaces/ionic-space-v1';
import { DynamicFormComponentBase } from '../common/bases/dynamic-form-component-base';
import { DynamicFormComponent } from '../ibgib-forms/dynamic-form/dynamic-form.component';
import { DynamicFormBuilder } from '../common/helper/form';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * I have this in a separate class (not ibgib page) for a couple reasons. The
 * main one is that we do not want the thing auto-syncing and updating this
 * behind the scenes.
 */
@Component({
  selector: 'ib-bootstrap',
  templateUrl: './bootstrap.page.html',
  styleUrls: ['./bootstrap.page.scss'],
})
export class BootstrapPage extends DynamicFormComponentBase<any>
  implements OnInit {

  /**
   * log context. Override this property in descending classes.
   *
   * NOTE:
   *   I use very short variable names ONLY when they are all over
   *   the place. This is used all throughout the codebase.
   *   Otherwise, I usually use very long names...often too long! :-)
   */
  protected lc: string = `[${BootstrapPage.name}]`;

  @Input()
  bootstrapIbGib: BootstrapIbGib;

  @Input()
  localSpaces: IonicSpace_V1[] = [];

  @Input()
  defaultSpace: IonicSpace_V1;

  /**
   * If a user selects a new space, this will be set for when submitted...
   * probably not doing this correctly.
   */
  @Input()
  newlySelectedDefaultSpace: IonicSpace_V1;

  @Input()
  defaultSpaceNotFound: boolean;

  @Input()
  newDefaultSpaceSelected: boolean;

  @Input()
  get showSubmit(): boolean {
    return this.newDefaultSpaceSelected;
  }

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref)
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 850f2df6992f1f931cd3c24c4c32e222)`); }
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

      this.bootstrapIbGib =
        await getValidatedBootstrapIbGib({ zeroSpace: this.common.ibgibs.zeroSpace });
      await this.initLocalSpaces();
      await this.initDefaultSpace();
      await this.initFormItems();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initLocalSpaces(): Promise<void> {
    const lc = `${this.lc}[${this.initLocalSpaces.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 8825effe62ad45520f7c6739d8669d22)`); }
      this.localSpaces = await this.common.ibgibs.getLocalUserSpaces({
        lock: true,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initDefaultSpace(): Promise<void> {
    const lc = `${this.lc}[${this.initDefaultSpace.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 1de0a1018f3b0aba4905122625f08522)`); }
      const defaultSpaceId = this.bootstrapIbGib.data.defaultSpaceId;

      const filteredSpaces =
        this.localSpaces.filter(x => x.data.uuid === defaultSpaceId);
      if (filteredSpaces.length === 1) {
        // it was found, all is good in the world
        if (logalot) { console.log(`${lc} defaultSpaceId (${defaultSpaceId}) found. (I: 05508c4b3859112443e8ef76d7987722)`); }
        this.defaultSpace = filteredSpaces[0];
      } else {
        if (logalot) { console.log(`${lc} defaultSpaceId (${defaultSpaceId}) was not found in this.localSpaces. (I: a7f0c89e62f2e484bebc7ed51025c722)`); }
        delete this.defaultSpace;
        this.defaultSpaceNotFound = true;
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initFormItems(): Promise<void> {
    const lc = `${this.lc}[${this.initFormItems.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: da88afd88b5d133e377fba68ccffaf22)`); }

      const getSelectText = (x: IonicSpace_V1) => {
        return `${x.data.name} (${x.data.uuid?.slice(0, 10)})`;
      }

      this.formItems = [];
      this.ref.detectChanges();
      this.formItems = new DynamicFormBuilder()
        .forA({ what: 'Bootstrap' })
        .with({})
        .customItem({
          name: 'defaultSpaceId',
          label: 'Default Space',
          dataType: 'select',
          description: 'This is the local space in use (when the app starts).',
          required: true,
          selectOptions: [
            ...this.localSpaces.map(x => getSelectText(x))
          ],
          value: getSelectText(this.defaultSpace),
          onSelect: async (e, info) => {
            this.newDefaultSpaceSelected =
              info.value !== getSelectText(this.defaultSpace);
            this.newlySelectedDefaultSpace =
              this.localSpaces.filter(x => getSelectText(x) === info.value)[0];
          },
        })
        .outputItems();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleBackButtonClick(): Promise<void> {
    await this.common.nav.back();
  }

  async handleDynamicSubmit_Validated(form: DynamicFormComponent): Promise<void> {
    const lc = `${this.lc}[${this.handleDynamicSubmit_Validated.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c6539c42ebfa1d197a6a4e035d8f5422)`); }
      // update the selected default
      if (this.newlySelectedDefaultSpace) {
        await updateBootstrapIbGib({
          space: this.newlySelectedDefaultSpace,
          zeroSpace: this.common.ibgibs.zeroSpace,
          setSpaceAsDefault: true,
        });
      }

      // await this.initialize();
      window.location.reload();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  handleDynamicSubmit_ErrorThrown(form: DynamicFormComponent): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async handleClick_AddSpace(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_AddSpace.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 53938b8ea30d7ff55fc4ba9d98c5bb22)`); }
      const newLocalSpace = await this.common.ibgibs.createLocalSpaceAndUpdateBootstrap({
        zeroSpace: this.common.ibgibs.zeroSpace,
        allowCancel: true,
        createBootstrap: false,
      });
      if (!newLocalSpace) {
        await Modals.alert({ title: 'canceled...', message: 'add space canceled.' });
        return; /* <<<< returns early */
      }

      // reinitialize, because we have a new bootstrap with a new space.
      await this.initialize();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
