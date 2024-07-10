/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as mock from '../../jest/mock';
import { DdLogs, DdRum, DdTrace, DdSdkReactNative } from '../index';

// 🚨 READ THIS FIRST IF THIS TEST IS FAILING
/*
 * This test is made to make sure the `jest/mock` file is complete.
 * If this test fails it can mean 2 possible things:
 *
 * 1. You added/renamed a private property to one of the tested class
 * In this case, add the private property to the list of private properties below.
 * There are not supposed to be used by our customers so they aren't mocked.
 *
 * 2. You added/renamed/deleted a public property from one of the tested class
 * In this case, make sure the public property is correctly mocked.
 * ⚠️ Only arrow functions will appear in properties!
 */

const privateProperties = {
    DdTrace: ['nativeTrace'],
    DdLogs: [
        'nativeLogs',
        'logEventMapper',
        'printLogDroppedSdkNotInitialized',
        'printLogDroppedByMapper',
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
    ],
    DdSdkReactNative: [
        'DD_SOURCE_KEY',
        'DD_SDK_VERSION',
        'DD_VERSION',
        'DD_VERSION_SUFFIX',
        'wasAutoInstrumented',
        'initializeNativeSDK',
        '_initializeFromDatadogProviderWithConfigurationAsync',
        'buildConfiguration'
    ]
};

const getPublicPropertiesFromModule = (
    module: Record<string, unknown>,
    moduleName: string
) => {
    return Object.keys(module).filter(
        key => !privateProperties[moduleName].includes(key)
    );
};

describe('official mock', () => {
    describe.each([{ DdTrace }, { DdLogs }, { DdRum }, { DdSdkReactNative }])(
        'mocks module: %s',
        moduleObject => {
            // We get the name of the module and the module from our object list
            const [moduleName, module] = Object.entries(moduleObject)[0];

            it.each(getPublicPropertiesFromModule(module, moduleName))(
                'for key: %s',
                key => {
                    expect(mock[moduleName][key]).not.toBeUndefined();
                }
            );
        }
    );
});
