import { ChangeDetectorRef, Directive, ElementRef, Input } from '@angular/core';
import { ListItemViewComponent } from 'src/app/views/list-item-view/list-item-view.component';

@Directive({
  selector: '[ibClickAnimation]'
})
export class ClickAnimationDirective {

  private _itemRef: any;
  @Input('ibClickAnimation')
  set itemRef(value: any) {
    this._itemRef = value;
  }
  get itemRef(): ListItemViewComponent {
    return this._itemRef;
  }

  constructor(
    private el: ElementRef,
    private ref: ChangeDetectorRef,
  ) {
    setTimeout(() => {
      this.itemRef.debugBorderColor = 'purple';
      (<HTMLElement>el.nativeElement).style.borderColor = 'pink !important';
      (<HTMLElement>el.nativeElement).style.borderStyle = 'solid';
      (<HTMLElement>el.nativeElement).style.borderWidth = '30px';
      this.itemRef.debugBorderColor = 'purple';
      this.ref.detectChanges();
    });
  }

}
