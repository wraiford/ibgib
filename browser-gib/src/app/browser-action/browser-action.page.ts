import { Component, OnInit, ChangeDetectorRef } from '@angular/core';

// alert('browser-action-page')

@Component({
  selector: 'app-browser-action',
  templateUrl: './browser-action.page.html',
  styleUrls: ['./browser-action.page.scss'],
})
export class BrowserActionPage implements OnInit {

  constructor(
    // private ref: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    // setTimeout(() => {
    //   this.ref.detectChanges();
    // }, 1000);
  }

}
