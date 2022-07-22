import {
    OnInit, OnDestroy, ChangeDetectorRef, ViewChild, Directive,
} from '@angular/core';

import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import { IbgibListItem, } from '../types/ux';
import { CommonService } from '../../services/common.service';
import { unique } from '../helper/utils';
import { IonContent, IonInfiniteScroll } from '@ionic/angular';
import { Subject } from 'rxjs/internal/Subject';
import { Observable, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/internal/operators/debounceTime';
import { IbgibListComponentBase } from './ibgib-list-component-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Directive()
export abstract class IbgibScrollingListComponentBase<TItem extends IbgibListItem = IbgibListItem>
    extends IbgibListComponentBase<TItem>
    implements OnInit, OnDestroy {

    /**
     * log context. Override this property in descending classes.
     *
     * NOTE:
     *   I use very short variable names ONLY when they are all over
     *   the place. This is used all throughout the codebase.
     *   Otherwise, I usually use very long names...often too long! :-)
     */
    protected lc: string = `[${IbgibScrollingListComponentBase.name}]`;

    @ViewChild('listViewContent')
    listViewContent: IonContent;

    @ViewChild('infiniteScroll')
    infiniteScroll: IonInfiniteScroll;

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
            await this.initializeScrollHandler();
            await this.bumpIntermittentItemUpdateInterval();
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
            this.destroyScrollHandler();
            await super.ngOnDestroy();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

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
        if (this.infiniteScroll) {
            this.infiniteScroll.disabled = false;
        }

        try {
            if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }

            await super.updateItems({ reloadAll, direction, scrollAfter });

            if (logalot) { console.log(`${lc} this.items count: ${this.items.length}`); }
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
        } finally {
            if (scrollAfter) { this.scrollToBottom(); }
            if (this.infiniteScroll) {
                this.infiniteScroll.complete();
                this.infiniteScroll.disabled = true;
            }
            this._updatingItems = false;
            setTimeout(() => this.ref.detectChanges());
            if (logalot) { console.log(`${lc} updated.`); }
        }
    }

    trackByAddr(index: number, item: TItem): any {
        return item?.addr;
    }

    subScrollYo: Subscription;

    scrollToBottom(): void {
        const lc = `${this.lc}[${this.scrollToBottom.name}]`;
        setTimeout(() => {
            if (this.listViewContent) {
                this.listViewContent.scrollToBottom(500);
            } else if (document) {
                const list = document.getElementById('theList');
                if (list) {
                    if (logalot) { console.log(`${lc} scrolling`); }
                    list.scrollTop = list.scrollHeight + 100;
                }
            }
        }, 2000);
    }

    async loadData(event: any): Promise<void> {
        const lc = `${this.lc}[${this.loadData.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: b0f64180f5e15b26dedfb4b138b23722)`); }
            await this.updateItems({
                reloadAll: false, direction: 'insert', scrollAfter: false,
            });
            // this.infiniteScroll.disabled = true;
            // event;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }


    private async initializeScrollHandler(): Promise<void> {
        const lc = `${this.lc}[${this.initializeScrollHandler.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: bef3d7ecfbd3476798665517ffdd5e22)`); }
            if (this._subScrollStart_InfHack) {
                this.destroyScrollHandler();
            }
            this._subScrollStart_InfHack = this.scrollStart_InfHack$.pipe(
                debounceTime(100),
            ).subscribe((event) => {
                this.handleScroll(event);
            });

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private destroyScrollHandler(): void {
        if (this._subScrollStart_InfHack) {
            this._subScrollStart_InfHack.unsubscribe();
            delete this._subScrollStart_InfHack;
        }
    }

    scrollStartSubject_InfHack: Subject<any> = new Subject<any>();
    scrollStart_InfHack$: Observable<any> = this.scrollStartSubject_InfHack.asObservable();
    private _subScrollStart_InfHack: Subscription;

    handleScroll(event: any): void {
        const lc = `${this.lc}[${this.handleScroll.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: e21e95ba10781450ca6d836fb0a7c222)`); }
            this.ionInfiniteScrollHack_OnScrollUpdateDisabled();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    // #region ion-infinite-scroll hack workaround

    /**
     * The ion-infinite-scroll doesn't work quite correctly.  So we need to
     * manually always disable and re-enable on scroll, depending on if we've
     * loaded all of our data.
     */
    private async ionInfiniteScrollHack_PostLoadData(): Promise<void> {
        const lc = `${this.lc}[${this.ionInfiniteScrollHack_PostLoadData.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 00b39ce34b6c248a77c07a1d1aed8322)`); }
            if (this.infiniteScroll) {
                this.infiniteScroll.disabled = true;
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * @see {@link ionInfiniteScrollHack_PostLoadData}
     */
    private ionInfiniteScrollHack_OnScrollUpdateDisabled(): void {
        const lc = `${this.lc}[${this.ionInfiniteScrollHack_OnScrollUpdateDisabled.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 67ebd7ff72ca4b58ac53c92cd2b6837f)`); }
            if (!this.infiniteScroll) {
                if (logalot) { console.log(`${lc} this.infiniteScroll falsy, returning early. (I: 47ac2ee2cdec7ad18da5066b59173422)`); }
                return; /* <<<< returns early */
            }

            this.infiniteScroll.disabled = true;

            const currentItemAddrs = this.items.map(item => item.addr);

            /** unique list of rel8nNames used in this.items */
            const rel8nNames = unique(this.rel8nNames);

            // go through all rel8d addrs to check to see if they already exist
            // in the current items. If not, then we need to re-enable the
            // infinite scroll
            for (let i = 0; i < rel8nNames.length; i++) {
                const rel8nName = rel8nNames[i];
                const rel8dAddrs = this.item.ibGib?.rel8ns[rel8nName] || [];
                rel8dAddrs.forEach(x => {
                    if (!currentItemAddrs.includes(x)) {
                        // we do not have all items, so re-enable the infinite scroll
                        this.infiniteScroll.disabled = false;
                        return; /* <<<< returns early */
                    }
                });
            }

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
            this.bumpIntermittentItemUpdateInterval();
        }
    }

    // #endregion ion-infinite-scroll hack workaround

}
