import { NgModule } from '@angular/core';
import { PreloadAllModules, Route, RouterModule, Routes, UrlSegment, UrlSegmentGroup } from '@angular/router';

const routes: Routes = [
  // {
  //   path: '',
  //   // redirectTo: 'welcome',
  //   redirectTo: 'ibgib/ib^gib',
  //   // if we are passing in info from the extension in firefox/chrome, then we
  //   // want to route to handle the incoming information. For example, this is the
  //   // chrome extension and the user has selected some text and wants to create
  //   // an ibgib from that selected text, then the extension's background.js triggers
  //   // the app with query param of 'index.html?extensionLaunchInfo={selectedText...}'
  //   matcher: (segments: UrlSegment[], group: UrlSegmentGroup, route: Route) => {

  //   }
  // },
  {
    path: 'index.html',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'welcome',
    pathMatch: 'full',
  },
  {
    path: 'ibgib/bootstrap^gib',
    loadChildren: () => import('./bootstrap/bootstrap.module').then(m => m.BootstrapPageModule),
  },
  {
    path: 'ibgib',
    redirectTo: 'welcome',
    // redirectTo: 'ibgib/ib^gib',
    pathMatch: 'full'
  },
  {
    path: 'ibgib/:addr',
    loadChildren: () => import('./ibgib/ibgib.module').then(m => m.IbGibPageModule)
  },
  {
    path: 'welcome',
    loadChildren: () => import('./welcome/welcome.module').then(m => m.WelcomePageModule)
  },
  {
    path: 'privacy',
    redirectTo: 'your-data#privacy',
  },
  {
    path: 'your-data',
    loadChildren: () => import('./your-data/your-data.module').then(m => m.YourDataPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
