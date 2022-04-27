import { AfterViewInit, ChangeDetectorRef, Injectable, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { FormItemInfo } from '../../ibgib-forms/types/form-items';
import { DynamicFormComponent } from '../../ibgib-forms/dynamic-form/dynamic-form.component';

const logalot = c.GLOBAL_LOG_A_LOT || false;

export type ModalContext = 'create' | 'edit';

/**
 * Prompts the user for information gathering and generates a new ibGib.
 *
 * Does NOT save this ibGib in any space(s) at present.
 */
@Injectable()
export abstract class DynamicModalFormComponentBase<TDataOut>
  implements OnInit, AfterViewInit, OnDestroy {

  protected lc: string = `[${DynamicModalFormComponentBase.name}]`;

  protected modalContext: ModalContext = 'create';

  // @Input()
  // validationErrors: string[] = [];
  // @Input()
  // validationErrorString: string;
  // @Input()
  // erroredFields: string[] = [];

  @Input()
  showHelp: boolean;

  /**
   * Put '#modalIonContent' in your ion-content section to scroll to top
   * when there are validation errors.
   *
   * Or, you can override implementation of `scrollToTopToShowValidationErrors`.
   *
   * @example <ion-content #modalIonContent fullscreen>
   */
  @ViewChild('modalIonContent')
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

  @ViewChild('metaform')
  metaform: DynamicFormComponent;

  @ViewChild('form')
  form: DynamicFormComponent;

  @Input()
  initializing: boolean;

  @Input()
  metaformItems: FormItemInfo[];

  @Input()
  formItems: FormItemInfo[];

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc}`); }
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
      this.initializing = true;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  protected abstract initializeImpl(): Promise<void>;

  async handleSubmitYo(form: DynamicFormComponent): Promise<void> {
    const lc = `${this.lc}[${this.handleSubmitYo.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      this.showHelp = false;
      debugger;

      if (this.form.hasErrors) {
        this.form.showErrorSummary = true;
        setTimeout(() => this.ref.detectChanges());
        console.warn(`${lc} Cannot submit form, as there are validation errors. ${this.form.validationErrorString} (I: 0d4bba36dde74552a93b94bc2c300fec)`);
        return;
      } else {
        this.form.showErrorSummary = false;
      }


      // no validation errors, so create the thing.

      const data = await this.createImpl();
      await this.common.modalController.dismiss(data);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  protected abstract createImpl(): Promise<TDataOut>;

  async handleCancelClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleCancelClick.name}]`;
    if (logalot) { console.log(`${lc}`); }
    await this.common.modalController.dismiss();
  }

  // async validateForm(): Promise<string[]> {
  //   const lc = `${this.lc}[${this.validateForm.name}]`;
  //   this.validationErrors.splice(0, this.validationErrors.length);
  //   this.erroredFields.splice(0, this.erroredFields.length);
  //   const errors: string[] = [];
  //   const erroredFields: string[] = [];

  //   let fields: FormItemInfo[] = Object.values(this.fields);
  //   for (let i = 0; i < fields.length; i++) {
  //     const field = fields[i];
  //     let value = this[field.name];
  //     if (logalot) { console.log(`${lc} doing ${field.name}`); }
  //     if (value) {
  //       if (logalot) {
  //         if (field.private) {
  //           console.log(`${lc} value: [field is private]`);
  //         } else {
  //           console.log(`${lc} value: ${value}`);
  //         }
  //       }

  //       if (typeof value === 'string') {
  //         if (field.regexp) {
  //           if (logalot) { console.log(`${lc} ${field.name} is a string. regexp: ${field.regexp}`); }
  //           if ((value.match(field.regexp) ?? []).length === 0) {
  //             erroredFields.push(field.name);
  //             errors.push(`${field.name} must match regexp: ${field.regexp}`);
  //           }
  //         }
  //         if ((<string>value).includes('\n')) {
  //           erroredFields.push(field.name);
  //           errors.push(`${field.name} cannot contain new lines.`);
  //         }
  //       }
  //       if (field.fnValid && !field.fnValid(value)) {
  //         erroredFields.push(field.name);
  //         errors.push(`${field.name} error: ${field.fnErrorMsg}`);
  //       }
  //     } else {
  //       if (field.required) {
  //         erroredFields.push(field.name);
  //         errors.push(`${field.name} required.`);
  //       }
  //     }
  //   }

  //   errors.forEach(e => this.validationErrors.push(e));
  //   if (this.validationErrors.length > 0) {
  //     console.error(`${lc} this.validationErrors:\n${this.validationErrors.join('\n')}`);
  //     this.scrollToTopToShowValidationErrors();
  //   }
  //   erroredFields.forEach(e => this.erroredFields.push(e));

  //   return errors;
  // }

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

}
