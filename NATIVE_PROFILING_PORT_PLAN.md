# Port plan — expose the native profilers (iOS + Android) to React Native

**Goal:** ship `@datadog/mobile-react-native-profiling`, a new RN package that lets a customer
enable the Datadog **native** profilers (dd-sdk-android-profiling / DatadogProfiling on iOS) with
`DdProfiling.enable({ ... })`.

**Source of truth:** branch `sbarrio/set-profiling-benchmark-scenario`
(merge-base with `develop`: `c9c90f33c7e0fc674dbff0872fa019b01e876c1a`).
That branch is a *benchmark* branch — the profiling package was built there as a means to an end,
so it is complete as code but has **zero monorepo registration** and is entangled with unrelated
work. This document separates the three.

> This file is intentionally untracked. It survives the branch switch (git does not touch
> untracked files) and should not be committed to the PR branch.

---

## 0. TL;DR of the work

| # | Step | Effort |
|---|---|---|
| 1 | Copy the 31 files of `packages/react-native-profiling/` verbatim from the source branch | mechanical |
| 2 | Fix the API-35 constant reference (**verified broken**, blocks customers on compileSdk < 35, see §4.1) | 1 line |
| 3 | Register the package in the 5 monorepo integration points that were never touched (§5) | ~15 lines |
| 4 | Add the package to `example/` + `example-new-architecture/` and add a demo screen | small |
| 5 | Docs + CHANGELOG | small |
| 6 | *(follow-up PR)* Operations API profiling options (§7) | design needed |

Explicitly **out of scope** — see §6 for what must NOT be carried over.

---

## 1. What the package does

One public call:

```ts
import { DdProfiling } from '@datadog/mobile-react-native-profiling';

await DdProfiling.enable({
    applicationLaunchSampleRate: 100, // 0-100, default 5
    continuousSampleRate: 100,        // 0-100, default 5
    customEndpoint: 'https://…',      // optional
});
```

It is a **separate package**, not part of `core`, matching the precedent set by
`react-native-session-replay`: the native profiling artifact is an extra dependency
(`dd-sdk-android-profiling`, `DatadogProfiling`) that customers who don't profile should not pay
for. It depends on `core` (Android: `project(':datadog_mobile-react-native')`;
iOS: `s.dependency 'DatadogSDKReactNative'`) because it reads the already-initialised core SDK
instance rather than initialising anything itself.

Ordering contract: `DdProfiling.enable()` must be called **after** `DdSdkReactNative.initialize()`,
because the Android path does `Datadog.getInstance() as FeatureSdkCore` and the iOS path uses
`CoreRegistry.default`. Neither validates that the core is up — worth either documenting loudly or
adding a guard (see §4.3).

---

## 2. Layer-by-layer: how it was built

Five layers, bottom-up. This is the shape to replicate.

### 2.1 JS public API — `src/Profiling.ts`

```ts
export interface ProfilingConfiguration {
    applicationLaunchSampleRate?: number;
    continuousSampleRate?: number;
    customEndpoint?: string;
}

const DEFAULTS: InternalProfilingConfiguration = {
    applicationLaunchSampleRate: 5,
    continuousSampleRate: 5,
    customEndpoint: ''
};

export class ProfilingWrapper {
    private nativeProfiling: NativeProfilingType =
        require('./specs/NativeDdProfiling').default;

    private buildConfiguration = (c?: ProfilingConfiguration) => { /* merge over DEFAULTS */ };

    enable = (configuration?: ProfilingConfiguration): Promise<void> => {
        const { applicationLaunchSampleRate, continuousSampleRate, customEndpoint } =
            this.buildConfiguration(configuration);
        return this.nativeProfiling.enable(
            applicationLaunchSampleRate, continuousSampleRate, customEndpoint);
    };
}

export const DdProfiling = new ProfilingWrapper();
```

Two deliberate choices, both to satisfy the codegen type system:

- **Optional fields are defaulted in JS, not native.** The TurboModule spec cannot express
  optional numbers cleanly, so the bridge signature is three *required* positional args and
  `undefined` never crosses it.
- **`customEndpoint` absence is encoded as `''`**, not `null` — the native side branches on
  `customEndpoint != ""`. Slightly ugly but it keeps the spec free of nullable strings.

`src/index.ts` exports the `DdProfiling` value and the `ProfilingConfiguration` type.
`src/nativeModulesTypes.ts` declares `NativeProfilingType extends NativeDdProfiling`.

### 2.2 TurboModule spec — `src/specs/NativeDdProfiling.ts`

