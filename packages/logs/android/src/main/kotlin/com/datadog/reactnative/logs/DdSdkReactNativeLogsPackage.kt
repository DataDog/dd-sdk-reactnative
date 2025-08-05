/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.logs

import com.datadog.reactnative.DatadogSDKWrapper
import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * Package of native dd-sdk-reactnative native modules.
 */
class DdSdkReactNativeLogsPackage : TurboReactPackage() {
    private val sdkWrapper = DatadogSDKWrapper()
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            DdLogsImplementation.NAME -> DdLogs(reactContext, sdkWrapper)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            val moduleInfos = listOf(
                DdLogsImplementation.NAME,
            ).associateWith {
                ReactModuleInfo(
                    it,
                    it,
                    false,  // canOverrideExistingModule
                    false,  // needsEagerInit
                    true,  // hasConstants
                    false,  // isCxxModule
                    isTurboModule // isTurboModule
                )
            }

            moduleInfos
        }
    }
}
