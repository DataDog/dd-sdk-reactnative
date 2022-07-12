import type { ConfigPlugin } from '@expo/config-plugins';
import { withPlugins } from '@expo/config-plugins';

import withAndroidProguardMappingFiles from './withAndroidProguardMappingFiles/withAndroidProguardMappingFiles';
import withAndroidSourcemaps from './withAndroidSourcemaps/withAndroidSourcemaps';
import withIosDsyms from './withIosDsyms/withIosDsyms';
import withIosSourcemaps from './withIosSourcemaps/withIosSourcemaps';

const withDatadog: ConfigPlugin<void> = config => {
    return withPlugins(config, [
        withIosDsyms,
        withAndroidProguardMappingFiles,
        withAndroidSourcemaps,
        withIosSourcemaps
    ]);
};

export default withDatadog;
