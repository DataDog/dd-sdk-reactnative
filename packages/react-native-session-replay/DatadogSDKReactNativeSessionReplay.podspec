require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32'

Pod::Spec.new do |s|
  s.name         = "DatadogSDKReactNativeSessionReplay"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.4.0", :tvos => "12.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }


  s.swift_version = '5.0'
  s.dependency "React-Core"


  s.test_spec 'Tests' do |test_spec|
    test_spec.dependency "React-RCTText"
    test_spec.source_files = 'ios/Tests/*.swift'
    test_spec.platforms = { :ios => "13.4", :tvos => "13.4" }
  end

  s.source_files = [
    "ios/Sources/**/*.{h,m,mm,swift}",
    "cpp/**/*.{cpp,mm}"
  ]

  s.private_header_files = [
    "ios/build/generated/**/*.h",
    "cpp/**/*.h"
  ]

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
    
    s.pod_target_xcconfig = {
      "DEFINES_MODULE" => "YES",
      "CLANG_CXX_LANGUAGE_STANDARD" => "c++17"
    }
  end

  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  # else
  #   s.dependency "React-Core"
  end

  s.dependency 'DatadogSessionReplay', '~> 2.24.0'
  s.dependency 'DatadogSDKReactNative'
end
