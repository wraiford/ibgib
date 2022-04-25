import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormArray, } from '@angular/forms';

import * as h from 'ts-gib/dist/helper';
import { DynamicFormBase } from '../bases/dynamic-form-base';

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
export class DynamicFormComponent extends DynamicFormBase
  implements AfterViewInit {

  protected lc: string = `[${DynamicFormComponent.name}]`;

  // @Input()
  // fields: FormItemInfo[];

  @Output()
  itemSelect: EventEmitter<FormItemInfo> = new EventEmitter<FormItemInfo>();

  public debugBorderWidth: string = debugBorder ? "5px" : "0px"
  public debugBorderColor: string = "#83BACB";
  public debugBorderStyle: string = "solid";

  constructor(
    protected fb: FormBuilder
  ) {
    super(fb);
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
    return a && b ? a.toLowerCase() === b.toLowerCase() : a === b;
  }

}
