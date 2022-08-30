/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { getErrorTrackingPluginsFromOptions } from '../getErrorTrackingPluginsFromOptions';
import withAndroidProguardMappingFiles from '../withAndroidProguardMappingFiles/withAndroidProguardMappingFiles';
import withAndroidSourcemaps from '../withAndroidSourcemaps/withAndroidSourcemaps';
import withIosDsyms from '../withIosDsyms/withIosDsyms';
import withIosSourcemaps from '../withIosSourcemaps/withIosSourcemaps';

const ALL_PLUGINS = [
    withIosDsyms,
    withIosSourcemaps,
    withAndroidProguardMappingFiles,
    withAndroidSourcemaps
];

describe('getErrorTrackingPluginsFromOptions', () => {
    it('returns all plugins if no option is provided', () => {
        expect(getErrorTrackingPluginsFromOptions()).toEqual(ALL_PLUGINS);
    });

    it('keeps plugins set to true or undefined, while removing those set to false in options', () => {
        expect(
            getErrorTrackingPluginsFromOptions({
                iosDsyms: true,
                androidProguardMappingFiles: false
            })
        ).toEqual(ALL_PLUGINS.filter((_, index) => index !== 2));
    });
});
