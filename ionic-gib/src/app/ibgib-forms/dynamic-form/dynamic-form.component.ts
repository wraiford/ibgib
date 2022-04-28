import { AfterViewInit, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormArray, FormGroup, ValidatorFn, AsyncValidatorFn, AbstractControl, Validators, } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { Subscription } from 'rxjs/internal/Subscription';

import * as h from 'ts-gib/dist/helper';
// import { DynamicFormBase } from '../bases/dynamic-form-base';

import * as c from '../dynamic-form-constants';
import { FormItemInfo } from '../types/form-items';

console.log(`ibgib reminder: dynamic forms module doesn't use global logalot/debugBorder from constants file...(delete this reminder at some point when refactor common module and constants)`);
const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss'],
})
export class DynamicFormComponent
  // extends DynamicFormBase
  implements OnDestroy, AfterViewInit {
  protected lc: string = `[${DynamicFormComponent.name}]`;
  @Input()
  updating: boolean;

  @Input()
  rootFormGroup: FormGroup;

  @Input()
  parentFormGroup: FormGroup;

  allItems_Flat_ById: { [uuid: string]: FormItemInfo };
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

  /**
   * Only gets boolean on if any errors exist. Does not get
   * actual errors.
   *
   * ## atow AbstractControl.errors
   *
   * Here is documentation for {@link AbstractControl.errors}
   * An object containing any errors generated by failing validation, or
   * null if there are no errors.
   * @see {@link AbstractControl.errors}
   */
  @Input()
  get hasErrors(): boolean {
    const controlMap = this.rootFormGroup?.controls ?? {};
    // const controlNames = Object.keys(controlMap);
    const controls = Object.values(controlMap);
    return controls.some(control => {
      const errorMap = control.errors;
      return !!errorMap;
    });
  }

  // @Input()
  // validationErrors: string[] = [];
  @Input()
  get validationErrors(): string[] {
    const validationErrorStrings = [];
    const controlMap = this.rootFormGroup?.controls ?? {};
    const controlNames = Object.keys(controlMap);
    controlNames.forEach(controlNameIsItemId => {
      const control = controlMap[controlNameIsItemId];
      if (control.errors) {
        const item = this.allItems_Flat_ById[controlNameIsItemId];
        validationErrorStrings.push(`${item.label}: ${this.getError(item)}`);
      }
    });
    return validationErrorStrings;
  }
  @Input()
  validationErrorString: string;
  @Input()
  erroredFields: string[] = [];

  @Input()
  showHelp: boolean = true;

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


  /**
   * If true, will show the submit button.
   */
  @Input()
  showSubmit: boolean = true;

  @Output()
  submit: EventEmitter<DynamicFormComponent> = new EventEmitter<DynamicFormComponent>();


  /**
   * Hack that exposes children controls' item select events.  I doubt that I
   * should do this but I'm just trying to get something going right now.
   */
  @Output()
  itemSelect: EventEmitter<FormItemInfo> = new EventEmitter<FormItemInfo>();

  /**
   * If true, will show an error summary of validation errors near submit button
   * in addition to the inline errors already shown by each control.
   */
  @Input()
  showErrorSummary: boolean;


  public debugBorderWidth: string = debugBorder ? "5px" : "0px"
  public debugBorderColor: string = "#83BACB";
  public debugBorderStyle: string = "solid";

  constructor(
    protected fb: FormBuilder,
    protected ref: ChangeDetectorRef,
  ) {
    // super(fb);
  }

  async ngAfterViewInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngAfterViewInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      // await this.updateForm();
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
    Object.values(this.validationSubscriptions).forEach(sub => {
      if (sub) { sub.unsubscribe(); }
    });
    this.validationSubscriptions = {};
  }

  /**
   * Hacky handler for form's select children controls.
   * Emits {@link itemSelect} event.
   *
   * @see {@link itemSelect}
   *
   * @param e select event
   * @param item item (dataType == select) that triggered a select event.
   */
  async handleSelectChange(e: any, item: FormItemInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleSelectChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} started...`)};
      if (!e.detail?.value) { throw new Error(`e.detail.value (item selected) falsy (E: 97fe80e7ae2948b69de3f350584d57d3)`) }
      let value: any = e.detail.value;
      item.value = value;
      this.itemSelect.emit(item);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  compareStrings(a: string, b: string): boolean {
    // const lc = `${this.lc}[compareMenuItems]`; // this is not defined when compareRoots is used
    const lc = `[compareStrings]`;
    if (logalot) { console.log(`${lc}`); }
    // reactive form controls when passing in {value: x} without something else
    // has the curious case that b is "" but toLowerCase is not a function.
    // if (typeof a !== 'string') { return false; }
    // if (typeof b !== 'string') { return false; }
    // if (!a.toLowerCase || !b.toLowerCase) {
    //   return false;
    // }
    return a && b ? a?.toLowerCase() === b?.toLowerCase() : a === b;
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
    setTimeout(() => this.ref)
  }

  validationSubscriptions: {[key: string]: Subscription} = { }

  async updateForm(): Promise<void> {
    const lc = `${this.lc}[${this.updateForm.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.updating) {
        console.warn(`Already updating. (W: fea5e0717beb466585a11bb46e0385a7)`);
        return;
      }
      this.updating = true;
      const randomIds: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const id = await h.getUUID();
        randomIds.push(id.substring(0, 16));
      }

      // await h.delay(2000);
      this.allItems_Flat_ById = {};

      const newControl = async (item: FormItemInfo, validators: (ValidatorFn | AsyncValidatorFn)[]) => {
        let control: AbstractControl;
        item.uuid = item.uuid || randomIds.pop();
        const addItemById = (x: FormItemInfo) => {
          this.allItems_Flat_ById[x.uuid] = x;
          // call recursively for any children
          if (x.children) { x.children.forEach(child => addItemById(child)); }
        }
        this._items.forEach(x => addItemById(x));
        if (item.children) {
          throw new Error(`control with children not implemented yet (E: e502388413bcf4c74926b186d9265c22)`);
          // control = this.fb.array([
          //   ...item.children.map(x => getControl(x))
          // ]);
        } else {
          if (logalot) { console.log(`${lc} adding standard control (I: aafdaadf4b4e0e659bd6a53d52924622)`); }
          control = this.fb.control({
              value: item.value ?? item.defaultValue ?? '',
              // disabled: ['toggle', 'select'].includes(item.dataType) ? item.readonly ?? false : false,
              disabled: item.readonly ?? false,
            },
            validators
          );
        }

        this.validationSubscriptions[item.uuid] =
          control.statusChanges.subscribe(status => {
            if (logalot) { console.log(`${lc} item (${item.name}, ${item.uuid}) validation changed. ${status} (I: a4737572c8244242fa2a44eb18c96222)`); }
            if (status === 'INVALID') {
              item.errored = true;
            } else if (item.errored) {
              delete item.errored;
            }
          });

        // item.control = control;

        return control;
      }

      // start with an empty form group...
      this.rootFormGroup = this.fb.group({});

      // add entries for each form item info
      for (let i = 0; i < this._items.length; i++) {
        const item = this._items[i];
        const validators = await this.getValidators({item});
        const control = await newControl(item, validators);
        if (item.children) {
          throw new Error(`not impl (E: 505be7ec1284ec23e3049b58c6880822)`);
          let formArray = <FormArray>control;
        } else {
          this.rootFormGroup.addControl(item.uuid, control);
        }
      }

      if (logalot) { console.log(`this.items: ${h.pretty(this.items)} (I: 30b7fc4146a757d5658af49f56f06322)`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.updating = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async getValidators({
    item,
  }: {
    item: FormItemInfo,
  }): Promise<(ValidatorFn | AsyncValidatorFn)[]> {
    const lc = `${this.lc}[${this.getValidators.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      const validators: (ValidatorFn | AsyncValidatorFn)[] = [];

      if (item.children?.length > 0) {
        // it's a subform
      } else {
        // it's a leaf node concrete control

        if (item.required) { validators.push(Validators.required); }
        if (item.dataType === 'number') {
          if (item.min || item.min === 0) { validators.push(Validators.min(item.min)); }
          if (item.max || item.max === 0) { validators.push(Validators.max(item.max)); }
        }

        if (item.regexp) { validators.push(Validators.pattern(item.regexp)); }

        if (item.fnValid) {
          // convert the fnValid to an Angular ValidatorFn
          const fnValid_Angular: ValidatorFn = (control) => {
            return item.fnValid(<string|number>control.value) ?
              null :
              {[item.uuid]: true};
          };
          validators.push(fnValid_Angular);
        }

      }

      return validators;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleSubmit(): Promise<void> {
    console.log('submitted');
    // this.submit.emit(this);
  }


  async handleTextChanged(text: string, item: FormItemInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleTextChanged.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      console.log(`${lc} text: ${text}`);
      item.value = text;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Combines if we are showing errors (e.g. if form submitted vs. pristine) and
   * if the item has an error.
   */
  showError({
    item,
  }: {
    item: FormItemInfo,
  }): boolean {
    const lc = `${this.lc}[${this.showError.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!item) { return false; }
      if (item.control) {
        let control = <AbstractControl>item.control;
        if (control.errors) {
          return true;
        }
      } else {
        throw new Error(`(UNEXPECTED) item.control assumed (E: 4e22c5b7ed7ff4d354aeb156bf42f122)`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  getControl(item: FormItemInfo): AbstractControl {
    const lc = `${this.lc}[${this.getControl.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!item) { return undefined; }
      if (!item.uuid) { throw new Error(`(UNEXPECTED) item.uuid required (E: 5f1a9fd7febf421fa579ec62992b9aee)`); }

      // get the control based on the uuid
      const controlNames = Object.keys(this.rootFormGroup.controls);
      const controlMaybe = controlNames
          .filter(controlName => controlName === item.uuid)
          .map(controlName => this.rootFormGroup.controls[controlName]);

      if (controlMaybe.length === 0) {
        debugger;
        throw new Error(`(UNEXPECTED) no control found for item (${item.name}, ${item.uuid}) (E: 1eb112f17981a08e09c928eed929a922)`);
      }

      return controlMaybe[0];
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  /**
   * Combines if we are showing errors (e.g. if form submitted vs. pristine) and
   * if the item has an error.
   */
  getError(item: FormItemInfo): string {
    const lc = `${this.lc}[${this.getError.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (!item) { return ''; }
      if (!item.errored) { return ''; }
      if (!item.uuid) { throw new Error(`item.uuid required (E: c29a3ad78c2916663e755217ee6c4122)`); }

      const control = this.getControl(item);
      if (control.errors) {
        const errorNames = Object.keys(control.errors);
        const errorStrings = errorNames.map(errorName => {
          if (errorName === 'required') {
            return `${item.name} is required.`
          } else if (errorName === 'pattern') {
            return item.regexpErrorMsg ?
              `${item.regexpErrorMsg} Pattern: /${item.regexp?.source}/` :
              `Must match the pattern /${item.regexp?.source}/`;
          } else {
            return errorName;
          }
        });
        return `${errorStrings.join('\n')}`;
      }
    } catch (error) {
      debugger;
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
