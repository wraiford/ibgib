import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { YourDataPage } from './your-data.page';

const routes: Routes = [
  {
    path: '',
    component: YourDataPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class YourDataPageRoutingModule {}
