import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Toast } from '@capacitor/toast';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib/dist/types';

import * as c from '../../constants';
import { CommonService } from '../../../services/common.service';
import { IbgibComponentBase } from '../../bases/ibgib-component-base';
import { createNewRobbot, parseRobbotIb } from '../../helper/robbot';
import { IbGibRobbotAny } from '../../witnesses/robbots/robbot-base-v1';
import { RobbotCmd, RobbotIbGib_V1 } from '../../types/robbot';
import { isError } from '../../helper/error';
import { ErrorIbGib_V1 } from '../../types/error';

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
  selectedRobbot: RobbotIbGib_V1;

  @Input()
  addingRobbot: boolean;

  robbots: RobbotIbGib_V1[];

  private _robbotWitness: IbGibRobbotAny;

  private _selectedRobbotAddr: IbGibAddr;
  @Input()
  get selectedRobbotAddr(): IbGibAddr { return this._selectedRobbotAddr; }
  set selectedRobbotAddr(value: IbGibAddr) {
    if (value !== this._selectedRobbotAddr) {
      this._selectedRobbotAddr = value;
      this.selectRobbot({ robbotAddr: value }); // spins off
    }
  }

  @Input()
  get toggleActivateTitle(): string {
    return this.robbotIsActive ?
      "Put the robbot to bed (Currently active)" :
      "Wake up the robbot (Currently inactive)";
  }
  @Input()
  robbotIsActive: boolean;

  /**
   * This is only an ibGib (dto) not a full witness.
   */
  @Output()
  robbotSelected = new EventEmitter<RobbotIbGib_V1>();

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

  async selectRobbot({
    robbotAddr,
  }: {
    robbotAddr: IbGibAddr,
  }): Promise<void> {
    const lc = `${this.lc}[${this.selectRobbot.name}]`;
    try {
      // delete this.selectedRobbot;
      if (logalot) { console.log(`${lc} starting... (I: 8be84cc5aef559fdb5ba47f514124422)`); }
      if ((this.robbots ?? []).length === 0) { await this.updateRobbots(); }
      if ((this.robbots ?? []).length === 0) { throw new Error(`robbot selected but this.robbots is falsy/empty even after updating (E: f938dad5df2802107eafd2fb7edcc222)`); }

      let { robbotId } = parseRobbotIb({ robbotIb: h.getIbAndGib({ ibGibAddr: robbotAddr }).ib });
      let robbotsWithSameId = this.robbots.filter(x => x.data?.uuid === robbotId);

      if (robbotsWithSameId.length === 1) {
        this.selectedRobbot = robbotsWithSameId[0];
        this.robbotSelected.emit(h.clone(this.selectedRobbot));
      } else if (robbotsWithSameId.length > 1) {
        throw new Error(`multiple robbots found with the same id? robbotId: ${robbotId}\n${robbotsWithSameId.map(x => h.getIbGibAddr({ ibGib: x })).join('\n')} (E: 9855a7b6de93d08c983d2ca651657c22)`);
      } else {
        throw new Error(`robbotAddr (${robbotAddr}) not found among robbots. (E: da7e66a4fee6e749321bd954b087ca22)`);
      }

      // let robbotToSelect: RobbotIbGib_V1;
      // for (let i = 0; i < this.robbots.length; i++) {
      //   const robbot = this.robbots[i];
      //   const robbotAddrs = [
      //     h.getIbGibAddr({ ibGib: robbot }),
      //     ...(robbot.rel8ns?.past ?? [])
      //   ];
      //   if (robbotAddrs.includes(robbotAddr)) {
      //     robbotToSelect = robbot;
      //     break;
      //   }
      // }
      // if (!robbotToSelect) { throw new Error(`robbotAddr (${robbotAddr}) not found among robbots. (E: da7e66a4fee6e749321bd954b087ca22)`); }
      // this.selectedRobbot = robbotToSelect;

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async updateRobbots(): Promise<void> {
    const lc = `${this.lc}[${this.updateRobbots.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      this.robbots = await this.common.ibgibs.getAppRobbotIbGibs({ createIfNone: false }) ?? [];
      if (this.robbots?.length > 0) {
        this.robbotNames = this.robbots.map(r => r.data.name);
      } else {
        this.robbotNames = [];
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
    const lc = `${this.lc}[${this.handleRobbotSelectChange.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: a8b5cb51707b230f213b6e9f2dfcd322)`); }
      const robbotIbGib = event?.detail?.value;

      console.warn(`${lc} implement deactivate robbot if robbot select change (W: 8d31a59c9139466db55ab5b74960907f)`);

      if (robbotIbGib) {
        if (logalot) { console.log(`${lc} robbotIbGib: ${h.pretty(robbotIbGib)} (I: 334969aa75f8b6202a8b652534642222)`); }
        if (!robbotIbGib.data.uuid) { throw new Error(`invalid robbot data. uuid required (E: 464d1fdf45f642f90bafc169b8aea122)`); }

        if (this.selectedRobbot?.data.uuid !== robbotIbGib.data.uuid) {
          if (this._robbotWitness) {
            if (this.robbotIsActive) { await this.deactivateCurrentRobbotWitness(); }
            delete this._robbotWitness;
          }
          this.selectedRobbot = robbotIbGib;
          console.log(`new robbot selected. (I: f09b25c6b71b441c9c7c01e734ff2bb0)`);
          this.robbotSelected.emit(h.clone(robbotIbGib));
        } else {
          if (logalot) { console.log(`${lc} same robbot selected (I: 05680c6006b2800ef12ab466c69e2c22)`); }
        }
      } else {
        // none selected
        if (logalot) { console.log(`${lc} none selected? (I: eac4920f3384061c94bbb6642512af22)`); }
        if (this.selectedRobbot) {
          delete this.selectedRobbot;
          this.robbotSelected.emit(null)
        }
      }

    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_AddRobbot(): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_AddRobbot.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }
      if (this.addingRobbot) { throw new Error(`(UNEXPECTED) already adding tag...shouldn't get here (E: 3978fdd932764199b659d9166f718205)`); }
      this.addingRobbot = true;

      const space = await this.common.ibgibs.getLocalUserSpace({ lock: true });

      await createNewRobbot({ common: this.common, space });
      await this.updateRobbots();
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.addingRobbot = false;
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async activateCurrentRobbotWitness(): Promise<void> {
    const lc = `${this.lc}[${this.activateCurrentRobbotWitness.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: c15c4130e4a936297cd6e5a7e960c422)`); }

      // robbot is not yet active, so activate it
      // todo: deactivate robbot in change handler if selected robbot changed later
      if (!this._robbotWitness) {
        this._robbotWitness = await this.getSelectedRobbot_FullWitness();
        if (logalot) { console.log(`${lc} robbotWitness created. (I: 5500d9b44b85ed605232d95ea565a522)`); }
      }
      const robbot = this._robbotWitness;

      const argActivate = await robbot.argy({
        argData: {
          cmd: RobbotCmd.activate,
          ibGibAddrs: [this.addr], // context
        },
        ibGibs: [this.ibGib], // context
      });
      const resCmd = await robbot.witness(argActivate);

      if (!resCmd) { throw new Error(`resCmd is falsy. (E: 1e133819a0064f639e8740ea8f774e31)`); }
      if (isError({ ibGib: resCmd })) {
        const errIbGib = <ErrorIbGib_V1>resCmd;
        throw new Error(`errIbGib: ${h.pretty(errIbGib)} (E: 0a012e46c8c645aa9984a07813930901)`);
      }

      this.robbotIsActive = true;
      const statusText = `${robbot.data?.outputPrefix ?? ''} i'm awake! ${robbot.data?.outputSuffix ?? ''}`;
      Toast.show({ text: statusText, duration: "long", position: "top" }); // spins off...
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async deactivateCurrentRobbotWitness(): Promise<void> {
    const lc = `${this.lc}[${this.deactivateCurrentRobbotWitness.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 3d736debdf6a3eff72f1da2996d1e322)`); }

      // robbot is already active, so deactivate it
      const robbot = this._robbotWitness;
      const argDeactivate = await robbot.argy({
        argData: {
          cmd: RobbotCmd.deactivate,
          ibGibAddrs: [this.addr], // context
        },
        ibGibs: [this.ibGib], // context
      });
      const resCmd = await robbot.witness(argDeactivate);
      const statusText = `${robbot.data?.outputPrefix ?? ''} gonna take a nap...see you latr. ${robbot.data?.outputSuffix ?? ''}`;

      if (!resCmd) { throw new Error(`resCmd is falsy. (E: ab4cda964fc14a0fb505c3b307f8802d)`); }
      if (isError({ ibGib: resCmd })) {
        const errIbGib = <ErrorIbGib_V1>resCmd;
        throw new Error(`errIbGib: ${h.pretty(errIbGib)} (E: e521899a399f4d7d855511ea9f45149c)`);
      }

      Toast.show({ text: statusText, duration: "long" }); // spins off...
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      this.robbotIsActive = false;
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleRobbotToggleActivate(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleRobbotToggleActivate.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting... (I: 8b49cd6de0b7d53d345ac0e5ecfc0322)`); }

      event.stopImmediatePropagation();
      event.stopPropagation();

      if (this.robbotIsActive) {
        await this.deactivateCurrentRobbotWitness();
      } else {
        await this.activateCurrentRobbotWitness();
      }
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      setTimeout(() => this.ref.detectChanges());
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_RobbotLook(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_RobbotLook.name}]`;
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
      if (isError({ ibGib: resCmd })) {
        const errIbGib = <ErrorIbGib_V1>resCmd;
        throw new Error(`errIbGib: ${h.pretty(errIbGib)} (E: bbd032d860ff710973dc1f24f6446122)`);
      }

      let gotIt = `${robbot.data?.outputPrefix ?? ''}got it...${robbot.data?.outputSuffix ?? ''}`;
      Toast.show({ text: gotIt, duration: "long", position: "center" }); // spins off...
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }

  async handleClick_RobbotSpeak(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_RobbotSpeak.name}]`;
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
      if (isError({ ibGib: resCmd })) {
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

  async handleClick_RobbotThink(event: MouseEvent): Promise<void> {
    const lc = `${this.lc}[${this.handleClick_RobbotThink.name}]`;
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
          cmd: 'ibgib', // speak (in this context I'm passing you)
          ibGibAddrs: [this.addr],
        },
        ibGibs: [this.ibGib],
      });
      const resCmd = await robbot.witness(cmdIbGib);
      if (!resCmd) { throw new Error(`resCmd is falsy. (E:ea742d97ed2f463792e6e8862d8f6b55 )`); }
      if (isError({ ibGib: resCmd })) {
        const errIbGib = <ErrorIbGib_V1>resCmd;
        // await this.common.ibgibs.put({ibGib: errIbGib}); // hmm
        throw new Error(`errIbGib: ${h.pretty(errIbGib)} (E: f164a5a7c826453da5dd260c02134f6e)`);
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
      if (!this.selectedRobbot) { throw new Error(`(UNEXPECTED) selectedRobbot should be truthy if this function is accessible. (E: 611986f6903a4b6b9a0cbb41b60bf33d)`); }
      if ((this.robbots ?? []).length === 0) { throw new Error(`(UNEXPECTED) this.robbots should be truthy if this function is accessible. (E: 92cb8d13628546d3972f9332af3c2b6d)`); }

      return this.selectedRobbot;
    } catch (error) {
      console.error(`${lc} ${error.message}`);
      throw error;
    } finally {
      if (logalot) { console.log(`${lc} complete.`); }
    }
  }


  /**
   * todo: This should be part of a singleton service...
   * @returns
   */
  async getSelectedRobbot_FullWitness(): Promise<IbGibRobbotAny> {
    const lc = `${this.lc}[${this.getSelectedRobbot_FullWitness.name}]`;
    try {
      if (logalot) { console.log(`${lc} starting...`); }

      const robbotIbGib = await this.getSelectedRobbot_IbGibOnly();

      if (logalot) { console.log(`${lc} calling robbot.witness (uuid: ${robbotIbGib.data.uuid}) on this.ibGib (${this.addr})  (I: e591b792bf459fe533d5e26202412722)`); }
      const name: string = robbotIbGib.data.classname;
      const factory = this.common.factories.getFactory({ name });
      const robbotWitness = <IbGibRobbotAny>(await factory.newUp({})).newIbGib;
      await robbotWitness.loadIbGibDto(robbotIbGib);
      robbotWitness.ibgibsSvc = this.common.ibgibs;

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
      const addr = h.getIbGibAddr({ ibGib });
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
