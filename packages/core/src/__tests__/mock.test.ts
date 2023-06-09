/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as mock from '../../jest/mock';
import { DdLogs, DdRum, DdTrace } from '../index';

const privateProperties = {
    DdTrace: ['nativeTrace'],
    DdLogs: [
        'nativeLogs',
        'logEventMapper',
        'printLogDroppedSdkNotInitialized',
        'printlogDroppedByMapper',
        'printLogTracked',
        'log',
        'logWithError'
    ],
    DdRum: [
        'nativeRum',
        'errorEventMapper',
        'resourceEventMapper',
        'actionEventMapper',
        'callNativeStopAction',
        'getStopActionNativeCallArgs'
    ]
};

describe('official mock', () => {
    describe.each([{ DdTrace }, { DdLogs }, { DdRum }])(
        'mocks module: %s',
        moduleObject => {
            const [moduleName, module] = Object.entries(moduleObject)[0];
            it.each(
                Object.getOwnPropertyNames(module).filter(
                    key => !privateProperties[moduleName].includes(key)
                )
            )('for key: %s', key => {
                expect(mock[moduleName][key]).not.toBeUndefined();
            });
        }
    );
});
