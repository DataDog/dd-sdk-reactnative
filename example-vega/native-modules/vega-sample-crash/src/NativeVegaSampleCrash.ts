import type {KeplerTurboModule} from '@amazon-devices/keplerscript-turbomodule-api';
import {TurboModuleRegistry} from '@amazon-devices/keplerscript-turbomodule-api';

export interface VegaSampleCrash extends KeplerTurboModule {
  crashForTesting(): Promise<void>;
}

const module = TurboModuleRegistry.get<VegaSampleCrash>('VegaSampleCrash');

export default module!;
