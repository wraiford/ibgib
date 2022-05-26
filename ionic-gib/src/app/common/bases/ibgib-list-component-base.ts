import { OnInit, OnDestroy, Input, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { Injectable } from '@angular/core';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { getGibInfo } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../constants';
import { IbgibListItem, IbGibTimelineUpdateInfo } from '../types/ux';
import { IbgibComponentBase } from './ibgib-component-base';
import { CommonService } from '../../services/common.service';
import { unique } from '../helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false || true;

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

    async ngOnInit(): Promise<void> {
        await super.ngOnInit();
    }

    async ngOnDestroy(): Promise<void> {
        const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            await super.ngOnDestroy();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async updateIbGib_NewerTimelineFrame({
        latestAddr,
        // latestIbGib,
        // tjpAddr,
    }: IbGibTimelineUpdateInfo): Promise<void> {
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

            // reloadAll = true;
            if (reloadAll || !this.items) { this.items = []; }

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
                    if (!a.ibGib?.data || !b.ibGib?.data) { return 0; }
                    if (!a.ibGib?.data?.timestamp ?? a.ibGib?.data?.textTimestamp) {
                        console.error(`${lc} no timestamp a.addr: ${a.addr}`)
                    }
                    if (!b.ibGib?.data?.timestamp ?? b.ibGib?.data?.textTimestamp) {
                        console.error(`${lc} no timestamp b.addr: ${b.addr}`)
                    }
                    return new Date(a.ibGib?.data?.timestamp ?? a.ibGib?.data?.textTimestamp) < new Date(b.ibGib?.data?.timestamp ?? b.ibGib?.data?.textTimestamp) ? -1 : 1
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
            // sortItems(itemsToAdd);

            for (let i = 0; i < itemsToAdd.length; i++) {
                const item = itemsToAdd[i];
                await this.loadIbGib({item});
                await this.loadItem(item);
                // this.items.push(item);
                // await h.delay(10);
                // if ((i % 5 === 0) || (i === itemsToAdd.length-1)) {
                //     sortItems(this.items);
                //     await h.delay(50);
                //     setTimeout(() => this.ref.detectChanges());
                // }
            }
            sortItems(itemsToAdd);

            // note our previous last item, which we'll use to determine if we
            // have to sort again after adding the items
            const lastExistingItemBeforeAdd = this.items?.length > 0 ?
                this.items[this.items.length - 1] :
                null;

            // add the items to the list, which will change our bound view
            for (let i = 0; i < itemsToAdd.length; i++) {
                const itemToAdd = itemsToAdd[i];
                this.items.push(itemToAdd);
                if (this.items?.length > 15) {
                    setTimeout(() => this.ref.detectChanges());
                    // debugger;
                }
                // if (i % 5 === 0)  {
                //     await h.delay(10); // process messages hack
                // }
            }

            // only sort on the main list if the earliest item to add is earlier
            // than the latest on the existing list. Otherwise, should already
            // be sorted.

            if (lastExistingItemBeforeAdd && itemsToAdd.length > 0) {
                const lastTimestamp = lastExistingItemBeforeAdd?.ibGib?.data?.timestamp;
                if (!lastTimestamp) { console.warn(`${lc} lastExistingItemBeforeAdd does not have a timestamp. (W: c24fbdad927441bd9a8ef9afff9c9597)`); }

                const firstToAddTimestamp = itemsToAdd[0].ibGib?.data?.timestamp;
                if (lastTimestamp && firstToAddTimestamp) {
                    if (lastTimestamp > firstToAddTimestamp) {
                        if (logalot) { console.log(`${lc} lastTimestamp > firstToAddTimestamp (?) (I: d49a3d286e1e2eaa4c70385e0c323a22)`); }
                        sortItems(this.items);
                    } else {
                        if (logalot) { console.log(`${lc} itemsToAdd later than current items. lastTimestamp: ${lastTimestamp}. firstToAddTimestamp: ${firstToAddTimestamp} (I: dad96ddde10515083aa1965aeb70af22)`); }
                    }
                } else {
                    if (logalot) { console.log(`${lc} edge case. going ahead and sorting. lastTimestamp: ${lastTimestamp}. firstToAddTimestamp: ${firstToAddTimestamp} (I: 6d1ebac90694dde0a541e1c650cf2622)`); }
                    sortItems(this.items);
                }
            }

            if (itemsToAdd.length > 0) {
                if (logalot) { console.log(`${lc} emitting itemsAdded (I: 145ca8df34da5119d1e08fe970faac22)`); }
                // sortItems(this.items);
                this.itemsAdded.emit();
            }

            if (logalot) { console.log(`${lc} this.items.length: ${this.items?.length} (I: 094cb3faac89df7d53aaa34fb538b522)`); }
            const thisItemsAddrs = (this.items ?? []).map(x => x.addr);
            if (logalot) { console.log(`${lc} this.items addrs: ${thisItemsAddrs.join('\n')} (I: 9693f8b265189a16172d01187e318422)`); }
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges());
            setTimeout(() => this.ref.detectChanges(),1000);

            if (logalot && timerEnabled) {
                console.timeEnd(timerName);
                console.log(`${timerName} timer complete.`);
            }

            if (logalot) { console.log(`${lc} this.items count: ${this.items.length}`); }
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
        } finally {
            this.ref.detectChanges();
            this._updatingItems = false;
            if (logalot) { console.log(`${lc} updated.`); }
        }
    }

    trackByAddr(index: number, item: TItem): any {
        return item?.addr;
    }

    scrollToBottom(): void {
        const lc = `${this.lc}[${this.scrollToBottom.name}]`;
        if (document) {
        const list = document.getElementById('theList');
            if (list) {
                if (logalot) { console.log(`${lc} scrolling`); }
                list.scrollTop = list.scrollHeight + 100;
            }
        }
    }

}
