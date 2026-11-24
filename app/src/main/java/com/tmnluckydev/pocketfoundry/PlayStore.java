package com.tmnluckydev.pocketfoundry;

import android.app.Activity;
import android.content.SharedPreferences;
import android.util.Base64;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Collections;
import java.util.List;
import java.util.function.Consumer;

/** Non-consumable cosmetic entitlement. No account, analytics or payment data is collected. */
final class PlayStore {
    static final String PRODUCT = "foundry_plus";
    private final Activity activity;
    private final Consumer<String> listener;
    private final SharedPreferences cache;
    private final PublicKey publicKey;
    private BillingClient client;
    private ProductDetails details;
    private ProductDetails.OneTimePurchaseOfferDetails offer;
    private boolean owned, connecting, closed, inFlow;
    private String status = "";

    PlayStore(Activity activity, Consumer<String> listener) {
        this.activity = activity;
        this.listener = listener;
        cache = activity.getSharedPreferences("verified-purchases", Activity.MODE_PRIVATE);
        publicKey = readKey();
        try {
            Purchase cached = new Purchase(cache.getString("data", "{}"), cache.getString("signature", ""));
            owned = valid(cached);
        } catch (Exception ignored) { owned = false; }
        if (publicKey == null) { status = "Purchases are not enabled in this build."; return; }
        client = BillingClient.newBuilder(activity)
            .setListener((result, purchases) -> onMain(() -> purchasesUpdated(result, purchases)))
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void onMain(Runnable action) { activity.runOnUiThread(() -> { if (!closed) action.run(); }); }
    private static PublicKey readKey() {
        try {
            if (BuildConfig.PLAY_BILLING_PUBLIC_KEY.isEmpty()) return null;
            return KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(Base64.decode(BuildConfig.PLAY_BILLING_PUBLIC_KEY, Base64.DEFAULT)));
        } catch (Exception ignored) { return null; }
    }
    private boolean valid(Purchase purchase) {
        if (publicKey == null || purchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED || !purchase.getProducts().contains(PRODUCT)) return false;
        try {
            Signature verifier = Signature.getInstance("SHA1withRSA");
            verifier.initVerify(publicKey);
            verifier.update(purchase.getOriginalJson().getBytes(StandardCharsets.UTF_8));
            return verifier.verify(Base64.decode(purchase.getSignature(), Base64.DEFAULT));
        } catch (Exception ignored) { return false; }
    }
    void refresh() {
        if (client == null || closed || connecting) { publish(); return; }
        if (client.isReady()) { query(); return; }
        connecting = true;
        status = "Connecting to Google Play…";
        publish();
        client.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                onMain(() -> {
                    connecting = false;
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) query();
                    else { status = "Google Play purchases are unavailable."; publish(); }
                });
            }
            @Override public void onBillingServiceDisconnected() {
                onMain(() -> { connecting = false; details = null; offer = null; status = "Google Play is temporarily disconnected."; publish(); });
            }
        });
    }
    private void query() {
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder().setProductList(Collections.singletonList(
            QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT).setProductType(BillingClient.ProductType.INAPP).build())).build();
        client.queryProductDetailsAsync(params, (result, products) -> onMain(() -> {
            details = null;
            offer = null;
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                for (ProductDetails p : products.getProductDetailsList()) if (PRODUCT.equals(p.getProductId())) {
                    List<ProductDetails.OneTimePurchaseOfferDetails> offers = p.getOneTimePurchaseOfferDetailsList();
                    if (offers != null && !offers.isEmpty()) { details = p; offer = offers.get(0); }
                }
            }
            status = offer == null ? "This product is not currently available." : "";
            publish();
        }));
        client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (result, purchases) -> onMain(() -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { publish(); return; }
            boolean found = false;
            for (Purchase p : purchases) if (valid(p)) { found = true; grant(p); }
            if (!found) { owned = false; cache.edit().clear().apply(); }
            publish();
        }));
    }
    void buy() {
        if (owned || inFlow || client == null || details == null || offer == null || !client.isReady()) { refresh(); return; }
        BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details).setOfferToken(offer.getOfferToken()).build();
        inFlow = true;
        BillingResult result = client.launchBillingFlow(activity, BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(item)).build());
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { inFlow = false; status = "Purchase could not be started. Try again."; publish(); }
    }
    private void purchasesUpdated(BillingResult result, List<Purchase> purchases) {
        inFlow = false;
        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (valid(purchase)) { grant(purchase); status = "Foundry Plus unlocked."; }
                else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) status = "Purchase pending. Your themes unlock after payment completes.";
                else status = "Purchase could not be verified. Use Restore purchases.";
            }
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) { refresh(); }
        else if (code == BillingClient.BillingResponseCode.USER_CANCELED) status = "Purchase canceled.";
        else status = "Purchase not completed. Please try again.";
        publish();
    }
    private void grant(Purchase purchase) {
        owned = true;
        cache.edit().putString("data", purchase.getOriginalJson()).putString("signature", purchase.getSignature()).apply();
        if (!purchase.isAcknowledged()) {
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(), result -> onMain(() -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { status = "Purchase confirmation pending. Restore purchases when online."; publish(); }
            }));
        }
    }
    void publish() {
        try {
            JSONObject state = new JSONObject();
            state.put("available", details != null && offer != null && !inFlow);
            state.put("owned", owned);
            state.put("price", offer == null ? "" : offer.getFormattedPrice());
            state.put("message", status);
            listener.accept(state.toString());
        } catch (Exception ignored) { }
    }
    void close() { closed = true; if (client != null) client.endConnection(); }
}
