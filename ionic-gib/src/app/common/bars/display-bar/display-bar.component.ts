import { ChangeDetectorRef, Component, EventEmitter, Input, Output, } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr, TransformResult } from 'ts-gib/dist/types';
import { Factory_V1 as factory, mut8 } from 'ts-gib/dist/V1';

import * as c from '../../constants';
import { CommonService } from '../../../services/common.service';
import { DisplayData_V1, DisplayRel8ns_V1, DisplayIbGib_V1, FilterInfo, SortInfo, DISPLAY_ATOM } from '../../types/display';
import { IbgibComponentBase } from '../../bases/ibgib-component-base';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { getTimestampInTicks } from '../../helper/utils';
import { getDisplayIb } from '../../helper/display';
import { IonInput } from '@ionic/angular';

const logalot = c.GLOBAL_LOG_A_LOT || false;
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
  hasNoneKeywords: string[] = [];

  @Input()
  get hasFilters(): boolean {
    return this.hasAllKeywords?.length > 0 ||
      this.hasAnyKeywords?.length > 0 ||
      this.hasNoneKeywords?.length > 0;
  }

  @Input()
  sortInfos: SortInfo[] = [];

  @Input()
  debounceMs: number = 300;

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
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async clearFilters(): Promise<void> {
    const lc = `${this.lc}[${this.clearFilters.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 755fdce3f4cf4022ec38d0843665a622)`); }
      delete this.addingText;
      delete this.addingType;
      this.hasAllKeywords = [];
      this.hasAnyKeywords = [];
      this.hasNoneKeywords = [];
      await this.emitDisplayChanged();
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

  /**
   * when user hits an add btn on one of the keyword filters
   */
  async handleAddFilterClick(addingType: AddingType): Promise<void> {
    const lc = `${this.lc}[${this.handleAddFilterClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: )`); }

      const resetAndFocusAddInput = () => {
        this.addingText = '';
        this.addingType = addingType;
        setTimeout(() => {
          (<IonInput><any>document
            .getElementById(`keyword-input-${addingType}`))
            .setFocus();
        });
      };

      if (this.addingType && this.addingText) {
        if (this.addingType === addingType) {
          // user has hit the same add btn, with text in the field, so we
          // interpret this to mean that they want to commit but not necessarily
          // add another.
          await this.commitAddingText();
        } else {
          // user has hit different add btn, with text in the field, so we
          // interpret this to mean that they want to commit and add another.
          await this.commitAddingText();
          resetAndFocusAddInput();
        }
      } else if (this.addingType && !this.addingText) {
        if (this.addingType === addingType) {
          // user has hit add btn WITHOUT text in the field, so we interpret this
          // as they want to cancel
          delete this.addingText;
          delete this.addingType;
        } else {
          // user has hit a different add btn without text in the field, which we
          // interpret as canceling the current add and starting the other
          resetAndFocusAddInput();
        }
      } else {
        // user has hit the add btn fresh
        resetAndFocusAddInput();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleKeywordClick(addingType: AddingType, keyword: string): Promise<void> {
    const lc = `${this.lc}[${this.handleKeywordClick.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 2db65d21826faa1ea6a161b51ce3bc22)`); }
      switch (addingType) {
        case 'all':
          this.hasAllKeywords = this.hasAllKeywords.filter(x => x !== keyword);
          break;
        case 'any':
          this.hasAnyKeywords = this.hasAnyKeywords.filter(x => x !== keyword);
          break;
        case 'none':
          this.hasNoneKeywords = this.hasNoneKeywords.filter(x => x !== keyword);
          break;
        default:
          throw new Error(`unknown addingType: ${addingType} (E: 7fd0ad92a143d86d9fe00b3ee3560322)`);
      }

      this.addingType = addingType;
      this.addingText = keyword;

      await this.emitDisplayChanged();
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
        if (logalot) { console.log(`${lc} escape keycode (I: 079b86ca94fddf2366341514e0bef822)`); }
        // cancel
        delete this.addingType;
        delete this.addingText;
      } else if (event.keyCode === KEYCODE_ENTER) {
        if (logalot) { console.log(`${lc} enter keycode (I: f31d88db97a13e5fd5c02be8b26fb622)`); }
        if (this.addingText) {
          // commit
          await this.commitAddingText();
        } else {
          delete this.addingText;
          delete this.addingType;
        }
      }
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
          if (!this.hasAllKeywords.includes(this.addingText)) {
            this.hasAllKeywords.push(this.addingText);
          }
          break;
        case 'any':
          if (!this.hasAnyKeywords.includes(this.addingText)) {
            this.hasAnyKeywords.push(this.addingText);
          }
          break;
        case 'none':
          if (!this.hasNoneKeywords.includes(this.addingText)) {
            this.hasNoneKeywords.push(this.addingText);
          }
          break;
        default:
          throw new Error(`unknown addingType: ${this.addingType} (E: be6261c506ed4de09244fdd4d020c822)`);
      }

      delete this.addingText;
      delete this.addingType;

      await this.emitDisplayChanged();
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
      const resDisplayIbgib =
        await this.createDisplayIbGibFromThis({ srcIbGib: this.displayIbGib });
      this.displayChanged.emit(resDisplayIbgib);
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
        this.hasNoneKeywords?.length > 0
      ) {
        filter = {
          filterType: 'keyword',
          hasAllKeywords: this.hasAllKeywords?.concat(),
          hasAnyKeywords: this.hasAnyKeywords?.concat(),
          hasNoneKeywords: this.hasNoneKeywords?.concat(),
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
