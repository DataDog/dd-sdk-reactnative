import type { ConfigPlugin } from '@expo/config-plugins';

const withAndroidProguardMappingFiles: ConfigPlugin<void> = config => {
    // Noop for now
    return config;
};

export default withAndroidProguardMappingFiles;
