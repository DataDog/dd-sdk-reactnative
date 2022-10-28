/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Package of native dd-sdk-reactnative native modules.
 */
class DdSdkReactNativePackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == DdSdk.NAME) {
            DdSdk(reactContext)
        } else if (name == DdRum.NAME) {
            DdRum(reactContext)
        } else if (name == DdTrace.NAME) {
            DdTrace(reactContext)
        } else if (name == DdLogs.NAME) {
            DdLogs(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val moduleInfos: MutableMap<String, ReactModuleInfo> =
                HashMap()
            val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            moduleInfos[DdSdk.NAME] = ReactModuleInfo(
                DdSdk.NAME,
                DdSdk.NAME,
                false,  // canOverrideExistingModule
                false,  // needsEagerInit
                true,  // hasConstants
                false,  // isCxxModule
                isTurboModule // isTurboModule
            )
            moduleInfos[DdRum.NAME] = ReactModuleInfo(
                DdRum.NAME,
                DdRum.NAME,
                false,  // canOverrideExistingModule
                false,  // needsEagerInit
                true,  // hasConstants
                false,  // isCxxModule
                isTurboModule // isTurboModule
            )
            moduleInfos[DdTrace.NAME] = ReactModuleInfo(
                DdTrace.NAME,
                DdTrace.NAME,
                false,  // canOverrideExistingModule
                false,  // needsEagerInit
                true,  // hasConstants
                false,  // isCxxModule
                isTurboModule // isTurboModule
            )
            moduleInfos[DdLogs.NAME] = ReactModuleInfo(
                DdLogs.NAME,
                DdLogs.NAME,
                false,  // canOverrideExistingModule
                false,  // needsEagerInit
                true,  // hasConstants
                false,  // isCxxModule
                isTurboModule // isTurboModule
            )

            moduleInfos
        }
    }
}