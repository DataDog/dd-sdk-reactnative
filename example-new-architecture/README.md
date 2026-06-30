# New Architecture Example

## Datadog Credentials

Create the local credentials file before running the app:

```sh
cp example-new-architecture/ddCredentials.example.js example-new-architecture/ddCredentials.js
```

`ddCredentials.js` is intentionally ignored by git. Edit it with:

- `CLIENT_TOKEN`: Datadog public client token for SDK initialization.
- `APPLICATION_ID`: RUM application ID. The placeholder keeps the native FF&E demo runnable; use a real staging RUM application ID to validate RUM flag annotation.
- `ENVIRONMENT`: use `staging` for this demo.
- `NATIVE_FFE_CLIENT_TOKEN`: token used by the native dynamic rules fetcher against `https://dd.datad0g.com/api/v2/feature-flagging/config/rules-based?dd_env=staging`.

The native FF&E demo also sends `Fastly-Client: 1` from `App.tsx` so it exercises the same staging rules-based request path used for this branch.
