import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IbgibFormsModule } from '../ibgib-forms/ibgib-forms.module';

import { BootstrapPageRoutingModule } from './bootstrap-routing.module';
import { BootstrapPage } from './bootstrap.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IbgibFormsModule,
    BootstrapPageRoutingModule
  ],
  declarations: [BootstrapPage]
})
export class BootstrapPageModule { }
