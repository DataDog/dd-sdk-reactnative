/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const mockGet = jest.fn();

jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: { get: (...args: unknown[]) => mockGet(...args) }
}));

describe('Vega transport import safety', () => {
    beforeEach(() => jest.clearAllMocks());

    it('does not resolve a native module when importing the package', () => {
        jest.isolateModules(() => {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            const sdk = require('../src');
            expect(sdk).not.toHaveProperty('startHttpProxy');
            expect(sdk).not.toHaveProperty('stopHttpProxy');
        });
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('does not look up metadata or install error handlers when importing setup hooks', () => {
        const handler = ErrorUtils.getGlobalHandler();
        const consoleHandler = console.error;
        jest.isolateModules(() => {
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            require('../src/ApplicationMetadata');
            // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
            require('../src/ErrorTracking');
        });
        expect(mockGet).not.toHaveBeenCalled();
        expect(ErrorUtils.getGlobalHandler()).toBe(handler);
        expect(console.error).toBe(consoleHandler);
    });

    it('resolves the transport module only when requested', () => {
        const native = { httpResponse: jest.fn() };
        mockGet.mockReturnValueOnce(native);
        // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
        const { getNativeDdSdk } = require('../src/turbo-modules/NativeDdSdk');
        expect(getNativeDdSdk()).toBe(native);
        expect(mockGet).toHaveBeenCalledWith('DdSdk');
    });
});
