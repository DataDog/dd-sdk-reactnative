import { DdBabelInteractionTracking } from '../rum/instrumentation/interactionTracking/DdBabelInteractionTracking';

export const getBabelTelemetryConfig = () => {
    return {
        babel_plugin: {
            enabled: !!globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__,
            track_interactions: !!DdBabelInteractionTracking.trackInteractions
        }
    };
};
