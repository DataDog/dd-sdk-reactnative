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
  s.name         = "DatadogSDKReactNativeSessionReplay"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.0", :tvos => "12.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }

  s.source_files = "ios/Sources/**/*.{h,m,mm,swift}"

  # A CocoaPods resource bundle would create a second target (`<pod>-DDSessionReplay`) whose
  # CONFIGURATION_BUILD_DIR is pinned, inline in the generated project, to the pod-scoped
  # <symroot>/<config><platform>/DatadogSDKReactNativeSessionReplay. When the pod also declares an
  # SPM dependency, Xcode picks that bundle target as the host for the package's own resource
  # bundles (Datadog_DatadogRUM.bundle, KSCrash_*.bundle, ...) and emits implicit copy tasks that
  # read them from that pod-scoped directory -- while SwiftPM writes them to the shared products
  # root one level up. The copies then fail with "no such file", and because the build dir is set
  # inline rather than through the pod's xcconfig there is no way to redirect them from a podspec.
  # Ship the two assets as plain resources instead: with no bundle target there is nothing for
  # Xcode to mis-host, and it embeds the package resources into the app target as it does for the
  # other Datadog pods. Bundle+SessionReplay.swift handles both layouts.
  s.resources = ['assets/assets.json', 'assets/assets.bin']

  s.dependency "React-Core"
  s.dependency 'DatadogSDKReactNative'

  # DatadogInternal is an internal target of dd-sdk-ios rather than an exported product, so
  # it cannot be requested here; it is expected to stay importable via the SWIFT_INCLUDE_PATHS
  # entry that React Native's `spm_dependency` helper adds to this target.
  spm_dependency(s,
    url: datadog_ios_spm_url,
    requirement: { kind: 'exactVersion', version: datadog_ios_version },
    products: ['DatadogSessionReplay']
  )

  # The native test suite in ios/Tests relies on `@testable import DatadogSessionReplay` and on the
  # Podfile injecting DD_SDK_COMPILED_FOR_TESTING into the Datadog pod targets. Neither is possible
  # with the SDK resolved by SPM, as it is no longer built as a pod target, so no test spec is
  # declared.

  header_paths = %W[
    $(inherited)
    $(PODS_ROOT)/React-RCTFabric/**
    $(PODS_ROOT)/React-FabricComponents/**
    $(PODS_CONFIGURATION_BUILD_DIR)/React-FabricComponents/React_FabricComponents.framework/Headers/**
    $(PODS_CONFIGURATION_BUILD_DIR)/React-FabricComponents/React_FabricComponents.framework/Headers/react/renderer/components/text/platform/cxx/**
    ${PODS_CONFIGURATION_BUILD_DIR}/React-Fabric/React_RCTFabric.framework/Headers/**
    ${PODS_CONFIGURATION_BUILD_DIR}/React-FabricComponents/**
    $(PODS_CONFIGURATION_BUILD_DIR)/React-timing/React_timing.framework/Headers/**
  ].join(' ')

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
    'HEADER_SEARCH_PATHS' => header_paths,
    'USER_HEADER_SEARCH_PATHS' => header_paths,
  }

  xcconfig.merge!(datadog_spm_xcconfig)

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.compiler_flags = "-DRCT_NEW_ARCH_ENABLED=1"

    xcconfig.merge!({
      "DEFINES_MODULE" => "YES",
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    })

    s.pod_target_xcconfig = xcconfig

    # install_modules_dependencies is only available on RN >= 0.71
    if respond_to?(:install_modules_dependencies, true)
      install_modules_dependencies(s)
    else
      Pod::UI.warn "Using Datadog React Native Session Replay with new architecture on RN < 0.71 is discouraged and not officially supported."
    end
  else
    s.pod_target_xcconfig = xcconfig
  end
end
