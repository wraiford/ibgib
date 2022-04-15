import {
  Component, EventEmitter, Injectable, Input, OnDestroy, OnInit, Output,
  ViewChild
} from '@angular/core';
import {
  AbstractControl, AsyncValidatorFn, FormArray, FormBuilder, FormControl,
  FormGroup, ValidatorFn, Validators
} from '@angular/forms';
import { IonContent } from '@ionic/angular';

import { DynamicFormBase } from '../bases/dynamic-form-base';

@Component({
  selector: 'ib-sub-form',
  templateUrl: './sub-form.component.html',
  styleUrls: ['./sub-form.component.scss'],
})
export class SubFormComponent extends DynamicFormBase
  implements OnInit {

  constructor(
    protected fb: FormBuilder,
  ) {
    super(fb);
  }

  ngOnInit() {}

}
