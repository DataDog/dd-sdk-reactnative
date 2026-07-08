// The boolean flag key demonstrated by the offline example.
export const OFFLINE_FLAG_KEY = 'rn-sdk-test-boolean-flag';

// Value type kept to JSON primitives so this is assignable to OpenFeature's
// `EvaluationContext` when passed to `OpenFeature.setContext`.
export type OfflineWireContext = {targetingKey?: string} & Record<
  string,
  string | number | boolean
>;

// The evaluation context the bundled configuration is precomputed for. This app also calls
// `OpenFeature.setContext` (see App.tsx), so the two MUST be identical — context matching is
// exact (targetingKey AND attributes). A mismatch surfaces PROVIDER_ERROR and the flag falls
// back to its default.
export const OFFLINE_CONTEXT: OfflineWireContext = {
  targetingKey: 'example-offline-user',
  favoriteFruit: 'apple',
};

/**
 * Build a bundled `ConfigurationWire` v1 string for the offline example.
 *
 * Mirrors the shape the Datadog Flags CDN returns, but is bundled with the app so the demo
 * is fully offline — it never hits the network. Flip `variationValue` to `false` to confirm
 * the flag's fallback renders.
 */
export const buildSampleWire = (
  context: OfflineWireContext = OFFLINE_CONTEXT,
  variationValue = true,
): string =>
  JSON.stringify({
    version: 1,
    precomputed: {
      context,
      response: JSON.stringify({
        data: {
          attributes: {
            obfuscated: false,
            flags: {
              [OFFLINE_FLAG_KEY]: {
                variationType: 'boolean',
                variationValue,
                variationKey: String(variationValue),
                allocationKey: 'offline-example-alloc',
                reason: 'STATIC',
                doLog: true,
                extraLogging: {},
              },
            },
          },
        },
      }),
    },
  });
