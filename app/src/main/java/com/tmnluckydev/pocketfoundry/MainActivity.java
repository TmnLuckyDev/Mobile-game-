package com.tmnluckydev.pocketfoundry;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.window.OnBackInvokedDispatcher;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private static final Map<String, String> ASSETS;
    static {
        Map<String, String> assets = new HashMap<>();
        assets.put("/index.html", "text/html");
        assets.put("/style.css", "text/css");
        assets.put("/app.mjs", "application/javascript");
        assets.put("/engine.mjs", "application/javascript");
        ASSETS = Collections.unmodifiableMap(assets);
    }
    private WebView web;
    private PlayStore store;
    private boolean pageReady;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(0xff111722);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return true; // The game has no external navigation.
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if ("https".equals(request.getUrl().getScheme()) && HOST.equals(request.getUrl().getHost()) && ASSETS.containsKey(path)) {
                    try {
                        Map<String, String> headers = new HashMap<>();
                        headers.put("Cache-Control", "no-store");
                        headers.put("X-Content-Type-Options", "nosniff");
                        return new WebResourceResponse(ASSETS.get(path), "UTF-8", 200, "OK", headers, getAssets().open(path.substring(1)));
                    } catch (IOException ignored) { }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
        });
        web.addJavascriptInterface(new Bridge(), "FoundryNative");
        setContentView(web);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            web.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
            web.requestApplyInsets();
        }
        store = new PlayStore(this, this::sendBillingState);
        web.loadUrl(START);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        if (store != null) store.refresh();
    }
    @Override protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { handleBack(); }

    private void handleBack() {
        if (web == null || !pageReady) { finish(); return; }
        web.evaluateJavascript("typeof window.foundryBack==='function' && window.foundryBack()", result -> {
            if (!"true".equals(result)) finish();
        });
    }
    private void sendBillingState(String json) {
        runOnUiThread(() -> {
            if (pageReady && web != null) web.evaluateJavascript("window.foundryBillingUpdate(" + json + ")", null);
        });
    }
    @Override protected void onDestroy() {
        if (store != null) store.close();
        if (web != null) {
            web.removeJavascriptInterface("FoundryNative");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
    public final class Bridge {
        @JavascriptInterface public void ready() { runOnUiThread(() -> { pageReady = true; store.publish(); }); }
        @JavascriptInterface public void haptic(String strength) {
            runOnUiThread(() -> {
                if (web != null) web.performHapticFeedback("strong".equals(strength) ? HapticFeedbackConstants.LONG_PRESS : HapticFeedbackConstants.KEYBOARD_TAP);
            });
        }
        @JavascriptInterface public void buyPlus() { runOnUiThread(() -> store.buy()); }
        @JavascriptInterface public void restore() { runOnUiThread(() -> store.refresh()); }
    }
}
