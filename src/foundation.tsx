import type { DdSdkType, DdLogsType, DdTraceType, DdRumType } from './types';
import { NativeModules } from 'react-native';

export const DdSdk: DdSdkType = NativeModules.DdSdk;
export const DdLogs: DdLogsType = NativeModules.DdLogs;
export const DdTrace: DdTraceType = NativeModules.DdTrace;
export const DdRum: DdRumType = NativeModules.DdRum;
