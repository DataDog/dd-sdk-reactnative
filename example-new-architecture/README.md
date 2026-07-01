# New Architecture Example

## Datadog Credentials

The example imports `ddCredentials.example.js`, which contains fake placeholder
values. That is enough for the offline native FF&E fixture demo and for CI,
because the demo passes a bundled rules configuration JSON file through the
React Native bridge and does not make a feature flag network request.

To point the example at a real staging app for manual SDK/RUM validation, edit
the values in `ddCredentials.example.js` locally:

- `CLIENT_TOKEN`: Datadog public client token for SDK initialization.
- `APPLICATION_ID`: RUM application ID. The placeholder keeps the native FF&E demo runnable; use a real staging RUM application ID to validate RUM flag annotation.
- `ENVIRONMENT`: use `staging` for this demo.

Do not commit real credentials.

## Native FFE Offline Smoke

CI runs the Android smoke test below to exercise the offline fixture corpus from
React Native JS through the native bridge:

```sh
ANDROID_HOME="$ANDROID_HOME" ANDROID_SDK_ROOT="$ANDROID_SDK_ROOT" \
  ./example-new-architecture/scripts/native-ffe-offline-android-smoke.sh
```

The smoke test starts Metro if needed, installs the new-architecture Android
app, launches it on an emulator, and waits for `Native FFE offline fixture pass:
233 cases across 30 files`. It does not use credentials or make a feature flag
network request.
