# AI Agents Guide for dd-sdk-reactnative

Start here, then read [CONTRIBUTING.md](CONTRIBUTING.md) for the developer setup.
This file holds the rules an agent needs and that the code doesn't make obvious.

## SDK Philosophy

The SDK runs inside thousands of customer apps, on top of the native iOS and Android SDKs. Every change must keep it:

1. **Safe.** SDK code must never crash, throw into, or block the host app. If something fails, the SDK stops working; the app keeps running.
2. **Compatible.** The SDK supports both React Native architectures (old bridge and new TurboModules/Fabric), React Native `>=0.63.4 <1.0`, iOS/tvOS 12.0+, Android minSdk 23, and Expo through [`expo-datadog`](https://github.com/DataDog/expo-datadog).
3. **Stable.** Avoid breaking changes. Minor updates must be transparent to customers.
4. **Light.** Keep the JS-thread cost, bridge traffic and bundle size low.

## Repo Map

This is a monorepo built with yarn 3 workspaces and lerna. All packages share one version, set in `lerna.json`.

| Path | npm package | What it is |
|---|---|---|
| `packages/core` | `@datadog/mobile-react-native` | The SDK: RUM, Logs, Trace, Flags, `DatadogProvider`, the Metro plugin, and the iOS/Android bridges |
| `packages/react-native-session-replay` | `@datadog/mobile-react-native-session-replay` | Session Replay (JS and native) |
| `packages/react-native-webview` | `@datadog/mobile-react-native-webview` | WebView tracking (JS and native) |
| `packages/react-native-babel-plugin` | `@datadog/mobile-react-native-babel-plugin` | Babel plugin for action tracking and SR asset generation |
| `packages/react-navigation`, `packages/react-native-navigation` | `@datadog/mobile-react-navigation`, `@datadog/mobile-react-native-navigation` | View tracking for the navigation libraries |
| `packages/react-native-apollo-client`, `packages/codepush`, `packages/react-native-openfeature` | `@datadog/mobile-react-native-{apollo-client,code-push,openfeature}` | Third-party integrations (JS only) |
| `packages/internal-testing-tools` | `@datadog/react-native-internal-testing-tools` | Internal test helpers (JS and native) |
| `example` | | Sample app, old architecture |
| `example-new-architecture` | | Sample app, new architecture |
| `benchmarks` | | Performance benchmark app |

Inside `packages/core`:

- `src/`: TypeScript sources.
  - `rum/`, `logs/`, `trace/`, `flags/`: product features.
  - `sdk/`: initialization, `DatadogProvider`, the buffer and global state.
  - `config/`: configuration types and file-based configuration.
  - `metro/`: the Metro and Expo bundler plugin.
  - `specs/`: TurboModule specs.
- `ios/Sources/`: the iOS bridge. Each module has an ObjC++ `DdX.mm` (React Native glue) and a Swift `DdXImplementation.swift` (logic). Tests are in `ios/Tests/`.
- `android/src/main/kotlin/com/datadog/reactnative/`: the Android bridge (Kotlin). Architecture-specific code is in `android/src/{newarch,oldarchCommon,oldarch,oldarch65}`. Tests are in `android/src/test/`.
- `jest/mock.js`: a Jest mock that we publish for customers (`@datadog/mobile-react-native/jest`).

## How a Call Reaches the Native SDK

`DdRum.startView(...)` (TS wrapper) → `getNativeDdRum()` (spec in `src/specs/NativeDdRum.ts`) → `DdRum.mm` / `DdRumImplementation.kt` → `dd-sdk-ios` / `dd-sdk-android`.

- **Lazy resolution.**
  - Specs export a `getNativeDdX()` getter instead of resolving the module at import time.
  - Importing any SDK module must not call `TurboModuleRegistry` or `NativeModules`. Some platforms have no native module.
  - `src/__tests__/wrapperImportSafety.test.ts` guards this.
- **Typing.** Don't import specs directly. Use the `DdNativeXType` types from `src/nativeModulesTypes.ts`, which add typing that codegen can't express.
- **Both architectures:**
  - On the old architecture, `TurboModuleRegistry.get` falls back to `NativeModules`.
  - On iOS, `.mm` files branch on `#ifdef RCT_NEW_ARCH_ENABLED`.
  - On Android, `android/build.gradle` picks the source sets from `newArchEnabled` and the RN version. Its comment explains how to name the `oldarch<N>` source sets.
- **Changing a bridge method.** Update all of these together:
  - the spec
  - `nativeModulesTypes.ts`
  - the iOS `.mm` (both architecture branches) and `Implementation.swift`
  - the Android `newarch` and `oldarch*` modules and `Implementation.kt`
  - `__mocks__/react-native.ts`
  - `jest/mock.js`
- **Singletons** are stored on `globalThis` through `src/utils/singletonUtils.ts`, so they survive duplicated module instances. Use that helper for new singletons.

## Critical Rules (always apply)

- **Never crash or block the host app.** Catch errors at the bridge boundary. Never let an SDK error escape into customer code. Don't add synchronous bridge calls or heavy work on the JS thread at import or initialization.
- **Keep both architectures working.** A native change must build and work on old and new architecture, and on iOS and Android.
- **Don't add dependencies** (npm, CocoaPods or Gradle) without approval from the maintainers.
- **Don't add or change public API** (anything exported from `packages/core/src/index.tsx` or a package's entry point) without maintainer review. Removing or changing an export is a breaking change, for us and for `expo-datadog`.
- **`./internal` is not public API.** `src/internal.ts` serves other Datadog packages. Everything it re-exports must not touch native code at import time.
- **Don't edit generated or release-managed files** by hand (see [Generated and Release-Managed Files](#generated-and-release-managed-files)).
- **Don't edit CI config (`.gitlab-ci.yml`, `.github/workflows`) or the release scripts** (`update-version.sh`, `bump-native-dd-sdk.sh`, `update-native-sdk-versions.sh`, `check-release-content.sh`) unless asked to.
- **Don't break `expo-datadog`.** Read [Expo Compatibility](#expo-compatibility) before you rename, move or remove anything at the package root or in `package.json`.
- **Search all packages before you call a change done.** Integrations import from `@datadog/mobile-react-native`. Session Replay, WebView and internal-testing-tools have their own native bridges that depend on core.
- **Never mention AI assistant names** (Claude, ChatGPT, Cursor, Copilot, etc.) in commit messages, PR descriptions, code comments or co-author tags.
- **This repo is public. Never put customer information, sensitive data, internal links or references to internal projects** in PRs, commits, branch names, code comments, test fixtures or review replies. That covers:
  - customer names and customer data
  - support ticket numbers
  - API keys, client tokens, application or org IDs
  - Slack, Confluence, internal Jira, Datadog app or internal CI links
  - private repos, internal codenames or incidents

  Ticket IDs such as `RUM-1234` are fine; links to the internal tracker are not. Details are in section 0 of [`.github/PULL_REQUEST_GUIDELINES.md`](.github/PULL_REQUEST_GUIDELINES.md).

