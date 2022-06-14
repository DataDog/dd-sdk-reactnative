/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * In the tests, performance.now sometimes does not change as fast as Date.now.
 * This results in short intervals sometimes having a duration of 0ms and flaky tests.
 */
global.performance.now = () => {
    return Date.now();
};
