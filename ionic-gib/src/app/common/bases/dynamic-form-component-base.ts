import { AfterViewInit, ChangeDetectorRef, Directive, Injectable, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { FormItemInfo } from '../../ibgib-forms/types/form-items';
import { DynamicFormComponent } from '../../ibgib-forms/dynamic-form/dynamic-form.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Base class for a component centered around a dynamic form.
 */
@Directive()
export abstract class DynamicFormComponentBase<TDataOut>
  implements OnInit, AfterViewInit, OnDestroy {

  protected lc: string = `[${DynamicFormComponentBase.name}]`;

  @Input()
  showHelp: boolean;

  /**
   * Optional help text for the entire modal form.
   */
  @Input()
  helpText: string;

  /**
   * Put '#formContainer' in your ion-content section to scroll to top
   * when there are validation errors.
   *
   * Or, you can override implementation of `scrollToTopToShowValidationErrors`.
   *
   * @example <ion-content #formContainer fullscreen>
   */
  @ViewChild('formContainer')
  ionContent: IonContent;

  /**
   * If true, then modal is readonly.
   *
   * ## notes
   *
   * * I would have preferred just `readonly`, but that's a special word in js/ts.
   */
  @Input()
  isReadonly: boolean;

  @ViewChild('form')
  form: DynamicFormComponent;

  @Input()
  initializing: boolean;

  @Input()
  formItems: FormItemInfo[];

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) { }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc}`); }
    // super.ngOnInit();
  }

  async ngAfterViewInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngAfterViewInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      await this.initialize();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  /**
   * Initializes to default space values.
   */
  protected async initialize(): Promise<void> {
    const lc = `${this.lc}[${this.initialize.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      this.initializing = true;

      await this.initializeImpl();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      this.initializing = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  protected abstract initializeImpl(): Promise<void>;

  scrollToTopToShowValidationErrors(): void {
    const lc = `${this.lc}[${this.scrollToTopToShowValidationErrors.name}]`;
    if (logalot) { console.warn(`${lc} implement in modal implementing class to scroll to top to show validation errors. (W: f8e7ee5168f2c567a60c81be16ec2422)`); }
    if (this.ionContent?.scrollToTop) {
      if (logalot) { console.log(`${lc} this.ionContent?.scrollToTop truthy (I: 97effa095f38f6b6daca84416c648a22)`); }
      this.ionContent.scrollToTop();
    } else {
      if (logalot) { console.log(`${lc} this.ionContent?.scrollToTop falsy (I: 3d4df466c4043b85d7c3f7e5a767cc22)`); }
    }
  }

  handleShowHelpClick(): void {
    this.showHelp = !this.showHelp;
  }

  async handleDynamicSubmit(form: DynamicFormComponent): Promise<void> {
    const lc = `${this.lc}[${this.handleDynamicSubmit.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      this.showHelp = false;

      if (this.form.hasErrors) {
        this.form.showErrorSummary = true;
        setTimeout(() => this.ref.detectChanges());
        await this.handleDynamicSubmit_Invalid(form);
      } else {
        this.form.showErrorSummary = false;
        await this.handleDynamicSubmit_Validated(form);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      await this.handleDynamicSubmit_ErrorThrown(form);
    }
  }
  abstract handleDynamicSubmit_Validated(form: DynamicFormComponent): Promise<void>;
  abstract handleDynamicSubmit_ErrorThrown(form: DynamicFormComponent): Promise<void>;
  async handleDynamicSubmit_Invalid(form: DynamicFormComponent): Promise<void> {
    const lc = `${this.lc}[${this.handleDynamicSubmit_Invalid.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d4e7078be34b36c335b472d507c3cf22)`); }
      console.warn(`${lc} Cannot submit form, as there are validation errors. ${this.form.validationErrors.join('|')} (I: 2a47bdab464140d39af9d5d0cba35cf3)`);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
