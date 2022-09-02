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
