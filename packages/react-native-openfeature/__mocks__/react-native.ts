/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const actualRN = require('react-native');

actualRN.NativeModules.DdFlags = {
    enable: jest.fn(() => Promise.resolve()),
    setEvaluationContext: jest.fn(() => Promise.resolve({})),
    trackEvaluation: jest.fn(() => Promise.resolve())
};

module.exports = actualRN;
