require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# /!\ Remember to keep this version in sync with DatadogSDKReactNative.podspec
datadog_ios_version = '3.16.1'
datadog_ios_spm_url = 'https://github.com/DataDog/dd-sdk-ios.git'

# The native iOS SDK is resolved through Swift Package Manager, using React Native's
# `spm_dependency` podspec helper. This requires React Native >= 0.75. Pods can be linked statically
# or as frameworks (see DatadogSDKReactNative.podspec for how static linkage is handled).
if !respond_to?(:spm_dependency, true)
  raise "Datadog: the native iOS SDK is resolved through Swift Package Manager, which requires " \
        "React Native >= 0.75 -- the first version to ship the `spm_dependency` podspec helper."
end

# Only with dynamic frameworks does Xcode build DatadogInternal as a framework of its own. When pods
# are linked statically its code is in DatadogSDKReactNative's archive instead, which requests
# every Datadog product then (see DatadogSDKReactNative.podspec). React Native's
# `use_react_native!` records how the app's target links pods in USE_FRAMEWORKS.
uses_dynamic_frameworks = ENV['USE_FRAMEWORKS'] == 'dynamic'

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

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'ios/Tests/*.swift'

    # DatadogCore resolves the same way it does for DatadogSDKReactNative's own test spec: as a
    # declared SPM product, its .framework sits at the top-level SYMROOT/CONFIGURATION directory,
    # which Xcode searches implicitly for any target with no CONFIGURATION_BUILD_DIR override of
    # its own -- true here since test specs don't get the per-pod-target override main pod targets
    # do. DatadogInternal needs the explicit help below because it is not a product: it lives one
    # level down, in PackageFrameworks/.
    if uses_dynamic_frameworks
      test_spec.pod_target_xcconfig = {
        'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "$(SYMROOT)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)/PackageFrameworks"',
        'OTHER_LDFLAGS' => '$(inherited) -framework DatadogInternal'
      }
    end
  end

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
  #
  # Archive builds lay this out differently: PackageFrameworks/ stays empty and the package
  # frameworks are linked straight into the products directory itself, so search that too.
  datadog_spm_xcconfig = {
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "$(SYMROOT)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)/PackageFrameworks" "$(SYMROOT)/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)"'
  }

  xcconfig = datadog_spm_xcconfig.dup

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    xcconfig.merge!({
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1"
    })

    # Assign before install_modules_dependencies: the helper reads the spec's current
    # pod_target_xcconfig, merges React Native's own header search paths and C++ settings into it
    # and assigns the result back, so assigning afterwards would drop everything it added.
    s.pod_target_xcconfig = xcconfig

    install_modules_dependencies(s)
  else
    s.pod_target_xcconfig = xcconfig
  end
end