## Expo Compatibility

[`expo-datadog`](https://github.com/DataDog/expo-datadog) is a separate repo with its own release cycle. Its major version follows the Expo SDK, and it declares `@datadog/mobile-react-native >=2.0.0` as a peer dependency, so it must keep working with every SDK release. Expo apps are generated with `expo prebuild` (Continuous Native Generation), which means customers don't edit `ios/` or `android/` by hand.

It depends on this repo in these ways:

| expo-datadog uses | Defined here | So don't |
|---|---|---|
| `export * from "@datadog/mobile-react-native"` (`src/index.ts`) | `packages/core/src/index.tsx` | remove or rename exports without a migration plan |
| `require.resolve("@datadog/mobile-react-native/package.json")` | `"./package.json"` in `exports` | remove that export |
| `apply from: ".../datadog-sourcemaps.gradle"`, inserted after `apply plugin: "com.facebook.react"` | `packages/core/datadog-sourcemaps.gradle` (in `files`) | rename, move, or require extra setup in the app's `build.gradle` |
| `datadog-ci react-native xcode` wrapping `react-native-xcode.sh`, with `SOURCEMAP_FILE` | the sourcemap and debug-id flow (`scripts/copy-debug-id.js`, `src/metro/`) | change the sourcemap output paths or the debug-id format without checking the iOS build phase |
| `getDatadogExpoConfig` from `@datadog/mobile-react-native/metro` | `packages/core/src/metro.ts` | rename the `./metro` entry point or its exports |
| CocoaPods and Gradle autolinking | podspec names `DatadogSDKReactNative*`, `codegenConfig` in `package.json`, Android package `com.datadog.reactnative` | rename them |

When you add a feature, ask: **does a customer have to edit native project files to use it?** For example `AppDelegate`, `MainApplication`, `Podfile`, `build.gradle` or `Info.plist`. If so, the feature doesn't work on Expo until `expo-datadog` gets a config plugin for it. Prefer a JS-only setup. If native setup can't be avoided, say so in the PR and open an `expo-datadog` follow-up.

An internal nightly E2E pipeline builds `expo-datadog` against the SDK across Expo versions. Unit tests in this repo don't cover Expo, so mention any Expo-relevant change in the PR.

## Native SDK Coupling

- Native SDK versions are pinned in each podspec (`DatadogSDKReactNative*.podspec`) and in each Android `build.gradle`. **Versions must match within a platform**: all podspecs pin the same `dd-sdk-ios` version, and all Gradle files pin the same `dd-sdk-android` version. iOS and Android are versioned independently and usually differ. Bump one platform at a time with `./bump-native-dd-sdk.sh <ios|android> <version>`. `NATIVE_SDK_VERSIONS.md` records both versions for each release.
- The bridges use native internal APIs: `_InternalProxy` on Android and `._internal` on iOS. If one of them changes in `dd-sdk-android` or `dd-sdk-ios`, the bridge here must change too. Check the native SDK's changelog when you bump.
- iOS dependencies go through CocoaPods today. An SPM migration is in progress; don't assume `Package.swift` exists on `develop`.

## Commands

Run these from the repo root after `yarn install`.

| Task | Command |
|---|---|
| Install | `yarn install` |
| All JS tests | `yarn test` |
| One package's tests | `yarn workspace @datadog/mobile-react-native test` |
| One test file | `yarn jest packages/core/src/rum/__tests__/DdRum.test.ts` |
| Lint (ESLint + Prettier) | `yarn lint` (auto-fix: `yarn eslint --fix <paths>`) |
| Build all packages and type-check | `yarn prepare` |
| iOS native tests (old arch) | `(cd example/ios && RCT_NEW_ARCH_ENABLED=0 pod install)`, then `xcodebuild -workspace example/ios/DdSdkReactNativeExample.xcworkspace -scheme <scheme> test -destination 'platform=iOS Simulator,name=<simulator>'` |

Native tests run per package. The Android command also runs ktlint and detekt. Packages other than core read their own `minSdkVersion` property, so they need both overrides:

| Package | Android command | iOS scheme |
|---|---|---|
| core | `(cd packages/core/android && ./gradlew build -PDdSdkReactNative_minSdkVersion=24)` | `DatadogSDKReactNative` |
| Session Replay | `(cd packages/react-native-session-replay/android && ./gradlew build -PDdSdkReactNative_minSdkVersion=24 -PDatadogSDKReactNativeSessionReplay_minSdkVersion=24)` | `DatadogSDKReactNativeSessionReplay` |
| WebView | none: the standalone build fails because `react-native-webview` needs `com.facebook.react:react-native:+`, which this build can't resolve | `DatadogSDKReactNativeWebView` |
| internal-testing-tools | `(cd packages/internal-testing-tools/android && ./gradlew build -PDdSdkReactNative_minSdkVersion=24 -PDatadogInternalTesting_minSdkVersion=24)` | none: `ios/Tests` exists, but no example Podfile includes its test spec |

- CI (`.gitlab-ci.yml`) runs the core, Session Replay and internal-testing-tools Android commands and the core and Session Replay iOS schemes. **CI doesn't run the WebView native tests.** When you change WebView native code, run the iOS scheme locally. For Android, say in the PR that its tests (`packages/react-native-webview/android/src/test*`) weren't run. The WebView and Session Replay test specs are only in `example/ios/Podfile`, so their schemes exist only in the old-architecture workspace.
- The Android builds need JDK 17 and the Android SDK.
- For the new architecture, use `example-new-architecture` with `RCT_NEW_ARCH_ENABLED=1`.
- The sample apps need credentials in a gitignored `ddCredentials` file (see CONTRIBUTING.md).
- **Worktree nested inside the repo** (for example `.worktrees/<name>`): the root `.eslintrc.js` doesn't set `root: true`, so ESLint also loads the parent checkout's config, and `yarn lint` fails with `couldn't find the config "prettier"`. Create worktrees outside the repo folder, or run `yarn eslint --no-eslintrc -c .eslintrc.js --ignore-path .eslintignore .` instead.

## Before You Finish

Run these for every change:

```sh
yarn lint       # must pass with no errors
yarn test       # or the affected packages' tests while you iterate; run everything at the end
yarn prepare    # builds lib/ and type-checks with tsc
```

If you changed native code, also run the native tests for that platform (see [Commands](#commands)). They need a JDK and the Android SDK, or Xcode and a simulator. If you can't run them, say so in the PR so a human or CI checks them; don't claim they pass.

If you changed a public export or a bridge method, also check:

- `jest/mock.js` and `src/__tests__/mock.test.ts` are updated.
- `__mocks__/react-native.ts` mocks the new native method.
- The [Expo Compatibility](#expo-compatibility) table still holds.

## Generated and Release-Managed Files

| File | Owned by | Rule |
|---|---|---|
| `packages/core/src/version.ts` | `genversion` (runs on `yarn test`, `yarn lint`, `yarn prepare`) | Don't edit. It is rewritten from `packages/core/package.json` on every run. |
| `packages/*/lib/`, `*.tgz` | `bob build` / `yarn pack` | Gitignored. Never commit. |
| `packages/*/release-content.txt` | `update-version.sh` during a release | Don't touch in feature PRs. It is regenerated when the version is bumped. |
| `NATIVE_SDK_VERSIONS.md`, `SdkVersion.swift`, `SdkVersion.kt`, `version` fields in `package.json` and `lerna.json` | `update-version.sh`, `update-native-sdk-versions.sh` | Release PRs only. |
| `packages/react-native-webview/generated/` (when present) | local codegen output | Untracked. Never commit. |

## Code Conventions

### TypeScript

- `tsconfig.json` is `strict`, with `noUnusedLocals`, `noUnusedParameters` and `verbatimModuleSyntax`: use `import type` for type-only imports.
- Prettier settings: 4 spaces, single quotes, 80 columns, no trailing commas, `arrowParens: avoid`. ESLint enforces `curly: all` and the `arca` import ordering, so let `eslint --fix` sort imports.
- Prefer named exports (`import/no-default-export` warns on default exports).
- Every source file starts with the Apache-2.0 license header used in existing files.
- Log SDK messages with `InternalLog` (`src/InternalLog.tsx`), not `console.*`.
- Code that wraps customer code (event mappers, global handlers, proxies) must catch errors from that code, and must call the previous handler or original implementation.

### Native

- **Kotlin:** ktlint and detekt run as part of `./gradlew build`; `detekt.yml` is in each `android/` folder. Bridge methods resolve or reject their `Promise`; they never throw.
- **Swift/ObjC++:**
  - Keep the React Native glue in `.mm` and the logic in Swift `*Implementation` classes.
  - Guard new-architecture-only code with `RCT_NEW_ARCH_ENABLED`.
  - Code must compile for tvOS too, unless it is explicitly iOS-only (like `DatadogWebViewTracking`).
- Keep native behaviour the same on iOS and Android. If parity isn't possible, document the difference in the PR.

## Testing

- **JS:**
  - Tests are Jest with the `react-native` preset, in `__tests__/` folders next to the code.
  - Native modules are mocked in `packages/*/__mocks__/react-native.ts`.
  - The shared test setup (`jest.setup.js`) sets `performance.now = Date.now`. Use `MockTimeProvider` (`src/rum/__mocks__/`) for time-dependent tests instead of real timers.
- **Android:** JUnit 5, Mockito and Elmyr, in `android/src/test/kotlin`.
- **iOS:** XCTest, in `ios/Tests/`. They run through the `DatadogSDKReactNative` scheme of the example workspace.
- A bug fix includes a test that fails without the fix.

## Fragile Areas

Take extra care, and add tests, when you touch:

- **Global error tracking** (`src/rum/instrumentation/DdRumErrorTracking.tsx`): wraps `ErrorUtils.setGlobalHandler` and must always chain to the previous handler.
- **Resource tracking** (`src/rum/instrumentation/resourceTracking/requestProxy/`): patches XHR and global `fetch`, including Expo's `fetch`. Mistakes here break customers' networking.
- **The JSX runtime** (`src/rum/instrumentation/interactionTracking/getJsxRuntime.ts`, `scripts/replace-react-require.js`, which is the core `postinstall`): works around Metro limitations. Keep the inline `require`s.
- **Session Replay on Android** (`packages/react-native-session-replay/android/src/rn*`): separate source sets per RN version range. A change may have to be made in several of them.
- **The Babel plugin** (`packages/react-native-babel-plugin`): rewrites customer code at build time. Test against real JSX patterns (handlers from `useMemo`/`useCallback`, spreads, nested components).
- **Time and clock sync** (`src/utils/time-provider/`): timestamps must stay in sync between JS and native.
- **Event mappers** (`src/sdk/EventMappers/`): deep-cloning customer events has a depth limit and a performance cost.

## Branches, Commits and PRs

- Base branch: **`develop`**. Branch names: `<username>/<JIRA-KEY>/<short-description>` (or `<username>/<short-description>` with no ticket).
- All commits must be signed (see CONTRIBUTING.md).
- Write commit messages as a short imperative summary, for example `Fix duplicated XHR resource keys`.
- **Before you write or edit a PR title or description, read [`.github/PULL_REQUEST_GUIDELINES.md`](.github/PULL_REQUEST_GUIDELINES.md) and follow it.** It covers the title format (`[RUM-1234] fix: ...`, `[NOJIRA] ...`), how to fill the PR template, the writing style, and what must never appear in a public PR.
- **Add the `flags` label to any PR that touches feature flags.** That includes `packages/core/src/flags/`, `packages/react-native-openfeature/`, `NativeDdFlags.ts` and the native `DdFlags*` files. The full path list is in the guidelines.
- Keep PRs focused. Leave out unrelated refactors, formatting churn, debug leftovers and stray files.
- Release PRs ("Bump to version x.y.z") come from `update-version.sh`. Don't make release-style changes in feature PRs.
