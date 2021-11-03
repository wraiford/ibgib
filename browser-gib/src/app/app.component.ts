console.log(`app.component.ts here 1`)
import { Component, OnInit } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent implements OnInit {
  public selectedIndex = 0;
  public appPages = [
    {
      title: 'Inbox',
      url: '/sidebar/Inbox',
      icon: 'mail'
    },
    {
      title: 'Outbox',
      url: '/sidebar/Outbox',
      icon: 'paper-plane'
    },
    {
      title: 'Favorites',
      url: '/sidebar/Favorites',
      icon: 'heart'
    },
    {
      title: 'Archived',
      url: '/sidebar/Archived',
      icon: 'archive'
    },
    {
      title: 'Trash',
      url: '/sidebar/Trash',
      icon: 'trash'
    },
    {
      title: 'Spam',
      url: '/sidebar/Spam',
      icon: 'warning'
    }
  ];
  public labels = ['Family', 'Friends', 'Notes', 'Work', 'Travel', 'Reminders'];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }

  ngOnInit() {
    const path = window.location.pathname.split('sidebar/')[1];
    if (path !== undefined) {
      this.selectedIndex = this.appPages.findIndex(page => page.title.toLowerCase() === path.toLowerCase());
    }
  }
}
