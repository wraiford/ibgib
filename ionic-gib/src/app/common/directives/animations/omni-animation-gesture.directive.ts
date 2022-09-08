import {
    ChangeDetectorRef, Directive, ElementRef, EventEmitter, Input, Output
} from '@angular/core';
import { AnimationController, GestureController, GestureDetail, Animation } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../../constants';
import { ItemViewComponent } from '../../../views/item-view/item-view.component';
import { AnimationWithGestureDirectiveBase } from '../../bases/animation-with-gesture-directive-base';

const logalot = c.GLOBAL_LOG_A_LOT || true;

@Directive({
    selector: '[ibOmni]'
})
export class OmniAnimationGestureDirective extends AnimationWithGestureDirectiveBase {

    protected lc: string = `[${OmniAnimationGestureDirective.name}]`;

    /**
     * style that this.el nativeelement.style is before we start mucking about
     * with transforms and our custom styling...
     *
     * so atow, in on start we do:
     *     this.initialStyle = this.el.nativeElement.style;
     */
    private _initialStyle: any;
    private _cancelClickSetTimeoutRef: any;

    protected animation_swipeRightExecCmd: Animation;

    private _itemRef: any;
    @Input('ibOmni')
    set itemRef(value: any) {
        this._itemRef = value;
    }
    get itemRef(): ItemViewComponent {
        return this._itemRef;
    }

    /**
     * Max ms time that will trigger a single click event.
     */
    @Input()
    click_MaxMs: number = 500;
    /**
     * Max amount of deadzone area (play) that will trigger a single click event.
     */
    @Input()
    click_MaxDeltaXYDeadzone: number = 10;

    /**
     * Min delta XY displacement that will trigger a command.
     */
    @Input()
    cmd_MinDeltaXYExecute: number = 125;
    @Input()
    cmd_MinDeltaXYDeadzone: number = 10;

    /**
     * this is how long the animation plays when executing a command.
     *
     * For example, when you swipe right, this is the length of time after
     * letting go that the item finishes the slide to the side.
     */
    @Input()
    swipeCmdAnimationMs: number = 500;

    @Output()
    omniClick = new EventEmitter<void>();

    @Output()
    omniSwipeRight = new EventEmitter<void>();

    @Output()
    omniSwipeLeft = new EventEmitter<void>();

    constructor(
        protected el: ElementRef,
        protected ref: ChangeDetectorRef,
        protected animationCtrl: AnimationController,
        protected gestureCtrl: GestureController,
    ) {
        super(el, ref, animationCtrl, gestureCtrl);
        const lc = `${this.lc}[ctor]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: cefd9db8b2c640d6aeabba0d14400a33)`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initializeAnimation(): Promise<void> {
        const lc = `${this.lc}[${this.initializeAnimation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 7ce3a7e8f64c416c8f912550992eec8f)`); }
            // debugger;

