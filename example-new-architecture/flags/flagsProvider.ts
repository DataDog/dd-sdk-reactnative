import {
  DatadogOpenFeatureProvider,
  DatadogOfflineOpenFeatureProvider,
  configurationFromString,
  getPrecomputedContext,
} from '@datadog/mobile-react-native-openfeature';
import {OpenFeature} from '@openfeature/react-sdk';

import {buildSampleWire} from './sampleOfflineConfiguration';

export type FlagsSource = 'online' | 'offline';

/**
 * Select which OpenFeature provider backs flag evaluations, and (re)set it at runtime.
 *
 * - `offline`: loads a bundled `ConfigurationWire` into `DatadogOfflineOpenFeatureProvider`
 *   **before** setting it, so flags resolve immediately with no network request.
 * - `online`: the standard `DatadogOpenFeatureProvider`, which fetches assignments from the CDN.
 *
 * The two providers use distinct `clientName`s so each is backed by its own `FlagsClient`.
 * Sharing one client across the offline and online modes is unsupported (an online fetch would
 * discard the offline configuration).
 *
 * `DdFlags.enable()` must have been called once before this (it enables the native feature).
 */
export const setFlagsProvider = async (source: FlagsSource): Promise<void> => {
  if (source === 'offline') {
    const configuration = configurationFromString(buildSampleWire());
    const context = getPrecomputedContext(configuration);

    if (context !== undefined) {
      await OpenFeature.setContext(context);
    }

    const provider = new DatadogOfflineOpenFeatureProvider({
      clientName: 'offline',
    });
    provider.setConfiguration(configuration);
    await OpenFeature.setProviderAndWait(provider);
    return;
  }

  await OpenFeature.setProviderAndWait(
    new DatadogOpenFeatureProvider({clientName: 'online'}),
  );
};
