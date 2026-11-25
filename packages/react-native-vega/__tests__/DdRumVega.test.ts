/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { AttributesSingleton } from '@datadog/mobile-react-native/internal';

import { DdRum, DdSdkReactNative } from '../src';

const mockRum = Object.fromEntries(
    [
        'startView',
        'stopView',
        'startAction',
        'stopAction',
        'addAction',
        'startResource',
        'stopResource',
        'addError',
        'addViewAttribute',
        'removeViewAttribute',
        'addViewAttributes',
        'removeViewAttributes',
        'reportAppFullyDisplayed',
        'stopSession',
        'startFeatureOperation',
        'succeedFeatureOperation',
        'failFeatureOperation'
    ].map(name => [name, jest.fn()])
);
const mockSdk = Object.fromEntries(
    [
        'addAttribute',
        'removeAttribute',
        'addAttributes',
        'removeAttributes'
    ].map(name => [name, jest.fn()])
);
const mockGet = jest.fn();
jest.mock('@amazon-devices/keplerscript-turbomodule-api', () => ({
    TurboModuleRegistry: { get: (...args: unknown[]) => mockGet(...args) }
}));

const context = {
    number: 42.5,
    bool: false,
    nil: null,
    list: [1, 'two'],
    object: { value: 3 }
};

describe('Vega manual RUM APIs', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        AttributesSingleton.reset();
        jest.spyOn(Date, 'now').mockReturnValue(1234);
        mockGet.mockImplementation(name =>
            name === 'DdRum' ? mockRum : mockSdk
        );
    });
    afterEach(() => jest.restoreAllMocks());

    it.each([
        ['startView', ['key', 'name'], ['key', 'name', {}, 1234]],
        ['stopView', ['key'], ['key', {}, 1234]],
        ['startAction', ['TAP', 'name'], ['TAP', 'name', {}, 1234]],
        ['stopAction', ['CUSTOM', 'name'], ['CUSTOM', 'name', {}, 1234]],
        ['addAction', ['SCROLL', 'name'], ['SCROLL', 'name', {}, 1234]],
        [
            'startResource',
            ['key', 'POST', 'https://example.com'],
            ['key', 'POST', 'https://example.com', {}, 1234]
        ],
        [
            'stopResource',
            ['key', 201, 'xhr'],
            ['key', 201, 'xhr', -1, {}, 1234]
        ],
        [
            'addError',
            ['message', 'SOURCE', 'stack'],
            [
                'message',
                'SOURCE',
                'stack',
                { '_dd.error.source_type': 'react-native' },
                1234,
                ''
            ]
        ],
        [
            'startView',
            ['key', 'name', context, 99],
            ['key', 'name', context, 99]
        ],
        [
            'stopResource',
            ['key', 202, 'fetch', 128, context, 99],
            ['key', 202, 'fetch', 128, context, 99]
        ],
        [
            'addError',
            ['message', 'NETWORK', 'stack', context, 99, 'group'],
            [
                'message',
                'NETWORK',
                'stack',
                { ...context, '_dd.error.source_type': 'react-native' },
                99,
                'group'
            ]
        ],
        ['addViewAttributes', [context], [context]],
        ['removeViewAttribute', ['key'], ['key']],
        ['removeViewAttributes', [['key', 'other']], [['key', 'other']]],
        ['reportAppFullyDisplayed', [], []],
        ['stopSession', [], []],
        ['startFeatureOperation', ['login', null], ['login', '', {}]],
        [
            'succeedFeatureOperation',
            ['login', 'key', context],
            ['login', 'key', context]
        ],
        [
            'failFeatureOperation',
            ['login', null, 'ABANDONED', context],
            ['login', '', 'ABANDONED', context]
        ]
    ])('forwards %s arguments', async (method, args, expected) => {
        await (DdRum[method as keyof typeof DdRum] as (
            ...values: unknown[]
        ) => Promise<void>)(...args);
        expect(mockGet).toHaveBeenCalledWith('DdRum');
        expect(mockRum[method]).toHaveBeenCalledWith(...expected);
    });

    it.each([null, false, 0, 'text', [1, null], { value: { nested: true } }])(
        'wraps a singular view attribute without changing its value: %p',
        async value => {
            await DdRum.addViewAttribute('key', value);
            expect(mockRum.addViewAttribute).toHaveBeenCalledWith('key', {
                value
            });
        }
    );

    it('handles unavailable, throwing, and rejecting bridges without failing the app', async () => {
        mockGet.mockReturnValueOnce(null).mockImplementationOnce(() => {
            throw new Error('lookup');
        });
        await expect(DdRum.startView('key', 'name')).resolves.toBeUndefined();
        await expect(DdRum.stopSession()).resolves.toBeUndefined();
        mockRum.addAction.mockImplementationOnce(() => {
            throw new Error('bridge');
        });
        await expect(
            DdRum.addAction('CUSTOM', 'action')
        ).resolves.toBeUndefined();
        mockRum.stopSession.mockRejectedValueOnce(new Error('native'));
        await expect(DdRum.stopSession()).resolves.toBeUndefined();
        await DdRum.startView('retry', 'retry');
        expect(mockRum.startView).toHaveBeenCalledWith(
            'retry',
            'retry',
            {},
            1234
        );
    });

    it('keeps unsupported APIs safe and does not resolve a native module for them', async () => {
        await DdRum.addTiming('ready');
        await DdRum.addViewLoadingTime(true);
        await DdRum.addFeatureFlagEvaluation('flag', true);
        await expect(DdRum.getCurrentSessionId()).resolves.toBeUndefined();
        expect(mockGet).not.toHaveBeenCalled();
    });

    it('adds, replaces, and removes global attributes in native and shared JS context', async () => {
        await DdSdkReactNative.addAttributes(context);
        expect(mockSdk.addAttributes).toHaveBeenCalledWith(context);
        await DdSdkReactNative.addAttribute('number', { value: false });
        expect(mockSdk.addAttribute).toHaveBeenCalledWith('number', {
            value: { value: false }
        });
        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            ...context,
            number: { value: false }
        });
        await DdSdkReactNative.removeAttribute('number');
        await DdSdkReactNative.removeAttributes(['list', 'object']);
        expect(mockSdk.removeAttribute).toHaveBeenCalledWith('number');
        expect(mockSdk.removeAttributes).toHaveBeenCalledWith([
            'list',
            'object'
        ]);
        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            bool: false,
            nil: null
        });
    });

    it('does not change shared attributes when native cannot accept the update', async () => {
        mockGet.mockReturnValueOnce(null);
        await DdSdkReactNative.addAttribute('missing', true);
        mockSdk.addAttributes.mockResolvedValueOnce(false);
        await DdSdkReactNative.addAttributes(context);
        mockSdk.addAttribute.mockRejectedValueOnce(new Error('native'));
        await DdSdkReactNative.addAttribute('failed', true);
        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({});
        await DdSdkReactNative.addAttribute('keep', true);
        mockSdk.removeAttributes.mockResolvedValueOnce(false);
        await DdSdkReactNative.removeAttributes(['keep']);
        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            keep: true
        });
    });
});
