/**
 * @module
 *
 * Types used in bindings for forms/dynamic forms.
 *
 * ## transitioning development
 *
 * I am transitioning from a ad hoc field behavior with angular templated forms
 * to a slightly more powerful dynamic form fields that leverages angular's
 * reactive forms. So many of the later properties of {@link FormItemInfo} are
 * optional for backwards compatibility. These may become required in the
 * future, once I have dynamic forms more fleshed out.
 */

/**
 * Used in modal forms.
 */
export interface FormItemInfo {
  /**
   * Property name
   */
  name: string;
  /**
   *
   */
  value?: string | number | boolean;
  /**
   * Label for the property on a form
   */
  label?: string;
  /**
   * Optional description for the property. Can bind title/hover/tooltip to this.
   */
  description?: string;
  /**
   * Placeholder when entering the field's data.
   */
  placeholder?: string;
  /**
   * Validation regular expression
   */
  regexp?: RegExp;
  /**
   * regexp.source
   */
  regexpSource?: string;
  /**
   * Only required if wanting to do validation beyond regexp/required.
   */
  fnValid?: (value: string) => boolean;
  /**
   * Error message that shows up **when using `fnValid`**.
   *
   * Other messages show for regexp/required.
   */
  fnErrorMsg?: string;
  /**
   * If the field is required.
   */
  required?: boolean;
  /**
   * If true, will not log field and will use type='password', unless the field
   * is {@link unmasked}.
   */
  private?: boolean;
  /**
   * If true, will reveal a private field.
   */
  unmasked?: boolean;
  /**
   * If true, then regardless of modal state (adding/editing/viewing), this
   * field will always be readonly.
   */
  readonly?: boolean;
  /**
   * If truthy and non-zero, then this is a composite item which contains
   * other items.
   *
   * Basically with angular, this translates to either a `FormGroup` or
   * `FormArray`.
   */
  children?: FormItemInfo[];
  /**
   * @see {@link FormItemDataType}
   *
   * Only should be set if {@link children} is falsy.
   */
  dataType?: FormItemDataType;
  /**
   * Options to populate a select drop-down list (valid value list). I believe
   * this can also be populated after the field info has been created but
   * before/while the select list is shown to the user.
   */
  selectOptions?: string[];
  /**
   * If given, should be the min of the field for validation.
   *
   * If the dataType is some kind of text, then this refers to the length of string.
   * If the dataType is some kind of number, then this refers to the value of the number.
   *
   * @optional
   */
  // min?: number;
  /**
   * If given, should be the max of the field for validation.
   *
   * If the dataType is some kind of text, then this refers to the length of string.
   * If the dataType is some kind of number, then this refers to the value of the number.
   *
   * @optional
   */
  // max?: number;
}

/** @see {@link FormItemDataType} */
export type FormItemDataType =
    'text' | 'textarea' | 'checkbox' | 'select_multi' | 'toggle';
/**
 * Type of the data, to drive what kind of control will be used for data.
 *
 * See individual members for more info.
 *
 * For fields that have auto-generated UI.
 *
 * {@link text}
 * {@link textarea}
 * {@link select}
 * {@link toggle}
 */
export const FormItemDataType = {
  /**
   * @example name
   */
  text: 'text' as FormItemDataType,
  /**
   * @example description
   */
  textarea: 'textarea' as FormItemDataType,
  /**
   * select a single string from a list.
   *
   * @example States e.g. TX, TN, NY, etc.
   *
   * @see {@link select_multi}
   */
  checkbox: 'checkbox' as FormItemDataType,
  /**
   * Same as {@link checkbox}, but with multiple options selectable.
   */
  select_multi: 'select_multi' as FormItemDataType,
  /**
   * Boolean true/false or on/off, etc.
   */
  toggle: 'toggle' as FormItemDataType,
}

/**
 * syntactic sugar for `Object.values(FormItemDataType)`
 */
export const FORM_ITEM_DATA_TYPES = Object.values(FormItemDataType);