# Resource Header Capture

The Datadog React Native SDK can capture HTTP request and response headers on RUM resource events. This helps debug caching, CDN, and content negotiation issues without manual instrumentation.

## Configuration

Header capture is **disabled by default**. Enable it via the `trackResourceHeaders` option in your RUM configuration:

```typescript
// Capture a predefined set of caching/content headers
trackResourceHeaders: 'defaults'

// Capture specific headers for specific URLs
trackResourceHeaders: {
    custom: [
        {
            match: 'api.example.com',
            requestHeaderNames: ['x-request-id'],
            responseHeaderNames: ['etag', 'cache-control']
        }
    ]
}

// Disabled (default behavior)
trackResourceHeaders: 'disabled'
```

### Custom Rules

Each rule specifies a URL pattern and the header names to capture:

```typescript
type HeaderCaptureRule = {
    match: string;                    // URL pattern (same format as firstPartyHosts)
    requestHeaderNames?: string[];    // Request headers to capture
    responseHeaderNames?: string[];   // Response headers to capture
};
```

The `match` field supports hostname-only (`api.example.com`), hostname+path prefix (`api.example.com/v2`), or wildcard (`*`) to match all URLs. This is the same format used by `firstPartyHosts`.

When multiple rules could match a URL, **the first matching rule wins**.

### Default Headers

When using `'defaults'` mode, the SDK captures:

**10 response headers:**
`cache-control`, `etag`, `age`, `expires`, `content-type`, `content-encoding`, `content-length`, `vary`, `server-timing`, `x-cache`

**2 request headers:**
`cache-control`, `content-type`

## Output Format

Captured headers appear as context attributes on `stopResource` events:

- `_dd.request_headers` — `Record<string, string>` of captured request headers
- `_dd.response_headers` — `Record<string, string>` of captured response headers

When no headers are captured (disabled mode, no matching URL rules, or empty result), these attributes are **omitted entirely** rather than set to empty objects.

## Constraints and Behavior Details

### Header Name Normalization

All header names in the output are **lowercased**, regardless of how the server or application originally cased them. `Content-Type` and `content-type` both appear as `content-type` in the captured output.

### Duplicate Headers

- **Response headers:** If a response contains duplicate header names (e.g., multiple `Set-Cookie`), the **last value wins**.
- **Request headers:** If `setRequestHeader` is called multiple times with the same header name, the **last value wins**.

### Whitespace Handling

Leading and trailing whitespace is **trimmed** from header values. For example, `"  text/html  "` becomes `"text/html"`.

### Malformed Response Headers

Lines from `getAllResponseHeaders()` that lack a colon separator, have an empty name, or are otherwise malformed are **silently skipped**. The SDK never throws on malformed header input.

### Null or Empty Responses

If `getAllResponseHeaders()` returns `null` or an empty string (e.g., due to a network error or CORS restriction), the result is an empty object. Since empty results are omitted, no `_dd.response_headers` attribute will appear on the event.

### Aborted Requests

Response header capture is **skipped entirely** on aborted requests (XHR status 0). Request headers that were accumulated before the abort are also discarded.

### Security Filtering

The SDK enforces two layers of security filtering that **cannot be overridden** by configuration:

#### Sensitive Header Blocklist

Headers matching the following pattern are **always blocked**, even if explicitly listed in a custom rule:

```
/(?:token|cookie|secret|authorization|password|credential|bearer|
(?:api|secret|access|app).?key|forwarded|real.?ip|connecting.?ip|client.?ip)/i
```

This blocks headers like `Authorization`, `Cookie`, `Set-Cookie`, `x-access-token`, `x-amz-security-token`, `x-api-key`, `X-Forwarded-For`, `X-Real-IP`, and any header containing `password`, `secret`, `credential`, or `bearer` in its name.

The match is **case-insensitive** and applies to partial name matches (a header named `x-custom-token-id` would be blocked because it contains `token`).

#### SDK Tracing Header Exclusion

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

#### Filter Order

Security filtering is applied **before** URL rule matching. The pipeline is: capture raw header -> security filter (blocklist + tracing exclusion) -> mode/rule filter (defaults set or custom rule).

### Request Header Capture Timing

Request headers are filtered by the security blocklist **at capture time** — sensitive headers are never stored in memory, even briefly. However, URL-based rule filtering is applied **at request completion** (when the final URL is known), since the URL may change between `setRequestHeader` calls and request completion.

### Configuration Lifecycle

- The compiled header capture configuration is **snapshotted per request** at `open()` time. In-flight requests are unaffected by configuration changes.
- Configuration changes take effect on the **next request** — no SDK restart required.
- When disabled, no interception hooks are installed for header capture — **zero overhead** on the network hot path.

### Fetch Support

React Native's `fetch` API uses `XMLHttpRequest` under the hood. All fetch requests go through the same XHR interception pipeline and benefit from header capture identically to direct XHR usage.
