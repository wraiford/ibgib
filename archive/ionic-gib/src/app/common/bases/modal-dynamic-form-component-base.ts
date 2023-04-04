import { AfterViewInit, ChangeDetectorRef, Directive, Injectable, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { FormItemInfo } from '../../ibgib-forms/types/form-items';
import { DynamicFormComponent } from '../../ibgib-forms/dynamic-form/dynamic-form.component';
import { DynamicFormComponentBase } from './dynamic-form-component-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export type ModalContext = 'create' | 'edit';

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Directive()
export abstract class ModalDynamicFormComponentBase<TDataOut>
  extends DynamicFormComponentBase<TDataOut>
  implements OnInit, AfterViewInit, OnDestroy {

  protected lc: string = `[${ModalDynamicFormComponentBase.name}]`;

  protected modalContext: ModalContext = 'create';

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  /**
   * Using this in binding to the modal's ion-title.
   *
   * Override this in descending classes.
   */
  getTitleText(): string { return 'Form'; }
  /**
   * Using this in binding to the modal's ion-title.
   *
   * Override this in descending classes.
   */
  getTitleHint(): string { return 'Fill this out why doncha...'; }

  async handleDynamicSubmit_Validated(form: DynamicFormComponent): Promise<void> {
    const lc = `${this.lc}[${this.handleDynamicSubmit_Validated.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 43cc5cd868b5ded377daae3bc059f222)`); }

      const data = await this.createImpl();
      await this.common.modalController.dismiss(data);

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  async handleDynamicSubmit_ErrorThrown(form: DynamicFormComponent): Promise<void> {
    const lc = `${this.lc}[${this.handleDynamicSubmit_ErrorThrown.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 614295c0f7626a5b23adc4677f7b0822)`); }

      await this.common.modalController.dismiss(undefined);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  protected abstract createImpl(): Promise<TDataOut>;

  async handleCancelClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleCancelClick.name}]`;
    if (logalot) { console.log(`${lc}`); }
    await this.common.modalController.dismiss();
  }

}
