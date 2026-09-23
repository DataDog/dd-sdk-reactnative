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
  s.name         = "DatadogInternalTesting"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.0", :tvos => "12.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }


  s.source_files = "ios/Sources/*.{h,m,mm,swift}"

  s.dependency "React-Core"
  s.dependency "DatadogSDKReactNative"

  # DatadogCore and DatadogInternal do not reach this pod through DatadogSDKReactNative:
  # React Native's `spm_dependency` helper adds the SPM build-products directory to
  # SWIFT_INCLUDE_PATHS per pod target, so this target only gets it by declaring its own SPM
  # dependency. Our sources import both DatadogCore and DatadogInternal.
  spm_dependency(s,
    url: datadog_ios_spm_url,
    requirement: { kind: 'exactVersion', version: datadog_ios_version },
    products: ['DatadogCore']
  )

  # The test spec in ios/Tests does not `@testable import` anything from dd-sdk-ios, but it does
  # plainly import DatadogCore and DatadogInternal. Test spec targets are separate from the main
  # pod target and so do not receive the SWIFT_INCLUDE_PATHS entry above, which leaves those
  # modules unresolvable, so no test spec is declared.

  # This guard prevents installing the dependencies when we run `pod install` in the old architecture.
  # The `install_modules_dependencies` function is only available from RN 0.71, the new architecture is not
  # supported on earlier RN versions.
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

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    xcconfig.merge!({
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1"
    })

    install_modules_dependencies(s)
  end

  s.pod_target_xcconfig = xcconfig
end
