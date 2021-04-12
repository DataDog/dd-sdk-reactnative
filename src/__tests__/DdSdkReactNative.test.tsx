/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { NativeModules } from 'react-native'
import { DdSdkReactNativeConfiguration } from '../DdSdkReactNativeConfiguration'
import type { DdSdkConfiguration } from '../types'
import { DdSdk } from '../dd-foundation'
import { DdSdkReactNative } from '../DdSdkReactNative'
import { DdRumUserInteractionTracking } from '../rum/instrumentation/DdRumUserInteractionTracking'
import { DdRumResourceTracking } from '../rum/instrumentation/DdRumResourceTracking'
import { DdRumErrorTracking } from '../rum/instrumentation/DdRumErrorTracking'

jest.mock('react-native', () => {
    return {
        NativeModules: {
            DdSdk: {
                initialize: jest.fn().mockImplementation(() => { }),
                setUser: jest.fn().mockImplementation(() => { }),
                setAttributes: jest.fn().mockImplementation(() => { })
            }
        }
    };
});

jest.mock('../rum/instrumentation/DdRumUserInteractionTracking', () => {
    return {
        DdRumUserInteractionTracking: {
            startTracking: jest.fn().mockImplementation(() => { })
        }
    }
})

jest.mock('../rum/instrumentation/DdRumResourceTracking', () => {
    return {
        DdRumResourceTracking: {
            startTracking: jest.fn().mockImplementation(() => { })
        }
    }
})

jest.mock('../rum/instrumentation/DdRumErrorTracking', () => {
    return {
        DdRumErrorTracking: {
            startTracking: jest.fn().mockImplementation(() => { })
        }
    }
})

beforeEach(async () => {
    DdSdkReactNative['wasInitialized'] = false;
    NativeModules.DdSdk.initialize.mockReset()
    NativeModules.DdSdk.setAttributes.mockReset()
    NativeModules.DdSdk.setUser.mockReset()
})

it('M initialize the SDK W initialize', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdSdkReactNativeConfiguration(fakeClientToken, fakeEnvName, fakeAppId)

    // WHEN
    DdSdkReactNative.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddSdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddSdkConfiguration.env).toBe(fakeEnvName)
    expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
        '_dd.source': 'react-native'
    })
})

it('M initialize once W initialize { multiple times in a row }', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdSdkReactNativeConfiguration(fakeClientToken, fakeEnvName, fakeAppId)

    // WHEN
    DdSdkReactNative.initialize(configuration)
    DdSdkReactNative.initialize(configuration)
    DdSdkReactNative.initialize(configuration)
    DdSdkReactNative.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddSdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddSdkConfiguration.env).toBe(fakeEnvName)
    expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
        '_dd.source': 'react-native'
    })
})

it('M enable user interaction feature W initialize { user interaction config enabled }', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdSdkReactNativeConfiguration(fakeClientToken, fakeEnvName, fakeAppId, true)

    // WHEN
    DdSdkReactNative.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddSdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddSdkConfiguration.env).toBe(fakeEnvName)
    expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
        '_dd.source': 'react-native'
    })
    expect(DdRumUserInteractionTracking.startTracking).toHaveBeenCalledTimes(1)
})

it('M enable resource tracking feature W initialize { resource tracking config enabled }', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdSdkReactNativeConfiguration(fakeClientToken, fakeEnvName, fakeAppId, false, true)

    // WHEN
    DdSdkReactNative.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddSdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddSdkConfiguration.env).toBe(fakeEnvName)
    expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
        '_dd.source': 'react-native'
    })
    expect(DdRumResourceTracking.startTracking).toHaveBeenCalledTimes(1)
})

it('M enable error tracking feature W initialize { error tracking config enabled }', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdSdkReactNativeConfiguration(fakeClientToken, fakeEnvName, fakeAppId, false, false, true)

    // WHEN
    DdSdkReactNative.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddSdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddSdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddSdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddSdkConfiguration.env).toBe(fakeEnvName)
    expect(ddSdkConfiguration.additionalConfig).toStrictEqual({
        '_dd.source': 'react-native'
    })
    expect(DdRumErrorTracking.startTracking).toHaveBeenCalledTimes(1)
})

it('M call SDK method W setAttributes', async () => {
    // GIVEN
    const attributes = { "foo": "bar" }

    // WHEN

    DdSdkReactNative.setAttributes(attributes)

    // THEN
    expect(DdSdk.setAttributes).toHaveBeenCalledTimes(1)
    expect(DdSdk.setAttributes).toHaveBeenCalledWith(attributes)
})

it('M call SDK method W setUser', async () => {
    // GIVEN
    const user = { "foo": "bar" }

    // WHEN

    DdSdkReactNative.setUser(user)

    // THEN
    expect(DdSdk.setUser).toHaveBeenCalledTimes(1)
    expect(DdSdk.setUser).toHaveBeenCalledWith(user)
})