import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BrowserActionPage } from './browser-action.page';

const routes: Routes = [
  {
    path: '',
    component: BrowserActionPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BrowserActionPageRoutingModule {}
