import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { IbgibNav } from './common.service';

@Injectable({
  providedIn: 'root'
})
export class NgIbgibNavService implements IbgibNav {

  protected lc: string = `[${NgIbgibNavService.name}]`;

  constructor(
    private router: Router,
  ) { }

  async navTo({ addr }: { addr: string; }): Promise<void> {
    const lc: string = `${this.lc}[${this.navTo.name}(${addr || 'undefined|null'})]`;
    console.log(`${lc} called`);
    try {
      await this.router.navigate(['ibgib', addr], {
          queryParamsHandling: 'preserve',
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

}
