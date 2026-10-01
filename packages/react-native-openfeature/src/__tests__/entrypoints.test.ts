/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable global-require */

jest.mock('../../../core/src/specs/NativeDdFlags', () => ({
    __esModule: true,
    default: {
        enable: jest.fn(() => Promise.resolve()),
        setEvaluationContext: jest.fn(() => Promise.resolve({})),
        trackEvaluation: jest.fn(() => Promise.resolve())
    }
}));

// The rules parser loads Protobuf-ES. Only the `/rules-based` entry may load it.
jest.mock('@datadog/flagging-core/rules-based', () => {
    throw new Error('rules-based parser loaded');
});

describe('package entry points', () => {
    it('keeps the rules-based parser out of the main entry', () => {
        expect(() =>
            jest.isolateModules(() => require('../index'))
        ).not.toThrow();
    });

    it('loads the rules-based parser from the rules-based entry', () => {
        expect(() =>
            jest.isolateModules(() => require('../rules-based'))
        ).toThrow('rules-based parser loaded');
    });
});
