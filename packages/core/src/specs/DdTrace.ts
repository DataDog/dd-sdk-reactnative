import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { DdNativeTraceType } from '../nativeModulesTypes';

export interface Spec extends TurboModule, DdNativeTraceType {
    readonly getConstants: () => Record<string, never>;
}

export default TurboModuleRegistry.get<Spec>('DdTrace');
