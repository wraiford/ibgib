import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { DynamicFormComponent } from './dynamic-form/dynamic-form.component';
import { IonicModule } from '@ionic/angular';
import { SubFormComponent } from './sub-form/sub-form.component';

@NgModule({
  declarations: [
    DynamicFormComponent,
    SubFormComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
  ],
  exports: [
    FormsModule,
    ReactiveFormsModule,
    DynamicFormComponent,
  ]
})
export class IbgibFormsModule { }
