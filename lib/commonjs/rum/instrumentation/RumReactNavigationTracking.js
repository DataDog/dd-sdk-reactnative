"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _index = require("../../index");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
class RumReactNavigationTracking {
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
      _index.DdRum.startView(key, screenName, new Date().getTime(), {});
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

exports.default = RumReactNavigationTracking;

_defineProperty(RumReactNavigationTracking, "navigationStateChangeListener", void 0);
//# sourceMappingURL=RumReactNavigationTracking.js.map