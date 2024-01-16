import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { YourDataPageRoutingModule } from './your-data-routing.module';

import { YourDataPage } from './your-data.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    YourDataPageRoutingModule
  ],
  declarations: [YourDataPage]
})
export class YourDataPageModule {}
