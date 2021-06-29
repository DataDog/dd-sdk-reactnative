## RUM Integrations

### Integrate with ReactNavigation
We provide automatic integration for [ReactNavigation](https://reactnavigation.org/) API (minimum supported version is `react-navigation/native@5.6.0`). You just need to add this in your source code:
```typescript
    const navigationRef:React.RefObject<NavigationContainerRef> = React.createRef();
    // ...
    <NavigationContainer ref={navigationRef} onReady={
        ()=>{DdRumReactNavigationTracking.startTrackingViews(navigationRef.current)}}>
        // ...
    </NavigationContainer>
```