```ts
export interface Spec extends TurboModule {
    readonly getConstants: () => {};
    enable(
        applicationLaunchSampleRate: number,
        continuousSampleRate: number,
        customEndpoint: string
    ): Promise<void>;
}
export default TurboModuleRegistry.get<Spec>('DdProfiling');
```

`get` (not `getEnforcing`) so the old architecture falls back to `NativeModules`.
Registered via `package.json`:

```json
"codegenConfig": {
    "name": "DdSDKReactNativeProfiling",
    "type": "modules",
    "jsSrcsDir": "./src/specs",
    "android": { "javaPackageName": "com.datadog.reactnative.profiling" }
}
```

This generates `NativeDdProfilingSpec` (Kotlin abstract class) and the
`NativeDdProfilingSpec` protocol + `NativeDdProfilingSpecJSI` on iOS.

### 2.3 Android native

Source-set fan-out in `android/build.gradle` — two independent axes, four dirs:

| axis | condition | dirs |
|---|---|---|
| architecture | `newArchEnabled` | `src/newarch` / `src/oldarch` |
| RN version | RN minor ≥ 74 | `src/rnpost74` / `src/rnpre74` |

- `src/newarch/…/DdProfiling.kt` — `class DdProfiling(…) : NativeDdProfilingSpec(reactContext)`,
  `override fun enable(…)`.
- `src/oldarch/…/DdProfiling.kt` — `: ReactContextBaseJavaModule`, `@ReactMethod fun enable(…)`.
- `src/rnpost74/…/DdSDKReactNativeProfilingPackage.kt` — `BaseReactPackage`, implements
  `getModule` + `getReactModuleInfoProvider`, gated on `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED`.
- `src/rnpre74/…/DdSDKReactNativeProfilingPackage.kt` — plain `ReactPackage`,
  `createNativeModules`.

Both thin wrappers delegate to the single shared
`src/main/…/DdProfilingImplementation.kt`, which is where the real logic and the API gate live:

```kotlin
class DdProfilingImplementation(
    private val sdkVersionProvider: () -> Int = { Build.VERSION.SDK_INT },
    private val profilingProvider: () -> ProfilingWrapper = { ProfilingSDKWrapper() }
) {
    fun enable(
        applicationLaunchSampleRate: Double,
        continuousSampleRate: Double,
        customEndpoint: String,
        promise: Promise
    ) {
        if (sdkVersionProvider() < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            promise.resolve(null); return   // no-op below API 35
        }
        val configurationBuilder = ProfilingConfiguration.Builder()
            .setApplicationLaunchSampleRate(applicationLaunchSampleRate.toFloat())
            .setContinuousSampleRate(continuousSampleRate.toFloat())
        if (customEndpoint != "") { configurationBuilder.useCustomEndpoint(customEndpoint) }
        profilingProvider().enable(configurationBuilder.build(),
            Datadog.getInstance() as FeatureSdkCore)
        promise.resolve(null)
    }
    internal companion object { internal const val NAME = "DdProfiling" }
}
```

Note the **API 35 floor** (`VANILLA_ICE_CREAM` / Android 15): the Android native profiler needs
platform support that only exists there, so below it `enable` silently resolves. Both constructor
params exist purely as test seams. `ProfilingWrapper.kt` / `ProfilingSDKWrapper.kt` are that seam:

```kotlin
@OptIn(ExperimentalProfilingApi::class)
Profiling.enable(configuration, sdkCore)
```

`android/build.gradle` dependencies:

```gradle
implementation "com.datadoghq:dd-sdk-android-profiling:3.13.1"
implementation "com.datadoghq:dd-sdk-android-internal:3.13.1"
implementation project(path: ':datadog_mobile-react-native')
```

`android/settings.gradle` maps `':datadog_mobile-react-native'` → `../../core/android`.
`android/src/main/AndroidManifest.xml` declares `package="com.datadog.reactnative.profiling"` plus
INTERNET / ACCESS_NETWORK_STATE.

### 2.4 iOS native

- `ios/Sources/DdProfiling.h` / `.mm` — ObjC++ bridge. `RCT_REMAP_METHOD(enable, …)` for the old
  arch, `#ifdef RCT_NEW_ARCH_ENABLED` → `NativeDdProfilingSpecJSI` for the new one.
  `requiresMainQueueSetup` returns `NO`.
- `ios/Sources/DdProfilingImplementation.swift` — the logic:

```swift
let profilingConfiguration = Profiling.Configuration(
    customEndpoint: customEndpointURL,
    applicationLaunchSampleRate: Float(applicationLaunchSampleRate),
    continuousSampleRate: Float(continuousSampleRate)
)
profiling.enable(with: profilingConfiguration, in: CoreRegistry.default)
resolve(nil)
```

  with `internal protocol ProfilingProtocol` + `internal class NativeProfiling` as the mock seam,
  mirroring Android's `ProfilingWrapper`.

