/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    configurationFromString as nativeConfigurationFromString,
    DdFlags
} from '@datadog/mobile-react-native';

import {
    configurationFromString,
    DatadogOfflineOpenFeatureProvider
} from '../../index';

export const checkPortableConfigurationTypes = (wire: string): void => {
    const provider = new DatadogOfflineOpenFeatureProvider();
    provider.setConfiguration(configurationFromString(wire));
    DdFlags.getClient().setConfiguration(nativeConfigurationFromString(wire));
};
