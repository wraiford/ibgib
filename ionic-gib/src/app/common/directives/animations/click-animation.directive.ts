import {
    ChangeDetectorRef, Directive, ElementRef, Input
} from '@angular/core';
import { AnimationController, GestureController, GestureDetail } from '@ionic/angular';

import * as h from 'ts-gib/dist/helper';

import * as c from '../../constants';
import { ListItemViewComponent } from '../../../views/list-item-view/list-item-view.component';
import { AnimationDirectiveBase } from '../../bases/animation-directive-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Directive({
    selector: '[ibClickAnimation]'
})
export class ClickAnimationDirective extends AnimationDirectiveBase {

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
    }

    protected async initializeAnimation(): Promise<void> {
        const lc = `${this.lc}[${this.initializeAnimation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: ccd34399d335dc7d5a5b0af8de867f22)`); }
            // debugger;

            this.animation =
                this.animationCtrl.create()
                    .addElement(this.el.nativeElement)
                    .duration(200)
                    .fromTo('transform', 'scale(1)', 'scale(1.05)')
                    .fromTo('opacity', '1', '0.5');
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
            if (logalot) { console.log(`${lc} starting... (I: febcc2f3a2b4a20193c1db09ff2e2622)`); }

            this.moveCount = 0;

            this.gesture = this.gestureCtrl.create({
                el: this.el.nativeElement,
                threshold: 0, //
                gestureName: 'click',
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
            if (logalot) { console.log(`${lc} starting... (I: 10d3487a77e17ce08b18b7aa78c5dc22)`); }

            if (this.animating) {
                console.warn(`${lc} this.animating: ${this.animating}. returning early... (W: 1038d6fc3d9b455da632457593f92f31)`);
                return; /* <<<< returns early */
            }
            this.aborting = false;

            this.animating = true;
            this.animation.direction('alternate').play();
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
            if (logalot) { console.log(`${lc} starting... (I: 3a7e367472438e0ca29e9f0a7da8ff22)`); }
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
            if (logalot) { console.log(`${lc} triggered. sansEvent(detail): ${h.pretty(this.sansEvent(detail))} (I: bc517d4e731f401d8a2341735ffbe025)`); }
            this.moveCount++;
            if (this.moveCount > c.GESTURE_CLICK_TOLERANCE_ONMOVE_THRESHOLD_COUNT) {
                if (logalot) { console.log(`${lc} gesture onmove threshold exceeded. cancelling click animation. (I: 139596d3b9e252cd524a997fe68f0322)`); }
                this.abortAnimation(); // spins off
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

}