**There is no iOS version gate** — `s.platforms = { :ios => "12.0", :tvos => "12.0" }` and the
native profiler is available across that range. So the two platforms are *asymmetric*: Android
no-ops below API 35, iOS never does. That asymmetry must be in the public docs (§4.2).

`DatadogSDKReactNativeProfiling.podspec`:

```ruby
s.dependency "React-Core"
# /!\ Remember to keep the version in sync with DatadogSDKReactNative.podspec
s.dependency 'DatadogProfiling', '3.16.0'
s.dependency 'DatadogSDKReactNative'
s.test_spec 'Tests' { … }
```

Both native pins (Android `3.13.1`, iOS `3.16.0`) were checked against `develop` and **already
match** what the other packages use — no version bump is bundled into this port.

### 2.5 Tests (all three layers already have them — port as-is)

- `src/__tests__/Profiling.test.ts` — 3 cases: defaults → `(5, 5, '')`; all provided →
  `(100, 100, url)`; edge → `(0, 0, '')`. Backed by `__mocks__/react-native.ts`, which mocks
  `NativeModules.DdProfiling.enable`.
- `android/src/test/…/DdProfilingImplementationTest.kt` — 3 Elmyr/Mockito tests, including
  `M no-op W enable called on unsupported API level`.
- `ios/Tests/DdProfilingTests.swift` — 3 XCTest cases with `MockProfiling` / `MockDatadogCore`.

---

## 3. File inventory to copy (31 tracked files)

```
DatadogSDKReactNativeProfiling.podspec
__mocks__/react-native.ts
babel.config.js
package.json
tsconfig.json
src/Profiling.ts
src/index.ts
src/nativeModulesTypes.ts
src/specs/NativeDdProfiling.ts
src/__tests__/Profiling.test.ts
android/build.gradle
android/detekt.yml
android/gradle.properties
android/settings.gradle
android/gradlew
android/gradlew.bat
android/gradle/wrapper/gradle-wrapper.jar
android/gradle/wrapper/gradle-wrapper.properties
android/src/main/AndroidManifest.xml
android/src/main/kotlin/com/datadog/reactnative/profiling/DdProfilingImplementation.kt
android/src/main/kotlin/com/datadog/reactnative/profiling/ProfilingWrapper.kt
android/src/main/kotlin/com/datadog/reactnative/profiling/ProfilingSDKWrapper.kt
android/src/newarch/kotlin/com/datadog/reactnative/profiling/DdProfiling.kt
android/src/oldarch/kotlin/com/datadog/reactnative/profiling/DdProfiling.kt
android/src/rnpost74/kotlin/com/datadog/reactnative/profiling/DdSDKReactNativeProfilingPackage.kt
android/src/rnpre74/kotlin/com/datadog/reactnative/profiling/DdSDKReactNativeProfilingPackage.kt
android/src/test/kotlin/com/datadog/reactnative/profiling/DdProfilingImplementationTest.kt
ios/Sources/DdProfiling.h
ios/Sources/DdProfiling.mm
ios/Sources/DdProfilingImplementation.swift
ios/Tests/DdProfilingTests.swift
```

Suggested mechanical copy once the new branch exists:

```sh
git checkout sbarrio/set-profiling-benchmark-scenario -- packages/react-native-profiling
```

That restricts the checkout to exactly this path, so none of the excluded work (§6) comes with it.
`package.json` there says `"version": "3.7.0"` — verify it matches whatever `develop` is at when
the PR opens.

---

## 4. Bugs and gaps to fix as part of the port

### 4.1 `compileSdkVersion=33` vs `VANILLA_ICE_CREAM` (API 35) — **VERIFIED BROKEN**

`android/gradle.properties` was copied from session-replay and says:

```
DatadogSDKReactNativeProfiling_compileSdkVersion=33
DatadogSDKReactNativeProfiling_buildToolsVersion=33.0.0
DatadogSDKReactNativeProfiling_targetSdkVersion=33
```

but the implementation references `Build.VERSION_CODES.VANILLA_ICE_CREAM`, which does not exist
below API 35. On the source branch this compiled **only by accident**: `getExtOrIntegerDefault`
prefers `rootProject.ext`, and `benchmarks/android/build.gradle:5` sets
`compileSdkVersion = 35`. Built standalone — which is exactly how CI builds each package — it
fails. Confirmed locally:

```
$ cd packages/react-native-profiling/android && ./gradlew compileReleaseKotlin
e: …/DdProfilingImplementation.kt:37:56 Unresolved reference: VANILLA_ICE_CREAM
BUILD FAILED in 28s
```

