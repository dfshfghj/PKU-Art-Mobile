package com.pku.course

import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.ViewTreeObserver
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

class MainActivity : TauriActivity() {
  private var hasDrawnFirstFrame = false

  override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()
    val surfaceColor = ContextCompat.getColor(this, R.color.pake_surface)
    window.setBackgroundDrawable(ColorDrawable(surfaceColor))
    splashScreen.setKeepOnScreenCondition { !hasDrawnFirstFrame }
    splashScreen.setOnExitAnimationListener { splashScreenViewProvider ->
      splashScreenViewProvider.view.animate()
        .alpha(0f)
        .setDuration(220L)
        .withEndAction { splashScreenViewProvider.remove() }
        .start()
    }
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    val surfaceColor = ContextCompat.getColor(this, R.color.pake_surface)
    webView.setBackgroundColor(surfaceColor)

    val viewTreeObserver = webView.viewTreeObserver
    viewTreeObserver.addOnPreDrawListener(object : ViewTreeObserver.OnPreDrawListener {
      override fun onPreDraw(): Boolean {
        if (!webView.viewTreeObserver.isAlive) {
          hasDrawnFirstFrame = true
          return true
        }

        hasDrawnFirstFrame = true
        webView.viewTreeObserver.removeOnPreDrawListener(this)
        return true
      }
    })
  }
}
