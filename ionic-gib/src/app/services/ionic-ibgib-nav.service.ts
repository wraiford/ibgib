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

  async navTo({ addr }: { addr: string; }): Promise<void> {
    const lc: string = `${this.lc}[${this.navTo.name}(${addr || 'undefined|null'})]`;
    console.log(`${lc} called`);
    try {
      if (!addr) { throw new Error(`addr required`); }
      await this.nav.navigateRoot(['ibgib', addr], {
          queryParamsHandling: 'preserve',
          animated: true,
          animationDirection: 'forward',
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
    }
  }

}
