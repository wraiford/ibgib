import {
    ChangeDetectorRef, Directive, ElementRef, Input
} from '@angular/core';
import { AnimationController, GestureController, GestureDetail } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../../constants';
import { ListItemViewComponent } from '../../../views/list-item-view/list-item-view.component';
import { AnimationWithGestureDirectiveBase } from '../../bases/animation-with-gesture-directive-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Directive({
    selector: '[ibClickHoldAnimation]'
})
export class ClickHoldAnimationDirective extends AnimationWithGestureDirectiveBase {

    protected lc: string = `[${ClickHoldAnimationDirective.name}]`;

    private _itemRef: any;
    @Input('ibClickAnimation')
    set itemRef(value: any) {
        this._itemRef = value;
    }
    get itemRef(): ListItemViewComponent {
        return this._itemRef;
    }

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
                    .duration(1000)
                    .fromTo('transform', 'scale(1)', 'scale(1.5)')
                    .fromTo('opacity', '1', '0.3');
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
                threshold: 10, // immediately trigger gesture
                gestureName: 'clickHold',
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

    protected onStart(_: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onStart.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 9c5ca6a1637a41fda3c4c1512da28ba0)`); }

            if (this.animating) {
                console.warn(`${lc} this.animating: ${this.animating}. returning early... (W: 61ea2686a00e4e55a2687beab2b99e5a)`);
                return; /* <<<< returns early */
            }

            /**
             * If after this delay the gesture is not cancelled, then we begin animating.
             */
            const delayMs = 300;
            setTimeout(() => {
                if (this.aborting) {
                    if (logalot) { console.log(`${lc} aborting is true. returning early (I: c3e34b0e6d8b8a470257b90f44214322)`); }
                    return; /* <<<< returns early */

                } else {
                    this.animating = true;
                    this.animation.direction('alternate').play();
                }

            }, delayMs);

        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected onEnd(_: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onEnd.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 579e247323e34d87b59e79bd62e1d6d3)`); }
            this.abortAnimation(); // spins off
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
            if (logalot) { console.log(`${lc} triggered. sansEvent(detail): ${h.pretty(this.sansEvent(detail))} (I: 6c6eb37a67b94a73adad99b063e68dd8)`); }
            console.log('moving long hold...')
            this.moveCount++;
            const style = this.el.nativeElement.style;
            style.transform = `translate3d(${detail.deltaX}px, 0, 0)`;
            // if (this.moveCount > c.GESTURE_CLICK_TOLERANCE_ONMOVE_THRESHOLD_COUNT) {
            //     if (logalot) { console.log(`${lc} gesture onmove threshold exceeded. cancelling click animation. (I: 56a489e6befd43129beedf3136dd64e4)`); }
            //     this.abortAnimation(); // spins off
            // }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

}
