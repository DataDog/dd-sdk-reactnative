/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export type AssertionResult = SuccessfulAssertion | FailedAssertion;

type SuccessfulAssertion = {
    name: string;
    status: 'PASSED';
};

type FailedAssertion = {
    name: string;
    status: 'FAILED';
    error: Error;
};

export type EventTypeAssertions = Record<string, Assertion>;
export type Assertion = (...args: any[]) => void;

export type EventTypeFinders = Record<string, Finder>;
export type Finder = (...args: any[]) => EventTypeAssertions | undefined;
