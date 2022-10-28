import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { DdNativeRumType } from '../nativeModulesTypes';

export interface Spec extends TurboModule, DdNativeRumType {
    readonly getConstants: () => Record<string, never>;
}

export default TurboModuleRegistry.get<Spec>('DdRum');
