function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { DdRum } from '../../index';

/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
export default class RumReactNavigationTracking {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  /**
   * Starts tracking the NavigationContainer and sends a RUM View event every time the navigation route changed.
   * @param navigationRef the reference to the real NavigationContainer.
   */
  static startTrackingViews(navigationRef) {
    if (navigationRef != null) {
      const listener = this.resolveNavigationStateChangeListener();
      this.handleRouteNavigation(navigationRef.getCurrentRoute());
      navigationRef.addListener("state", listener);
    }
  }
  /**
   * Stops tracking the NavigationContainer.
   * @param navigationRef the reference to the real NavigationContainer.
   */


  static stopTrackingViews(navigationRef) {
    navigationRef === null || navigationRef === void 0 ? void 0 : navigationRef.removeListener("state", this.navigationStateChangeListener);
  } // eslint-disable-next-line


  static handleRouteNavigation(route) {
    const key = route === null || route === void 0 ? void 0 : route.key;
    const screenName = route === null || route === void 0 ? void 0 : route.name;

    if (key != null && screenName != null) {
      DdRum.startView(key, screenName, new Date().getTime(), {});
    }
  }

  static resolveNavigationStateChangeListener() {
    if (this.navigationStateChangeListener == null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.navigationStateChangeListener = event => {
        var _event$data, _event$data$state, _event$data2, _event$data2$state;

        this.handleRouteNavigation((_event$data = event.data) === null || _event$data === void 0 ? void 0 : (_event$data$state = _event$data.state) === null || _event$data$state === void 0 ? void 0 : _event$data$state.routes[(_event$data2 = event.data) === null || _event$data2 === void 0 ? void 0 : (_event$data2$state = _event$data2.state) === null || _event$data2$state === void 0 ? void 0 : _event$data2$state.index]);
      };
    }

    return this.navigationStateChangeListener;
  }

}

_defineProperty(RumReactNavigationTracking, "navigationStateChangeListener", void 0);
//# sourceMappingURL=RumReactNavigationTracking.js.map