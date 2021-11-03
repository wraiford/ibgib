import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserActionPage } from './browser-action/browser-action.page';
import { SidebarPage } from './sidebar/sidebar.page';
import { NgIbgibNavService } from './services/ng-ibgib-nav.service';
import { ActionBarComponent } from './common/action-bar/action-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    ActionBarComponent,
    BrowserActionPage,
    SidebarPage,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    {
      provide: 'IbgibNav',
      useClass: NgIbgibNavService,
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
