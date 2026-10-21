require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# /!\ Remember to keep this version in sync with the other Datadog podspecs:
#     - DatadogSDKReactNativeSessionReplay.podspec
#     - DatadogSDKReactNativeWebView.podspec
#     - DatadogInternalTesting.podspec
datadog_ios_version = '3.16.1'
datadog_ios_spm_url = 'https://github.com/DataDog/dd-sdk-ios.git'

# The native iOS SDK is resolved through Swift Package Manager, using React Native's
# `spm_dependency` podspec helper. This requires React Native >= 0.75 and an app that links
# pods as dynamic frameworks (`use_frameworks! :linkage => :dynamic`).
if !respond_to?(:spm_dependency, true)
  raise "Datadog: the native iOS SDK is resolved through Swift Package Manager, which requires " \
        "React Native >= 0.75 -- the first version to ship the `spm_dependency` podspec helper."
end

# Xcode builds some of the package's frameworks as dynamic frameworks: DatadogInternal, a target
# shared by every product, and a `<Product>_<hash>_PackageProduct` framework for any product that
# more than one pod requests (e.g. DatadogWebViewTracking). The pods link them, but CocoaPods'
# "[CP] Embed Pods Frameworks" phase only embeds pod frameworks, and `spm_dependency` does not
# embed them either, so a Release or archived app crashes at launch with dyld "Library not
# loaded". Debug builds hide it because Xcode adds an rpath to the build folder.
# This extends React Native's SPM post-install step, which every React Native Podfile already
# runs through `react_native_post_install`, so the app embeds them without any Podfile change.
unless defined?(SPM) && SPM.respond_to?(:apply_on_post_install)
  raise "Datadog: could not find React Native's Swift Package Manager integration " \
        "(SPM.apply_on_post_install), which is needed to embed the native iOS SDK frameworks."
end

unless SPM.singleton_class.method_defined?(:datadog_embeds_spm_frameworks?)
  SPM.singleton_class.prepend(Module.new do
    def datadog_embeds_spm_frameworks?
      true
    end

    def apply_on_post_install(installer)
      super
      embed = <<~'SH'
        # Embeds the Datadog Swift package frameworks that Xcode builds dynamically. Looks where Xcode
        # writes them: the products dir, PackageFrameworks, or UninstalledProducts when archiving.
        embed_datadog_spm_frameworks()
        {
          local dir framework found
          for dir in "${PODS_CONFIGURATION_BUILD_DIR}" "${PODS_CONFIGURATION_BUILD_DIR}/PackageFrameworks" "${OBJROOT}/UninstalledProducts/${PLATFORM_NAME}"; do
            found=false
            for framework in "${dir}"/$1.framework; do
              [ -d "${framework}" ] || continue
              found=true
              if file -b "${framework}/$(basename "${framework}" .framework)" | grep -q "dynamically linked"; then
                install_framework "${framework}"
              fi
            done
            [ "${found}" = true ] && return 0
          done
          # Nothing to embed (e.g. every Datadog product is linked statically) is fine; returning the
          # last test's status instead would abort the script, which runs with `set -e`.
          return 0
        }
        embed_datadog_spm_frameworks "DatadogInternal"
        embed_datadog_spm_frameworks "Datadog*_PackageProduct"
      SH
      anchor = /^if \[ "\$\{COCOAPODS_PARALLEL_CODE_SIGN\}" == "true" \]; then$/
      installer.aggregate_targets.each do |target|
        next unless target.pod_targets.any? { |pod| pod.name == 'DatadogSDKReactNative' }
        script_path = target.embed_frameworks_script_path
        next unless File.exist?(script_path)
        script = File.read(script_path)
        next if script.include?('embed_datadog_spm_frameworks()')
        unless script.match?(anchor)
          raise "Datadog: could not add the native iOS SDK frameworks to #{script_path}, " \
                "so the app would crash at launch in Release builds."
        end
        File.write(script_path, script.sub(anchor) { "#{embed}#{$&}" })
      end
    end
  end)
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
  # dd-sdk-ios, not an exported SPM product, so it cannot be requested here. Making it
  # importable takes an extra search path -- see the FRAMEWORK_SEARCH_PATHS note below.
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

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'ios/Tests/**/*.{swift,json}'
    test_spec.resources = 'ios/Tests/Fixtures'
    test_spec.platforms = { :ios => "13.4", :tvos => "13.4" }
  end

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

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    xcconfig.merge!({
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1"
    })

    # Assign before install_modules_dependencies: the helper reads the spec's current
    # pod_target_xcconfig, merges React Native's own header search paths and C++ settings into it
    # and assigns the result back, so assigning afterwards would drop everything it added.
    s.pod_target_xcconfig = xcconfig

    # install_modules_dependencies is only available on RN >= 0.71
    if respond_to?(:install_modules_dependencies, true)
      install_modules_dependencies(s)
    else
      Pod::UI.warn "Using Datadog React Native SDK with new architecture on RN < 0.71 is discouraged and not officially supported."
    end
  else
    s.pod_target_xcconfig = xcconfig
  end
end
