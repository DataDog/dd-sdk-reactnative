require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "DatadogSDKReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "11.0" }
  s.source       = { :git => "https://github.com/DataDog/dd-sdk-reactnative.git", :tag => "#{s.version}" }

  
  s.source_files = "ios/Sources/*.{h,m,mm,swift}"
  
  s.dependency "React-Core"
  s.dependency 'DatadogSDK', '~> 1.12.0-beta3'
  s.dependency 'DatadogSDKCrashReporting', '~> 1.12.0-beta3'

  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'ios/Tests/*.swift'
  end
end
