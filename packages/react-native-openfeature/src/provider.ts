/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    EvaluationContext as OFEvaluationContext,
    ProviderMetadata
} from '@openfeature/web-sdk';

import { DatadogCoreOpenFeatureProvider, toDdContext } from './coreProvider';

export type { DatadogOpenFeatureProviderOptions } from './coreProvider';

/**
 * The online Datadog OpenFeature provider. Fetches precomputed flag assignments from Datadog
 * whenever the evaluation context is set or changed.
 */
export class DatadogOpenFeatureProvider extends DatadogCoreOpenFeatureProvider {
    readonly metadata: ProviderMetadata = {
        name: 'datadog-react-native'
    };

    private contextChangePromise = Promise.resolve();

    async initialize(context: OFEvaluationContext = {}): Promise<void> {
        const ddContext = toDdContext(context);
        this.contextChangePromise = this.flagsClient.setEvaluationContext(
            ddContext
        );

        await this.contextChangePromise;
    }

    async onContextChange(
        _oldContext: OFEvaluationContext,
        newContext: OFEvaluationContext
    ): Promise<void> {
        const newDdContext = toDdContext(newContext);

        // Promise chain in case `onContextChange` is called multiple times.
        this.contextChangePromise = this.contextChangePromise.then(() => {
            return this.flagsClient.setEvaluationContext(newDdContext);
        });

        // Wait for the current context change to complete.
        await this.contextChangePromise;
    }
}
