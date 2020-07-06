import { NgModule } from '@angular/core';
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

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IbGibPageRoutingModule
  ],
  declarations: [
    IbGibPage,
    ChatViewComponent,
    ListViewComponent,
    ListItemViewComponent,
    FallbackViewComponent,
    ActionBarComponent,
    TagViewComponent,
    TagListViewComponent,
    PicViewComponent,
    CommentViewComponent,
  ]
})
export class IbGibPageModule {}
