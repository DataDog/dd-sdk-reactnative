/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.reactnative.sessionreplay

import com.datadog.reactnative.sessionreplay.views.DdPrivacyViewManager
import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

/**
 * Package of native dd-sdk-reactnative native modules.
 */
class DdSDKReactNativeSessionReplayPackage : BaseReactPackage() {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(DdPrivacyViewManager(reactContext))
    }

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            DdSessionReplayImplementation.NAME -> DdSessionReplay(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            val isTurboModule: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            val moduleInfos = listOf(
                DdSessionReplayImplementation.NAME
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
