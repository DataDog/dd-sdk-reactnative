import { RunType, Scenario } from "./src/testSetup/types/testConfig";

declare module 'react-native-config' {
    export interface NativeConfig {
        DD_CLIENT_TOKEN?: string;
        DD_API_KEY?: string;
        DD_APP_ID?: string;
        DD_SITE?: string;
        DD_ENV?: string;
        BENCH_SCENARIO?: Scenario;
        BENCH_RUN_TYPE?: RunType;
    }

    export const Config: NativeConfig;
    export default Config;
  }
