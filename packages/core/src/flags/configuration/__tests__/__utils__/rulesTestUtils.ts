/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://github.com/DataDog).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    RulesConfigurationResponse,
    RulesEngine,
    RulesEvaluationDetails,
    RulesEvaluationRequest,
    RulesValueType
} from '../../rules';
import { configurationFromString } from '../../wire';

// A complete protobuf response from the flagging-core 3.0.0 wire contract.
// It contains one static boolean flag with the key `dynamic-flag`.
export const RULES_RESPONSE =
    'EgRwcm9kGigKDGR5bmFtaWMtZmxhZxIYEAQaAigBIhAKCmFsbG9jYXRpb24iAiADKgJvbg==';

export const buildRulesWire = (response: string = RULES_RESPONSE): string =>
    JSON.stringify({
        version: 1,
        rules: { response, fetchedAt: 1731939819456, etag: 'rules-etag' }
    });

export const buildRulesConfiguration = (): RulesConfigurationResponse => {
    const response = configurationFromString(buildRulesWire()).rules?.response;
    if (!response) {
        throw new Error('The rules test fixture could not be decoded.');
    }
    return response;
};

type FakeRulesEvaluation = RulesEvaluationDetails<unknown>;

export interface FakeRulesEngine extends RulesEngine {
    evaluate: jest.Mock<
        FakeRulesEvaluation,
        [RulesEvaluationRequest<RulesValueType>]
    >;
}

// Client tests use this fake to control evaluation independently of the
// flagging-core implementation and its canonical integration vectors.
export const createFakeRulesEngine = (
    result: FakeRulesEvaluation
): FakeRulesEngine => {
    return {
        evaluate: jest.fn(() => result)
    } as FakeRulesEngine;
};
