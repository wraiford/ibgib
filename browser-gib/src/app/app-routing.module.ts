import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { PageSelectorGuard } from './page-selector.guard';

const routes: Routes = [
  {
    path: 'sidebar/:id',
    loadChildren: () => import('./sidebar/sidebar.module').then( m => m.SidebarPageModule),
  },
  {
    path: 'sidebar',
    redirectTo: 'sidebar/Inbox',
    pathMatch: 'full',
  },
  {
    path: 'browser-action',
    loadChildren: () => import('./browser-action/browser-action.module').then( m => m.BrowserActionPageModule),
  },
  { 
    path: '**', 
    // loadChildren: () => import('./sidebar/sidebar.module').then( m => m.SidebarPageModule),
    redirectTo: 'sidebar/Inbox',
    canActivate: [PageSelectorGuard],
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
