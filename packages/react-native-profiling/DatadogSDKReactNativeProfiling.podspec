require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "DatadogSDKReactNativeProfiling"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "12.0", :tvos => "12.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }

  s.source_files = "ios/Sources/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  # /!\ Remember to keep the version in sync with DatadogSDKReactNative.podspec
  s.dependency 'DatadogProfiling', '3.14.0'
  s.dependency 'DatadogSDKReactNative'

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'ios/Tests/*.swift'
    test_spec.platforms = { :ios => "13.4", :tvos => "13.4" }
  end

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.compiler_flags = "-DRCT_NEW_ARCH_ENABLED=1"

    s.pod_target_xcconfig = {
      "DEFINES_MODULE" => "YES",
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    }

    if respond_to?(:install_modules_dependencies, true)
      install_modules_dependencies(s)
    else
      Pod::UI.warn "Using Datadog React Native Profiling with new architecture on RN < 0.71 is discouraged and not officially supported."
    end
  end
end
