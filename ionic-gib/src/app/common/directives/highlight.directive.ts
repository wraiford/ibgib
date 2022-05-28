import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: '[ibHighlight]'
})
export class HighlightDirective {

  constructor(private el: ElementRef) {
    this.el.nativeElement.style.backgroundColor = 'yellow';
  }

}
