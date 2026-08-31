const mockEmptyPromise = jest.fn(() => Promise.resolve());

jest.mock(
  'react-native-gesture-handler',
  () => {
    const {View} = require('react-native');

    return {
      GestureHandlerRootView: View,
      PanGestureHandler: View,
      State: {},
    };
  },
  {virtual: true},
);

jest.mock(
  '../../packages/react-native-vega/src/turbo-modules/NativeDdSdk',
  () => ({
    __esModule: true,
    default: {
      initialize: mockEmptyPromise,
      addAttribute: mockEmptyPromise,
      removeAttribute: mockEmptyPromise,
      addAttributes: mockEmptyPromise,
      removeAttributes: mockEmptyPromise,
      setUserInfo: mockEmptyPromise,
      clearUserInfo: mockEmptyPromise,
      addUserExtraInfo: mockEmptyPromise,
      setAccountInfo: mockEmptyPromise,
      clearAccountInfo: mockEmptyPromise,
      addAccountExtraInfo: mockEmptyPromise,
      setTrackingConsent: mockEmptyPromise,
      sendTelemetryLog: mockEmptyPromise,
      telemetryDebug: mockEmptyPromise,
      telemetryError: mockEmptyPromise,
      consumeWebviewEvent: mockEmptyPromise,
      clearAllData: mockEmptyPromise,
      httpResponse: mockEmptyPromise,
      crashForTesting: mockEmptyPromise,
    },
  }),
);

jest.mock(
  '../../packages/react-native-vega/src/turbo-modules/NativeDdRum',
  () => ({
    __esModule: true,
    default: {
      startView: mockEmptyPromise,
      stopView: mockEmptyPromise,
      startAction: mockEmptyPromise,
      stopAction: mockEmptyPromise,
      addAction: mockEmptyPromise,
      startResource: mockEmptyPromise,
      stopResource: mockEmptyPromise,
      addError: mockEmptyPromise,
      addTiming: mockEmptyPromise,
      addViewAttribute: mockEmptyPromise,
      removeViewAttribute: mockEmptyPromise,
      addViewAttributes: mockEmptyPromise,
      removeViewAttributes: mockEmptyPromise,
      addViewLoadingTime: mockEmptyPromise,
      stopSession: mockEmptyPromise,
      addFeatureFlagEvaluation: mockEmptyPromise,
      getCurrentSessionId: jest.fn(() => Promise.resolve('')),
      startFeatureOperation: mockEmptyPromise,
      succeedFeatureOperation: mockEmptyPromise,
      failFeatureOperation: mockEmptyPromise,
    },
  }),
);

jest.mock('../../packages/react-native-vega/src/HttpProxy', () => ({
  __esModule: true,
  startHttpProxy: jest.fn(() => jest.fn()),
}));

jest.mock(
  '../../packages/core/src/rum/instrumentation/resourceTracking/DdRumResourceTracking',
  () => ({
    __esModule: true,
    DdRumResourceTracking: {
      startTracking: jest.fn(),
      updateTrackingContext: jest.fn(),
      stopTracking: jest.fn(),
      get isTracking() {
        return false;
      },
    },
  }),
);

jest.mock(
  '../../packages/core/src/rum/instrumentation/DdRumErrorTracking',
  () => ({
    __esModule: true,
    DdRumErrorTracking: {
      startTracking: jest.fn(),
    },
  }),
);
