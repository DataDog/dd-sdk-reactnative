require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "DatadogSDKReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "11.0", :tvos => "11.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }

  
  s.source_files = "ios/Sources/*.{h,m,mm,swift}"
  
  s.dependency "React-Core"
  s.dependency 'DatadogCore', '~> 2.4.0'
  s.dependency 'DatadogLogs', '~> 2.4.0'
  s.dependency 'DatadogTrace', '~> 2.4.0'
  s.dependency 'DatadogRUM', '~> 2.4.0'
  s.dependency 'DatadogCrashReporting', '~> 2.4.0'
  s.dependency 'DatadogWebViewTracking', '~> 2.4.0'
  s.dependency 'DatadogSessionReplay', '~> 2.4.0'
  
  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'ios/Tests/*.swift'
  end

  
  # This guard prevents installing the dependencies when we run `pod install` in the old architecture.
  # The `install_modules_dependencies` function is only available from RN 0.71, the new architecture is not
  # supported on earlier RN versions.
  if ENV['RCT_NEW_ARCH_ENABLED'] == '1' then
    s.pod_target_xcconfig = {
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1"
    }

    install_modules_dependencies(s)
  end
end