            this.animation =
                this.animationCtrl.create()
                    .addElement(this.el.nativeElement)
                    .duration(100)
                    .fromTo('transform', 'scale(1)', 'scale(0.95)')
                    .fromTo('opacity', '1', '0.8');
            ;

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initializeGesture(): Promise<void> {
        const lc = `${this.lc}[${this.initializeGesture.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: c012d2cc63cd465db8879eeab23c6706)`); }

            this.moveCount = 0;

            this.gesture = this.gestureCtrl.create({
                el: this.el.nativeElement,
                threshold: 0, // immediately trigger gesture
                gestureName: 'omniGesture',
                gesturePriority: 1,
                onStart: (detail) => this.onStart(detail),
                onEnd: (detail) => this.onEnd(detail),
                onMove: (detail) => this.onMove(detail),
            });

            this.gesture.enable();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }

    }

    protected onStart(detail: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onStart.name}]`;
        try {
            console.log(lc)
            if (logalot) { console.log(`${lc} starting... (I: 9c5ca6a1637a41fda3c4c1512da28ba0)`); }

            if (this.animating) {
                console.warn(`${lc} this.animating: ${this.animating}. returning early... (W: 61ea2686a00e4e55a2687beab2b99e5a)`);
                return; /* <<<< returns early */
            }

            // this._startTime = Date.now();

            /**
             * If after this delay the gesture is not cancelled, then we begin animating.
             */
            // const delayMs = 300;
            // setTimeout(() => {
            //     if (this.aborting) {
            //         if (logalot) { console.log(`${lc} aborting is true. returning early (I: c3e34b0e6d8b8a470257b90f44214322)`); }
            //         return; /* <<<< returns early */

            //     } else {
            //         this.animating = true;
            //         this.animation.direction('alternate').play();
            //     }

            // }, delayMs);
            this.aborting = false;

            this.animating = true;
            this.animation.direction('alternate').play();

            this._initialStyle = this.el.nativeElement.style;

            // clear this in onMove/onEnd
            this._cancelClickSetTimeoutRef = setTimeout(() => {
                this.abortAnimation({ reverse: false }); // spins off
                delete this._cancelClickSetTimeoutRef;
            }, this.click_MaxMs);

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected onEnd(detail: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onEnd.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 579e247323e34d87b59e79bd62e1d6d3)`); }

            if (this._cancelClickSetTimeoutRef) {
                clearTimeout(this._cancelClickSetTimeoutRef);
                delete this._cancelClickSetTimeoutRef;
            }

            const { deltaX, deltaY } = detail;
            const { abs } = Math;

            // this._endTime = Date.now();


            // if it hasn't moved much and the click is fast enough, emit the click event
            // const deltaMs = this._endTime - this._startTime;
            const deltaMs = detail.currentTime - detail.startTime;
            console.log(`${lc} deltaMs: ${deltaMs}`);
            console.log(`${lc} deltaX: ${deltaX}`);
            console.log(`${lc} deltaY: ${deltaY}`);

            if (deltaMs < this.click_MaxMs && abs(deltaX) < this.click_MaxDeltaXYDeadzone) {
                this.omniClick.emit();
            } else if (deltaX > 0) {
                if (deltaX > this.cmd_MinDeltaXYExecute) {
                    // swiped right
                    console.log(`${lc} swiped right`);
                    this.swipeRightCmdExec(detail); // spins off
                } else {
                    console.log(`${lc} ALMOST swipe right`);
                    this.el.nativeElement.style = this._initialStyle;
                }
            } else if (deltaX < 0) {
                if (abs(deltaX) > this.cmd_MinDeltaXYExecute) {
                    // swiped left
                    console.log(`${lc} swiped left`);
                    this.swipeLeftCmdExec(detail); // spins off
                } else {
                    console.log(`${lc} ALMOST swiped left`);
                    this.el.nativeElement.style = this._initialStyle;
                }
            } else {
                this.el.nativeElement.style = this._initialStyle;
            }
            this.abortAnimation({ reverse: false }); // spins off
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected onMove(detail: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onMove.name}]`;
        try {
            // if (logalot) { console.log(`${lc} triggered. sansEvent(detail): ${h.pretty(this.sansEvent(detail))} (I: 6c6eb37a67b94a73adad99b063e68dd8)`); }
            if (logalot) { console.log(`${lc} starting... (I: 54a44548d1a86e8efb3e0488505d8522)`); }
            const { deltaX, deltaY } = detail;
            const { abs } = Math;


            // if we're definitely not single click, then cancel that animation (but dont reverse)
            if (abs(deltaX) > this.click_MaxDeltaXYDeadzone || abs(deltaY) > this.click_MaxDeltaXYDeadzone) {
                if (this._cancelClickSetTimeoutRef) {
                    clearTimeout(this._cancelClickSetTimeoutRef);
                    delete this._cancelClickSetTimeoutRef;
                }
                this.abortAnimation({ reverse: false }); // spins off
            }

            this.moveCount++;
            const style = this.el.nativeElement.style;
            style.transform = `translate3d(${deltaX}px, 0, 0) scale(0.95)`;
            style.padding = '0px';
            style.margin = '2px';
            style.borderWidth = '2px';
            style.borderStroke = 'solid';

            // const abs = (x: number) => { return Math.abs(x); }

            // ty https://www.hexcolortool.com
            let backgroundColor: string;
            let borderColor: string;
            if (deltaX > 0 && abs(deltaX) > this.cmd_MinDeltaXYDeadzone) {
                // cmd is trash
                if (abs(deltaX) < abs(this.cmd_MinDeltaXYExecute)) {
                    // slightly displaced, indicate maybe cmd
                    borderColor = 'rgba(245, 0, 53, 0.73)';
                    backgroundColor = 'rgba(245, 0, 53, 0.33)';
                } else {
                    // very displaced, indicate cmd will exec on end gesture
                    borderColor = 'red';
                    backgroundColor = 'red';
                }
            } else if (deltaX < 0 && abs(deltaX) > this.cmd_MinDeltaXYDeadzone) {
                // cmd is archive
                if (abs(deltaX) < abs(this.cmd_MinDeltaXYExecute)) {
                    // slightly displaced, indicate maybe cmd
                    borderColor = 'rgba(16, 12, 228, 0.7)';
                    backgroundColor = 'rgba(16, 12, 228, 0.2)';
                } else {
                    // very displaced, indicate cmd will exec on end gesture
                    borderColor = 'rgba(0, 12, 245, 1)';
                    backgroundColor = 'rgba(0, 12, 245, 1)';
                }
            } else {
                backgroundColor = 'transparent';
                borderColor = 'grey';
            }

            style.backgroundColor = backgroundColor;
            style.borderColor = borderColor;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete. (I: 015201a4a4ce3ca4e53acbcebd28f222)`); }
        }
    }

    private async swipeRightCmdExec(detail: GestureDetail): Promise<void> {
        const lc = `${this.lc}[${this.swipeRightCmdExec.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 6e260c36f67ef44fb3f6378d5a27c422)`); }

            const { deltaX, deltaY, startX, currentX } = detail;
            // ty https://www.javascripttutorial.net/javascript-dom/javascript-width-height/
            const remainingX = this.el.nativeElement.getBoundingClientRect().width;
            const { abs } = Math;

            const animation =
                this.animationCtrl.create()
                    .addElement(this.el.nativeElement)
                    .duration(this.swipeCmdAnimationMs)
                    .fromTo('transform', `translate3d(${deltaX}px, 0, 0)`, `translate3d(${remainingX}px, 0, 0)`)
                    .to('height', '0px')
                    .fromTo('opacity', '1', '0.2');
            await animation.play();
            this.el.nativeElement.style.display = 'none';
            this.omniSwipeRight.emit();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    private async swipeLeftCmdExec(detail: GestureDetail): Promise<void> {
        const lc = `${this.lc}[${this.swipeLeftCmdExec.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 5c516c0433144363b5ae6a6576491f4e)`); }

            const { deltaX, deltaY, startX, currentX } = detail;
            // const remainingX = window.innerWidth - this.el.nativeElement.left - deltaX;
            // debugger;
            const remainingX = this.el.nativeElement.getBoundingClientRect().width;
            const { abs } = Math;

            const animation =
                this.animationCtrl.create()
                    .addElement(this.el.nativeElement)
                    .duration(this.swipeCmdAnimationMs)
                    .fromTo('transform', `translate3d(${deltaX}px, 0, 0)`, `translate3d(-${remainingX}px, 0, 0)`)
                    .to('height', '0px')
                    .fromTo('opacity', '1', '0.2');
            await animation.play();
            this.el.nativeElement.style.display = 'none';
            this.omniSwipeRight.emit();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}
