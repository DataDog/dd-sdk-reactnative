/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
 
package com.datadog.tools.unit.forge

import android.content.pm.PackageInfo
import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.ForgeryFactory
import java.util.UUID

class PackageInfoForgeryFactory : ForgeryFactory<PackageInfo> {
    override fun getForgery(forge: Forge): PackageInfo {
        val packageInfo = PackageInfo();
        packageInfo.versionName = forge.aStringMatching("[0-9]\\.[0-9]\\.[0-9]")
        return packageInfo
    }
}
