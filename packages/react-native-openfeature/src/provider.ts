/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as DatadogSdk from '@datadog/mobile-react-native';
import type {
    EvaluationContext as OFEvaluationContext,
    ProviderMetadata
} from '@openfeature/web-sdk';

import { DatadogCoreOpenFeatureProvider } from './coreProvider';
import { toDdContext } from './mappers';

export type { DatadogOpenFeatureProviderOptions } from './coreProvider';

type RumContextEnricher = (context: OFEvaluationContext) => OFEvaluationContext;

const rumContextEnricher = (DatadogSdk as {
    __ddEnrichEvaluationContextWithRumUser?: RumContextEnricher;
}).__ddEnrichEvaluationContextWithRumUser;

const enrichEvaluationContextWithRumUser = (
    context: OFEvaluationContext
): OFEvaluationContext => {
    // The OpenFeature package supports older compatible core SDK versions. Enrichment is available
    // when the installed core exposes the integration helper; otherwise preserve existing behavior.
    return typeof rumContextEnricher === 'function'
        ? rumContextEnricher(context)
        : context;
};

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
        const ddContext = toDdContext(
            enrichEvaluationContextWithRumUser(context)
        );
        this.contextChangePromise = this.flagsClient.setEvaluationContext(
            ddContext
        );

        await this.contextChangePromise;
    }

    async onContextChange(
        _oldContext: OFEvaluationContext,
        newContext: OFEvaluationContext
    ): Promise<void> {
        const newDdContext = toDdContext(
            enrichEvaluationContextWithRumUser(newContext)
        );

        // Promise chain in case `onContextChange` is called multiple times.
        this.contextChangePromise = this.contextChangePromise.then(() => {
            return this.flagsClient.setEvaluationContext(newDdContext);
        });

        // Wait for the current context change to complete.
        await this.contextChangePromise;
    }
}
