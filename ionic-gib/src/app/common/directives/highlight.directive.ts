import { ChangeDetectorRef, Directive, ElementRef } from '@angular/core';
import { DirectiveBase } from '../bases/directive-base';

@Directive({
  selector: '[ibHighlight]'
})
export class HighlightDirective extends DirectiveBase {

  constructor(
    protected el: ElementRef,
    protected ref: ChangeDetectorRef,
  ) {
    super(el, ref);
  }

  protected async initialize(): Promise<void> {
    this.el.nativeElement.style.backgroundColor = 'var(--ion-color-primary)';
  }

}
