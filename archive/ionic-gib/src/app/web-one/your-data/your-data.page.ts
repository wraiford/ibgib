import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { WebOnePageBase } from '../../common/bases/web-one-page-base';
import { Preferences } from '@capacitor/preferences';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';


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
export class YourDataPage extends WebOnePageBase implements OnInit {

  protected lc: string = `[${YourDataPage.name}]`;

  @Input()
  openAccordionGroups: AccordionSection[] = Object.values(AccordionSection);

  @Input()
  yourData: AccordionSection = 'your-data';
  @Input()
  privacy: AccordionSection = 'privacy';
  @Input()
  important: AccordionSection = 'important';

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: d7b4fe97765ddf35c33670d5040bf722)`); }

      // // check if the user has accepted
      // let resGet = await Preferences.get({ key: c.STORAGE_KEY_APP_USES_STUFF });
      // this.accepted = resGet?.value === 'accepted';

      // // check if user already has a local space
      // this.common.ibgibs.initialized$.subscribe(() => {
      //   this.alreadyHasLocalSpace = true;
      // });
      // this.alreadyHasLocalSpace = this.common.ibgibs.initialized;

      await super.ngOnInit();

      // accordion
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

  async handleClick_Accept(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Accept.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 641aff6bc9192c0c125d2e97ad99e622)`); }

      await Preferences.set({ key: c.STORAGE_KEY_APP_USES_STUFF, value: 'accepted' });
      this.accepted = true;
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_Go(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_Go.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c3a6386fdcde7a2149b211f2173ce722)`); }
      if (!this.accepted) { throw new Error(`(UNEXPECTED) must be accepted before go...this button should have been disabled though. (E: 54c02806145dcc715dd9ac29875ecc22)`); }
      await this.common.nav.go({
        toRawLocation: ['welcome'],
        fromRawLocation: ['your-data'],
        force: true,
      });

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  getDocumentTitle(): string { return 'YOUR data and privacy with ibgib' }

}
