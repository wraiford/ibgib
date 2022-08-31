import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Capacitor, Plugins } from '@capacitor/core';
const { Storage } = Plugins;

import * as c from '../common/constants';


const logalot = c.GLOBAL_LOG_A_LOT || false;

type AccordionSection = 'important' | 'your-data' | 'privacy';
const AccordionSection = {
  important: 'important' as AccordionSection,
  yourData: 'your-data' as AccordionSection,
  privacy: 'privacy' as AccordionSection,
}

@Component({
  selector: 'ib-your-data',
  templateUrl: './your-data.page.html',
  styleUrls: ['./your-data.page.scss'],
})
export class YourDataPage implements OnInit {

  protected lc: string = `[${YourDataPage.name}]`;

  @Input()
  accepted: boolean;

  @Input()
  accepting: boolean;

  @Input()
  openAccordionGroups: AccordionSection[] = Object.values(AccordionSection);

  @Input()
  yourData: AccordionSection = 'your-data';
  @Input()
  privacy: AccordionSection = 'privacy';
  @Input()
  important: AccordionSection = 'important';

  constructor(
    protected ref: ChangeDetectorRef,
  ) { }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d7b4fe97765ddf35c33670d5040bf722)`); }

      // check if the user has accepted

      await this.initializeAccepted();
      await this.initializeAccordion();

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_Accept(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Accept.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 641aff6bc9192c0c125d2e97ad99e622)`); }

      await Storage.set({ key: c.STORAGE_KEY_APP_USES_STUFF, value: 'accepted' });
      this.accepted = true;
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initializeAccepted(): Promise<void> {
    const lc = `${this.lc}[${this.initializeAccepted.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 6591c4d272f25584632ac66b52f22122)`); }

      let resGet = await Storage.get({ key: c.STORAGE_KEY_APP_USES_STUFF });
      this.accepted = resGet?.value === 'accepted';
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
  async initializeAccordion(): Promise<void> {
    const lc = `${this.lc}[${this.initializeAccordion.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d6330e91a47cc5726d880c8708aa3222)`); }
      Object.values(AccordionSection).forEach(section => {
        if (document.location.toString().endsWith(`#${section}`)) {
          this.openAccordionGroups = [section];
        }
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }



}
