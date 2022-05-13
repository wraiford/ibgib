import { OnInit, OnDestroy, Input, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../constants';
import { IbgibListItem, TimelineUpdateInfo } from '../types/ux';
import { IbgibComponentBase } from './ibgib-component-base';
import { CommonService } from '../../services/common.service';
import { unique } from '../helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Injectable({providedIn: "root"})
export abstract class IbgibListComponentBase<TItem extends IbgibListItem = IbgibListItem>
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

    /**
     * trying this out to let consumer know when items have been added to effect
     * scrolling.
     */
    @Output()
    itemsAdded: EventEmitter<number> = new EventEmitter();

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

    async updateIbGib_NewerTimelineFrame({
        latestAddr,
        // latestIbGib,
        // tjpAddr,
    }: TimelineUpdateInfo): Promise<void> {
        const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            // we want to change how we update the ibgib depending on if it's
            // the same ibgib timeline (same tjp) or a completely different one.
            // this will abort this call to `updateIbGib` and return early,
            // transferring control over to `updateIbGib_NewerTimelineFrame`

            // loads the default properties for this.item
            await this.loadItemPrimaryProperties(latestAddr, this.item);


            // loads the ibgib object proper
            const oldIbGib = this.item.ibGib;
            await this.loadIbGib();

            await this.loadTjp();
            await this.updateItems();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
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

            // we want to change how we update the ibgib depending on if it's
            // the same ibgib timeline (same tjp) or a completely different one.
            // this will abort this call to `updateIbGib` and return early,
            // transferring control over to `updateIbGib_NewerTimelineFrame`

            if (this.item?.ibGib && this.item?.addr && addr) {
                // both old and new are non-falsy
                let oldTjpGib = getGibInfo({ibGibAddr: this.item.addr}).tjpGib;
                let newTjpGib = getGibInfo({ibGibAddr: addr}).tjpGib;
                if (oldTjpGib === newTjpGib) {
                    // same timeline
                    await this.updateIbGib_NewerTimelineFrame({ latestAddr: addr })
                    return; // <<<< returns early
                }
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

    /**
     * How many items we're going to be adding when doing differential udpate.
     */
    @Input()
    skeletonItemsCount: number = 0;

    /**
     *
     */
    async updateItems({
        reloadAll,
    }: {
        /**
         * If true, will clear current items and load all from scratch.
         *
         * Else, this will perform a differential update to the items, incrementally
         * adding/removing items that are found in the current ibGib.
         */
        reloadAll?: boolean,
    } = {
        reloadAll: false,
    }): Promise<void> {
        const lc = `${this.lc}[${this.updateItems.name}]`;
        if (logalot) { console.log(`${lc} updating...`); }
        if (this._updatingItems) { return; }
        this._updatingItems = true;
        try {
            if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }

            if (reloadAll || !this.items) { this.items = []; }
            const isInitialLoad = this.items.length === 0;

            if (!this.item || !this.item.ibGib || !this.item.ibGib!.rel8ns) { return; }
            if (logalot) { console.log(`${lc} this.rel8nNames: ${this.rel8nNames?.toString()}`); }

            let timerName: string;
            const timerEnabled = true;
            if (logalot && timerEnabled) {
                timerName = lc.substring(0, 24) + '[timer 5d21ea]';
                console.log(`${timerName} starting timer`);
                console.time(timerName);
            }

            // sorts by timestamp
            const sortItems = (x: TItem[]) => {
                return x.sort((a,b) => {
                    if (!a.ibGib?.data?.timestamp || !b.ibGib?.data?.timestamp) {
                        console.error(`${lc} no timestamp `)
                    }
                    return new Date(a.ibGib?.data?.timestamp) < new Date(b.ibGib?.data?.timestamp) ? -1 : 1
                });
            }

            const currentItemAddrs = this.items.map(item => item.addr);

            /** unique list of rel8nNames to show in list */
            const rel8nNames = unique(this.rel8nNames);

            // compile list of all rel8d addrs to check for what to prune
            const allRel8dAddrs: IbGibAddr[] = [];
            for (let i = 0; i < rel8nNames.length; i++) {
                const rel8nName = rel8nNames[i];
                const rel8dAddrs = this.item.ibGib?.rel8ns[rel8nName] || [];
                rel8dAddrs.forEach(x => {
                    if (!allRel8dAddrs.includes(x)) { allRel8dAddrs.push(x); }
                });
            }

            // iterate through existing items, removing any that are no longer
            // rel8d to pertinent rel8nNames
            // not going to be able to check this until i include delete functionality!
            const addrsToRemove: IbGibAddr[] = [];
            for (let i = 0; i < this.items.length; i++) {
                const item = this.items[i];
                if (!allRel8dAddrs.includes(item.addr)) {
                    addrsToRemove.push(item.addr);
                }
            }

            if (addrsToRemove.length > 0) {
                this.items = this.items.filter(x => !addrsToRemove.includes(x.addr));
                sortItems(this.items);
            }

            let addrsToAdd: IbGibAddr[] = [];

            for (let i = 0; i < rel8nNames.length; i++) {
                const rel8nName = rel8nNames[i];
                const rel8dAddrs = this.item.ibGib?.rel8ns[rel8nName] || [];
                for (let j = 0; j < rel8dAddrs.length; j++) {
                    const rel8dAddr = rel8dAddrs[j];
                    if (!currentItemAddrs.includes(rel8dAddr)) {
                        addrsToAdd.push(rel8dAddr);
                    }
                }
            }

            let itemsToAdd: TItem[] = [];
            addrsToAdd = unique(addrsToAdd);
            for (let i = 0; i < addrsToAdd.length; i++) {
                const addrToAdd = addrsToAdd[i];
                const newItem = <TItem>{ addr: addrToAdd };
                itemsToAdd.push(newItem);
            }
            sortItems(itemsToAdd);

            for (let i = 0; i < itemsToAdd.length; i++) {
                const item = itemsToAdd[i];
                await this.loadIbGib({item});
                await this.loadItem(item);
                this.items.push(item);
                await h.delay(10);
                if (i % 5 === 0) {
                    sortItems(this.items);
                    await h.delay(50);
                    setTimeout(() => this.ref.detectChanges());
                }
            }

            // if we're adding a single item, then we're betting it's a
            // new item.
            if (this.items.length > 0 && itemsToAdd.length > 0) {
// if (!a.ibGib?.data?.timestamp || !b.ibGib?.data?.timestamp) {
//     console.error(`${lc} no timestamp `)
// }
// return new Date(a.ibGib?.data?.timestamp) < new Date(b.ibGib?.data?.timestamp) ? -1 : 1
                const lastExisting = this.items[this.items.length];
                const lastTimestamp = lastExisting.ibGib?.data?.timestamp;
                const firstToAddTimestamp = itemsToAdd[0].ibGib?.data?.timestamp;
                if (lastTimestamp > firstToAddTimestamp) {
                    debugger;
                    sortItems(this.items);
                }
            }

            setTimeout(() => this.ref.detectChanges());

            if (itemsToAdd.length > 0) { this.itemsAdded.emit(); }

            if (logalot && timerEnabled) {
                console.timeEnd(timerName);
                console.log(`${timerName} timer complete.`);
            }

            if (logalot) { console.log(`${lc} this.items count: ${this.items.length}`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            this.ref.detectChanges();
            this._updatingItems = false;
            if (logalot) { console.log(`${lc} updated.`); }
        }
    }

    trackByAddr(index: number, item: TItem): any {
        return item.addr;
    }

}
