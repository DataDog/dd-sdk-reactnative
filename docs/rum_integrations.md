## RUM Integrations

### Integrate with ReactNavigation
We offer automatic integration for [ReactNavigation](https://reactnavigation.org/) API. You just need to add this in your source code:
```typescript
    const navigationRef:React.RefObject<NavigationContainerRef> = React.createRef();
    // ...
    <NavigationContainer ref={navigationRef} onReady={
        ()=>{DdRumReactNavigationTracking.startTrackingViews(navigationRef.current)}}>
        // ...
    </NavigationContainer>
```
