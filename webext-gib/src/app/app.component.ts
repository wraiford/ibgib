import { Component } from '@angular/core';

console.log(`app component file executed`)

@Component({
  selector: 'ibgib-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'webext-gib';

  constructor() {
    console.log(`app component created`)
  }
}
