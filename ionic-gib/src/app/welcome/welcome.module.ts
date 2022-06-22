import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SwiperModule } from 'swiper/angular';

import { WelcomePageRoutingModule } from './welcome-routing.module';
import { WelcomePage } from './welcome.page';
import { ChildAddedAnimationDirective } from '../common/directives/animations/child-added-animation.directive';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SwiperModule,
    WelcomePageRoutingModule
  ],
  declarations: [
    ChildAddedAnimationDirective,
    WelcomePage,
  ]
})
export class WelcomePageModule {}
