import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

import type { DdNativeSdkType } from '../nativeModulesTypes';

export interface Spec extends TurboModule, DdNativeSdkType {
    readonly getConstants: () => Record<string, never>;
}

export default TurboModuleRegistry.get<Spec>('DdSdk');
