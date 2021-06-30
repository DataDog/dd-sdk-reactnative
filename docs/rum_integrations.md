## RUM Integrations

### Integrate with ReactNavigation
Datadog provides automatic integration for the [ReactNavigation](https://reactnavigation.org/) API (minimum supported version is `react-navigation/native@5.6.0`). Add the following in your source code:
```typescript
    const navigationRef:React.RefObject<NavigationContainerRef> = React.createRef();
    // ...
    <NavigationContainer ref={navigationRef} onReady={
        ()=>{DdRumReactNavigationTracking.startTrackingViews(navigationRef.current)}}>
        // ...
    </NavigationContainer>
```
