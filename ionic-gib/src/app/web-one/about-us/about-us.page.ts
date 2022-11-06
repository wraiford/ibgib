
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { WebOnePageBase } from '../../common/bases/web-one-page-base';

import * as c from '../../common/constants';
import { CommonService } from '../../services/common.service';


const logalot = c.GLOBAL_LOG_A_LOT || false;


type AccordionSection = 'bill';
const AccordionSection = {
  bill: 'bill' as AccordionSection,
}

@Component({
  selector: 'ib-about-us',
  templateUrl: './about-us.page.html',
  styleUrls: ['./about-us.page.scss'],
})
export class AboutUsPage extends WebOnePageBase implements OnInit {

  protected lc: string = `[${AboutUsPage.name}]`;

  @Input()
  openAccordionGroups: AccordionSection[] = Object.values(AccordionSection);

  @Input()
  bill: AccordionSection = 'bill';

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async ngOnInit(): Promise<void> {
    const lc = `${this.lc}[${this.ngOnInit.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: f166191332784f7bae800ae3437b905a)`); }

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

  getDocumentTitle(): string { return 'about us/me (looking forward to changing this...)' }

}
