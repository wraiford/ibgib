import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormArray, } from '@angular/forms';

import * as h from 'ts-gib/dist/helper';
import { DynamicFormBase } from '../bases/dynamic-form-base';

import * as c from '../dynamic-form-constants';
import { FormItemInfo } from '../types/form-items';

console.log(`ibgib reminder: dynamic forms module doesn't use global logalot/debugBorder from constants file...(delete this reminder at some point when refactor common module and constants)`);
const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false || true;

@Component({
  selector: 'ib-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss'],
})
export class DynamicFormComponent
  extends DynamicFormBase
  implements AfterViewInit {

  protected lc: string = `[${DynamicFormComponent.name}]`;

  // @Input()
  // fields: FormItemInfo[];

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

}
