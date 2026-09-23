require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# /!\ Remember to keep this version in sync with the other Datadog podspecs:
#     - DatadogSDKReactNativeSessionReplay.podspec
#     - DatadogSDKReactNativeWebView.podspec
#     - DatadogInternalTesting.podspec
datadog_ios_version = '3.16.0'
datadog_ios_spm_url = 'https://github.com/DataDog/dd-sdk-ios.git'

# The native iOS SDK is resolved through Swift Package Manager, using React Native's
# `spm_dependency` podspec helper. This requires React Native >= 0.75 and an app that links
# pods as dynamic frameworks (`use_frameworks! :linkage => :dynamic`).
if !respond_to?(:spm_dependency, true)
  raise "Datadog: the native iOS SDK is resolved through Swift Package Manager, which requires " \
        "React Native >= 0.75 -- the first version to ship the `spm_dependency` podspec helper."
end

Pod::Spec.new do |s|
  s.name         = "DatadogSDKReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.0", :tvos => "12.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }


  s.source_files = "ios/Sources/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  # `spm_dependency` cannot be scoped per-platform the way `s.ios.dependency` can, so
  # DatadogWebViewTracking is requested for every platform here. Our Swift sources already
  # guard the import with `#if os(iOS)`, but dd-sdk-ios declares the product for all of its
  # package platforms — building this pod for tvOS through SPM is therefore untested.
  #
  # Note that DatadogInternal is deliberately absent: it is an internal target of
  # dd-sdk-ios, not an exported SPM product, so it cannot be requested here. It is expected
  # to remain importable because React Native's `spm_dependency` helper appends the SPM
  # build-products directory to this target's SWIFT_INCLUDE_PATHS.
  spm_dependency(s,
    url: datadog_ios_spm_url,
    requirement: { kind: 'exactVersion', version: datadog_ios_version },
    products: [
      'DatadogCore',
      'DatadogLogs',
      'DatadogTrace',
      'DatadogRUM',
      'DatadogCrashReporting',
      'DatadogFlags',
      'DatadogWebViewTracking'
    ]
  )

  # The native test suite in ios/Tests relies on `@testable import DatadogCore` and on the Podfile
  # injecting DD_SDK_COMPILED_FOR_TESTING into the Datadog pod targets. Neither is possible with the
  # SDK resolved by SPM, as it is no longer built as a pod target, so no test spec is declared.

  # DatadogInternal is an internal target of dd-sdk-ios rather than an exported product, so
  # SwiftPM builds it into PackageFrameworks/ instead of emitting a bare .swiftmodule alongside
  # the products. React Native's `spm_dependency` helper only appends the products directory to
  # SWIFT_INCLUDE_PATHS, which leaves the module invisible to the compiler. Our sources import it
  # for AnyEncodable, CoreRegistry, DatadogCoreProtocol and FeatureScope, so add the directory
  # holding the package frameworks explicitly.
  #
  # Note this cannot be written against BUILT_PRODUCTS_DIR: CocoaPods gives every pod target its
  # own CONFIGURATION_BUILD_DIR, so for this target BUILT_PRODUCTS_DIR is
  # <symroot>/<config><platform>/DatadogSDKReactNative, one level below where SwiftPM actually
  # writes PackageFrameworks/. Spelling it as SYMROOT/CONFIGURATION+EFFECTIVE_PLATFORM_NAME
  # matches what `spm_dependency` itself uses for SWIFT_INCLUDE_PATHS.
  datadog_spm_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "$(SYMROOT)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)/PackageFrameworks"'
  }

  xcconfig = datadog_spm_xcconfig.dup

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    xcconfig.merge!({
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1"
    })

    # install_modules_dependencies is only available on RN >= 0.71
    if respond_to?(:install_modules_dependencies, true)
      install_modules_dependencies(s)
    else
      Pod::UI.warn "Using Datadog React Native SDK with new architecture on RN < 0.71 is discouraged and not officially supported."
    end
  end

  s.pod_target_xcconfig = xcconfig
end
