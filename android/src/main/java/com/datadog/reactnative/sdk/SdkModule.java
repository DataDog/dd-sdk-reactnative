
package com.datadog.reactnative.sdk;

import android.os.Handler;
import android.os.Looper;

import com.datadog.android.Datadog;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class SdkModule extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());


    public SdkModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "RNSdkModule";
    }

    @ReactMethod
    public void initWithEndpoint(final String clientToken,
                                 final String endpointUrl,
                                 final Promise promise) {
        internalInit(clientToken, endpointUrl);
        promise.resolve(null);
    }

    // FOR SOME REASON REACT CANNOT SUPPORT JAVA OVERLOADED METHODS. WTFFF !!!!
    @ReactMethod
    public void init(final String clientToken, final Promise promise) {
        internalInit(clientToken, null);
        promise.resolve(null);
    }


    private void internalInit(final String clientToken,
                              final String endpointUrl) {
        mainHandler.post(new Runnable() {
            @Override
            public void run() {
                if (endpointUrl != null) {
                    Datadog.initialize(reactContext.getApplicationContext(),
                            clientToken,
                            endpointUrl);
                } else {
                    Datadog.initialize(reactContext.getApplicationContext(),
                            clientToken);
                }
            }
        });
    }

    @Override
    public boolean canOverrideExistingModule() {
        return true;
    }
}