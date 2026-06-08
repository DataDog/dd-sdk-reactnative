# Resource Header Capture

The Datadog React Native SDK can capture HTTP request and response headers on RUM resource events. This helps debug caching, CDN, and content negotiation issues without manual instrumentation.

## Configuration

Header capture is **disabled by default**. Enable it via the `headerCaptureRules` option in your RUM configuration:

```typescript
// Capture a predefined set of caching/content headers across all URLs
headerCaptureRules: 'defaults'

// Composable rules — mix defaults and custom header/URL targets
headerCaptureRules: [
    { type: 'defaults' },
    {
        type: 'matchResponseHeaders',
        headers: ['x-request-id', 'x-trace-id'],
        forURLs: ['api.example.com']
    }
]

// Disabled (default behavior — omit the option entirely)
// headerCaptureRules: undefined
```

### Rule types

`headerCaptureRules` accepts either the string shortcut `'defaults'` or an array of `HeaderCaptureRule` objects. Each rule is discriminated by its `type` field:

| `type` | Headers captured |
|---|---|
| `'defaults'` | A predefined set of caching and content headers (request + response) |
| `'matchHeaders'` | The specified header names from both request and response |
| `'matchRequestHeaders'` | The specified header names from requests only |
| `'matchResponseHeaders'` | The specified header names from responses only |

```typescript
type HeaderCaptureRule =
    | { type: 'defaults'; forURLs?: string[] }
    | { type: 'matchHeaders'; headers: string[]; forURLs?: string[] }
    | { type: 'matchRequestHeaders'; headers: string[]; forURLs?: string[] }
    | { type: 'matchResponseHeaders'; headers: string[]; forURLs?: string[] }
```

The optional `forURLs` field scopes the rule to specific URL patterns. Supports hostname-only (`api.example.com`), hostname + path prefix (`api.example.com/v2`), or wildcard (`*`) to match all URLs. This is the same format used by `firstPartyHosts`. Omitting `forURLs` is equivalent to `['*']`.

When multiple rules match a URL, their header sets are **merged additively** (union of all matching headers). If at least one scoped rule matches, catch-all rules (omitted `forURLs` / `['*']`) are ignored for that URL.
### Default headers

When using `'defaults'` (or `{ type: 'defaults' }`), the SDK captures:

**10 response headers:**
`Cache-Control`, `ETag`, `Age`, `Expires`, `Content-Type`, `Content-Encoding`, `Content-Length`, `Vary`, `Server-Timing`, `X-Cache`

**2 request headers:**
`Cache-Control`, `Content-Type`

## Output format

Captured headers appear as context attributes on `stopResource` events:

- `_dd.request_headers` — `Record<string, string>` of captured request headers
- `_dd.response_headers` — `Record<string, string>` of captured response headers

When no headers are captured (disabled mode, no matching URL rules, or empty result after filtering), these attributes are **omitted entirely** rather than set to empty objects.

### Header name casing

- **Default headers** use RFC Title-Case: `Cache-Control`, `ETag`, `Content-Type`, etc.
- **Custom headers** (`matchHeaders`, `matchRequestHeaders`, `matchResponseHeaders`) use the casing exactly as specified in the `headers` array of the rule. Request headers additionally preserve the casing used in the original `setRequestHeader` call.

## Constraints and behavior details

### Size limits

To prevent runaway event sizes, the SDK enforces the following hard limits after all filtering:

- **Per-value cap:** 128 characters per header value (values exceeding this are truncated)
- **Header count cap:** 100 headers total (request + response combined)
- **Total size cap:** 2 048 characters across all header names and values
### Duplicate headers

- **Response headers:** If a response contains duplicate header names, the **last value wins**.
- **Request headers:** If `setRequestHeader` is called multiple times with the same header name, the **last value wins**.

### Whitespace handling

Leading and trailing whitespace is **trimmed** from header values. For example, `"  text/html  "` becomes `"text/html"`.

### Malformed response headers

Lines from `getAllResponseHeaders()` that lack a colon separator, have an empty name, or are otherwise malformed are **silently skipped**. The SDK never throws on malformed header input.

### Null or empty responses

If `getAllResponseHeaders()` returns `null` or an empty string (e.g. due to a network error or CORS restriction), the result is treated as an empty set. Since empty results are omitted, no `_dd.response_headers` attribute will appear on the event.

### Aborted requests

Response header capture is **skipped entirely** on aborted requests (XHR status 0). Request headers accumulated before the abort are also discarded.

## Security filtering

Two layers of non-overridable filtering are always applied, regardless of configuration. Security filtering runs **before** any URL rule matching.

### Sensitive header blocklist

Headers whose names match the following pattern are **always blocked**, even if explicitly listed in a custom rule:

```
/(?:token|cookie|secret|authorization|password|credential|bearer|
(?:api|secret|access|app).?key|forwarded|real.?ip|connecting.?ip|client.?ip)/i
```

This blocks headers such as `Authorization`, `Cookie`, `Set-Cookie`, `X-Access-Token`, `X-Amz-Security-Token`, `X-Api-Key`, `X-Forwarded-For`, `X-Real-IP`, and any header whose name contains `password`, `secret`, `credential`, or `bearer`.

The match is **case-insensitive** and applies to **partial name matches** — a header named `x-custom-token-id` would be blocked because it contains `token`.

Sensitive headers are filtered at capture time and are **never stored in memory**, even briefly.

### SDK tracing header exclusion

The 12 headers injected by the SDK's distributed tracing system are **always excluded** from capture:

| Header | Protocol |
|--------|----------|
| `x-datadog-sampling-priority` | Datadog |
| `x-datadog-origin` | Datadog |
| `x-datadog-trace-id` | Datadog |
| `x-datadog-parent-id` | Datadog |
| `x-datadog-tags` | Datadog |
| `traceparent` | W3C / OpenTelemetry |
| `tracestate` | W3C / OpenTelemetry |
| `baggage` | W3C / OpenTelemetry |
| `b3` | B3 Single |
| `x-b3-traceid` | B3 Multi |
| `x-b3-spanid` | B3 Multi |
| `x-b3-sampled` | B3 Multi |

## Configuration lifecycle

- The compiled header capture configuration is **snapshotted per request** at `open()` time. In-flight requests are unaffected by configuration changes.
- Configuration changes take effect on the **next request** — no SDK restart required.
- When `headerCaptureRules` is omitted, the capture path is not entered at all — **zero overhead** on the network hot path.

## Fetch support

React Native's `fetch` API uses `XMLHttpRequest` under the hood. All fetch requests go through the same XHR interception pipeline and benefit from header capture identically to direct XHR usage.
