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
            require('../src');
        });
        expect(mockGet).not.toHaveBeenCalled();
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
