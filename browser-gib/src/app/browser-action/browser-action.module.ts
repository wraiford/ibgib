import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BrowserActionPageRoutingModule } from './browser-action-routing.module';

import { BrowserActionPage } from './browser-action.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BrowserActionPageRoutingModule
  ],
  declarations: [BrowserActionPage]
})
export class BrowserActionPageModule {}
