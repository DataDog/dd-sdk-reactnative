require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

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

  # /!\ Remember to keep the versions in sync with DatadogSDKReactNativeSessionReplay.podspec
  s.dependency 'DatadogCore', '2.30.2'
  s.dependency 'DatadogLogs', '2.30.2'
  s.dependency 'DatadogTrace', '2.30.2'
  s.dependency 'DatadogRUM', '2.30.2'
  s.dependency 'DatadogCrashReporting', '2.30.2'

  # DatadogWebViewTracking is not available for tvOS
  s.ios.dependency 'DatadogWebViewTracking', '2.30.2'
  
  s.test_spec 'Tests' do |test_spec|
    test_spec.source_files = 'ios/Tests/**/*.{swift,json}'
    test_spec.resources = 'ios/Tests/Fixtures'
    test_spec.platforms = { :ios => "13.4", :tvos => "13.4" }
  end

  if ENV['RCT_NEW_ARCH_ENABLED'] == '1'
    s.pod_target_xcconfig = {
      "DEFINES_MODULE" => "YES",
      "OTHER_CPLUSPLUSFLAGS" => "-DRCT_NEW_ARCH_ENABLED=1"
    }

    # install_modules_dependencies is only available on RN >= 0.71
    if respond_to?(:install_modules_dependencies, true)
      install_modules_dependencies(s)
    else
      Pod::UI.warn "Using Datadog React Native SDK with new architecture on RN < 0.71 is discouraged and not officially supported."
    end
  end

  # Run check-metro-config.js script after installing the pod
  s.post_install do |installer|
    # Get the path to the script
    metro_config_script = File.join(__dir__, "scripts", "check-metro-config.js")
    # Fail safe if node is not available
    unless system("which node > /dev/null 2>&1")
      Pod::UI.warn "Node.js is not installed or not available in PATH. Skipping metro.config.js check for Datadog SDK."
      next
    end
    # Run the script
    system("node #{metro_config_script}")
  end

end
