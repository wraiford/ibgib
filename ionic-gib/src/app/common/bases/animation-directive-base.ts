import {
    ChangeDetectorRef, Directive, ElementRef
} from "@angular/core";
import {
    Animation, AnimationController,
} from "@ionic/angular";

import * as h from 'ts-gib/dist/helper';

import * as c from '../constants';
import { DirectiveBase } from "./directive-base";

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * A little plumbing to simplify for future animations.
 *
 * https://ionicframework.com/docs/utilities/animations
 */
@Directive()
export abstract class AnimationDirectiveBase
    extends DirectiveBase {

    protected lc: string = `[${AnimationDirectiveBase.name}]`;

    protected animation: Animation;
    protected animating: boolean = false;
    protected aborting: boolean;

    constructor(
        protected el: ElementRef,
        protected ref: ChangeDetectorRef,
        protected animationCtrl: AnimationController,
    ) {
        super(el, ref);
    }

    protected async initialize(): Promise<void> {
        const lc = `${this.lc}[${this.initialize.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 5518172b5bea3086ce4f95b555ae8322)`); }
            await this.initializeAnimation();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    /**
     * https://ionicframework.com/docs/utilities/animations
     */
    protected abstract initializeAnimation(): Promise<void>;

    protected async abortAnimation(): Promise<void> {
        const lc = `${this.lc}[${this.abortAnimation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: ffa1f9a733d15c2e35a8e18c02aa3422)`); }

            if (this.aborting) {
                if (logalot) { console.log(`${lc} already aborting (I: 230688737db1831e2634457929f18922)`); }
                return; /* <<<< returns early */
            }
            this.aborting = true;
            if (this.animation.isRunning) { this.animation.stop(); }

            if (this.animating) {
                await this.animation.direction('reverse').play();
                this.animation.stop();
            } else {
                if (logalot) { console.log(`${lc} animation already stopped. (I: 5b6257af45d4b8e504073324128f9c22)`); }
            }
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
            this.animating = false;
        }
    }
}
