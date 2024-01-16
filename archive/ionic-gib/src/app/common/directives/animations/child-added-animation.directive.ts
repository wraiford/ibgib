import {
    ChangeDetectorRef, Directive, ElementRef,
} from '@angular/core';
import { AnimationController, GestureController, } from '@ionic/angular';

import * as c from '../../constants';
import { AnimationDirectiveBase } from '../../bases/animation-directive-base';

const logalot = c.GLOBAL_LOG_A_LOT || false;

@Directive({
    selector: '[ibChildAddedAnimation]'
})
export class ChildAddedAnimationDirective extends AnimationDirectiveBase {

    protected lc: string = `[${ChildAddedAnimationDirective.name}]`;

    constructor(
        protected el: ElementRef,
        protected ref: ChangeDetectorRef,
        protected animationCtrl: AnimationController,
    ) {
        super(el, ref, animationCtrl);
        const lc = `${this.lc}[ctor]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: a5a369aca6aa778ad3fbd4f674d25e22)`); }
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
            if (logalot) { console.log(`${lc} starting... (I: ccd34399d335dc7d5a5b0af8de867f22)`); }

            // debugger;
            this.animation =
                this.animationCtrl.create()
                    .addElement(this.el.nativeElement)
                    .duration(900)
                    // .fromTo('transform', 'scale(0)', 'scale(1)')
                    .fromTo('height', '0%', 'auto')
                    .fromTo('opacity', '0', '1');
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
