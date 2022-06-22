import {
    ChangeDetectorRef, Directive, ElementRef
} from "@angular/core";
import {
    Animation, AnimationController, Gesture, GestureController, GestureDetail,
} from "@ionic/angular";

import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import { AnimationDirectiveBase } from "./animation-directive-base";
import { DirectiveBase } from "./directive-base";

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * A little plumbing to simplify for future animations with
 * optionally driven gestures.
 *
 * https://ionicframework.com/docs/utilities/gestures
 * https://ionicframework.com/docs/utilities/animations
 */
@Directive()
export abstract class AnimationWithGestureDirectiveBase
    extends AnimationDirectiveBase {

    protected lc: string = `[${AnimationWithGestureDirectiveBase.name}]`;

    protected gesture: Gesture;
    protected get gestureName(): string { return this.getGestureName(); }
    protected getGestureName(): string { throw new Error(`not implemented in base class (E: 50f278d6c8f91a8fefb7e68ce6d3b522)`); }

    protected moveCount: number = 0;

    protected aborting: boolean;

    constructor(
        protected el: ElementRef,
        protected ref: ChangeDetectorRef,
        protected animationCtrl: AnimationController,
        protected gestureCtrl: GestureController,
    ) {
        super(el, ref, animationCtrl);
    }

    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 2384bb316db44bafb2cbf12e28e29946)`); }
            await super.initialize();
            await this.initializeGesture();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * I'm nervous about what detail.event could be populated with, so I'm
     * sanitizing it effectively and removing the event for logging.
     */
    protected sansEvent(detail: GestureDetail): GestureDetail {
        return {
            type: detail.type,
            startX: detail.startX,
            startY: detail.startY,
            startTime: detail.startTime,
            currentX: detail.currentX,
            currentY: detail.currentY,
            velocityX: detail.velocityX,
            velocityY: detail.velocityY,
            deltaX: detail.deltaX,
            deltaY: detail.deltaY,
            currentTime: detail.currentTime,
            event: null,
        };
    }

    protected onStart(detail: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onStart.name}]`;
        try {
            if (logalot) { console.log(`${lc} triggered. sansEvent(detail): ${h.pretty(this.sansEvent(detail))} (I: b4ad092ab653e775f18b01ca165b0422)`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected onMove(detail: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onMove.name}]`;
        try {
            if (logalot) { console.log(`${lc} triggered. sansEvent(detail): ${h.pretty(this.sansEvent(detail))} (I: bc517d4e731f401d8a2341735ffbe025)`); }
            this.moveCount++;
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    protected onEnd(detail: GestureDetail): boolean | void {
        const lc = `${this.lc}[${this.onEnd.name}]`;
        try {
            if (logalot) { console.log(`${lc} triggered. sansEvent(detail): ${h.pretty(this.sansEvent(detail))} (I: e656567bdf1f4055878d6644ca541b0c)`); }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        }
    }

    /**
     * https://ionicframework.com/docs/utilities/gestures
     */
    protected async initializeGesture(): Promise<void> {
        const lc = `${this.lc}[${this.initializeGesture.name}]`;
        if (logalot) { console.log(`${lc} no gesture configured for this directive (I: 85c0898e125a23a82d1a76a601668622)`); }
    }
}
