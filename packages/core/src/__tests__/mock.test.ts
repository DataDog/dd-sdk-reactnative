/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as mock from '../../jest/mock';
import { DdTrace } from '../index';

const ignoredProperties = {
    DdTrace: ['nativeTrace']
};

describe('official mock', () => {
    describe.each([{ DdTrace }])('mocks module: %s', moduleObject => {
        const [moduleName, module] = Object.entries(moduleObject)[0];
        it.each(Object.getOwnPropertyNames(module))('for key: %s', key => {
            if (!ignoredProperties[moduleName].includes(key)) {
                expect(mock[moduleName][key]).not.toBeUndefined();
            }
        });
    });
});
