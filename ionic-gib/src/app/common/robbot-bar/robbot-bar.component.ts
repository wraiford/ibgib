import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { IbGibAddr } from 'ts-gib/dist/types';
import { createNewRobbot } from '../helper/robbot';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';
import { RobbotIbGib_V1 } from '../types/robbot';
import { Witness } from '../types/witness';
import { WitnessAny, WitnessBase_V1 } from '../witnesses/witness-base-v1';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

@Component({
  selector: 'ib-robbot-bar',
  templateUrl: './robbot-bar.component.html',
  styleUrls: ['./robbot-bar.component.scss'],
})
export class RobbotBarComponent extends IbgibComponentBase implements OnInit {
  protected lc: string = `[${RobbotBarComponent.name}]`;

  public debugBorderWidth: string = debugBorder ? "2px" : "0px"
  public debugBorderColor: string = "#AFC590";
  public debugBorderStyle: string = "solid";

  @Input()
  robbotNames: string[] = [];

  @Input()
  selectedRobbotName: string;

  @Input()
  addingRobbot: boolean;

  robbots: RobbotIbGib_V1[];

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
      await this.updateRobbots();
    } catch (error) {
      console.error(`${lc} error: ${error.message}`);
      this.clearItem();
    } finally {
      this.ref.detectChanges();
      if (logalot) { console.log(`${lc} updated.`); }
    }
  }

  async updateRobbots(): Promise<void> {
    const lc = `${this.lc}[${this.updateRobbots.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.robbots = await this.common.ibgibs.getAppRobbots({createIfNone: false}) ?? [];
      if (this.robbots?.length > 0) {
        this.robbotNames = this.robbots.map(r => r.data.name);
        this.selectedRobbotName = this.robbots[0].data.name;
      } else {
        this.robbotNames = [];
        delete this.selectedRobbotName;
      }
      setTimeout(() => this.ref.detectChanges());
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleRobbotSelectChange(event: any): Promise<void> {
    console.log(`event: ${event.detail}`)
    const robbotName = event?.detail?.value;
    console.log(`selectedRobbotName: ${this.selectedRobbotName}`);
    if (this.selectedRobbotName !== robbotName) {
      this.selectedRobbotName = robbotName;
    }
  }

  async handleAddRobbot(): Promise<void> {
    const lc = `${this.lc}[${this.handleAddRobbot.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.addingRobbot) { throw new Error(`(UNEXPECTED) already adding tag...shouldn't get here (E: 3978fdd932764199b659d9166f718205)`); }
      this.addingRobbot = true;

      const space = await this.common.ibgibs.getLocalUserSpace({lock: true});

      await createNewRobbot({common: this.common, space});
      await this.updateRobbots();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.addingRobbot = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleRobbotLook(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleRobbotLook.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      event.stopImmediatePropagation();
      event.stopPropagation();

      if (!this.ibGib) { throw new Error(`this.ibGib required (E: c7fd946bd71c6a41132ab30ae59a3622)`); }
      if (!this.selectedRobbotName) { throw new Error(`(UNEXPECTED) selectedRobbotName should be truthy if this function is accessible. (E: 224ee81bff3e9ccbff00e886b562df22)`); }
      if ((this.robbots ?? []).length === 0) { throw new Error(`(UNEXPECTED) this.robbots should be truthy if this function is accessible. (E: 8593609fbe3041668e5b672cdffe2793)`); }

      const filteredIbGibs =
        this.robbots.filter(x => x?.data?.name === this.selectedRobbotName);

      if (filteredIbGibs.length === 0) { throw new Error(`(UNEXPECTED) selectedRobbotName not found in robbots list? (E: 28f90c07eb9bad4a5694bf431ffe7422)`); }

      const robbotIbGib = filteredIbGibs[0];
      // hack: change this to correctly map name/ion-select item to the robbot using gib/id
      console.warn(`${lc} if robbot name isn't unique, then this may not return the correct robbot. (W: 100287bce6b249d6af7f27c1fc53d90d)`);

      if (logalot) { console.log(`${lc} calling robbot.witness (uuid: ${robbotIbGib.data.uuid}) on this.ibGib (${this.addr})  (I: e591b792bf459fe533d5e26202412722)`); }
      debugger;
      const name: string = robbotIbGib.data.classname;
      const factory = this.common.factories.getFactory({name});
      const robbot = <WitnessAny>(await factory.newUp({})).newIbGib;
      robbot.loadIbGibDto(robbotIbGib);
      await robbot.witness(this.ibGib);
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

}
