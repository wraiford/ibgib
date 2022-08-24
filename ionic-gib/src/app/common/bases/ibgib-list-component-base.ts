import {
    OnInit, OnDestroy, Input, ChangeDetectorRef, Output,
    EventEmitter, ViewChild, Directive,
} from '@angular/core';
import { IonContent } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';
import { IbGibAddr } from 'ts-gib';
import { getGibInfo, } from 'ts-gib/dist/V1/transforms/transform-helper';

import * as c from '../constants';
import { IbGibListItem, IbGibTimelineUpdateInfo } from '../types/ux';
import { IbgibComponentBase } from './ibgib-component-base';
import { CommonService } from '../../services/common.service';
import { unique } from '../helper/utils';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Directive()
export abstract class IbgibListComponentBase<TItem extends IbGibListItem = IbGibListItem>
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

    protected _updatingItems: boolean;

    @Input()
    items: TItem[] = [];

    protected _rel8nNames = c.DEFAULT_LIST_REL8N_NAMES;
    set rel8nNames(value: string[]) {
        const lc = `${this.lc}[set rel8nNames]`;
        if (logalot) { console.log(`${lc} value: ${value} (I: 15708e5febab6d3684b5667d9918fb22)`); }
        this._rel8nNames = value;
    }

    /**
     * should determine which rel8ns are showed by the list component.
     */
    @Input()
    get rel8nNames(): string[] { return this._rel8nNames; }

    /**
     * How many items we're going to be adding when doing differential udpate.
     */
    @Input()
    skeletonItemsCount: number = 0;

    @Input()
    batchSize: number = 3;

    /**
     * trying this out to let consumer know when items have been added to effect
     * scrolling.
     */
    @Output()
    itemsAdded = new EventEmitter<TItem[]>();

    @Output()
    ibGibItemClicked = new EventEmitter<TItem>();

    @ViewChild('listViewContent')
    listViewContent: IonContent;

    constructor(
        protected common: CommonService,
        protected ref: ChangeDetectorRef,
    ) {
        super(common, ref);
        const lc = `${this.lc}[ctor]`;
        if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
    }

    async ngOnInit(): Promise<void> {
        const lc = `${this.lc}[${this.ngOnInit.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 9013c36ff8e7532361f03b61b242b822)`); }
            await super.ngOnInit();
            this.bumpIntermittentItemUpdateInterval();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async ngOnDestroy(): Promise<void> {
        const lc = `${this.lc}[${this.ngOnDestroy.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (logalot) { console.log(`${lc}[testing] caching items (I: d61f38fbed6042f98518e47a4edd6f67)`); }
            // this.cacheItems(); // spin off!
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
    }: IbGibTimelineUpdateInfo): Promise<void> {
        const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            if (this.paused) {
                if (logalot) { console.log(`${lc} paused is true, returning early. (I: e22b7a67955226b65979f6b7e61e5222)`); }
                return; /* <<<< returns early */
            }

            // we want to change how we update the ibgib depending on if it's
            // the same ibgib timeline (same tjp) or a completely different one.
            // this will abort this call to `updateIbGib` and return early,
            // transferring control over to `updateIbGib_NewerTimelineFrame`
            if (!this.item) {
                console.warn(`${lc} this.item is falsy. (W: 591df83f351a4717b79d3cd38916000c)`);
                return; /* <<<< returns early */
            }

            // loads the default properties for this.item
            await this.loadItemPrimaryProperties(latestAddr, this.item);

            // loads the ibgib object proper
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
        if (logalot) { console.log(`${lc} starting...`); }
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
                let oldTjpGib = getGibInfo({ ibGibAddr: this.item.addr }).tjpGib;
                let newTjpGib = getGibInfo({ ibGibAddr: addr }).tjpGib;
                if (oldTjpGib === newTjpGib && !this.paused) {
                    // same timeline
                    await this.updateIbGib_NewerTimelineFrame({ latestAddr: addr })
                    return; /* <<<< returns early */
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
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected addedAllItems: boolean = false;

    /**
     *
     */
    async updateItems({
        reloadAll,
        direction,
        scrollAfter,
    }: {
        /**
         * If true, will clear current items and load all from scratch.
         *
         * Else, this will perform a differential update to the items, incrementally
         * adding/removing items that are found in the current ibGib.
         */
        reloadAll?: boolean,
        direction?: 'insert' | 'append',
        /**
         * if items are in a scrolling list, this will indicate scroll to bottom
         * after update complete.
         */
        scrollAfter?: boolean,
    } = {
            reloadAll: false,
            direction: 'append',
            scrollAfter: true,
        }): Promise<void> {
        const lc = `${this.lc}[${this.updateItems.name}]`;
        if (logalot) { console.log(`${lc} updating...`); }

        let updatingCheckCount = 0;
        while (this._updatingItems) {
            if (logalot) { console.log(`${lc} already _updatingItems. delaying... (I: 176913fc1e18d619838b8abdf6be1222)`); }
            await h.delay(500); // arbitrary but finite...
            if (!this._updatingItems) {
                if (logalot) { console.log(`${lc} delaying done. no longer updating items from previous call. (I: 2cbe6daddf6f5faf51fd81ac20eb8422)`); }
                break;
            } else if (updatingCheckCount > 60) { // arbitrary but finite...
                if (logalot) { console.log(`${lc} already updating and we've waited 10 times. aborting this updateItems call. (I: 1c8d7eba8cf52e3f6d0cc98f75a6fc22)`); }
                return; /* <<<< returns early */
            } else {
                if (logalot) { console.log(`${lc} still _updatingItems. updatingCheckCount: ${updatingCheckCount} (I: f18f6ca56b88a6b325a069dd7f292a22)`); }
                updatingCheckCount++;
            }
        }

        /**
         * flag used in finally clause to indicate if we can disable the
         * infinite scroll.
         */
        this.addedAllItems = true;

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
                await this.removeAddrs({ addrs: addrsToRemove });
                this.sortItems(this.items);
            }

            let itemsToAdd: TItem[] = [];
            let itemsToCache: TItem[] = [];

            for (let i = 0; i < rel8nNames.length; i++) {
                let addrsToAdd: IbGibAddr[] = [];
                const rel8nName = rel8nNames[i];
                const rel8dAddrs = this.item.ibGib?.rel8ns[rel8nName] || [];
                for (let j = 0; j < rel8dAddrs.length; j++) {
                    const rel8dAddr = rel8dAddrs[j];
                    if (!currentItemAddrs.includes(rel8dAddr)) {
                        addrsToAdd.push(rel8dAddr);
                    }
                }

                addrsToAdd = unique(addrsToAdd);

                // we want to add only the last [batch size] number of items
                let batchSize = this.batchSize;
                if (batchSize <= 0 || !batchSize) { batchSize = Number.MAX_SAFE_INTEGER; }
                if (addrsToAdd.length > batchSize) {
                    addrsToAdd = addrsToAdd.slice(addrsToAdd.length - batchSize);
                } else {
                    this.addedAllItems = true;
                }

                for (let i = 0; i < addrsToAdd.length; i++) {
                    const addrToAdd = addrsToAdd[i];
                    const cached = await this.common.cache.get({ addr: addrToAdd, addrScope: this.lc });
                    // const cached = this._cachingItems ?
                    //     null :
                    //     await this.common.cache.get({addr: addrToAdd, addrScope: this.lc});
                    let newItem: TItem;
                    if (cached?.other) {
                        newItem = cached?.other;
                        if (logalot) { console.log(`${lc} found item in cache (I: d61f38fbed6042f98518e47a4edd6f67)`); }
                    } else {
                        // hack: just implemented ionic storage and am reusing it here maybe unnecessarily
                        // if (!this.paused) {
                        //     let latestcached = await this.common.getLatestCache.get({addr: addrToAdd});
                        //     if (latestcached?.ibGib) {
                        //         newItem = <TItem>{ addr: h.getIbGibAddr({ibGib: latestcached.ibGib}) };
                        //         if (logalot) { console.log(`${lc} in get latest cache, but queueing item to cache (${addrToAdd}) (I: 1c5486bb2830400dbd7e59ced7c9d6af)`); }
                        //         itemsToCache.push(newItem);
                        //     } else {
                        //         newItem = <TItem>{ addr: addrToAdd };
                        //         if (logalot) { console.log(`${lc} queueing item to cache (${addrToAdd}) (I: 0fe55669bfdd74f0cc9714ae96e4a622)`); }
                        //         itemsToCache.push(newItem);
                        //     }
                        // } else {
                        newItem = <TItem>{ addr: addrToAdd };
                        if (logalot) { console.log(`${lc} queueing item to cache (${addrToAdd}) (I: 0fe55669bfdd74f0cc9714ae96e4a622)`); }
                        itemsToCache.push(newItem);
                        // }
                    }
                    itemsToAdd.push(newItem);
                }

            }

            if (itemsToAdd.length > 0) { this.addedAllItems = false; }

            // this.sortItems(itemsToAdd);

            for (let i = 0; i < itemsToAdd.length; i++) {
                const item = itemsToAdd[i];
                if (!item.ibGib) {
                    await this.loadIbGib({ item });
                    await this.loadItem(item);
                }
            }
            this.sortItems(itemsToAdd);

            for (let i = 0; i < itemsToCache.length; i++) {
                const item = itemsToCache[i];
                setTimeout(async () => {
                    await h.delay(Math.ceil(Math.random() * 7000));
                    if (logalot) { console.log(`${lc} caching item: ${item.addr} (I: 672fc975b7547191e72e0034a03de422)`); }
                    await this.common.cache.put({ addr: item.addr, addrScope: this.lc, ibGib: item.ibGib, other: item });
                });
            }

            // note our previous last item, which we'll use to determine if we
            // have to sort again after adding the items
            // const lastExistingItemBeforeAdd = this.items?.length > 0 ?
            //     this.items[this.items.length - 1] :
            //     null;

            // add the items to the list, which will change our bound view

            await this.addItems({ itemsToAdd, direction });

            if (logalot) { console.log(`${lc} this.items.length: ${this.items?.length} (I: 094cb3faac89df7d53aaa34fb538b522)`); }
            const thisItemsAddrs = (this.items ?? []).map(x => x.addr);
            if (logalot) { console.log(`${lc} this.items addrs: ${thisItemsAddrs.join('\n')} (I: 9693f8b265189a16172d01187e318422)`); }

            if (logalot && timerEnabled) {
                console.timeEnd(timerName);
                console.log(`${timerName} timer complete.`);
            }

            if (logalot) { console.log(`${lc} this.items count: ${this.items.length}`); }
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
        } finally {
            this._updatingItems = false;
            setTimeout(() => this.ref.detectChanges());
            if (logalot) { console.log(`${lc} updated.`); }
        }
    }

    // sorts by timestamp
    sortItems(x: TItem[]): TItem[] {
        const lc = `${this.lc}[${this.sortItems.name}]`;
        return x.sort((a, b) => {
            if (!a.ibGib?.data || !b.ibGib?.data) { return 0; }
            if (!a.ibGib?.data?.timestamp ?? a.ibGib?.data?.textTimestamp) {
                console.warn(`${lc} no timestamp a.addr: ${a.addr}`)
            }
            if (!b.ibGib?.data?.timestamp ?? b.ibGib?.data?.textTimestamp) {
                console.warn(`${lc} no timestamp b.addr: ${b.addr}`)
            }
            return new Date(a.ibGib?.data?.timestamp ?? a.ibGib?.data?.textTimestamp) < new Date(b.ibGib?.data?.timestamp ?? b.ibGib?.data?.textTimestamp) ? -1 : 1
        });
    }

    /**
     * base implement atow simply sets `this.items` to the filtered version of
     * itself that doesn't include given `addrs`.
     *
     * override this for non-angular list components
     *
     * ## driving intent
     *
     * i'm creating an svg view that can't bind to an ngFor loop.
     *
     */
    async removeAddrs({
        addrs,
    }: {
        addrs: IbGibAddr[],
    }): Promise<void> {
        const lc = `${this.lc}[${this.removeAddrs.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: ec7ca4fee217c8c09fbaae11df80d822)`); }
            this.items = this.items.filter(x => !addrs.includes(x.addr));
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async addItems({
        itemsToAdd,
        direction
    }: {
        itemsToAdd: TItem[],
        direction: 'insert' | 'append',
    }): Promise<void> {
        const lc = `${this.lc}[${this.addItems.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 4095aa8792efdc12e5e7cba9879fba22)`); }

            this.items = direction === 'insert' ?
                [...itemsToAdd, ...this.items] :
                [...this.items, ...itemsToAdd];

            this.sortItems(this.items);

            if (itemsToAdd.length > 0) {
                if (logalot) { console.log(`${lc} emitting itemsAdded (I: 145ca8df34da5119d1e08fe970faac22)`); }
                // this.sortItems(this.items);
                this.itemsAdded.emit(itemsToAdd);
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    trackByAddr(index: number, item: TItem): any {
        return item?.addr;
    }

    protected _pollItemUpdateHackIntervalRef: any;
    protected bumpIntermittentItemUpdateInterval(): void {
        const lc = `${this.lc}[${this.bumpIntermittentItemUpdateInterval.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 46409af8fcfca43b633fae165cc5ee22)`); }
            if (this._pollItemUpdateHackIntervalRef) {
                if (logalot) { console.log(`${lc} already hacky interval poll going (I: 6d7261401c11b1bbb72fe45fd2736422)`); }
                return; /* <<<< returns early */
            }
            let counter = 0;
            this._pollItemUpdateHackIntervalRef = setInterval(async () => {
                await this.updateItems({
                    reloadAll: false,
                    direction: 'insert',
                    scrollAfter: false,
                });
                counter++;
                if (counter === 3) {
                    if (this._pollItemUpdateHackIntervalRef) {
                        clearInterval(this._pollItemUpdateHackIntervalRef);
                        delete this._pollItemUpdateHackIntervalRef;
                    }
                }
            }, 5000);
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}