**This is a customer-facing constraint, not just a CI one.** RN Android native modules are not
shipped as prebuilt AARs — autolinking includes `android/` as a Gradle subproject that is
**compiled from source inside the customer's app build**. Combined with `getExtOrIntegerDefault`
preferring `rootProject.ext`, this means the pins in our `gradle.properties` are *ignored* in any
real app: the customer's own root ext supplies `compileSdkVersion`. So a customer compiling against
SDK 34 hits the identical `Unresolved reference` failure in their own build. Given the package's
peer dep is `react-native: ">=0.63.4 <1.0"` — and RN templates only defaulted to compileSdk 35 at
0.76 — that would break a large share of supported customers.

`minSdkVersion` is **not** affected and must stay at 23: the API-35 requirement is enforced at
runtime, so older devices install and run normally with profiling inert. Nobody needs to raise
their minSdk. `targetSdkVersion` is irrelevant for a library — consumers' manifests win.

**Fix (preferred): drop the named constant.** `VANILLA_ICE_CREAM` is just the integer 35, and the
literal compiles against any compileSdk, imposing no floor on anyone:

```kotlin
internal companion object {
    internal const val NAME = "DdProfiling"

    // Build.VERSION_CODES.VANILLA_ICE_CREAM (API 35, Android 15). Inlined rather than
    // referenced so the module still compiles in apps whose compileSdk is below 35 —
    // React Native builds native modules from source inside the consuming app's build.
    private const val MIN_PROFILING_API_LEVEL = 35
}
```

Then `if (sdkVersionProvider() < MIN_PROFILING_API_LEVEL)`. A named `const` also keeps detekt's
magic-number rule quiet. With this, `gradle.properties` can stay at 33 and matches the other
packages, and the standalone/CI build in §5.1 passes unchanged.

**Rejected alternative:** bumping our own `gradle.properties` to 35. It turns CI green while
leaving every customer on compileSdk < 35 broken, so it hides the bug rather than fixing it.
Only worth doing if the team decides to *require* compileSdk 35 for this package, which would
need a documented peer-dep/RN-version floor and a release note.

### 4.2 Document the platform asymmetry

`enable()` resolving successfully on an Android 14 device while collecting nothing is a support
ticket waiting to happen. Options, cheapest first: (a) document the API 35 floor prominently;
(b) log a warning through the core SDK's internal logger on the no-op path; (c) resolve with a
boolean "was actually enabled". (a)+(b) is probably the right call for this PR; (c) changes the
spec signature and can wait.

### 4.3 No "is the core initialised?" guard

`Datadog.getInstance() as FeatureSdkCore` will produce a no-op core (Android) and
`CoreRegistry.default` a `NOPDatadogCore` (iOS) if the customer calls `enable` before
`initialize`. Consider an explicit check + telemetry rather than silent nothing.

### 4.4 `package="…"` in AndroidManifest.xml

Deprecated by AGP 7+ and removed in AGP 8 — `namespace` in `build.gradle` is already set. Harmless
today (session-replay does the same) but worth dropping while touching the file.

---

## 5. Monorepo registration — **none of this was done on the source branch**

The benchmark branch only wired the package into `benchmarks/package.json`. Every release/CI
integration point carries an **explicit per-package list**, and profiling is missing from all of
them. This is the part most likely to be forgotten, because nothing fails locally.

1. **`.gitlab-ci.yml`**, job `test:native-android` (~lines 88-96) — add both lines:
   ```yaml
   - echo "org.gradle.java.home=…" >> packages/react-native-profiling/android/gradle.properties
   …
   - (cd packages/react-native-profiling/android && ./gradlew build -PDdSdkReactNative_minSdkVersion=24 -PDatadogSDKReactNativeProfiling_minSdkVersion=24)
   ```
   Note this job is exactly the standalone build that §4.1 breaks — fix that first or the PR is red.
   Also check `test:native-ios` for a matching podspec/test-spec list.
2. **`update-native-sdk-versions.sh`** — add to *both* arrays:
   - `podspec_files=(…)` → `packages/react-native-profiling/DatadogSDKReactNativeProfiling.podspec`
   - `build_gradle_files=(…)` → `packages/react-native-profiling/android/build.gradle`

   Without this, a native SDK version bump silently skips profiling and the pins drift out of sync
   with the `/!\ keep in sync` comment in the podspec.
3. **`update-version.sh`** — add `yarn workspace @datadog/mobile-react-native-profiling pack` and
   the matching `./check-release-content.sh -p packages/react-native-profiling/package.tgz > …`
   line. Without this the package is never published.
