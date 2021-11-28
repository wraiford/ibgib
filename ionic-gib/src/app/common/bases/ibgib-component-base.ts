import { OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { IbGib_V1, GIB, Factory_V1, Rel8n } from "ts-gib/dist/V1";
import { IbGibAddr, Ib, Gib, V1, TransformResult } from "ts-gib";
import { getIbAndGib, getIbGibAddr } from "ts-gib/dist/helper";
import { Injectable } from "@angular/core";
// import { FilesService } from 'src/app/services/files.service';
import { IbgibItem, PicData, CommentData, LatestEventInfo } from '../types';
import { CommonService } from 'src/app/services/common.service';
import { DEFAULT_META_IB_STARTS } from '../constants';
import { Subscription } from 'rxjs';

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

    private _updatingIbGib: boolean;
    // private _addr: IbGibAddr;
    get addr(): IbGibAddr { return this.item?.addr; }
    @Input()
    set addr(value: IbGibAddr) {
        const lc = `${this.lc}[set addr(${value})]`;
        if (this._updatingIbGib) {
            console.log(`${lc} already updatingIbGib`)
            return;
        }
        console.log(`${lc} updating ibgib ${value}`);
        this._updatingIbGib = true;
        this.updateIbGib(value).finally(() => {
            this._updatingIbGib = false;
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
            console.log(`${lc} ignored setting falsy context.`);
            return;
        }
        const setContext = () => {
            console.log(`${lc} setting context`);
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
    get isTag(): boolean { return this.ib?.startsWith('tag ') || false; }
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
    get refreshing(): boolean {
        return this._updatingIbGib || this.item?.refreshing;
    }

    @Input()
    isTitle: boolean;

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

    get title(): string {
        if (this.ib?.startsWith('tag ')) {
            return this.ib.split(' ').slice(1).join(' ');
        } else if (this.ib?.startsWith('pic ')) {
            return this.ib.split(' ').slice(1).join(' ');
        } else {
            return this.ib || 'loading...';
        }
    }

    clearItem(): void {
        const lc = `${this.lc}[${this.clearItem.name}]`;
        console.log(`${lc} clearing data...`);
        // delete this._addr;
        delete this.item;
        // delete this.ib;
        // delete this.gib;
        // delete this.ibGib;
        // delete this.isMeta;
        console.log(`${lc} data cleared.`);
    }

    async updateIbGib(addr: IbGibAddr): Promise<void> {
        const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
        if (addr === this.addr) { return; }

        this.clearItem();

        if (addr) {
            console.log(`${lc} setting new address`)
            // we have an addr which is different than our previous.
            const{ ib, gib } = getIbAndGib({ibGibAddr: addr});
            this.item = <any>{
                addr,
                ib,
                gib,
            };

            if (this.gib === GIB && !this.isMeta) {
                this.item.isMeta = true;
            }
        } else {
            console.log(`${lc} no new address`)
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
            const {ib, gib} = getIbAndGib({ibGibAddr: item.addr});
            if (!force && item.ibGib && getIbGibAddr({ibGib: item.ibGib}) === item.addr) {
                // do nothing, because we already have loaded this address.
            } else {
                if (gib === GIB) {
                    // primitive, just build
                    item.ibGib = Factory_V1.primitive({ib});
                } else {
                    // try to get from files provider
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
        return this.tjp ? getIbGibAddr({ibGib: this.tjp}) : "";
    }

    async loadTjp(): Promise<void> {
        if (this.ibGib) {
            let tjp = await this.common.ibgibs.getTjp({ibGib: this.ibGib, naive: true});
            this.tjp = tjp;
        } else if (this.tjp) {
            delete this.tjp;
        }
    }

    /**
     * Creates a primitive ibGib, forks it with the same ib
     * but with a tjp (temporal junction point, aka birthday) to give it
     * uniqueness and returns the fork result, which includes the unique ibGib.
     *
     * Also this will by default use linkedRel8ns for 'past' and 'ancestor'.
     *
     * Perhaps this should be somewhere in the core lib, perhaps in the factory.
     *
     * @param ib primitive ib
     */
    // async reifyPrimitive({
    //     ib,
    //     dna
    // }: {
    //     /**
    //      * Primitive ib, e.g., "tags"
    //      */
    //     ib: Ib,
    //     /**
    //      * usually will be false. Can't think of why true atm. just passing through to fork call.
    //      */
    //     dna?: boolean
    // }): Promise<TransformResult<IbGib_V1>> {
    //     const primitive = Factory_V1.primitive({ib});
    //     const result =
    //         await V1.fork({
    //             src: primitive,
    //             dna,
    //             linkedRel8ns: [Rel8n.past, Rel8n.ancestor],
    //             tjp: {uuid: true, timestamp: true},
    //             nCounter: true,
    //         });
    //     await this.common.ibgibs.rel8ToCurrentRoot({ibGib: result.newIbGib, linked: true});
    //     await this.common.ibgibs.registerNewIbGib({ibGib: result.newIbGib});
    //     return result;
    // }

    async navTo({
        addr,
        queryParamsHandling = 'preserve',
        queryParams,
    }: {
        addr: string,
        queryParamsHandling?: 'merge' | 'preserve',
        queryParams?: { [key: string]: any },
   }): Promise<void> {
        console.log(`navigating to addr: ${addr}`);
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
        } else if (this.isRoot) {
            this.item.type = 'root';
        } else if (this.isPic) {
            this.item.type = 'pic';
        } else if (this.isComment) {
            this.item.type = 'comment';
        }
    }

  async loadPic(item?: TItem): Promise<void> {
    const lc = `${this.lc}[${this.loadPic.name}]`;
    if (!this.isPic) { return; }
    if (!this.ibGib?.data?.binHash) { return; }
    if (!this.ibGib?.data?.ext) { return; }

    const data = <PicData>this.ibGib.data;
    const resGet =
      await this.common.ibgibs.get({binHash: data.binHash, binExt: data.ext})
    this.item.timestamp = data.timestamp;
    // this.item.picSrc = await this.common.ibgibs.getFileSrc({binHash: data.binHash, binExt: data.ext});
    console.log(`${lc} src: ${this.item.picSrc}`);
    if (resGet.success && resGet.binData) {
      this.item.picSrc = `data:image/jpeg;base64,${resGet.binData}`;
      setTimeout(() => {
        this.ref.detectChanges();
      }, 2000);
    } else {
      console.error(`${lc} Couldn't get pic. ${resGet.errorMsg}`);
    }
  }

  async loadComment(item?: TItem): Promise<void> {
    const lc = `${this.lc}[${this.loadComment.name}]`;
    if (!this.isComment) { return; }
    if (!this.ibGib?.data?.text) { return; }

    const data = <CommentData>this.ibGib.data;
    this.item.text = data.text;
    this.item.timestamp = data.textTimestamp || data.timestamp;
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
        console.log(`${lc} triggeredd.\nthis.addr: ${this.addr}\ninfo: ${JSON.stringify(info, null, 2)}`);
        if (this._updatingIbGib || this.paused || this.errored) { return; }
        this.addr = info.latestAddr;
    } catch (error) {
        console.error(`${lc} ${error.message}`);
        this.errored = true;
    }
  }

}
