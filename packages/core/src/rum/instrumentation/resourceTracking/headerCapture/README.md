# Resource Header Capture

The Datadog React Native SDK can capture HTTP request and response headers on RUM resource events. This helps debug caching, CDN, and content negotiation issues without extra instrumentation.

Header capture is **disabled by default** and requires `trackResources: true`.

## Configuration

Set `headerCaptureRules` in your RUM configuration:

```typescript
import { DatadogProvider } from '@datadog/mobile-react-native';

DatadogProvider.initialize({
  // ...
  trackResources: true,
  headerCaptureRules: 'defaults',
});
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

**Rule precedence:** when multiple rules match a URL, their header sets are merged. However, if at least one scoped rule (with explicit `forURLs` patterns) matches, catch-all rules (no `forURLs` / `['*']`) are ignored for that URL.

## Output

Captured headers appear as attributes on RUM resource events:

- `_dd.request_headers` — captured request headers
- `_dd.response_headers` — captured response headers

Header names use RFC Title-Case for default headers (`Cache-Control`, `ETag`, …) and preserve the casing from your rule's `headers` array for custom headers.

When nothing is captured these attributes are omitted entirely.

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
