import {
    OnInit, OnDestroy, Input, ChangeDetectorRef, Injectable, Directive,
} from '@angular/core';
import { Subscription } from 'rxjs';

import * as h from 'ts-gib/dist/helper';
import { getGibInfo, isPrimitive } from 'ts-gib/dist/V1/transforms/transform-helper';
import { IbGib_V1, GIB, Factory_V1, ROOT_ADDR } from "ts-gib/dist/V1";
import { IbGibAddr, Ib, Gib, } from "ts-gib";

import * as c from '../../common/constants';
import { CommonService, NavInfo } from 'src/app/services/common.service';
import { Capacitor } from '@capacitor/core';
import { CommentData_V1 } from '../types/comment';
import { LinkData_V1 } from '../types/link';
import { PicData_V1 } from '../types/pic';
import { IbGibItem, IbGibTimelineUpdateInfo } from '../types/ux';
import { getInfoFromSpaceIb, isSpaceIb } from '../helper/space';
import { GetIbGibResult } from '../types/legacy';

const logalot = c.GLOBAL_LOG_A_LOT || false;
const debugBorder = c.GLOBAL_DEBUG_BORDER || false;

// @Injectable()
@Directive()
export abstract class IbgibComponentBase<TItem extends IbGibItem = IbGibItem>
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
    public get updatingIbGib(): boolean { return this._updatingIbGib; }

    // private _addr: IbGibAddr;
    get addr(): IbGibAddr { return this.item?.addr; }
    @Input()
    set addr(value: IbGibAddr) {
        const lc = `${this.lc}[set addr(${value})]`;
        if (logalot) { console.log(`${lc}[start]${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
        if (this._updatingIbGib) {
            if (logalot) { console.log(`${lc} already updating ibGib...retrying soon... (I: 3d6d0098625248a4996526842ed1259c)`) }
            h.delay(100).then(() => { this.addr = value; }); // calls this recursively, because is sync
            return; /* <<<< returns early */
        }
        if (value === this.addr) {
            if (logalot) { console.log(`${lc} value already === this.addr`); }
            if (logalot) { console.log(`${lc}[end]${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
        } else {
            if (logalot) { console.log(`${lc} updating ibgib ${value}`); }
            this._updatingIbGib = true;
            const statusId = this.addStatusText({ text: 'updating...' });
            setTimeout(() => this.ref.detectChanges());
            this.updateIbGib(value).finally(() => {
                this.removeStatusText({ statusId: statusId })
                this._updatingIbGib = false;
                setTimeout(() => { this.ref.detectChanges(); }, 500)
                if (logalot) { console.log(`${lc}[end]${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
            });
        }
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
        return this.item?.isMeta || c.DEFAULT_META_IB_STARTS.some(x => this.ib?.startsWith(x)); // hack
    }
    get ibGib_Context(): IbGib_V1 { return this.item?.ibGib_Context; }
    @Input()
    set ibGib_Context(value: IbGib_V1) {
        const lc = `${this.lc}[set ibGib_Context]`;
        if (this.item?.ibGib_Context) {
            console.warn(`${lc} can only set context once.`);
            return; /* <<<< returns early */
        }
        if (!value) {
            if (logalot) { console.log(`${lc} ignored setting falsy context.`); }
            return; /* <<<< returns early */
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

    // @Input()
    // get isRoot(): boolean { return isRootItem(this.item); }
    // @Input()
    // get isRoots(): boolean { return isRootsItem(this.item); }
    // @Input()
    // get isTag(): boolean { return isTagItem(this.item); }
    // @Input()
    // get isTags(): boolean { return isTagsItem(this.item); }
    // @Input()
    // get isPic(): boolean { return isPicItem(this.item); }
    // @Input()
    // get isComment(): boolean { return isCommentItem(this.item); }
    // @Input()
    // get isLink(): boolean { return isLinkItem(this.item); }
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
    @Input()
    get isLink(): boolean { return this.ib?.startsWith('link ') || false; }
    /**
     * temporary...
     */
    @Input()
    showHeart: boolean = false;

    /**
     * Hack because ngSwitchCase doesn't seem to work properly. Probably my fault...hmmm
     *
     * this is used in the fallback case.
     */
    get itemTypes(): string[] { return ['pic', 'comment', 'link', 'tag', 'root']; }

    /**
     * Set this to true if you don't want updates to this
     * ibGib's timeline (e.g. tjp -> latest has new event) to propagate to this component.
     */
    @Input()
    paused: boolean;
    @Input()
    errored: boolean;
    @Input()
    errorMsg: string;
    @Input()
    get refreshing(): boolean {
        return this._updatingIbGib || this.item?.refreshing ||
            !this.item || this.addr === ROOT_ADDR;
    }
    @Input()
    get syncing(): boolean { return this._updatingIbGib || this.item?.syncing; }

    @Input()
    isTitleOrJustSmall: boolean;

    get title(): string {
        if (this.isTag) {
            return this.ibGib?.data?.tagText || this.ibGib?.data?.text || this.ib.split(' ').slice(1).join(' ');
        } else if (this.isPic) {
            return this.ib.split(' ').slice(1).join(' ');
        } else if (this.isComment) {
            return this.item?.text || this.ib || '[comment]';
        } else if (this.isLink) {
            return this.item?.text || this.ib || '[link]';
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

    @Input()
    platform: string = Capacitor.getPlatform();

    @Input()
    get ios(): boolean { return this.platform === 'ios'; }
    @Input()
    get android(): boolean { return this.platform === 'android'; }
    @Input()
    get web(): boolean { return this.platform === 'web'; }

    /**
     * When the component is busy or similar, this can reflect the status.
     *
     * Each message is stored by an id, so we don't have reference counting
     * or other mechanism.
     *
     * @see {@link addStatusText}
     * @see {@link removeStatusText}
     * @see {@link updateStatusText}
     */
    @Input()
    statusText: string = '';
    /**
     * @see {@link statusText}
     */
    protected _statusTexts: { [msgId: string]: string } = {};

    @Input()
    get hasChildren(): boolean { return this.item?.hasChildren; }

    /**
     * If a comment/link/pic/whatever sets this to true, then a click will not
     * bubble up and nav/whatever.
     */
    @Input()
    stopClickPropagation: boolean;

    constructor(
        protected common: CommonService,
        protected ref: ChangeDetectorRef,
    ) {
        const lc = `${this.lc}[ctor]`;

        let now = new Date();
        if (!console.time) {
            console.time = (s: string) => {
                console.log(`${lc} ${now} ${s} time (custom timeLog)`);
            };
        }
        if (!console.timeLog) {
            console.timeLog = (s: string) => {
                console.log(`${lc} ${now} ${s} (custom timeLog)`);
            }
        }
        if (!console.timeEnd) {
            console.timeEnd = (s: string) => {
                console.log(`${lc} ${now} ${s} timeEnd (custom timeLog)`);
            }
        }

        if (logalot) { console.log(`${lc}${c.GLOBAL_TIMER_NAME}`); console.timeLog(c.GLOBAL_TIMER_NAME); }
    }

    /**
     * Subscribes for updates to the component's ibGib.
     *
     * Override this if you want to customize WHEN to subscribe.
     *
     * If you want to override just HOW TO HANDLE this subscription, then
     * override {@link handleIbGib_NewLatest} function.
     */
    async subscribeLatest(): Promise<void> {
        const lc = `${this.lc}[${this.subscribeLatest.name}]`;
        if (this.subLatest) { this.subLatest.unsubscribe(); }
        await this.smallDelayToLoadBalanceUI();
        if (this.subLatest) { this.subLatest.unsubscribe(); delete this.subLatest; }
        this.subLatest = this.common.ibgibs.latestObs.subscribe((evnt: IbGibTimelineUpdateInfo) => {
            if (logalot) { console.log(`${lc} latestEvent heard...`); }
            this.handleIbGib_NewLatest(evnt); // SPINS OFF ASYNC!!
        });
    }

    /**
     * Unsubscribes from updates to the component's ibGib.
     */
    unsubscribeLatest(): void {
        if (this.subLatest) { this.subLatest.unsubscribe(); delete this.subLatest; }
    }

    async ngOnInit(): Promise<void> {
        await this.subscribeLatest();
    }

    /**
     * helper function to clean up an item's transient flags, e.g., refreshing
     * or syncing.
     *
     * @param item to clean
     */
    cleanItem(item: TItem): void {
        delete item.refreshing;
        delete item.selected;
        delete item.syncing;
    }

    async cleanAndCacheCurrentItem(): Promise<void> {
        const lc = `${this.lc}[${this.cleanAndCacheCurrentItem.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (!this.addr || !this.item || !this.ibGib || !isPrimitive({ gib: this.gib })) {
                if (logalot) { console.log(`${lc} skipping this (I: 97001b8238b423b5619fa297a942cb22)`); }
                return; /* <<<< returns early */
            }

            this.cleanItem(this.item);
            await this.common.cache.put({
                addr: this.addr + this.lc,
                ibGib: this.ibGib,
                other: this.item,
            });
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

            await this.cleanAndCacheCurrentItem();
            this.unsubscribeLatest();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    clearItem(): void {
        const lc = `${this.lc}[${this.clearItem.name}]`;
        if (logalot) { console.log(`${lc} clearing data...`); }
        delete this.item;
        if (logalot) { console.log(`${lc} data cleared.`); }
    }

    /**
     * This function serves to just spread out execution, similar
     * to the old school "process messages" in a message loop.
     * Otherwise, angular tends to freeze a bit afaict.
     */
    async smallDelayToLoadBalanceUI(): Promise<void> {
        await h.delay(Math.ceil(Math.random() * 32));
    }

    protected async updateIbGib(addr: IbGibAddr): Promise<void> {
        const lc = `${this.lc}[${this.updateIbGib.name}(${addr})]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }

            if (addr === this.addr) { return; /* <<<< returns early */ }

            await this.smallDelayToLoadBalanceUI();

            this.clearItem();

            if (addr) {
                // we have different addr from our previous one.
                if (logalot) { console.log(`${lc} setting new address`); }

                // first try from item cache
                let addrGib = h.getIbAndGib({ ibGibAddr: addr }).gib;
                if (this.lc && !isPrimitive({ gib: addrGib })) {
                    const cached = await this.common.cache.get({ addr: addr + this.lc });
                    if (cached?.other) {
                        // first clean other flags
                        const cachedItem = <TItem>cached.other;
                        this.cleanItem(cachedItem);
                        this.item = cachedItem;
                    }
                }

                if (!this.item) {
                    // not found in cache, manually load
                    this.item = <any>{};
                    this.loadItemPrimaryProperties(addr, this.item);

                    if (this.gib === GIB && !this.isMeta) { this.item.isMeta = true; }
                }
            } else {
                if (logalot) { console.log(`${lc} no new address`) }
            }

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    async loadItemPrimaryProperties(addr: IbGibAddr, item?: TItem): Promise<void> {
        const lc = `${this.lc}[${this.loadItemPrimaryProperties.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            item = item ?? this.item;
            if (!item) {
                debugger;
            }
            const { ib, gib } = h.getIbAndGib({ ibGibAddr: addr });
            item.ib = ib;
            item.gib = gib;
            item.addr = addr;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Updates this component because a newer ibgib has been found.
     *
     * Default implementation merely updates this.addr with the latestAddr,
     * which triggers a call to `updateIbGib`. Override this for custom updating
     * specific only to updateibGib notifications.
     *
     * This should only be triggered once a genuinely new ibgib on the timeline
     * tjp occurs, so checking for different addrs should be unnecessary.
     *
     * This should not be triggered if there is no tjp (timeline).
     *
     * ## notes
     *
     * * by default, this just sets `this.addr` to the `latestAddr`, which triggers
     *   a call to `updateIbGib`.
     */
    async updateIbGib_NewerTimelineFrame({
        latestAddr,
        latestIbGib,
        tjpAddr,
    }: IbGibTimelineUpdateInfo): Promise<void> {
        const lc = `${this.lc}[${this.updateIbGib_NewerTimelineFrame.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: f67a7a947bec4906b5a940d724a26891)`); }

            // cheap double-check assertion
            if (latestAddr === this.addr) {
                console.warn(`${lc} (UNEXPECTED) this function is expected to fire only when latest is already checked to be different, but latestAddr (${latestAddr}) === this.addr (${this.addr}) (W: a23c8187caef4308b1d9f85b3aa8bedc)`);
                return; /* <<<< returns early */
            }

            this.addr = latestAddr; // triggers `updateIbGib` call

        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete. (I: f67a7a947bec4906b5a940d724a26891)`); }
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
            return; /* <<<< returns early */
        }
        if (item.addr) {
            const { ib, gib } = h.getIbAndGib({ ibGibAddr: item.addr });
            if (!force && item.ibGib && h.getIbGibAddr({ ibGib: item.ibGib }) === item.addr) {
                // do nothing, because we already have loaded this address.
                if (logalot) { console.log(`${lc} already loaded item.ibGib and force flag is falsy (I: dde55ba695fb2aa0e20caadb1ef83922)`); }
            } else {
                if (gib === GIB) {
                    // if (item.addr === c.BOOTSTRAP_IBGIB_ADDR) {
                    //     let bootstrapIbGib =
                    //         getValidatedBootstrapIbGib({zeroSpace: this.common.ibgibs.zeroSpace});
                    // } else {
                    // primitive, just build
                    item.ibGib = Factory_V1.primitive({ ib });
                    // }
                } else {
                    // these components often try a little too soon when
                    // starting up the app...so delay
                    while (!this.common.ibgibs.initialized) {
                        const delayMs = Math.ceil(Math.random() * 100) + 10;
                        if (logalot) { console.warn(`${lc} ibgibs initializing...waiting ${delayMs} ms...`); }
                        await h.delay(delayMs);
                    }
                    //
                    // get the full ibgib record from the ibgibs service (local space)
                    let resGet: GetIbGibResult;
                    if (!isSpaceIb({ ib })) {
                        // usually we'll be getting a regular ibgib
                        resGet = await this.common.ibgibs.get({
                            addr: item.addr,
                            isMeta: item.isMeta,
                        });
                    } else {
                        let spaceInfo = getInfoFromSpaceIb({ spaceIb: ib });
                        let localIonicSpaceClassname = 'IonicSpace_V1';
                        if (spaceInfo.spaceClassname === localIonicSpaceClassname) {
                            // hard-coded hack because I didn't include space classname in sync space
                            // aws dynamo space was supposed to be a proof-of-concept anyway, and
                            // i should be able to export the entire space to another.
                            // anyway, we must load the space from itself.
                            if (!spaceInfo.spaceId) { throw new Error(`(UNEXPECTED) spaceClassname is ${localIonicSpaceClassname} but spaceId not found in ib? (E: fb1beb0407ac1507790adaeb46d7e722)`); }
                            let localSpace = await this.common.ibgibs.getLocalUserSpace({ localSpaceId: spaceInfo.spaceId });
                            if (!localSpace) { throw new Error(`localSpace with spaceId ${spaceInfo.spaceId} not found in getLocalUserSpace call (E: bde85f1ce73d89efec515bdc1b04a722)`); }
                            resGet = await this.common.ibgibs.get({
                                addr: item.addr,
                                isMeta: item.isMeta,
                                space: localSpace,
                            });
                        } else {
                            // atow, we will handle this like a normal ibgib
                            resGet = await this.common.ibgibs.get({
                                addr: item.addr,
                                isMeta: item.isMeta,
                            });
                        }
                        if (spaceInfo.spaceId)
                            // we're getting a space
                            resGet = await this.common.ibgibs.get({
                                addr: item.addr,
                                isMeta: true,
                                space: isSpaceIb({ ib }) ? this.common.ibgibs.zeroSpace : undefined,
                            });
                    }
                    if (resGet.success && resGet.ibGibs?.length === 1) {
                        item.ibGib = resGet.ibGibs![0];

                        // set item.hasChildren hack - uses default list rel8n names
                        if (item.ibGib.rel8ns) {
                            for (let rel8nName of c.DEFAULT_LIST_REL8N_NAMES) {
                                if (item.ibGib.rel8ns[rel8nName] && item.ibGib.rel8ns[rel8nName].length > 0) {
                                    item.hasChildren = true;
                                    break;
                                }
                            }
                        }
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
        return this.tjp ? h.getIbGibAddr({ ibGib: this.tjp }) : "";
    }

    async loadTjp(): Promise<void> {
        const lc = `${this.lc}[${this.loadTjp.name}]`;
        if (this.gib === GIB) {
            if (logalot) { console.log(`${lc} this.gib is gib so no tjp (I: 3057523be835c71305a2622cce811922)`); }
            return; /* <<<< returns early */
        }

        const tjpAlreadySet =
            this.ibGib && this.tjp && this.tjpAddr &&
            getGibInfo({ ibGibAddr: this.addr }).tjpGib === this.tjp.gib;

        if (!tjpAlreadySet && this.ibGib && this.gib !== GIB && !this.ib.startsWith('bin.')) {
            let tjp = await this.common.ibgibs.getTjpIbGib({ ibGib: this.ibGib, naive: true });
            this.tjp = tjp;
        } else if (tjpAlreadySet) {
            // do nothing
        } else if (this.tjp) {
            delete this.tjp;
        }
    }

    async go({
        toAddr,
        fromAddr,
        queryParams,
        queryParamsHandling = 'preserve',
        isModal,
        force,
    }: NavInfo): Promise<void> {
        let lc: string = '[invalid lc] (E: 9048c65ff92e4a08b840cf15d0a2867c)';
        try {
            lc = `${this.lc}[${this.go.name}(${toAddr || 'falsy'}) from (${fromAddr || 'falsy'})]`;
            if (logalot) { console.log(`starting`); }

            if (!toAddr) { throw new Error(`toAddr required. (E: 963988b52c9047a6bfd3adc87db8d99b)`); }
            const toAddr_TjpGib = getGibInfo({ ibGibAddr: toAddr }).tjpGib;

            fromAddr = fromAddr ?? this.addr ?? undefined;
            const fromAddr_TjpGib = this.addr ? getGibInfo({ ibGibAddr: this.addr }).tjpGib : undefined;

            await this.common.nav.go({
                toAddr, toAddr_TjpGib,
                fromAddr, fromAddr_TjpGib,
                queryParamsHandling,
                queryParams,
                isModal,
                force,
            });

            if (logalot) { console.log(`${lc} complete.`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        }
    }

    /**
     * Load the item's other properties, e.g. text or tagText.
     *
     * Does nothing in base implementation.
     */
    async loadItem(item?: TItem): Promise<void> {
        item = item || this.item;
        if (!item) {
            return; /* <<<< returns early */
        }

        await this.loadType(item);
        await this.loadTimestamp(item);
        if (item.type === 'pic') { await this.loadPic(item); }
        if (item.type === 'comment') { await this.loadComment(item); }
        if (item.type === 'link') { await this.loadLink(item); }
    }

    async loadType(item?: TItem): Promise<void> {
        item = item || this.item;
        if (item.type) { return; }

        if (isTagItem(item)) {
            item.type = 'tag';
        } else if (isTagsItem(item)) {
            item.type = 'tags';
        } else if (isRootItem(item)) {
            item.type = 'root';
        } else if (isRootsItem(item)) {
            item.type = 'roots';
        } else if (isPicItem(item)) {
            item.type = 'pic';
        } else if (isCommentItem(item)) {
            item.type = 'comment';
        } else if (isLinkItem(item)) {
            item.type = 'link';
        }
    }

    /**
     * Loads the item with the pic's properties like `filenameWithExt` and
     * binary properties like `binHash`.
     *
     * @param item the item on which we are setting the properties.
     */
    async loadPic(item?: TItem): Promise<void> {
        const lc = `${this.lc}[${this.loadPic.name}]`;
        item = item || this.item;
        if (!isPicItem(item)) { return; /* <<<< returns early */ }
        if (logalot) { console.log(`${lc} starting...`); }
        try {
            if (item.picSrc) {
                if (logalot) { console.log(`${lc} item.picSrc already loaded pic (I: a1ea6c6e4feec51d849e86877b033122)`); }
                return; /* <<<< returns early */
            }

            if (!item.ibGib?.data?.binHash) {
                if (logalot) { console.log(`${lc} no data.binHash`); }
                return; /* <<<< returns early */
            }
            if (!item.ibGib!.data!.ext) {
                if (logalot) { console.log(`${lc} no data.ext`); }
                return; /* <<<< returns early */
            }
            if (!item.ibGib.rel8ns || item.ibGib.rel8ns['bin'].length === 0) {
                if (logalot) { console.log(`${lc} no rel8ns.bin`); }
                return; /* <<<< returns early */
            }

            const data = <PicData_V1>item.ibGib.data;
            if (logalot) { console.log(`${lc} binHash: ${data.binHash}\nbinExt: ${data.ext}`); }
            const binAddrs = item.ibGib.rel8ns[c.BINARY_REL8N_NAME];
            let binAddr = binAddrs[binAddrs.length - 1];
            if (logalot) { console.log(`${lc} getting bin addr: ${binAddr}`); }
            const resGet = await this.common.ibgibs.get({ addr: binAddr });

            item.filenameWithExt = `${data.filename || data.binHash}.${data.ext}`;

            const delayRefDetectChangesMs = 2000; // hack
            if (resGet.success && resGet.ibGibs?.length === 1 && resGet.ibGibs[0]!.data) {
                item.picSrc = `data:image/jpeg;base64,${resGet.ibGibs![0].data!}`;
                if (logalot) { console.log(`${lc} loaded item.picSrc.length: ${item?.picSrc?.length}`); }
                setTimeout(() => { this.ref.detectChanges(); }, delayRefDetectChangesMs);
                if (logalot) { console.log(`${lc} ref.detectChanges in ${delayRefDetectChangesMs.toString()}`); }
            } else {
                console.error(`${lc} Couldn't get pic. ${resGet.errorMsg}`);
            }
            item.text = data.filename ?? `pic ${item.gib.slice(0, 5)}...`;

            // load multi pics if applicable, spin off
            if (binAddrs.length > 1) {
                if (logalot) { console.log(`${lc} spinning off loading multiple bins (I: d5c61f2de717a7c762d1b89ee3796b22)`); }
                const picSrcs = [item.picSrc];
                // item.multiPicSrcs = [item.picSrc];
                new Promise(async (resolve) => {
                    console.warn(`${lc} wakka`);

                    // await this.smallDelayToLoadBalanceUI();
                    await h.delay(Math.ceil(2000 * Math.random())); // hack
                    for (let i = 0; i < binAddrs.length - 1; i++) {
                        binAddr = binAddrs[i];
                        // let binAddr = binAddrs[binAddrs.length-1];
                        if (logalot) { console.log(`${lc} getting bin addr: ${binAddr}`); }
                        const resGet = await this.common.ibgibs.get({ addr: binAddr });

                        if (resGet.success && resGet.ibGibs?.length === 1 && resGet.ibGibs[0]!.data) {
                            let picSrc = `data:image/jpeg;base64,${resGet.ibGibs![0].data!}`;
                            picSrcs.push(picSrc);
                            if (logalot) { console.log(`${lc} picSrc.length: ${picSrc.length}`); }
                            if (logalot) { console.log(`${lc} ref.detectChanges in ${delayRefDetectChangesMs.toString()}`); }
                        } else {
                            console.error(`${lc} Couldn't get pic. ${resGet.errorMsg}`);
                        }
                    }
                    item.multiPicSrcs = picSrcs;
                    setTimeout(() => this.ref.detectChanges());
                });
            }
            if (logalot) { console.log(`${lc} loaded.`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
        } finally {
            if (logalot) { console.log(`${lc} complete.`) }
        }
    }

    /**
     * Loads the item with the comment's properties like `text` & `timestamp`.
     *
     * @param item the item on which we are setting the properties.
     */
    async loadComment(item?: TItem): Promise<void> {
        const lc = `${this.lc}[${this.loadComment.name}]`;
        item = item || this.item;
        if (!this.isComment) {
            if (logalot) { console.log(`${lc} !this.isComment (I: 5b5a6b2c0fd2717c655e7ff587afc822)`); }
            return; /* <<<< returns early */
        }
        if (!this.ibGib?.data?.text) {
            if (logalot) { console.log(`${lc} !this.ibGib?.data?.text (I: 3f042c7067a2f6a8a949b49ebf6b8922)`); }
            return; /* <<<< returns early */
        }
        if (item.text) {
            if (logalot) { console.log(`${lc} item.text already loaded (I: 4b277f3ac1d953cf4fcc5cf9c9dc1a22)`); }
            return; /* <<<< returns early */
        }

        const data = <CommentData_V1>this.ibGib.data;
        item.text = data.text;
    }

    async loadLink(item?: TItem): Promise<void> {
        const lc = `${this.lc}[${this.loadLink.name}]`;
        item = item || this.item;
        if (!this.isLink) {
            if (logalot) { console.log(`${lc} !this.isLink (I: 7214b1a1f2df431fbb682014b7e652a6)`); }
            return; /* <<<< returns early */
        }
        if (!this.ibGib?.data?.text) {
            if (logalot) { console.log(`${lc} !this.ibGib?.data?.text (I: 132ee2d88e6e4bf887e96d5f1e5da938)`); }
            return; /* <<<< returns early */
        }
        if (item.text) {
            if (logalot) { console.log(`${lc} item.text already loaded (I: fb07c4c955b24d049d6b972e8f901415)`); }
            return; /* <<<< returns early */
        }

        const data = <LinkData_V1>this.ibGib.data;
        item.text = data.text;
    }

    async loadTimestamp(item?: TItem): Promise<void> {
        if (!this.ibGib?.data) { return; }
        if (item.timestamp) { return; }
        if (this.isComment || this.isLink) {
            item.timestamp = this.ibGib?.data.textTimestamp || this.ibGib?.data.timestamp;
        } else {
            item.timestamp = this.ibGib?.data?.timestamp;
        }
    }

    /**
     * Default handler for dealing with updates to ibGibs (i.e. new frames in their timelines).
     *
     * NOTE: ATOW this will be SPUN OFF, it will not be awaited.
     *
     * @param info event info for the new latest ibGib
     */
    async handleIbGib_NewLatest(info: IbGibTimelineUpdateInfo): Promise<void> {
        const lc = `${this.lc}[${this.handleIbGib_NewLatest.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`) }

            if (!this.ibGib) {
                if (logalot) { console.log(`${lc} this.ibGib is falsy, returning early. (I: b75c97830164f4b08c658717a3b20122)`); }
                return; /* <<<< returns early */
            }

            // check if different addr first because moderate likelihood and cheap to check
            if (this.addr && this.addr === info.latestAddr) {
                if (logalot) { console.log(`${lc} already latest, so returning early. (I: c3331d8298dfc1d5e8bce69ecc645e22)`); }
                return; /* <<<< returns early */
            }

            // check paused & errored early because less likely, but extremely cheap to check
            if (this.paused) {
                if (logalot) { console.log(`${lc} this.paused truthy, so returning early. (I: 4d4b4bd3f01a4c7fadb6eab9d5cb7e50)`); }
                return; /* <<<< returns early */
            }
            if (this.errored) {
                if (logalot) { console.log(`${lc} this.errored truthy, so returning early. (I: 8aa06ebb7fec43f78cb710088c8ecbc7)`); }
                return; /* <<<< returns early */
            }

            // if we don't have a timeline, then we won't update no matter what.
            // odds are that if we care about timelines, tjp is already loaded
            if (!this.tjp || !this.tjpAddr) { await this.loadTjp(); }
            if (!this.ibGib) {
                return; /* <<<< returns early */
            }
            if (!this.tjp) {
                if (logalot) { console.log(`${lc} no tjp, so returning early. (I: 342575ac8de44c258965355dbd92a515)`); }
                return; /* <<<< returns early */
            }

            // if it's not for this ibgib's timeline, then dont update
            if (this.tjpAddr !== info.tjpAddr) {
                if (logalot) { console.log(`${lc} tjpAddr isn't us, so returning early. (I: c30f4da018224fb08df77adc98495a25)`); }
                return; /* <<<< returns early */
            }

            if (!this.ibGib) {
                return; /* <<<< returns early */
            }
            // if (logalot) { console.log(`${lc} triggered.\nthis.addr: ${this.addr}\ninfo: ${JSON.stringify(info, null, 2)} (I: c0483014944c43cdac5f8d296bb56e05)`); }
            if (logalot) { console.log(`${lc} setting this.addr (${this.addr}) to info.latestAddr (${info.latestAddr}). (I: 74f2ce5803064578a5f4166ad045c1bf)`); }

            if (!this.ibGib) { debugger; }
            // check manually comparing data
            if (logalot) { console.log(`${lc} triggered.\nthis.addr: ${this.addr}\nlatest info: ${JSON.stringify(info, null, 2)}`); }
            let info_latestIbGib = info.latestIbGib;
            if (!info_latestIbGib) {
                let resGet = await this.common.ibgibs.get({ addr: info.latestAddr });
                if (resGet.success && resGet.ibGibs?.length === 1) {
                    info_latestIbGib = resGet.ibGibs[0];
                    info.latestIbGib = info_latestIbGib;
                } else {
                    console.error(`${lc} could not get latest ibgib that was published. (E: 85599b5cca4a4bba93578a3156c98b50)`);
                    return; /* <<<< returns early */
                }
            }

            const isNewer = (info_latestIbGib.data?.n ?? -1) > (this.ibGib.data?.n ?? -1);
            if (isNewer) {
                await this.updateIbGib_NewerTimelineFrame(info);
            } if (info_latestIbGib.gib === this.gib) {
                if (logalot) { console.log(`${lc} latest ibgib info is the same as the current. (I: 2e184de2498e205ef692395e2b25d922)`); }
            } else {
                console.log(`${lc} ignoring "latest" info because it's not newer.\nthis.addr: ${this.addr}\nlatestAddr: ${info.latestAddr} (I: c88d135984c39a2aaefd48620d913b22)`);
                if (logalot) { console.log(`${lc} current: ${h.pretty(this.ibGib)}, "latest": ${h.pretty(info_latestIbGib)} (I: c89622ffc6ca1be7f668940c26fb5b22)`); }
                // the following call is idempotent, so okay here in base class.
                await this.common.ibgibs.registerNewIbGib({ ibGib: this.ibGib });
            }
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            this.errored = true;
        } finally {
            if (logalot) { console.log(`${lc} complete.`) }
        }
    }

    // #region status text

    /**
     * Adds an entry for the status text and returns the id to that.

     * Updates {@link statusText}

     * @returns id for status text
     */
    protected addStatusText({
        text,
    }: {
        text: string,
    }): string {
        const lc = `${this.lc}[${this.addStatusText.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            const updateId = this.common.ibgibs.getUUIDSync();
            this._statusTexts[updateId] = text;
            return updateId;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this.updateStatusText();
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    /**
     * Removes the status entry for the given id.
     *
     * Updates {@link statusText}
     */
    protected removeStatusText({
        statusId,
    }: {
        statusId: string,
    }): void {
        const lc = `${this.lc}[${this.removeStatusText.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            if (this._statusTexts[statusId]) {
                delete this._statusTexts[statusId];
            } else {
                console.warn(`${lc} tried to remove a non-existent textId (W: ab6ce2aed6984625a0df85e97d53b41d)`);
            }
            setTimeout(() => this.ref.detectChanges());
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            this.updateStatusText();
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * Updates {@link statusText}
     */
    protected updateStatusText(): void {
        const lc = `${this.lc}[${this.updateStatusText.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting...`); }
            let statusText: string;
            let statusTextIds = Object.keys(this._statusTexts);
            if (statusTextIds.length > 0) {
                let raw = Object.values(this._statusTexts).join('; ');
                statusText = `i believe we are...${raw}`;
            } else {
                statusText = undefined;
            }
            if (this.statusText !== statusText) {
                this.statusText = statusText;
                setTimeout(() => this.ref.detectChanges());
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            // throw error; // no rethrow
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
    // #endregion status text

    /**
     * used in ion-select for strings...
     */
    compareStrings(a: string, b: string): boolean {
        // const lc = `${this.lc}[compareMenuItems]`; // this is not defined when compareRoots is used
        const lc = `[compareStrings]`;
        if (logalot) { console.log(`${lc}`); }
        // reactive form controls when passing in {value: x} without something else
        // has the curious case that b is "" but toLowerCase is not a function.
        // if (typeof a !== 'string') { return false; }
        // if (typeof b !== 'string') { return false; }
        // if (!a.toLowerCase || !b.toLowerCase) {
        //   return false;
        // }
        return a && b ? a?.toLowerCase() === b?.toLowerCase() : a === b;
    }
    compareIbGibs(a: IbGib_V1, b: IbGib_V1): boolean {
        // const lc = `${this.lc}[compareMenuItems]`; // this is not defined when compareRoots is used
        const lc = `[compareIbGibs]`;
        if (logalot) { console.log(`${lc}`); }
        try {
            if (logalot) { console.log(`${lc} starting... (I: 37c2a1a080b616dab13753d7e664c922)`); }
            // reactive form controls when passing in {value: x} without something else
            // has the curious case that b is "" but toLowerCase is not a function.
            // if (typeof a !== 'string') { return false; }
            // if (typeof b !== 'string') { return false; }
            // if (!a.toLowerCase || !b.toLowerCase) {
            //   return false;
            // }
            // hack..., should compare full addr
            if (a && b && a.gib && b.gib) {
                return a?.gib.toLowerCase() === b?.gib.toLowerCase();
            } else {
                return a === b;
            }
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }
}

function isRootItem(item: IbGibItem): boolean { return item.ib?.startsWith('root ') || false; }
function isRootsItem(item: IbGibItem): boolean { return item.ib?.startsWith('meta special roots') || false; }
function isTagItem(item: IbGibItem): boolean { return item.ib?.startsWith('tag ') || false; }
function isTagsItem(item: IbGibItem): boolean { return item.ib?.startsWith('meta special tags') || false; }
function isPicItem(item: IbGibItem): boolean { return item.ib?.startsWith('pic ') || false; }
function isCommentItem(item: IbGibItem): boolean { return item.ib?.startsWith('comment ') || false; }
function isLinkItem(item: IbGibItem): boolean { return item.ib?.startsWith('link ') || false; }
