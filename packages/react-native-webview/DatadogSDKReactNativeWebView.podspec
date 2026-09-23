require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# /!\ Remember to keep this version in sync with DatadogSDKReactNative.podspec
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
  s.name         = "DatadogSDKReactNativeWebView"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.0", :tvos => "12.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }

  
  s.source_files = "ios/Sources/*.{h,m,mm,swift}"
  
  s.dependency "React-Core"
  s.dependency 'DatadogSDKReactNative'

  # Our headers subclass RNCWebViewImpl / RNCWebViewManager. Under framework linkage those headers
  # are only reachable as <react_native_webview/...>, which requires react-native-webview to be a
  # declared dependency so that CocoaPods puts its build directory on this target's
  # FRAMEWORK_SEARCH_PATHS.
  s.dependency "react-native-webview"

  # DatadogInternal was previously declared explicitly here, but it is an internal target of
  # dd-sdk-ios rather than an exported SPM product, so it cannot be requested. It is expected
  # to stay importable via the SWIFT_INCLUDE_PATHS entry that React Native's `spm_dependency`
  # helper adds to this target.
  spm_dependency(s,
    url: datadog_ios_spm_url,
    requirement: { kind: 'exactVersion', version: datadog_ios_version },
    products: ['DatadogWebViewTracking']
  )

  # The native test suite in ios/Tests relies on `@testable import DatadogWebViewTracking` and on
  # the Podfile injecting DD_SDK_COMPILED_FOR_TESTING into the Datadog pod targets. Neither is
  # possible with the SDK resolved by SPM, as it is no longer built as a pod target, so no test
  # spec is declared.

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

  xcconfig = {
    "HEADER_SEARCH_PATHS" => "$(PODS_ROOT)/react-native-webview/**"
  }

  xcconfig.merge!(datadog_spm_xcconfig)
  
  # This guard prevents installing the dependencies when we run `pod install` in the old architecture.
  # The `install_modules_dependencies` function is only available from RN 0.71, the new architecture is not
  # supported on earlier RN versions.
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then

    xcconfig.merge!({
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1",
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    })

    install_modules_dependencies(s)
  end

  s.pod_target_xcconfig = xcconfig
end