4. **Root `package.json` workspaces** — already `packages/*`, so no change. Root jest
   `projects: ["<rootDir>/packages/*"]` likewise picks the package up automatically.
5. **`example/package.json` and `example-new-architecture/package.json`** — add
   `"@datadog/mobile-react-native-profiling": "workspace:packages/react-native-profiling"` and a
   demo screen. These are the apps reviewers and customers actually run; only `benchmarks` had it.

Also check for any other per-package list that grew since: `codeowners`, release notes tooling,
danger/lint config, `tsconfig` path maps.

---

## 6. Explicit exclusions — do NOT carry these over

The source branch is 68 files. Only the 31 above belong in this PR.

1. **All core Hermes *JS* profiling work (~13 files in `packages/core`).** This is a different
   feature: `DdRum.startProfiling()` / `stopProfiling()` driving Hermes's own sampling profiler via
   `HermesProfilerWrapper` / `HermesSamplingProfilerWrapper`, plus the RUM spec, both
   `DdRum.kt` source sets, `DdRumImplementation.kt`, and the iOS equivalents. It also carries an
   unresolved upstream defect: on RN < 0.86 the Java `HermesSamplingProfiler.disable()` binding is
   wired to the C++ `enable` (fixed by RN PR #56174), so `disable` is a no-op on Android and a
   second `stopProfiling` dumps a trace covering everything since the *first* start. That is the
   deferred JNI-shim work — keep it out of this PR entirely.
2. **The two accidental `docs/` deletions**: `docs/image_reactnative.png` and
   `docs/migrating_to_datadog_provider.md`. They still exist on `develop` and were removed on the
   benchmark branch by mistake. Starting from `develop` and copying only the profiling path avoids
   this automatically — just verify with `git status` before opening the PR.
3. **Everything under `benchmarks/`** — `Scenario.Profiling`, the `RunType.PROFILING` →
   `INSTRUMENTED_PROFILING_JS` / `_NATIVE` / `_JS_NATIVE` replacement, the `autoWorkload` flag,
   `profilingScenario.tsx`, `profilingUtils.ts`, deeplink parsing. Note the RunType change is
   **breaking for the benchmark tooling**: `develop`'s benchmarks README documents
   `instrumented|baseline|profiling` and the value flows into native reporting via
   `.setRun(runType)`. It deserves its own PR with the README updated.
4. **`benchmarks/profiles/*.cpuprofile`** — 8 MB of captured traces (and `testprofile.cpuprofile`,
   a stale ad-hoc capture). Measurement artifacts, not source.
5. **`Podfile.lock` churn** in `benchmarks/ios`, `example/ios`, `example-new-architecture/ios` —
   regenerate on the new branch instead of porting.

### The entanglement gotcha

`benchmarks/src/scenario/Profiling/profilingScenario.tsx` imports **both**
`DdProfiling` from `@datadog/mobile-react-native-profiling` *and* `DdRum.startProfiling()` from
core. So it cannot be ported wholesale while core JS profiling is excluded. If you do want a demo
screen in this PR, write a fresh minimal one (enable + a button, no Hermes calls) rather than
trimming that file.

---

## 7. Follow-up: Operations API profiling options

Your hunch is right — the native SDKs already expose profiling through the Operations API and the
RN layer does not. Current RN signature, `packages/core/src/rum/types.ts:240`:

```ts
startFeatureOperation(name: string, operationKey: string | null, attributes: object): Promise<void>;
```

There is no `options` parameter. Natively, on iOS
(`DatadogRUM/…/RUMMonitorProtocol.swift:292`):

```swift
func startOperation(name:operationKey:attributes:options: OperationOptions?)
```

and `startFeatureOperation` is `@available(*, deprecated, renamed: "startOperation(…options:)")`.
The relevant option type (`DatadogInternal/…/Profiling/ProfilingOptions.swift`):

```swift
public struct ProfilingOptions: OperationOptions {
    public let sampleRate: SampleRate
    public init(sampleRate: SampleRate) { self.sampleRate = sampleRate }
}
```

So the follow-up work is:

1. Add an optional `options` argument to the RN `startFeatureOperation` spec (or rename to
   `startOperation` and deprecate, matching native).
2. Decide how `OperationOptions` — a native *protocol* with multiple conformers — is represented
   across a bridge that only carries plain data. Likely a discriminated object,
   e.g. `{ profiling: { sampleRate: 100 } }`, mapped to the concrete type on each side.
3. Check the Android equivalent's shape before designing the JS type; only the iOS side has been
   inspected so far.

Best done as a separate PR: it touches the core RUM spec, both architectures, and both platforms,
and it has real API-design questions in it. Landing `enable()` first gives customers something
usable immediately.

---

## 8. Verification checklist before opening the PR

- [ ] `git status` shows no `docs/` deletions and no `Podfile.lock` churn
- [ ] `yarn test` at root (root jest auto-globs `packages/*`, so the new package's 3 JS tests run)
- [ ] `cd packages/react-native-profiling/android && ./gradlew build` — **standalone**, no
      benchmarks root, no `-PcompileSdkVersion` override. This is the §4.1 regression test.
- [ ] Build `example/` with `compileSdkVersion` forced to 34 in its root ext — proves the module
      no longer imposes a compileSdk floor on customers. Revert afterwards.
- [ ] `./gradlew detekt` / lint for the new Kotlin
- [ ] iOS unit tests via the podspec `test_spec`
- [ ] `example/` builds and runs on both architectures, old and new, with a real
      `DdProfiling.enable()` call — verify a profile actually lands in the org, not just that the
      promise resolves
- [ ] Verified on a real **API 35+** Android device/emulator, and separately on API 34 to confirm
      the no-op path doesn't crash
- [ ] `./update-version.sh` dry-run includes the new package in the pack + release-content output
- [ ] CHANGELOG + package README + public docs, including the API 35 floor

---

## 9. Execution log — what actually happened, and what §1-§8 did not predict

The port was executed on `sbarrio/RUM-18282/expose-native-profilers` (fresh off `develop` at
`c9c90f33`). Everything in §3 and §5 held. Below are the five things this plan got wrong or
missed, each discovered by running the verification in §8 rather than by reading code.

### 9.1 A fourth script needed registering: `bump-native-dd-sdk.sh`

§5 listed `update-native-sdk-versions.sh` and `update-version.sh`. There is a third script that
also carries hardcoded per-package arrays — `bump-native-dd-sdk.sh` — with **both** a
`build_gradle_files` and a `podspec_files` array. Profiling was added to both. Without this, a
native SDK bump would silently skip the profiling package and its pins would drift out of sync
with the other three, which `extract_and_validate_version` would then reject.

### 9.2 The iOS test scheme does not exist from autolinking alone

The CI job added in §5 (`test:native-ios-profiling`, targeting the
`DatadogSDKReactNativeProfiling` scheme) **would have failed**: profiling was only autolinked,
whereas core, session-replay and webview are each declared explicitly in `example/ios/Podfile`
with `:testspecs => ['Tests']`. That directive is what generates the runnable `-Unit-Tests`
scheme and wires the test action into the base scheme. Fixed by adding to `example/ios/Podfile`:

```ruby
pod 'DatadogSDKReactNativeProfiling', :path => '../../packages/react-native-profiling/DatadogSDKReactNativeProfiling.podspec', :testspecs => ['Tests']
```

### 9.3 The Kotlin unit tests had never compiled — vendored test tooling is per-package

`DdProfilingImplementationTest.kt` imports `com.datadog.tools.unit.GenericAssert.Companion.assertThat`.
Test source sets are not shared across Gradle subprojects, and each package keeps its **own copy**
of that tooling. `GenericAssert.kt` and `ReflectUtils.kt` were vendored verbatim from
`packages/react-native-session-replay/android/src/test/kotlin/com/datadog/reactnative/tools/unit/`
(note: directory `com/datadog/reactnative/tools/unit/`, `package com.datadog.tools.unit` — the
mismatch is intentional and matches session-replay). `kotlin-reflect` was already in
`build.gradle`; no dependency change was needed.

### 9.4 Android lint `NewApi` fails even with the runtime gate in place

§4.1's inline-constant fix resolves compilation, but lint then flags
`ProfilingSDKWrapper.kt` — it cannot see the version gate across a class boundary, still less
through the injected `sdkVersionProvider` lambda. The full fix is three coordinated pieces:

- `MIN_PROFILING_API_LEVEL = 35` as a top-level `internal const` in `ProfilingWrapper.kt`
- `@RequiresApi(MIN_PROFILING_API_LEVEL)` on both the interface method and its override
- one scoped `@SuppressLint("NewApi")` on `DdProfilingImplementation.enable`, immediately above
  the early return that constitutes the proof, with a comment explaining why lint can't see it

Also pre-existing and newly surfaced: detekt `UndocumentedPublicFunction` on
`ProfilingWrapper.enable`, fixed with KDoc. Neither had ever run on the benchmark branch.

### 9.5 The standalone Gradle build needs the CI's minSdk override

`./gradlew build` from `packages/react-native-profiling/android` fails manifest merging with
`minSdkVersion 23 cannot be smaller than version 24 declared in ... react-android`. This is not a
bug and not the §4.1 issue — it is exactly why the existing CI invocations pass
`-P<Package>_minSdkVersion=24`. The §8 regression test must be run as:

```sh
cd packages/react-native-profiling/android && ./gradlew build \
  -PDdSdkReactNative_minSdkVersion=24 -PDatadogSDKReactNativeProfiling_minSdkVersion=24
```

### 9.6 Results

| Check | Result |
| --- | --- |
| Standalone `./gradlew build` (the §4.1 regression test) | `BUILD SUCCESSFUL`, detekt + lint clean |
| Android unit tests | 3/3 pass — had never run before |
| JS tests (`Profiling.test.ts`) | 3/3 pass |
| iOS unit tests (`DdProfilingTests`, via the new CI scheme) | 3/3 pass, `** TEST SUCCEEDED **` |
| `pod install`, both architectures | `DatadogProfiling (3.16.0)` + `DatadogSDKReactNativeProfiling (3.7.0)` |
| TypeScript, both example apps | clean (4 pre-existing benchmark SVG errors in `example`, untouched) |
| Native pin alignment across all 4 packages | iOS `3.16.0`, Android `3.13.1` — consistent |

Both example apps now call `DdProfiling.enable({applicationLaunchSampleRate: 100,
continuousSampleRate: 100})` immediately after `DdSdkReactNative.initialize`, so profiling can be
exercised by hand. `packages/react-native-profiling/README.md` was added — profiling had been the
only package without one.

### 9.7 Runtime verification on device — the upload gate

Getting a profile to *upload* turned out to be the hard part, and the reason is not documented
anywhere in the native SDKs' public docs.

**A continuous profile is only uploaded if its active window captured a long task, an app
hang/ANR, or a RUM vital.** Windows that see nothing are still profiled, and then discarded.
The gate is identical on both platforms:

- Android — `ProfilingFeature` (decompiled from `dd-sdk-android-profiling-3.13.1.aar`):
  ```
  val (longTasks, anrEvents, vitalEvents) = pendingRumEvents.drain()
  dataWriter.write(perfettoResult, longTasks, anrEvents, vitalEvents)
  if (longTasks.isEmpty() && anrEvents.isEmpty() && vitalEvents.isEmpty())
      logToUser("Continuous profiling result not uploaded: no pending RUM events.")
  else
      logToUser("Continuous profiling result written: %d long task(s), %d ANR event(s).")
  ```
  `onReceive` accepts exactly `ProfilerEvent$TTIDNotTracked`, `$RumVitalEvent`,
  `$RumLongTaskEvent`, `$RumAnrEvent`. RUM **actions** are not in the set — driving taps to
  "generate activity" does nothing for profiling.
- iOS — `DatadogProfiler.canWriteProfile`: `hasCustomProfilingData` (vitals) ||
  `hasContinuousProfilingData` (`hangs.count > 0 || longTasks.count > 0`), and in both cases
  `!quotaChecker.isRejectedByQuota`.

**TTID gates only app-launch profiling, not continuous profiling.** On Android, TTID arrives as
`ProfilerEvent$TTIDNotTracked` → `onTtidEvent()` → `profiler.stop()`, i.e. the launch path.
`RumVitalEvent$Type` has exactly two values, `TTID` and `KEY_VITAL`. Continuous profiling has its
own trigger set, so it does **not** depend on dd-sdk-android#3635 or dd-sdk-reactnative#1336 —
those two only unblock app-launch profiling, and are deliberately deferred out of this PR.

To make the gate reachable by hand, two example-app changes were needed:

1. `example/src/ddUtils.tsx` — set `longTaskThresholdMs: 200`. It defaults to **0, which disables
   JS long task reporting entirely**, so a blocked JS thread would have been invisible to the SDK.
   (`nativeLongTaskThresholdMs` defaults to 200 and is unrelated: in RN, JS runs off the main
   thread, so a JS busy-loop never trips native main-thread long task detection. It has to go
   through the JS frame-time callback, which is what `longTaskThresholdMs` gates —
   `DdSdkImplementation.kt` / `DdSdkImplementation.swift` both forward it to
   `rumMonitor._getInternal().addLongTask(..., "javascript")`.)
2. `example/src/screens/MainScreen.tsx` — a "Trigger JS long task (500ms)" button that
   synchronously busy-waits, producing a long task on demand inside a profiling window.

**iOS emits no user-facing profiling log strings**, so runtime verification there is indirect:
dd-sdk-ios core creates one directory per registered feature under
`Library/Caches/com.datadoghq/v2/<hash>/`, and the presence of `profiler/` is proof of
registration. Confirmed on the simulator alongside `rum/`, `logging/`, `tracing/`,
`session-replay/`, `flags/`, with intake returning `response_status=202`.

**Caveat — Android trace capture is gated by the OS, not by the SDK.** `PerfettoProfiler` does
not talk to perfetto directly. It calls
`androidx.core.os.Profiling.requestProfiling(...)` with a `StackSamplingRequestBuilder` — the
AndroidX wrapper over Android 15's `android.os.ProfilingManager`, implemented in the
`com.android.profiling` mainline apex — and reads back `ProfilingResult.getErrorCode()`. That
service applies a cost-based rate limiter (`cost_stack_sampling`, `max_per_24_h`). This is also
why the feature requires API 35+ in the first place.

Three things here cost a lot of debugging time, and are worth knowing before anyone tries to
reproduce a profile by hand:

- **A rejected request produces no logcat output whatsoever** — not even the "not uploaded" line.
  `PerfettoProfiler` reports failures only through telemetry
  (`ProfilingTelemetryEvent$Blocked`, and `SessionEnd` carrying the error code); there is no
  `logToUser` on the failure path. A window that logs "active window started" and "active window
  ended" with nothing in between means *no trace was ever captured*. That is a different failure
  from "captured, but there were no RUM events to attach", and only the second one is about the
  upload gate. Note that the scheduler emits "active window started" unconditionally, before
  knowing whether the profiler actually started — so that line is not evidence of capture.
  The reliable capture signals are on the system side:
  `perfetto_cmd.cc:1100 Connected to the Perfetto traced service` and
  `perfetto_cmd.cc:1263 Wrote N bytes into /data/misc/perfetto-traces/profiling/...`.
- **Disabling the limiter requires root, and the flag name is not what you would guess.** The
  DeviceConfig key is `rate_limiter.disabled` **with a dot**, in the `profiling` namespace — not
  `rate_limiter_disabled`. Setting the underscore spelling silently creates an unrelated key that
  nothing reads, and `device_config list profiling` will happily show it back to you. The real
  names can be read out of the module:
  `adb pull /apex/com.android.profiling/javalib/service-profiling.jar`, unzip, then
  `strings classes.dex | grep -i rate_limit` (also reveals `profiling_rate_limiter_store` and the
  cost properties). The working sequence on a rooted device is:
  ```
  adb root
  adb shell device_config set_sync_disabled_for_tests persistent
  adb shell device_config put profiling rate_limiter.disabled true default
  ```
  The `set_sync_disabled_for_tests` step is not optional: without it the namespace is re-synced
  and the flag silently disappears mid-session, which makes the whole thing look intermittent.
  Root is only available on a `google_apis` (userdebug) system image — every
  `google_apis_playstore` image is a `user` build, where `adb root` fails with
  `adbd cannot run as root in production builds` and `device_config put` fails with
  `SecurityException: ... must add flag to the allowlist`.
- **Before the flag was correct, the observed behaviour was one capture per app process**, taken
  by whichever request came first: a continuous window on one launch
  (`profile_continuous_2026-09-07-15-15-52`, 87531 bytes) and the app-launch profiler on another
  (`profile_applicationlaunch_2026-09-07-15-56-16`, 211010 bytes). Every subsequent continuous
  window in that process attempted nothing. An earlier reading of this as "roughly one profile per
  hour" was wrong — it is per-process, not time-based.

Incidental but useful confirmation of the deferred TTID work: the app-launch profiler **does**
capture on API 35, and is then cut short about 9 s in
(`perfetto_cmd.cc:1308 SIGINT/SIGTERM received: disabling tracing`), which is the
`ProfilerEvent$TTIDNotTracked` → `onTtidEvent()` → `profiler.stop()` path firing because RN does
not yet report TTID. That is exactly what dd-sdk-android#3635 and dd-sdk-reactnative#1336 fix, and
it is independent of continuous profiling.

### 9.8 Still open

- Run the example apps on an **API 35+** device and confirm profiles land in the org (§8), plus
  API 34 to confirm the no-op path.
- Optionally force `compileSdkVersion` to 34 in `example/`'s root ext to prove the §4.1 fix from
  the customer's side.
- The platform asymmetry (Android no-ops below API 35, iOS never does) is documented in the new
  package README; it still needs to reach the public docs site (§4.2).
- §4.3 (no core-initialised guard) and §4.4 (deprecated `package=` in `AndroidManifest.xml`) are
  untouched and still optional.
- §7's Operations API remains deliberately out of scope, as does the Hermes/JS profiler work
  (§6) and its RN < 0.86 JNI shim.
