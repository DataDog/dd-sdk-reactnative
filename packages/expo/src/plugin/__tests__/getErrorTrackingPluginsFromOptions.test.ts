import { getErrorTrackingPluginsFromOptions } from '../getErrorTrackingPluginsFromOptions';
import withAndroidProguardMappingFiles from '../withAndroidProguardMappingFiles/withAndroidProguardMappingFiles';
import withAndroidSourcemaps from '../withAndroidSourcemaps/withAndroidSourcemaps';
import withIosDsyms from '../withIosDsyms/withIosDsyms';
import withIosSourcemaps from '../withIosSourcemaps/withIosSourcemaps';

const ALL_PLUGINS = [
    withIosDsyms,
    withIosSourcemaps,
    [withAndroidProguardMappingFiles, { site: 'EU1' }],
    withAndroidSourcemaps
];

describe('getErrorTrackingPluginsFromOptions', () => {
    it('returns all plugins if no option is provided', () => {
        expect(
            getErrorTrackingPluginsFromOptions(undefined, { site: 'EU1' })
        ).toEqual(ALL_PLUGINS);
    });

    it('keeps plugins set to true or undefined, while removing those set to false in options', () => {
        expect(
            getErrorTrackingPluginsFromOptions(
                {
                    iosDsyms: true,
                    androidProguardMappingFiles: false
                },
                {}
            )
        ).toEqual(ALL_PLUGINS.filter((_, index) => index !== 2));
    });
});
