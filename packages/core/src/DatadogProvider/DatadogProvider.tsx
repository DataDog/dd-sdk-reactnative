/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import type { DdSdkReactNativeConfiguration } from '../DdSdkReactNativeConfiguration';
import { DdSdkReactNative } from '../DdSdkReactNative';

type Props = PropsWithChildren<{
    configuration: DdSdkReactNativeConfiguration;
}>;

export const DatadogProvider: React.FC<Props> = ({
    children,
    configuration
}) => {
    useEffect(() => {
        DdSdkReactNative.initialize(configuration);
        // Here we do not want to re-initialize if the configuration changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return <>{children}</>;
};
