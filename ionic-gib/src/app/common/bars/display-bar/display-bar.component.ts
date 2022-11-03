import { ChangeDetectorRef, Component, EventEmitter, Input, Output, } from '@angular/core';
import { Plugins } from '@capacitor/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult } from 'ts-gib/dist/types';
import { Factory_V1 as factory, mut8 } from 'ts-gib/dist/V1';

import * as c from '../../constants';
import { CommonService } from '../../../services/common.service';
import { DisplayData_V1, DisplayRel8ns_V1, DisplayIbGib_V1, FilterInfo, SortInfo, DISPLAY_ATOM } from '../../types/display';
import { IbgibComponentBase } from '../../bases/ibgib-component-base';
import { isError } from '../../helper/error';
import { ErrorIbGib_V1 } from '../../types/error';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { getTimestampInTicks } from '../../helper/utils';
import { getDisplayIb } from '../../helper/display';

const logalot = c.GLOBAL_LOG_A_LOT || true;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

// /**
//  * I have three filters
//  */
// interface KeywordFilterBinding {
//   label: string;
//   type: 'all' | 'any' | 'none',
//   model: string;
//   fnFilter: (x: IbGib_V1) => Promise<boolean>;
// }

type AddingType = 'any' | 'all' | 'none';

@Component({
  selector: 'ib-display-bar',
  templateUrl: './display-bar.component.html',
  styleUrls: ['./display-bar.component.scss'],
})
export class DisplayBarComponent extends IbgibComponentBase {
  protected lc: string = `[${DisplayBarComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#7BC590";
  public debugBorderStyle: string = "solid";

  // private readonly _displayChangedSubj = new ReplaySubject<DisplayIbGib_V1>();
  // readonly displayChanged$ = this._displayChangedSubj.asObservable();

  /**
   * If truthy, this is the saved state of the display settings.
   */
  displayIbGib: DisplayIbGib_V1;

  /**
   * When the user makes changes
   */
  displayIbGib_Working: DisplayIbGib_V1;

  @Input()
  addingText: string | undefined;
  @Input()
  addingType: AddingType;

  @Input()
  hasAllKeywords: string[] = [];
  @Input()
  hasAnyKeywords: string[] = [];
  @Input()
  hasNoKeywords: string[] = [];

  @Input()
  sortInfos: SortInfo[] = [];

  @Input()
  debounceMs: number = 1000;

  @Output()
  displayChanged = new EventEmitter<TransformResult<DisplayIbGib_V1>>();

  constructor(
    protected common: CommonService,
    protected ref: ChangeDetectorRef,
  ) {
    super(common, ref);
  }

  async updateIbGib(addr: IbGibAddr): Promise<void> {
    const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
    if (logalot) { console.log(`${lc} updating...`); }
    try {
      await super.updateIbGib(addr);
      await this.loadIbGib();
      await this.loadTjp();
      await this.loadItem();
      await this.updateDisplays();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async updateDisplays(): Promise<void> {
    const lc = `${this.lc}[${this.updateDisplays.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 4a90829eb8f1ea539ee6f53c01653322)`); }
      throw new Error(`not impl (E: 32cb228c002d2816e152167b3a5be322)`);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleDisplayChange(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleDisplayChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 87cd86627c110740abed12340795d822)`); }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleAddFilterClick(addingType: AddingType): Promise<void> {
    const lc = `${this.lc}[${this.handleAddFilterClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: )`); }
      if (this.addingText) { await this.commitAddingText(); }
      this.addingText = '';
      this.addingType = addingType;
      // debugger;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleInputChange(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleInputChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: )`); }

      // do nothing atow
      // debugger;
      // console.dir(event);
      // await this.updateDisplayIbGib_Working();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleInputBlur(): Promise<void> {
    const lc = `${this.lc}[${this.handleInputBlur.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: )`); }

      // apply the filter if applicable
      if (this.addingText) { await this.commitAddingText(); }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleInputKeydown(event: any): Promise<void> {
    const lc = `${this.lc}[${this.handleInputKeydown.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: )`); }
      // handle esc / enter
      const KEYCODE_ESC = 27;
      const KEYCODE_ENTER = 13;
      if (event.keyCode === KEYCODE_ESC) {
        // cancel
        delete this.addingType;
        delete this.addingText;
      } else if (event.keyCode === KEYCODE_ENTER) {
        // commit
        await this.commitAddingText();
      }
      // debugger;
      console.dir(event);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async commitAddingText(): Promise<void> {
    const lc = `${this.lc}[${this.commitAddingText.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: ffbb3a8bf2356f2e2f40695ea1fed622)`); }
      if (!this.addingText) {
        if (logalot) { console.log(`${lc} addingText falsy. returning early (I: 967583524bd7fb3e3f781c8a7a25a722)`); }
        return; /* <<<< returns early */
      }

      switch (this.addingType) {
        case 'all':
          this.hasAllKeywords.push(this.addingText);
          break;
        case 'any':
          this.hasAnyKeywords.push(this.addingText);
          break;
        case 'none':
          this.hasNoKeywords.push(this.addingText);
          break;
        default:
          throw new Error(`unknown addingType: ${this.addingType} (E: be6261c506ed4de09244fdd4d020c822)`);
      }

      await this.emitDisplayChanged();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async initDisplayIbGibIfNeeded(): Promise<void> {
    const lc = `${this.lc}[${this.initDisplayIbGibIfNeeded.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 32bcfd556062f24e6b07aca601644e22)`); }
      if (this.displayIbGib_Working) {
        if (logalot) { console.log(`${lc} working ibgib already created, returning early. (I: dfcf798e9c0a6137d57ce13946e0dc22)`); }
        return; /* <<<< returns early */
      }

      throw new Error(`not impl (E: 8abf6c4ff3848551717007eeeae95c22)`);

      // const resDisplay = factory.firstGen({
      //   ib: getDisplayIb
      // })
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async emitDisplayChanged(): Promise<void> {
    const lc = `${this.lc}[${this.emitDisplayChanged.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: afddd410f2c42b777307124b6c5ec622)`); }

      const displayIbGib =
        await this.createDisplayIbGibFromThis({ srcIbGib: this.displayIbGib });

      this.displayChanged.emit(displayIbGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async createDisplayIbGibFromThis({
    srcIbGib
  }: {
    srcIbGib?: DisplayIbGib_V1
  }): Promise<TransformResult<DisplayIbGib_V1>> {
    const lc = `${this.lc}[${this.createDisplayIbGibFromThis.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: ab56dc50318f86dd619c6a8aa69eba22)`); }

      let filter: FilterInfo;
      if (
        this.hasAllKeywords?.length > 0 ||
        this.hasAnyKeywords?.length > 0 ||
        this.hasNoKeywords?.length > 0
      ) {
        filter = {
          filterType: 'keyword',
          hasAllKeywords: this.hasAllKeywords?.concat(),
          hasAnyKeywords: this.hasAnyKeywords?.concat(),
          hasNoKeywords: this.hasNoKeywords?.concat(),
        };
      }

      const ticks = getTimestampInTicks();
      let data: DisplayData_V1 = {
        ticks,
        filters: filter ? [filter] : undefined,
        sorts: undefined,
      };
      // let rel8ns: DisplayRel8ns_V1 = {}; // right now no rel8ns

      let ib = getDisplayIb({ data });

      let resDisplay: TransformResult<IbGib_V1>;
      if (srcIbGib) {
        resDisplay = await mut8({
          type: 'mut8',
          src: srcIbGib,
          dataToAddOrPatch: data,
          dna: true,
          mut8Ib: ib,
          nCounter: true,
        });
      } else {
        resDisplay = await factory.firstGen({
          ib,
          parentIbGib: factory.primitive({ ib: DISPLAY_ATOM }),
          data,
          dna: true,
          nCounter: true,
          tjp: { uuid: true, timestamp: true },
        });
      }

      return <TransformResult<DisplayIbGib_V1>>resDisplay;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
