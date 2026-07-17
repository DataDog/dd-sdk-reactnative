// The flag key shared with the online example, so the UI is comparable across providers.
export const OFFLINE_FLAG_KEY = 'rn-sdk-test-boolean-flag';

export type OfflineWireContext = {targetingKey?: string} & Record<
  string,
  string | number | boolean
>;

// The evaluation context the bundled configuration is precomputed for. Because the wire
// carries its own context, the app does not need to call `OpenFeature.setContext` for the
// offline flow.
export const DEFAULT_OFFLINE_CONTEXT: OfflineWireContext = {
  targetingKey: 'example-offline-user',
};

/**
 * Build a bundled `ConfigurationWire` v1 string for the offline example.
 *
 * Mirrors the shape the Datadog Flags CDN returns, but is bundled with the app so the demo
 * is fully offline — it never hits the network. Flip `variationValue` to `false` to confirm
 * the flag's fallback renders.
 */
export const buildSampleWire = (
  context: OfflineWireContext = DEFAULT_OFFLINE_CONTEXT,
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
