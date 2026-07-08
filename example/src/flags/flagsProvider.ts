import {
    DatadogOpenFeatureProvider,
    DatadogOfflineOpenFeatureProvider,
    configurationFromString
} from '@datadog/mobile-react-native-openfeature';
import { OpenFeature } from '@openfeature/react-sdk';

import { buildSampleWire } from './sampleOfflineConfiguration';
import type { OfflineWireContext } from './sampleOfflineConfiguration';

export type FlagsSource = 'online' | 'offline';

/**
 * Select which OpenFeature provider backs flag evaluations, and (re)set it at runtime.
 *
 * - `offline`: loads a bundled `ConfigurationWire` into `DatadogOfflineOpenFeatureProvider`
 *   **before** setting it, so flags resolve immediately with no network request.
 * - `online`: the standard `DatadogOpenFeatureProvider`, which fetches assignments from the CDN.
 *
 * `DdFlags.enable()` must have been called once before this (it enables the native feature).
 */
export const setFlagsProvider = async (
    source: FlagsSource,
    offlineContext?: OfflineWireContext
): Promise<void> => {
    if (source === 'offline') {
        const provider = new DatadogOfflineOpenFeatureProvider();
        provider.setConfiguration(
            configurationFromString(buildSampleWire(offlineContext))
        );
        await OpenFeature.setProviderAndWait(provider);
        return;
    }

    await OpenFeature.setProviderAndWait(new DatadogOpenFeatureProvider());
};
