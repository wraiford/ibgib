import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BootstrapPage } from './bootstrap.page';

const routes: Routes = [
  {
    path: '',
    component: BootstrapPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class BootstrapPageRoutingModule {}
