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
        rules: {
            // One base64 encoding of a UFC protobuf response. It contains
            // OFFLINE_FLAG_KEY, targets country=US, and shards on targetingKey.
            response:
                'EgdleGFtcGxlGnkKGHJuLXNkay10ZXN0LWJvb2xlYW4tZmxhZxJdEAQaAigBGgQIASgAIjAKEHJ1bGVzLWFsbG9jYXRpb24QABoMEgoKBHNhbHQQARhkIgoKBAgAEGQYByABKAEiHQoTZmFsbGJhY2stYWxsb2NhdGlvbiIGEAEYCCAEIgYSBAoCCAIiAgoAKgdlbmFibGVkKghkaXNhYmxlZCoHY291bnRyeSoCVVNKBSoDEgED'
        }
    });
