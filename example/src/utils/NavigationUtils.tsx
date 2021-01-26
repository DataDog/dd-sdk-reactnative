import type { EventArg, NavigationContainerRef, Route } from "@react-navigation/native";
import {
    DdRum
  } from 'dd-sdk-reactnative';

const navigationStateChangeListener = (event:EventArg<string, boolean, any>) => {
    handleRouteNavigation(event.data?.state?.routes[event.data?.state?.index]);
};

export function registerNavigationStateListener(navigationRef:NavigationContainerRef | null) {
    handleRouteNavigation(navigationRef?.getCurrentRoute());
    navigationRef?.addListener("state", navigationStateChangeListener);
}

export function unregisterNavigationStateListener(navigationRef?:NavigationContainerRef) {
    navigationRef?.removeListener("state", navigationStateChangeListener);
}

function handleRouteNavigation(route:Route<string, object | undefined> | undefined) {
    let key = route?.key;
    let screenName = route?.name;
    if(key!=null&&screenName!=null){
        console.log(`Navigating to screen key: ${key} and name: ${screenName}`);
        DdRum.startView(key, screenName, new Date().getTime(),{});
    }
}
