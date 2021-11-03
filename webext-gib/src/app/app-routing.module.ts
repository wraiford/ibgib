import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BrowserActionPage } from './browser-action/browser-action.page';
import { PageSelectorGuard } from './page-selector.guard';
import { SidebarPage } from './sidebar/sidebar.page';

const routes: Routes = [
  // {
  //   path: '',
  //   component: BrowserActionPage,
  //   pathMatch: "full",
  // },
  {
    path: 'browser-action',
    component: BrowserActionPage,
  },
  {
    path: 'sidebar',
    // redirectTo: 'ibgib/ib^gib',
    component: SidebarPage,
  },
    {
    path: '',
    redirectTo: 'ibgib/ib^gib',
    pathMatch: 'full'
  },
  {
    path: 'ibgib/:addr',
    component: SidebarPage,
    // loadChildren: () => import('./ibgib/ibgib.module').then( m => m.IbGibPageModule)
  },
  { 
    path: '**', 
    component: SidebarPage,
    canActivate: [PageSelectorGuard],
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
