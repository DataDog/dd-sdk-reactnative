#import "AppDelegate.h"
#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

static BOOL DDFfeBenchmarkEnvEnabled(NSString *value)
{
  if (value == nil) {
    return NO;
  }
  NSString *normalized = [value lowercaseString];
  return [normalized isEqualToString:@"1"] ||
         [normalized isEqualToString:@"true"] ||
         [normalized isEqualToString:@"yes"];
}

static void DDApplyFfeBenchmarkEnvironment(void)
{
  NSDictionary<NSString *, NSString *> *environment = [NSProcessInfo processInfo].environment;
  NSString *autorun = environment[@"FFE_BENCHMARK_AUTORUN"];
  NSString *deviceKind = environment[@"FFE_BENCHMARK_DEVICE_KIND"];
  NSString *reportUrl = environment[@"FFE_BENCHMARK_REPORT_URL"];

  if (autorun == nil && deviceKind == nil && reportUrl == nil) {
    return;
  }

  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  [defaults setBool:DDFfeBenchmarkEnvEnabled(autorun) forKey:@"FfeBenchmarkAutorun"];
  if (deviceKind.length > 0) {
    [defaults setObject:deviceKind forKey:@"FfeBenchmarkDeviceKind"];
  }
  if (reportUrl.length > 0) {
    [defaults setObject:reportUrl forKey:@"FfeBenchmarkReportUrl"];
  }
  [defaults synchronize];
}

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  DDApplyFfeBenchmarkEnvironment();

  self.moduleName = @"ddSdkReactnativeExample";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  [ReactNativeNavigation bootstrapWithBridge:bridge];
  return YES;
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge {
  return [ReactNativeNavigation extraModulesForBridge:bridge];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}
 
- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
