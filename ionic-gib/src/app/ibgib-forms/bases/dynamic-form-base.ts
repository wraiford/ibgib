import { EventEmitter, Injectable, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../dynamic-form-constants';
// import { CommonService } from '../../services/common.service';
import { FormItemInfo } from '../../ibgib-forms/types/form-items';
import { FormArray, FormBuilder, FormControl } from '@angular/forms';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

/**
 * Abstract base class for dynamic forms that contains common plumbing.
 */
@Injectable()
export class DynamicFormBase implements OnInit, OnDestroy {

  protected lc: string = `[${DynamicFormBase.name}]`;

  @Input()
  updating: boolean;

  // @Input()
  // busy: boolean;

  /**
   * Root form array for the dynamic form.
   */
  rootFormArray: FormArray = this.fb.array([]);

  _items: FormItemInfo[] = [];
  @Input()
  get items(): FormItemInfo[] {
    const lc = `${this.lc}[get items]`;
    if (logalot) { console.log(`${lc} returning items (${h.pretty(this._items)}) (I: 243b674d8659b9adaed0fb2905fd3c22)`); }
    return this._items;
  }
  set items(newItems: FormItemInfo[]) {
    const lc = `${this.lc}[set items]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (this._items.length === 0) {
        if (newItems?.length > 0) {
          this._items = newItems;
          this.updateForm(); // spins off
        } else {
          if (logalot) { console.log(`${lc} tried to set empty items (I: 18cb6a7839225ed886678022bf4b7122)`); }
        }
      } else {
        throw new Error(`items already set and can only be initialized once. (E: 29a7c1236677488e869f13ed4646ec38)`);
      }

      if (logalot) { console.log(`${lc} setting items (${h.pretty(newItems)}) (I: fdd6dc7f2a4b44be9bf71d1da0e86825)`); }
    } catch (error) {
      console.error(`${lc} (NO RETHROW) ${error.message}`);
      // throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  @Input()
  validationErrors: string[] = [];
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

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

  /**
   * Event emitter for the dynamic form's output value.
   */
  @Output()
  validated: EventEmitter<FormItemInfo[]> = new EventEmitter<FormItemInfo[]>();

  @Output()
  cancel: EventEmitter<void> = new EventEmitter<void>();

  constructor(
    protected fb: FormBuilder,
  ) {

  }

  ngOnInit() {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  ngOnDestroy() {
    const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
    if (logalot) { console.log(`${lc}`); }
  }

  async handleSaveClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleSaveClick.name}]`;
    try {
      if (logalot) { console.log(`${lc}`); }
      this.showHelp = false;
      const validationErrors = await this.validateForm();
      if (validationErrors.length > 0) {
        console.warn(`${lc} validation failed. Errors:\n${validationErrors.join('\n')}`);
        return;
      }

      // const outputData = await this.createImpl();
      // await this.common.modalController.dismiss(data);

      this.validated.emit(this.items);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

  async handleCancelClick(): Promise<void> {
    const lc = `${this.lc}[${this.handleCancelClick.name}]`;
    if (logalot) { console.log(`${lc}`); }
    this.cancel.emit();
  }

  async validateForm(): Promise<string[]> {
    const lc = `${this.lc}[${this.validateForm.name}]`;
    this.validationErrors.splice(0, this.validationErrors.length);
    this.erroredFields.splice(0, this.erroredFields.length);
    const errors: string[] = [];
    const erroredFields: string[] = [];

    let itemInfos: FormItemInfo[] = Object.values(this.items);
    for (let i = 0; i < itemInfos.length; i++) {
      const itemInfo = itemInfos[i];
      let value = this[itemInfo.name];
      if (logalot) { console.log(`${lc} doing ${itemInfo.name}`); }
      if (value) {
        if (logalot) {
          if (itemInfo.private) {
            console.log(`${lc} value: [field is private]`);
          } else {
            console.log(`${lc} value: ${value}`);
          }
        }

        if (typeof value === 'string') {
          if (itemInfo.regexp) {
            if (logalot) { console.log(`${lc} ${itemInfo.name} is a string. regexp: ${itemInfo.regexp}`); }
            if ((value.match(itemInfo.regexp) ?? []).length === 0) {
              erroredFields.push(itemInfo.name);
              errors.push(`${itemInfo.name} must match regexp: ${itemInfo.regexp}`);
            }
          }
          if ((<string>value).includes('\n')) {
            erroredFields.push(itemInfo.name);
            errors.push(`${itemInfo.name} cannot contain new lines.`);
          }
        }
        if (itemInfo.fnValid && !itemInfo.fnValid(value)) {
          erroredFields.push(itemInfo.name);
          errors.push(`${itemInfo.name} error: ${itemInfo.fnErrorMsg}`);
        }
      } else {
        if (itemInfo.required) {
          erroredFields.push(itemInfo.name);
          errors.push(`${itemInfo.name} required.`);
        }
      }
    }

    errors.forEach(e => this.validationErrors.push(e));
    if (this.validationErrors.length > 0) {
      console.error(`${lc} this.validationErrors:\n${this.validationErrors.join('\n')}`);
      this.scrollToTopToShowValidationErrors();
    }
    erroredFields.forEach(e => this.erroredFields.push(e));

    return errors;
  }

  scrollToTopToShowValidationErrors(): void {
    const lc = `${this.lc}[${this.scrollToTopToShowValidationErrors.name}]`;
    if (logalot) { console.warn(`${lc} implement in modal implementing class to scroll to top to show validation errors. (W: f8e7ee5168f2c567a60c81be16ec2422)`); }
    if (this.ionContent?.scrollToTop) {
      if (logalot) { console.log(`${lc} this.ionContent?.scrollToTop truthy (I: 6e33d8936f92499a927da0c795b2a2e2)`); }
      this.ionContent.scrollToTop();
    } else {
      if (logalot) { console.log(`${lc} this.ionContent?.scrollToTop falsy (I: 540e42dee9f44ed98460f83f2a98b367)`); }
    }
  }

  handleShowHelpClick(): void {
    this.showHelp = !this.showHelp;
  }

  async updateForm(): Promise<void> {
    const lc = `${this.lc}[${this.updateForm.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.updating) {
        console.warn(`Already updating. (W: fea5e0717beb466585a11bb46e0385a7)`);
        return;
      }
      this.updating = true;

      for (let i = 0; i < this.items.length; i++) {
        const item = this.items[i];
        if (item.children?.length > 0) {
          // item is a container of other items
        } else {
          // item itself is the data
          debugger;
          let control = this.fb.control(item.name, {
          });
          this.rootFormArray.controls.push(control);
        }
      }

      console.log(`this.items: ${this.items}`)

      await h.delay(2000); // debug

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.updating = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }



  addControl({
    parent,
    item,
  }: {
    parent: FormArray,
    item: FormItemInfo,
  }): Promise<void> {
    //  parent.push()
    throw new Error('not impl')
  }

}
