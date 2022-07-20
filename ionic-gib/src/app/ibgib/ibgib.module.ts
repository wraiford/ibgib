import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SwiperModule } from 'swiper/angular';

import { IbGibPageRoutingModule } from './ibgib-routing.module';


import { ActionBarComponent } from '../common/action-bar/action-bar.component';
import { RobbotBarComponent } from '../common/robbot-bar/robbot-bar.component';
import { AppBarComponent } from '../common/app-bar/app-bar.component';

import { FallbackViewComponent } from '../views/fallback-view/fallback-view.component';
import { TagViewComponent } from '../views/tag-view/tag-view.component';
import { CommentViewComponent } from '../views/comment-view/comment-view.component';
import { PicViewComponent } from '../views/pic-view/pic-view.component';
import { LinkViewComponent } from '../views/link-view/link-view.component';
import { RootViewComponent } from '../views/root-view/root-view.component';

import { ListItemViewComponent } from '../views/list-item-view/list-item-view.component';
import { ListViewComponent } from '../views/list-view/list-view.component';
import { SvgViewComponent } from '../views/svg-view/svg-view.component';
import { TagListViewComponent } from '../views/tag-list-view/tag-list-view.component';
import { RootListViewComponent } from '../views/root-list-view/root-list-view.component';
import { ChatViewComponent } from '../views/chat-view/chat-view.component';
import { IbGibPage } from './ibgib.page';

import { ChooseIconModalComponent } from '../common/choose-icon-modal/choose-icon-modal.component';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { SecretModalFormComponent } from '../common/modals/secret-modal-form/secret-modal-form.component';
import { EncryptionModalFormComponent } from '../common/modals/encryption-modal-form/encryption-modal-form.component';
import { OuterspaceModalFormComponent } from '../common/modals/outerspace-modal-form/outerspace-modal-form.component';
import { RobbotModalFormComponent } from '../common/modals/robbot-modal-form/robbot-modal-form.component';
import { AppModalFormComponent } from '../common/modals/app-modal-form/app-modal-form.component';
import { BootstrapModalFormComponent } from '../common/modals/bootstrap-modal-form/bootstrap-modal-form.component';
import { TagModalFormComponent } from '../common/modals/tag-modal-form/tag-modal-form.component';
import { UpdatePicModalFormComponent } from '../common/modals/update-pic-modal-form/update-pic-modal-form.component';
import { IbgibFormsModule } from '../ibgib-forms/ibgib-forms.module';

import { ClickAnimationDirective } from '../common/directives/animations/click-animation.directive';
import { HighlightDirective } from '../common/directives/highlight.directive';
import { ClickHoldAnimationDirective } from '../common/directives/animations/click-hold-animation.directive';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    SwiperModule,
    IbgibFormsModule,
    IbGibPageRoutingModule,
  ],
  declarations: [
    ClickAnimationDirective,
    HighlightDirective,
    ClickHoldAnimationDirective,

    ActionBarComponent,
    RobbotBarComponent,
    AppBarComponent,

    FallbackViewComponent,
    TagViewComponent,
    CommentViewComponent,
    PicViewComponent,
    LinkViewComponent,
    RootViewComponent,

    ListItemViewComponent,
    ListViewComponent,
    SvgViewComponent,
    TagListViewComponent,
    RootListViewComponent,
    ChatViewComponent,
    IbGibPage,

    ChooseIconModalComponent,
    IbgibFullscreenModalComponent,
    SecretModalFormComponent,
    EncryptionModalFormComponent,
    OuterspaceModalFormComponent,
    TagModalFormComponent,
    RobbotModalFormComponent,
    AppModalFormComponent,
    BootstrapModalFormComponent,
    UpdatePicModalFormComponent,
  ],
  exports: [
    FormsModule,
    ReactiveFormsModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class IbGibPageModule { }
