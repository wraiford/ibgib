/**
 * Types used in UX operations/bindings in various views.
 */

/**
 * Used in modal forms.
 */
export interface FieldInfo {
  /**
   * Property name
   */
  name: string;
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
   * @see {@link FieldDataType}
   */
  dataType?: FieldDataType;
  /**
   * Options to populate a select drop-down list (valid value list). I believe
   * this can also be populated after the field info has been created but
   * before/while the select list is shown to the user.
   *
   * For fields that have auto-generated UI.
   */
  selectOptions?: string[];
}

export type FieldDataType =
    'short_text' | 'long_text' | 'select_single' | 'select_multi' | 'bool';
/**
 * Type of the data, to drive what kind of control will be used for data.
 *
 * See individual members for more info.
 *
 * For fields that have auto-generated UI.
 *
 * {@link short_text}
 * {@link long_text}
 * {@link select}
 * {@link bool}
 */
export const FieldDataType = {
  /**
   * @example name
   */
  short_text: 'short_text' as FieldDataType,
  /**
   * @example description
   */
  long_text: 'long_text' as FieldDataType,
  /**
   * select a single string from a list.
   *
   * @example States e.g. TX, TN, NY, etc.
   *
   * @see {@link select_multi}
   */
  select_single: 'select_single' as FieldDataType,
  /**
   * Same as {@link select_single}, but with multiple options selectable.
   */
  select_multi: 'select_multi' as FieldDataType,
  /**
   * Boolean true/false or on/off, etc.
   */
  bool: 'bool' as FieldDataType,
}
/**
 * syntactic sugar for `Object.values(FieldDataType)`
 */
export const FIELDDATATYPE_VALID_VALUES = Object.values(FieldDataType);

export interface FormFields {
    groups: FieldGroup[];
}

export interface FieldGroup {
    name: string;
    fields: FieldInfo[];
}
