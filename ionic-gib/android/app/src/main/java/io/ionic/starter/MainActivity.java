// @see https://github.com/ionic-team/capacitor/discussions/1978#discussioncomment-708439

package io.ionic.starter;

import android.os.Bundle;
import android.content.res.Configuration;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

import java.util.ArrayList;

public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Initializes the Bridge
    this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
      // Additional plugins you've installed go here
      // Ex: add(TotallyAwesomePlugin.class);
    }});
  }
  @Override
  public void onStart() {
    super.onStart();
    setDarkMode();
  }

  @Override
  public void onResume() {
    super.onResume();
    setDarkMode();
  }

  void setDarkMode() {
    // Android "fix" for enabling dark mode
    // @see: https://github.com/ionic-team/capacitor/discussions/1978
    int nightModeFlags = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
    WebSettings webSettings = this.bridge.getWebView().getSettings();
    if (nightModeFlags == Configuration.UI_MODE_NIGHT_YES) {
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
        // As of Android 10, you can simply force the dark mode
        webSettings.setForceDark(WebSettings.FORCE_DARK_ON);
      }
      // Before Android 10, we need to use a CSS class based fallback
      this.bridge.getWebView().evaluateJavascript("document.body.classList.toggle('dark', true);", null);
    } else {
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
        webSettings.setForceDark(WebSettings.FORCE_DARK_OFF);
      }
      this.bridge.getWebView().evaluateJavascript("document.body.classList.toggle('dark', false);", null);
    }
  }
}
