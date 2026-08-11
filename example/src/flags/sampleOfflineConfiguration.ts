// The flag key shared with the online example, so the UI is comparable across providers.
export const OFFLINE_FLAG_KEY = 'rn-sdk-test-boolean-flag';

export const DYNAMIC_OFFLINE_CONTEXTS = {
    included: {
        targetingKey: 'example-offline-user-a',
        country: 'US'
    },
    excluded: {
        targetingKey: 'example-offline-user-b',
        country: 'CA'
    }
};

/**
 * Build a complete bundled portable rules `ConfigurationWire` string.
 *
 * The example is fully offline. It evaluates the same rules for each new
 * OpenFeature context. It does not fetch a UFC response or build a wire at runtime.
 */
export const buildSampleWire = (): string =>
    JSON.stringify({
        version: 1,
        // TODO(FFL-2837): Replace this complete legacy `rulesBased` JSON branch
        // after a published flagging-core release contains
        // DataDog/openfeature-js-client#344 through `03cde21` and restores
        // 32-byte SHA digest validation. Safe integer conversion no longer calls
        // global `BigInt`; retain tests for unsafe integers and shard values.
        // The `03cde21` tree is identical to the previous `939da97` tree. Commits
        // `1db13d4` and `03cde21` only refresh generated Node-server declarations
        // and isolate browser provider tests. They do not change the portable wire
        // or runtime contract. Reuse the production-derived client
        // fixture from the integration test: one base64 encoding of the canonical
        // dd-source#34959 protobuf bytes in a version 1 `rules.response` envelope.
        // Record dd-source#40304 commit `071c4ad` as its schema revision. Let the
        // upstream configuration subpath decode it. Do not use the protobuf-free
        // precomputed subpath, raw protobuf, the legacy service JSON response, or a
        // local strict base64 validator here.
        // The final fixture must preserve protobuf integers as `bigint`, return
        // `PARSE_ERROR` for unsafe number conversion, tolerate unknown fields,
        // preserve them through `configurationToString`, return flag-scoped
        // `PARSE_ERROR` for an unsupported feature level, and work without the
        // global `BigInt` function.
        rulesBased: {
            response: JSON.stringify({
                createdAt: '2026-07-23T12:00:00.000Z',
                format: 'SERVER',
                environment: { name: 'example' },
                flags: {
                    [OFFLINE_FLAG_KEY]: {
                        key: OFFLINE_FLAG_KEY,
                        enabled: true,
                        variationType: 'BOOLEAN',
                        variations: {
                            enabled: { key: 'enabled', value: true }
                        },
                        allocations: [
                            {
                                key: 'offline-example-alloc',
                                rules: [
                                    {
                                        conditions: [
                                            {
                                                operator: 'ONE_OF',
                                                attribute: 'country',
                                                value: ['US']
                                            }
                                        ]
                                    }
                                ],
                                splits: [
                                    {
                                        variationKey: 'enabled',
                                        serialId: 1,
                                        shards: [
                                            {
                                                salt: 'offline-example-salt',
                                                ranges: [
                                                    { start: 0, end: 100 }
                                                ],
                                                totalShards: 100
                                            }
                                        ]
                                    }
                                ],
                                doLog: true
                            }
                        ]
                    }
                }
            })
        }
    });
