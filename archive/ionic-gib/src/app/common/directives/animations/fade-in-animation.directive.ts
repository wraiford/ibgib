import {
    ChangeDetectorRef, Directive, ElementRef,
} from '@angular/core';
import { AnimationController, } from '@ionic/angular';

import * as c from '../../constants';
import { AnimationDirectiveBase } from '../../bases/animation-directive-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Directive({
    selector: '[ibFadeInAnimation]'
})
export class FadeInAnimationDirective extends AnimationDirectiveBase {

    protected lc: string = `[${FadeInAnimationDirective.name}]`;

    constructor(
        protected el: ElementRef,
        protected ref: ChangeDetectorRef,
        protected animationCtrl: AnimationController,
    ) {
        super(el, ref, animationCtrl);
        const lc = `${this.lc}[ctor]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 22932088881542d6b741ced9b380a532)`); }
        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected async initializeAnimation(): Promise<void> {
        const lc = `${this.lc}[${this.initializeAnimation.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 97ab6061da324b16917552201c64f411)`); }

            // debugger;
            this.animation =
                this.animationCtrl.create()
                    .addElement(this.el.nativeElement)
                    .duration(500)
                    .fromTo('transform', 'scale(0.9)', 'scale(1)')
                    .fromTo('opacity', '0.2', '1');
            ;

            this.animation.play();

        } catch (error) {
            debugger;
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

}
