// The flag key shared with the online example, so the UI is comparable across providers.
export const OFFLINE_FLAG_KEY = 'rn-sdk-test-boolean-flag';

export const DYNAMIC_OFFLINE_CONTEXTS = {
  included: {
    targetingKey: 'example-offline-user-a',
    country: 'US',
  },
  excluded: {
    targetingKey: 'example-offline-user-b',
    country: 'CA',
  },
};

/**
 * Build a bundled rules `ConfigurationWire` string.
 *
 * The example is fully offline. It evaluates the same rules for each new
 * OpenFeature context. It does not fetch assignments.
 */
export const buildSampleWire = (): string =>
  JSON.stringify({
    version: 1,
    rulesBased: {
      // TODO(FFL-2837): Replace this JSON rules fixture with the published
      // portable wire fixture when flagging-core publishes the final format.
      response: JSON.stringify({
        createdAt: '2026-07-23T12:00:00.000Z',
        format: 'SERVER',
        environment: {name: 'example'},
        flags: {
          [OFFLINE_FLAG_KEY]: {
            key: OFFLINE_FLAG_KEY,
            enabled: true,
            variationType: 'BOOLEAN',
            variations: {
              enabled: {key: 'enabled', value: true},
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
                        value: ['US'],
                      },
                    ],
                  },
                ],
                splits: [
                  {
                    variationKey: 'enabled',
                    serialId: 1,
                    extraLogging: {
                      source: 'dynamic-offline-example',
                    },
                    shards: [
                      {
                        salt: 'offline-example-salt',
                        ranges: [{start: 0, end: 100}],
                        totalShards: 100,
                      },
                    ],
                  },
                ],
                doLog: true,
              },
            ],
          },
        },
      }),
    },
  });
