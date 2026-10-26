# Resource Header Capture

The Datadog React Native SDK can capture HTTP request and response headers on RUM resource events. This helps debug caching, CDN, and content negotiation issues without extra instrumentation.

Header capture is **disabled by default** and requires `trackResources: true`.

## Configuration

Set `headerCaptureRules` in your RUM configuration:

```typescript
import {
  DatadogProvider,
  DatadogProviderConfiguration,
  TrackingConsent
} from '@datadog/mobile-react-native';

const config = new DatadogProviderConfiguration(
  '<CLIENT_TOKEN>',
  '<ENVIRONMENT_NAME>',
  TrackingConsent.GRANTED,
  {
    rumConfiguration: {
      applicationId: '<RUM_APPLICATION_ID>',
      trackResources: true,
      headerCaptureRules: 'defaults'
    }
  }
);

// <DatadogProvider configuration={config}>...</DatadogProvider>
```

With `FileBasedConfiguration`, set the same value under `rumConfiguration` in your JSON configuration file:

```json
{
  "configuration": {
    "rumConfiguration": {
      "trackResources": true,
      "headerCaptureRules": "defaults"
    }
  }
}
```

### Modes

| Value | What gets captured |
|---|---|
| Omitted (default) | Nothing |
| `'defaults'` | A predefined set of caching and content headers across all URLs |
| `HeaderCaptureRule[]` | Custom rules — see below |

### Default headers

`'defaults'` captures:

- **Response:** `Cache-Control`, `ETag`, `Age`, `Expires`, `Content-Type`, `Content-Encoding`, `Content-Length`, `Vary`, `Server-Timing`, `X-Cache`
- **Request:** `Cache-Control`, `Content-Type`

### Custom rules

Use an array of rules to control exactly which headers are captured and for which URLs:

```typescript
headerCaptureRules: [
    // Capture default headers everywhere
    { type: 'defaults' },

    // Capture a custom response header on a specific API
    {
        type: 'matchResponseHeaders',
        headers: ['x-request-id', 'x-ratelimit-remaining'],
        forURLs: ['api.example.com']
    },

    // Capture a custom request header on a path prefix
    {
        type: 'matchRequestHeaders',
        headers: ['x-device-id'],
        forURLs: ['api.example.com/v2']
    }
]
```

Each rule has a `type`:

| `type` | Captures from |
|---|---|
| `'defaults'` | Request + response (predefined set) |
| `'matchHeaders'` | Both request and response (named headers) |
| `'matchRequestHeaders'` | Request only |
| `'matchResponseHeaders'` | Response only |

The optional `forURLs` field scopes a rule to specific URL patterns. Supports hostname-only (`api.example.com`) or hostname + path prefix (`api.example.com/v2`). Omit it (or use `['*']`) to match all URLs.

- A hostname matches itself and its subdomains (`api.example.com` matches `cdn.api.example.com`), but never a hostname that only appears in the path or query of another URL.
- A path prefix matches whole path segments: `api.example.com/v2` matches `/v2` and `/v2/users`, but not `/v22`.
- URLs are matched the way HTTP clients resolve them: `..` and `.` segments (including `%2e` encodings) are resolved first, so `api.example.com/public/../private` does not match `api.example.com/public`. Equivalent hostname spellings are normalized (percent-encodings, fullwidth characters, `。`/`．`/`｡` label separators, extra slashes after `https:`), and a URL without a path (`https://api.example.com?x=1`) matches as `/`. Hostnames in `forURLs` are normalized the same way. Hostnames match case-insensitively, paths case-sensitively.

**Rule precedence:** when multiple rules match a URL, their header sets are merged. However, if at least one scoped rule (with explicit `forURLs` patterns) matches, catch-all rules (no `forURLs`, or a `forURLs` list containing `'*'`) are ignored for that URL. For example, `[{ type: 'defaults' }, { type: 'matchResponseHeaders', headers: ['x-request-id'], forURLs: ['api.example.com'] }]` captures only `x-request-id` on `api.example.com`, and the default headers everywhere else.

## Output

Captured headers appear as attributes on RUM resource events:

- `_dd.request_headers` — captured request headers
- `_dd.response_headers` — captured response headers

Header names use RFC Title-Case for default headers (`Cache-Control`, `ETag`, …) and preserve the casing from your rule's `headers` array for custom headers.

When nothing is captured these attributes are omitted entirely.

## Supported clients

Headers are captured for every request tracked by the SDK:

- **XHR** (`trackResources: true`) — covers React Native's built-in `fetch`, axios and any other XMLHttpRequest-based client.
- **Global Fetch** (`trackFetchResources: true`) — covers the Expo-installed global `fetch`. When the global `fetch` is backed by XHR, headers are reported once, on the Fetch resource. Direct imports retained from `expo/fetch` are not intercepted.

Fetch `Headers` lowercase header names, so on Fetch resources custom request headers use the casing from your rule's `headers` array rather than the casing passed to `fetch`.

Requests that fail without a response (aborted, network error) never report headers.

## Security

Two filters are always enforced, regardless of configuration:

**Sensitive header blocklist** — headers matching patterns like `token`, `cookie`, `secret`, `authorization`, `password`, `bearer`, `api-key`, `x-forwarded-for`, etc. are always blocked and never stored.

**SDK tracing headers** — the Datadog and W3C/B3 tracing headers injected by the SDK itself (`x-datadog-trace-id`, `traceparent`, `b3`, etc.) are always excluded.

## Size limits

To protect event size, the SDK enforces:

- **128 bytes** max per header value (values are truncated)
- **100 headers** max total (request + response combined)
- **2 048 bytes** max total across all header names and values

All limits are measured in UTF-8 bytes.
