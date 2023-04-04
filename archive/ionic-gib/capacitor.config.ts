/// <reference types="@capacitor/local-notifications" />
/// <reference types="@capacitor/splash-screen" />

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  "appId": "com.ibgib.ibgib",
  "appName": "ibgib",
  "bundledWebRuntime": false,
  "webDir": "www",
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 0,
    },
    "LocalNotifications": {
      "smallIcon": "ic_stat_icon_config_sample",
      "iconColor": "#92ED80",
      "sound": "beep.wav",
    }
  },
  "cordova": {}
}

export default config;
