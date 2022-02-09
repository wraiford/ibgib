import { OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { IbGib_V1, GIB, Factory_V1, Rel8n } from "ts-gib/dist/V1";
import { IbGibAddr, Ib, Gib, V1, TransformResult } from "ts-gib";
import { Injectable } from "@angular/core";
// import { FilesService } from 'src/app/services/files.service';
import { IbgibItem, PicData, CommentData, LatestEventInfo } from '../types';
import { CommonService } from 'src/app/services/common.service';
import { DEFAULT_META_IB_STARTS } from '../constants';
import { Subscription } from 'rxjs';
import * as h from 'ts-gib/dist/helper';
import * as c from '../../common/constants';


const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

// @Injectable({providedIn: "root"})
@Injectable()
export abstract class IbgibComponentBase<TItem extends IbgibItem = IbgibItem>
    implements OnInit, OnDestroy {

    /**
     * log context. Override this property in descending classes.
     *
     * NOTE:
     *   I use very short variable names ONLY when they are all over
     *   the place. This is used all throughout the codebase.
     *   Otherwise, I usually use very long names...often too long! :-)
     */
    protected lc: string = `[${IbgibComponentBase.name}]`;

    public debugBorderWidth: string = debugBorder ? "2px" : "0px"
    public debugBorderColor: string = "green";
    public debugBorderStyle: string = "solid";

    private _updatingIbGib: boolean;
    // private _addr: IbGibAddr;
    get addr(): IbGibAddr { return this.item?.addr; }
    @Input()
    set addr(value: IbGibAddr) {
        const lc = `${this.lc}[set addr(${value})]`;
        if (this._updatingIbGib) {
            if (logalot) { console.log(`${lc} already updatingIbGib`) }
            return;
        }
        if (logalot) { console.log(`${lc} updating ibgib ${value}`); }
        this._updatingIbGib = true;
        this.updateIbGib(value).finally(() => {
            this._updatingIbGib = false;
            setTimeout(() => { this.ref.detectChanges(); }, 500)
        });
    }
    @Input()
    item: TItem;
    @Input()
    get ib(): Ib { return this.item?.ib; }
    @Input()
    get gib(): Gib { return this.item?.gib; }
    @Input()
    get ibGib(): IbGib_V1 { return this.item?.ibGib; }
    @Input()
    get isMeta(): boolean {
        return this.item?.isMeta || DEFAULT_META_IB_STARTS.some(x => this.ib?.startsWith(x)); // hack
    }
    get ibGib_Context(): IbGib_V1 { return this.item?.ibGib_Context; }
    @Input()
    set ibGib_Context(value: IbGib_V1) {
        const lc = `${this.lc}[set ibGib_Context]`;
        if (this.item?.ibGib_Context) {
            console.warn(`${lc} can only set context once.`);
            return;
        }
        if (!value) {
            if (logalot) { console.log(`${lc} ignored setting falsy context.`); }
            return;
        }
        const setContext = () => {
            if (logalot) { console.log(`${lc} setting context`); }
            if (this.item) {
                this.item.ibGib_Context = value;
                this.ref.detectChanges();
            } else {
                console.error(`${lc} attempted to set context to falsy item.`);
            }
        };
        if (this.item) {
            setContext();
        } else {
            // hack in case this gets set in binding before the item does.
            setTimeout(() => { setContext(); }, 1000);
        }
    }

//    get files(): FilesService { return this.common.files; }

    @Input()
    get isRoot(): boolean { return this.ib?.startsWith('root ') || false; }
    @Input()
    get isRoots(): boolean { return this.ib?.startsWith('meta special roots') || false; }
    @Input()
    get isTag(): boolean { return this.ib?.startsWith('tag ') || false; }
    @Input()
    get isTags(): boolean { return this.ib?.startsWith('meta special tags') || false; }
    @Input()
    get isPic(): boolean { return this.ib?.startsWith('pic ') || false; }
    @Input()
    get isComment(): boolean { return this.ib?.startsWith('comment ') || false; }

    /**
     * Hack because ngSwitchCase doesn't seem to work properly. Probably my fault...hmmm
     *
     * this is used in the fallback case.
     */
    get itemTypes(): string[] { return ['pic','comment','tag', 'root']; }

    /**
     * Set this to true if you don't want updates to this
     * ibGib's timeline (e.g. tjp -> latest has new event) to propagate to this component.
     */
    @Input()
    paused: boolean;
    @Input()
    errored: boolean;
    @Input()
    get refreshing(): boolean { return this._updatingIbGib || this.item?.refreshing; }
    @Input()
    get syncing(): boolean { return this._updatingIbGib || this.item?.syncing; }

    @Input()
    isTitle: boolean;

    get title(): string {
        if (this.isTag) {
            return this.ibGib?.data?.tagText || this.ibGib?.data?.text || this.ib.split(' ').slice(1).join(' ');
        } else if (this.isPic) {
            return this.ib.split(' ').slice(1).join(' ');
        } else if (this.isComment) {
            return this.item?.text || this.ib || '[comment]';
        } else if (this.ib?.startsWith(`meta special `)) {
            return this.ib.substring(`meta special `.length);
        } else if (this.isRoot) {
            return this.ib.substring(`root `.length);
        } else {
            return this.ib || 'loading...';
        }
    }

    /**
     * subscription used with updates for the latest ibgib.
     */
    protected subLatest: Subscription;

    constructor(
        protected common: CommonService,
        protected ref: ChangeDetectorRef,
    ) {

    }

    /**
     * Subscribes for updates to the component's ibGib.
     *
     * Override this if you want to customize WHEN/HOW to subscribe.
     *
     * If you want to override HOW TO HANDLE this subscription, then override
     * {@link handleIbGib_NewLatest} function.
     */
    subscribeLatest(): void {
        if (this.subLatest) { this.subLatest.unsubscribe(); }
        this.subLatest = this.common.ibgibs.latestObs.subscribe((evnt: LatestEventInfo) => {
            this.handleIbGib_NewLatest(evnt); // SPINS OFF ASYNC!!
        });
    }

    /**
     * Unsubscribes from updates to the component's ibGib.
     */
    unsubscribeLatest(): void {
        if (this.subLatest) { this.subLatest.unsubscribe(); delete this.subLatest; }
    }

    ngOnInit() {
        this.subscribeLatest();
    }

    ngOnDestroy() {
        this.unsubscribeLatest();
    }

    clearItem(): void {
        const lc = `${this.lc}[${this.clearItem.name}]`;
        if (logalot) { console.log(`${lc} clearing data...`); }
        // delete this._addr;
        delete this.item;
        // delete this.ib;
        // delete this.gib;
        // delete this.ibGib;
        // delete this.isMeta;
        if (logalot) { console.log(`${lc} data cleared.`); }
    }

    async updateIbGib(addr: IbGibAddr): Promise<void> {
        const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
        if (addr === this.addr) { return; }

        this.clearItem();

        if (addr) {
            if (logalot) { console.log(`${lc} setting new address`) }
            // we have an addr which is different than our previous.
            const{ ib, gib } = h.getIbAndGib({ibGibAddr: addr});
            this.item = <any>{
                addr,
                ib,
                gib,
            };

            if (this.gib === GIB && !this.isMeta) {
                this.item.isMeta = true;
            }
        } else {
            if (logalot) { console.log(`${lc} no new address`) }
        }
    }

    /**
     * Loads the ibGib's full record, using the files service.
     *
     * This is not required for all components!
     *
     * @param force reload the ibGib even if the addr matches the current this.ibGib
     */
    async loadIbGib({
        item,
        force,
    }: {
        item: TItem,
        force?: boolean,
    } = {
        item: this.item,
    }): Promise<void> {
        const lc = `${this.lc}[${this.loadIbGib.name}]`;
        if (!item) {
            item = this.item;
            if (item) {
                const isMeta = this.isMeta;
                item.isMeta = isMeta;
            }
        }
        if (!item) {
            console.warn(`${lc} item is undefined/null`);
            return;
        }
        if (item.addr) {
            const {ib, gib} = h.getIbAndGib({ibGibAddr: item.addr});
            if (!force && item.ibGib && h.getIbGibAddr({ibGib: item.ibGib}) === item.addr) {
                // do nothing, because we already have loaded this address.
            } else {
                if (gib === GIB) {
                    // primitive, just build
                    item.ibGib = Factory_V1.primitive({ib});
                } else {
                    // try to get from files provider
                    while (!this.common.ibgibs.initialized) {
                        // these components often try a little too soon when
                        // starting up the app...so delay
                        const delayMs = Math.ceil(Math.random() * 100) + 10;
                        if (logalot) { console.warn(`${lc} ibgibs initializing...waiting ${delayMs} ms...`); }
                        await h.delay(delayMs);
                    }
                    const resGet = await this.common.ibgibs.get({addr: item.addr, isMeta: item.isMeta });
                    if (resGet.success && resGet.ibGibs?.length === 1) {
                        item.ibGib = resGet.ibGibs![0];
                    } else if (!resGet.success && item.isMeta) {
                        // we've tried to load a meta ibGib that does not exist.
                        // item.ibGib = Factory_V1.primitive({ib});
                        item.ibGib = null;
                    } else {
                        console.error(`${lc} ${resGet.errorMsg || 'unknown error'}`)
                    }
                }
            }
        } else {
            item.ibGib = null;
        }
    }

    tjp: IbGib_V1<any>;
    get tjpAddr(): string {
        return this.tjp ? h.getIbGibAddr({ibGib: this.tjp}) : "";
    }

    async loadTjp(): Promise<void> {
        if (this.ibGib && this.gib !== GIB && !this.ib.startsWith('bin.')) {
            let tjp = await this.common.ibgibs.getTjpIbGib({ibGib: this.ibGib, naive: true});
            this.tjp = tjp;
        } else if (this.tjp) {
            delete this.tjp;
        }
    }

    async navTo({
        addr,
        queryParamsHandling = 'preserve',
        queryParams,
    }: {
        addr: string,
        queryParamsHandling?: 'merge' | 'preserve',
        queryParams?: { [key: string]: any },
   }): Promise<void> {
        if (logalot) { console.log(`navigating to addr: ${addr}`); }
        this.common.nav.navTo({addr, queryParamsHandling, queryParams});
        // await this.common.nav.navigateRoot(['ibgib', addr], {
        //     queryParamsHandling: 'preserve',
        //     animated: true,
        //     animationDirection: 'forward',
        // });
    }

    /**
     * Load the item's other properties, e.g. text or tagText.
     *
     * Does nothing in base implementation.
     */
    async loadItem(item?: TItem): Promise<void> {
        item = item || this.item;
        if (!item) { return; }

        await this.loadType(item);
        if (item.type === 'pic') { await this.loadPic(item); }
        if (item.type === 'comment') { await this.loadComment(item); }
    }

    async loadType(item?: TItem): Promise<void> {
        item = item || this.item;
        if (this.isTag) {
            this.item.type = 'tag';
        } else if (this.isTags) {
            this.item.type = 'tags';
        } else if (this.isRoot) {
            this.item.type = 'root';
        } else if (this.isRoots) {
            this.item.type = 'roots';
        } else if (this.isPic) {
            this.item.type = 'pic';
        } else if (this.isComment) {
            this.item.type = 'comment';
        }
    }

  async loadPic(item?: TItem): Promise<void> {
    const lc = `${this.lc}[${this.loadPic.name}]`;
    if (!this.isPic) { return; }
    if (logalot) { console.log(`${lc} starting...`); }
    try {
        item = item || this.item;
        // item = this.item;

        if (!this.ibGib?.data?.binHash) {
            if (logalot) { console.log(`${lc} no data.binHash`); }
            return;
        }
        if (!this.ibGib!.data!.ext) {
            if (logalot) { console.log(`${lc} no data.ext`); }
            return;
        }
        if (!this.ibGib.rel8ns || this.ibGib.rel8ns['bin'].length === 0) {
            if (logalot) { console.log(`${lc} no rel8ns.bin`); }
            return;
        }

        const data = <PicData>this.ibGib.data;
        if (logalot) { console.log(`${lc} binHash: ${data.binHash}\nbinExt: ${data.ext}`); }
        const addr = this.ibGib.rel8ns!['bin'][0];
        if (logalot) { console.log(`${lc} getting bin addr: ${addr}`); }
        const resGet = await this.common.ibgibs.get({addr});
        item.timestamp = data.timestamp;
        if (logalot) { console.log(`${lc} initial item.picSrc.length: ${item?.picSrc?.length}`); }

        const delayRefDetectChangesMs = 2000; // hack
        if (resGet.success && resGet.ibGibs?.length === 1 && resGet.ibGibs[0]!.data) {
            item.picSrc = `data:image/jpeg;base64,${resGet.ibGibs![0].data!}`;
            if (logalot) { console.log(`${lc} loaded item.picSrc.length: ${item?.picSrc?.length}`); }
            setTimeout(() => { this.ref.detectChanges(); }, delayRefDetectChangesMs);
            if (logalot) { console.log(`${lc} ref.detectChanges in ${delayRefDetectChangesMs.toString()}`); }
        } else {
            console.error(`${lc} Couldn't get pic. ${resGet.errorMsg}`);
        }
        item.text = data.filename ?? `pic ${this.gib.slice(0,5)}...`;
        if (logalot) { console.log(`${lc} loaded.`); }
    } catch (error) {
        console.error(`${lc} ${error.message}`);
    } finally {
        if (logalot) { console.log(`${lc} complete.`) }
    }
  }

  async loadComment(item?: TItem): Promise<void> {
    const lc = `${this.lc}[${this.loadComment.name}]`;
    item = item || this.item;
    if (!this.isComment) { return; }
    if (!this.ibGib?.data?.text) { return; }

    const data = <CommentData>this.ibGib.data;
    item.text = data.text;
    item.timestamp = data.textTimestamp || data.timestamp;

  }

  /**
   * Default handler for dealing with updates to ibGibs (i.e. new frames in their timelines).
   *
   * NOTE: ATOW this will be SPUN OFF, it will not be awaited.
   *
   * @param info event info for the new latest ibGib
   */
  async handleIbGib_NewLatest(info: LatestEventInfo): Promise<void> {
    const lc = `${this.lc}[${this.handleIbGib_NewLatest.name}]`;
    try {
        if (!this.tjp) { await this.loadTjp(); }
        if (this.tjpAddr !== info.tjpAddr) { return; }
        if (logalot) { console.log(`${lc} triggeredd.\nthis.addr: ${this.addr}\ninfo: ${JSON.stringify(info, null, 2)}`); }
        if (this._updatingIbGib || this.paused || this.errored) { return; }
        this.addr = info.latestAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        this.errored = true;
    }
  }

}
