import type { NavigationContainerRef } from "@react-navigation/native";
/**
 * Provides RUM integration for the [ReactNavigation](https://reactnavigation.org/) API.
 */
export default class RumReactNavigationTracking {
    private static navigationStateChangeListener;
    /**
     * Starts tracking the NavigationContainer and sends a RUM View event every time the navigation route changed.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static startTrackingViews(navigationRef: NavigationContainerRef | null): void;
    /**
     * Stops tracking the NavigationContainer.
     * @param navigationRef the reference to the real NavigationContainer.
     */
    static stopTrackingViews(navigationRef?: NavigationContainerRef): void;
    private static handleRouteNavigation;
    private static resolveNavigationStateChangeListener;
}
