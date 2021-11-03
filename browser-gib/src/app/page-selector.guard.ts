import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';

const TARGET_QUERY_PARAM_NAME = 'target';
const TARGETS = [
  'sidebar',
  'browser-action',
];

@Injectable({
  providedIn: 'root'
})
export class PageSelectorGuard implements CanActivate {
  constructor(
    private router: Router,
  ) {

  }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const target = next.queryParams[TARGET_QUERY_PARAM_NAME];

    if (target) {
      if (TARGETS.includes(target)) {
        // redirect to a valid target
        return this.router.navigate(
            ['/' + target],
            {
              queryParams: { [TARGET_QUERY_PARAM_NAME]: null, },
              queryParamsHandling: "merge"
            }
          ).then(() => { return false; });
      } else {
        // todo: need to redirect to invalid url
        return false;
      }
    } else {
      // no target query param so this guard doesn't apply
      return true;
    }
  }
  
}
