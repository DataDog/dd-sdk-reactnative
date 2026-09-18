/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { __ddEnrichEvaluationContextWithRumUser } from '@datadog/mobile-react-native';
import type { EvaluationContext } from '@openfeature/web-sdk';

import type { EnrichableEvaluationContext } from '../../index';
import { enrichRumContext } from '../../index';

// Compiled, not executed: valid inputs must compile, and invalid inputs must stay rejected.
export const checkRumContextTypes = (optionalId: string | undefined) => {
    const applicationContext: EnrichableEvaluationContext = {
        targetingKey: optionalId,
        email: undefined,
        plan: undefined,
        region: 'us-east-1',
        profile: { tier: 'pro' },
        roles: ['admin'],
        createdAt: new Date(),
        active: true,
        age: 42,
        nullable: null
    };
    const existingContext: EvaluationContext = { targetingKey: 'user-123' };
    const emailTombstone = { email: undefined };
    const optionalTargetingKey = { targetingKey: optionalId, region: 'us' };

    const results: EvaluationContext[] = [
        enrichRumContext(applicationContext),
        enrichRumContext(existingContext),
        enrichRumContext({}),
        enrichRumContext({ email: undefined, plan: undefined }),
        enrichRumContext(emailTombstone),
        enrichRumContext({ targetingKey: undefined }),
        enrichRumContext(optionalTargetingKey)
    ];

    // @ts-expect-error A targeting key must be a string or undefined.
    enrichRumContext({ targetingKey: 42 });
    // @ts-expect-error Functions are not OpenFeature context values.
    enrichRumContext({ callback: () => true });
    // @ts-expect-error Tombstones only apply to top-level attributes.
    enrichRumContext({ profile: { tier: undefined } });

    const coreResult = __ddEnrichEvaluationContextWithRumUser({
        email: undefined
    });
    // @ts-expect-error Enrichment does not preserve the input's exact shape.
    const unchangedShape: { email: undefined } = coreResult;

    return { results, unchangedShape };
};
