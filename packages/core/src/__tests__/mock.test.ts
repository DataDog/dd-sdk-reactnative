/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as mock from '../../jest/mock';
import { DdLogs, DdTrace } from '../index';

const ignoredProperties = {
    DdTrace: ['nativeTrace'],
    DdLogs: [
        'nativeLogs',
        'logEventMapper',
        'printLogDroppedSdkNotInitialized',
        'printlogDroppedByMapper',
        'printLogTracked',
        'log',
        'logWithError'
    ]
};

describe('official mock', () => {
    describe.each([{ DdTrace }, { DdLogs }])(
        'mocks module: %s',
        moduleObject => {
            const [moduleName, module] = Object.entries(moduleObject)[0];
            it.each(
                Object.getOwnPropertyNames(module).filter(
                    key => !ignoredProperties[moduleName].includes(key)
                )
            )('for key: %s', key => {
                expect(mock[moduleName][key]).not.toBeUndefined();
            });
        }
    );
});
