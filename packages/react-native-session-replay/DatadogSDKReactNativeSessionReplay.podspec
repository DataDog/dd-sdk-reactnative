require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

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

  s.resource_bundles = {
    'DDSessionReplay' => ['assets/assets.json', 'assets/assets.bin']
  }

  s.dependency "React-Core"

  # /!\ Remember to keep the version in sync with DatadogSDKReactNative.podspec
  s.dependency 'DatadogSessionReplay', '3.8.2'
  s.dependency 'DatadogSDKReactNative'

  s.test_spec 'Tests' do |test_spec|
    test_spec.dependency "React-RCTText"
    test_spec.source_files = 'ios/Tests/*.swift'
    test_spec.platforms = { :ios => "13.4", :tvos => "13.4" }
  end

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

  xcconfig = {
    'HEADER_SEARCH_PATHS' => header_paths,
    'USER_HEADER_SEARCH_PATHS' => header_paths,
  }

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
