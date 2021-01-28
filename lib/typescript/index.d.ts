import { DdSdkConfiguration, DdSdkType, DdLogsType, DdTraceType, DdRumType } from './types';
import RumReactNavigationTracking from './rum/instrumentation/RumReactNavigationTracking';
declare const DdSdk: DdSdkType;
declare const DdLogs: DdLogsType;
declare const DdTrace: DdTraceType;
declare const DdRum: DdRumType;
export { DdSdkConfiguration, DdSdk, DdLogs, DdTrace, DdRum, RumReactNavigationTracking as ReactNavigationTrackingStrategy };
