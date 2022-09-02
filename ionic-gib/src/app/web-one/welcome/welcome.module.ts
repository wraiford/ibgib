import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SwiperModule } from 'swiper/angular';

import { WelcomePageRoutingModule } from './welcome-routing.module';
import { WelcomePage } from './welcome.page';
import { ChildAddedAnimationDirective } from '../../common/directives/animations/child-added-animation.directive';
import { FadeOutAnimationDirective } from '../../common/directives/animations/fade-out-animation.directive';
import { FadeInAnimationDirective } from '../../common/directives/animations/fade-in-animation.directive';


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
    FadeOutAnimationDirective,
    FadeInAnimationDirective,
    WelcomePage,
  ]
})
export class WelcomePageModule { }
