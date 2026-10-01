/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

package com.flagsbenchmark

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class FlagsBenchmarkPackage : BaseReactPackage() {
    override fun getModule(name: String, context: ReactApplicationContext): NativeModule? =
        if (name == FlagsBenchmarkModule.NAME) FlagsBenchmarkModule(context) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(FlagsBenchmarkModule.NAME to ReactModuleInfo(
            FlagsBenchmarkModule.NAME, FlagsBenchmarkModule::class.java.name,
            false, false, false, true
        ))
    }
}
