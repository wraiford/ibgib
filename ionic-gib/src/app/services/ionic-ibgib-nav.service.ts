import { Injectable } from '@angular/core';
import { IbgibNav } from './common.service';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class IonicIbgibNavService implements IbgibNav {

  protected lc: string = `[${IonicIbgibNavService.name}]`;

  constructor(
    private nav: NavController,
  ) { }

  async navTo({ 
    addr,
    queryParamsHandling = 'preserve',
    queryParams,
  }: { 
    addr: string,
    queryParamsHandling?: 'merge' | 'preserve',
    queryParams?: { [key: string]: any },
  }): Promise<void> {
    const lc: string = `${this.lc}[${this.navTo.name}(${addr || 'undefined|null'})]`;
    console.log(`${lc} called`);
    try {
      if (!addr) { throw new Error(`addr required`); }
      await this.nav.navigateRoot(['ibgib', addr], {
          queryParamsHandling,
          animated: true,
          animationDirection: 'forward',
          queryParams,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

}
