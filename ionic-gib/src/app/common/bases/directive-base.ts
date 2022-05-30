import {
    AfterViewInit, ChangeDetectorRef, Directive, ElementRef,
} from "@angular/core";

import * as c from '../constants';

const logalot = c.GLOBAL_LOG_A_LOT || false;

/**
 * Base class for all directives in this app, with some basic plumbing.
 */
@Directive()
export abstract class DirectiveBase implements AfterViewInit {

    protected lc: string = `[${DirectiveBase.name}]`;

    constructor(
        protected el: ElementRef,
        protected ref: ChangeDetectorRef,
    ) {

    }

    async ngAfterViewInit(): Promise<void> {
        const lc = `${this.lc}[${this.ngAfterViewInit.name}]`;
        try {
            if (logalot) { console.log(`${lc} starting... (I: 88952d612155f6b64a2dbffc63eccd22)`); }
            await this.initialize();
        } catch (error) {
            console.error(`${lc} ${error.message}`);
            throw error;
        } finally {
            if (logalot) { console.log(`${lc} complete.`); }
        }
    }

    protected abstract initialize(): Promise<void>;
}
