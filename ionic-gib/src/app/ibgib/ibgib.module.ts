import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IbGibPageRoutingModule } from './ibgib-routing.module';

import { IbGibPage } from './ibgib.page';
import { ChatViewComponent } from '../views/chat-view/chat-view.component';
import { ListViewComponent } from '../views/list-view/list-view.component';
import { FallbackViewComponent } from '../views/fallback-view/fallback-view.component';
import { ActionBarComponent } from '../common/action-bar/action-bar.component';
import { TagViewComponent } from '../views/tag-view/tag-view.component';
import { TagListViewComponent } from '../views/tag-list-view/tag-list-view.component';
import { PicViewComponent } from '../views/pic-view/pic-view.component';
import { ListItemViewComponent } from '../views/list-item-view/list-item-view.component';
import { CommentViewComponent } from '../views/comment-view/comment-view.component';
import { ChooseIconModalComponent } from '../common/choose-icon-modal/choose-icon-modal.component';
import { RootListViewComponent } from '../views/root-list-view/root-list-view.component';
import { RootViewComponent } from '../views/root-view/root-view.component';
import { IbgibFullscreenModalComponent } from '../common/ibgib-fullscreen-modal/ibgib-fullscreen-modal.component';
import { EncryptionModalFormComponent } from '../common/modals/encryption-modal-form/encryption-modal-form.component';
import { SecretModalFormComponent } from '../common/modals/secret-modal-form/secret-modal-form.component';
import { OuterspaceModalFormComponent } from '../common/modals/outerspace-modal-form/outerspace-modal-form.component';
import { RobbotModalFormComponent } from '../common/modals/robbot-modal-form/robbot-modal-form.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IbGibPageRoutingModule,
  ],
  declarations: [
    TagViewComponent,
    ChatViewComponent,
    ListViewComponent,
    ListItemViewComponent,
    FallbackViewComponent,
    ActionBarComponent,
    TagListViewComponent,
    PicViewComponent,
    CommentViewComponent,
    IbGibPage,
    ChooseIconModalComponent,
    RootListViewComponent,
    RootViewComponent,
    IbgibFullscreenModalComponent,
    EncryptionModalFormComponent,
    SecretModalFormComponent,
    OuterspaceModalFormComponent,
    RobbotModalFormComponent,
  ],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA ],
})
export class IbGibPageModule {}
