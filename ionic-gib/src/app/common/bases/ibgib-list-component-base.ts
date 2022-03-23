import { OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { IbGibAddr } from "ts-gib";
import { Injectable } from "@angular/core";
import { IbgibItem } from '../types';
import { IbgibComponentBase } from './ibgib-component-base';
import { CommonService } from 'src/app/services/common.service';
import * as c from '../constants';
import { IbGib_V1 } from 'ts-gib/dist/V1';
import { unique } from '../helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

@Injectable({providedIn: "root"})
export abstract class IbgibListComponentBase<TItem extends IbgibItem = IbgibItem>
    extends IbgibComponentBase<TItem>
    implements OnInit, OnDestroy {

    /**
     * log context. Override this property in descending classes.
     *
     * NOTE:
     *   I use very short variable names ONLY when they are all over
     *   the place. This is used all throughout the codebase.
     *   Otherwise, I usually use very long names...often too long! :-)
     */
    protected lc: string = `[${IbgibListComponentBase.name}]`;

    private _updatingItems: boolean;

    @Input()
    items: TItem[] = [];

    @Input()
    rel8nNames: string[] = c.DEFAULT_LIST_REL8N_NAMES;

    constructor(
        protected common: CommonService,
        protected ref: ChangeDetectorRef,
    ) {
        super(common, ref);
        const lc = `${this.lc}[ctor]`;
        if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
    }

    ngOnInit() {
        super.ngOnInit();
    }

    ngOnDestroy() {
        super.ngOnDestroy();
    }

    async updateIbGib(addr: IbGibAddr): Promise<void> {
        const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
        if (logalot) { console.log(`${lc} updating...`); }
        try {

            let timerName: string;
            const timerEnabled = false;
            if (logalot && timerEnabled) {
                timerName = lc.substring(0, 24) + '[timer d2e45a]';
                console.log(`${timerName} starting timer`);
                console.time(timerName);
            }

            await super.updateIbGib(addr);
            // if (logalot) { console.timeLog(timerName); }
            await this.loadIbGib();
            // if (logalot) { console.timeLog(timerName); }
            await this.loadTjp();
            // if (logalot) { console.timeLog(timerName); }
            await this.updateItems();
            // if (logalot) { console.timeLog(timerName); }

            if (logalot && timerEnabled) {
                console.timeEnd(timerName);
                console.log(`${timerName} timer complete.`);
            }

        } catch (error) {
            console.error(`${lc} error: ${error.message}`);
            this.clearItem();
        } finally {
            this.ref.detectChanges();
            if (logalot) { console.log(`${lc} updated.`); }
        }
    }

    // /**
    //  * Override this to add/remove rel8n names for the list.
    //  */
    // updateRel8nNames(): void { this.rel8nNames = DEFAULT_LIST_REL8N_NAMES; }

    /**
     *
     */
    async updateItems(): Promise<void> {
        const lc = `${this.lc}[${this.updateItems.name}]`;
        if (logalot) { console.log(`${lc} updating...`); }
        if (this._updatingItems) { return; }
        this._updatingItems = true;
        try {
            if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
            this.items = [];
            let newItems = [];
            if (!this.item || !this.item.ibGib || !this.item.ibGib!.rel8ns) { return; }
            if (logalot) { console.log(`${lc} this.rel8nNames: ${this.rel8nNames?.toString()}`); }

            let timerName: string;
            const timerEnabled = true;
            if (logalot && timerEnabled) {
                timerName = lc.substring(0, 24) + '[timer 5d21ea]';
                console.log(`${timerName} starting timer`);
                console.time(timerName);
            }
            // can intersperse with calls to console.timeLog for intermediate times
            // if (logalot) { console.timeLog(timerName); }

            for (let rel8nName of unique(this.rel8nNames)) {
                const rel8dAddrs = this.item.ibGib?.rel8ns[rel8nName] || [];
                for (let rel8dAddr of rel8dAddrs) {
                    if (logalot) { console.log(`${lc} adding rel8dAddr: ${rel8dAddr}`); }
                    const newItem = <TItem>{ addr: rel8dAddr };
                    await this.loadIbGib({item: newItem});
                    await this.loadItem(newItem);
                    newItems.push(newItem);
                }
            }

            if (logalot && timerEnabled) {
                console.timeEnd(timerName);
                console.log(`${timerName} timer complete.`);
            }

            // sort by timestamp
            newItems = newItems.sort((a,b) => {
                if (!a.ibGib?.data?.timestamp || !b.ibGib?.data?.timestamp) {
                    console.error(`${lc} no timestamp `)
                }
                return new Date(a.ibGib?.data?.timestamp) < new Date(b.ibGib?.data?.timestamp) ? -1 : 1
            });
            this.items = newItems || [];
            if (logalot) { console.log(`${lc} this.items count: ${this.items.length}`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            this.ref.detectChanges();
            this._updatingItems = false;
            if (logalot) { console.log(`${lc} updated.`); }
        }
    }

}
