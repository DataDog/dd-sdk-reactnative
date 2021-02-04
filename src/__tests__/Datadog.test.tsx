import { NativeModules } from 'react-native'
import { DdRNSdkConfiguration } from '../configuration'
import type { DdSdkConfiguration } from '../types'
import { Datadog } from '../Datadog'
import { DdRumUserInteractionTracking } from '../rum/instrumentation/DdRumUserInteractionTracking'

jest.mock('react-native', () => {
    return {
        NativeModules: {
            DdSdk: {
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                initialize: jest.fn().mockImplementation(() => { })
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

beforeEach(async () => {
    Datadog['wasInitialized'] = false;
    NativeModules.DdSdk.initialize.mockReset()
})

it('M initialize the SDK W initialize', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdRNSdkConfiguration(fakeClientToken, fakeEnvName, fakeAppId)

    // WHEN
    Datadog.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddsdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddsdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddsdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddsdkConfiguration.env).toBe(fakeEnvName)
})

it('M initialize once W initialize { multiple times in a row }', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdRNSdkConfiguration(fakeClientToken, fakeEnvName, fakeAppId)

    // WHEN
    Datadog.initialize(configuration)
    Datadog.initialize(configuration)
    Datadog.initialize(configuration)
    Datadog.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddsdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddsdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddsdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddsdkConfiguration.env).toBe(fakeEnvName)
})

it('M enable user interaction feature W initialize { user interaction config enabled }', async () => {
    // GIVEN
    const fakeAppId = "1"
    const fakeClientToken = "2"
    const fakeEnvName = "env"
    const configuration = new DdRNSdkConfiguration(fakeClientToken, fakeEnvName, fakeAppId, true)

    // WHEN
    Datadog.initialize(configuration)

    // THEN
    expect(NativeModules.DdSdk.initialize.mock.calls.length).toBe(1);
    const ddsdkConfiguration = NativeModules.DdSdk.initialize.mock.calls[0][0] as DdSdkConfiguration
    expect(ddsdkConfiguration.clientToken).toBe(fakeClientToken)
    expect(ddsdkConfiguration.applicationId).toBe(fakeAppId)
    expect(ddsdkConfiguration.env).toBe(fakeEnvName)
    expect(DdRumUserInteractionTracking.startTracking).toHaveBeenCalledTimes(1)
})