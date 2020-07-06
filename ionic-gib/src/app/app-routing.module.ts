import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'ibgib/ib^gib',
    pathMatch: 'full'
  },
  {
    path: 'ibgib/:addr',
    loadChildren: () => import('./ibgib/ibgib.module').then( m => m.IbGibPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
