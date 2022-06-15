import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SwiperModule } from 'swiper/angular';

import { WelcomePageRoutingModule } from './welcome-routing.module';
import { WelcomePage } from './welcome.page';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SwiperModule,
    WelcomePageRoutingModule
  ],
  declarations: [WelcomePage]
})
export class WelcomePageModule {}
