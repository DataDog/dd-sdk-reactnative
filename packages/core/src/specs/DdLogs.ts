import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { DdNativeLogsType } from '../nativeModulesTypes';

export interface Spec extends TurboModule, DdNativeLogsType {
    readonly getConstants: () => Record<string, never>;
}

export default TurboModuleRegistry.get<Spec>('DdLogs');
