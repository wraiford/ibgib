import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../constants';
import { CommonService } from '../../services/common.service';
import { IbgibComponentBase } from '../bases/ibgib-component-base';
import { createNewRobbot } from '../helper/robbot';
import { IbGibRobbotAny } from '../witnesses/robbots/robbot-base-v1';
import { RobbotIbGib_V1 } from '../types/robbot';
import { isError } from '../helper/error';
import { ErrorIbGib_V1 } from '../types/error';

const logalot = c.GLOBAL_LOG_A_LOT || false;
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

      this.robbots = await this.common.ibgibs.getAppRobbotIbGibs({createIfNone: false}) ?? [];
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
    if (logalot) { console.log(`event: ${event.detail}`) }
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

      const robbot = await this.getSelectedRobbot_FullWitness();

      // setting ibgibsSvc is necessary to hook up plumbing atow,
      // but in the future this is essentially assigning a local space
      // to an ibgib witness (robbot in this case).
      robbot.ibgibsSvc = this.common.ibgibs;

      const cmdIbGib = await robbot.argy({
        argData: {
          cmd: 'ib', // look (at this ibGib I'm showing you)
          ibGibAddrs: [this.addr],
        },
        ibGibs: [this.ibGib],
      });
      const resCmd = await robbot.witness(cmdIbGib);
      if (!resCmd) { throw new Error(`resCmd is falsy. (E: e9d5046381c32bfe8d6b7a11cc7ef722)`); }
      if (isError({ibGib: resCmd})) {
        const errIbGib = <ErrorIbGib_V1>resCmd;
        throw new Error(`errIbGib: ${h.pretty(errIbGib)} (E: bbd032d860ff710973dc1f24f6446122)`);
      }

      let robbotName = robbot.data?.name ?? 'robbot';
      let alerty = await this.common.alertController.create({
        header: robbotName,
        message: `${robbot.data?.outputPrefix ?? ''}got it...${robbot.data?.outputSuffix ?? ''}`,
        buttons: [
          {
            text: `ok ${robbotName}`,
            role: 'cancel',
          }
        ]
      })
      await alerty.present();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleRobbotSpeak(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleRobbotSpeak.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      event.stopImmediatePropagation();
      event.stopPropagation();

      const robbot = await this.getSelectedRobbot_FullWitness();

      // setting ibgibsSvc is necessary to hook up plumbing atow,
      // but in the future this is essentially assigning a local space
      // to an ibgib witness (robbot in this case).
      robbot.ibgibsSvc = this.common.ibgibs;

      const cmdIbGib = await robbot.argy({
        argData: {
          cmd: 'gib', // speak (in this context I'm passing you)
          ibGibAddrs: [this.addr],
        },
        ibGibs: [this.ibGib],
      });
      const resCmd = await robbot.witness(cmdIbGib);
      if (!resCmd) { throw new Error(`resCmd is falsy. (E: 9ddd93b5d5554bbb8fa3b4ad59f48aae)`); }
      if (isError({ibGib: resCmd})) {
        const errIbGib = <ErrorIbGib_V1>resCmd;
        throw new Error(`errIbGib: ${h.pretty(errIbGib)} (E: 967e544ccb2a4332a3ecaf4b6885f75a)`);
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  async getSelectedRobbot_IbGibOnly(): Promise<RobbotIbGib_V1> {
    const lc = `${this.lc}[${this.getSelectedRobbot_IbGibOnly.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      if (!this.ibGib) { throw new Error(`this.ibGib required (E: 469051c049b443119b203420f72d2337)`); }
      if (!this.selectedRobbotName) { throw new Error(`(UNEXPECTED) selectedRobbotName should be truthy if this function is accessible. (E: 611986f6903a4b6b9a0cbb41b60bf33d)`); }
      if ((this.robbots ?? []).length === 0) { throw new Error(`(UNEXPECTED) this.robbots should be truthy if this function is accessible. (E: 92cb8d13628546d3972f9332af3c2b6d)`); }

      const filteredIbGibs =
        this.robbots.filter(x => x?.data?.name === this.selectedRobbotName);

      if (filteredIbGibs.length === 0) { throw new Error(`(UNEXPECTED) selectedRobbotName not found in robbots list? (E: 1fd157b2d9ee4075a08693a5cc4a4366)`); }

      // hack: change this to correctly map name/ion-select item to the robbot using gib/id
      console.warn(`${lc} if robbot name isn't unique, then this may not return the correct robbot. (W: 100287bce6b249d6af7f27c1fc53d90d)`);

      const robbotIbGib = filteredIbGibs[0];
      return robbotIbGib;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async getSelectedRobbot_FullWitness(): Promise<IbGibRobbotAny> {
    const lc = `${this.lc}[${this.getSelectedRobbot_FullWitness.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const robbotIbGib = await this.getSelectedRobbot_IbGibOnly();

      if (logalot) { console.log(`${lc} calling robbot.witness (uuid: ${robbotIbGib.data.uuid}) on this.ibGib (${this.addr})  (I: e591b792bf459fe533d5e26202412722)`); }
      const name: string = robbotIbGib.data.classname;
      const factory = this.common.factories.getFactory({name});
      const robbotWitness = <IbGibRobbotAny>(await factory.newUp({})).newIbGib;
      await robbotWitness.loadIbGibDto(robbotIbGib);

      return robbotWitness;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleRobbotGoto(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleRobbotGoto.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      event.stopImmediatePropagation();
      event.stopPropagation();

      const ibGib = await this.getSelectedRobbot_IbGibOnly();
      const addr = h.getIbGibAddr({ibGib});
      await this.go({
        toAddr: addr,
        fromAddr: this.addr,
      });
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }
}
