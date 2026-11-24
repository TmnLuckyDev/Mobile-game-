package com.tmnluckydev.pocketfoundry;

import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.pm.PackageInfo;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceError;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.view.HapticFeedbackConstants;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Collections;

public final class MainActivity extends ComponentActivity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START = "https://" + HOST + "/index.html";
    private static final Map<String, String> ASSETS;
    static {
        Map<String, String> assets = new HashMap<>();
        assets.put("/index.html", "text/html");
        assets.put("/style.css", "text/css");
        assets.put("/app.mjs", "application/javascript");
        assets.put("/engine.mjs", "application/javascript");
        assets.put("/content.mjs", "application/javascript");
        assets.put("/save.mjs", "application/javascript");
        assets.put("/hint-worker.mjs", "application/javascript");
        ASSETS = Collections.unmodifiableMap(assets);
    }
    private WebView web;
    private PlayStore store;
    private boolean pageReady;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        store = new PlayStore(this, this::sendBillingState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleBack(); }
        });
        createWeb();
    }

    private void createWeb() {
        pageReady = false;
        try {
            PackageInfo provider = WebView.getCurrentWebViewPackage();
            if (provider == null || Integer.parseInt(provider.versionName.split("\\.")[0]) < 90) {
                showError("Update Android System WebView or Chrome in Google Play, then try again."); return;
            }
            web = new WebView(this);
        } catch (RuntimeException error) {
            showError("The Android WebView is unavailable. Update Android System WebView and try again."); return;
        }
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
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                if (web == view) showError("The game renderer stopped. Your saved progress is still on this device.");
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && web == view) showError("The game could not load. Please try again.");
            }
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
        web.loadUrl(START);
        WebView loading = web;
        handler.postDelayed(() -> { if (web == loading && !pageReady) showError("The game could not start. Update Android System WebView if needed and try again."); }, 12000);
    }

    private void showError(String message) {
        WebView old = web;
        web = null;
        pageReady = false;
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(android.view.Gravity.CENTER);
        layout.setBackgroundColor(0xff111722);
        layout.setPadding(36, 36, 36, 36);
        TextView text = new TextView(this);
        text.setText(message);
        text.setTextColor(0xfff6eddf);
        text.setTextSize(18);
        layout.addView(text);
        Button retry = new Button(this);
        retry.setText("Try again");
        retry.setOnClickListener(v -> createWeb());
        layout.addView(retry);
        setContentView(layout);
        if (old != null) { old.removeJavascriptInterface("FoundryNative"); old.destroy(); }
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
        handler.removeCallbacksAndMessages(null);
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
        @JavascriptInterface public void restore() { runOnUiThread(() -> store.restore()); }
    }
}
