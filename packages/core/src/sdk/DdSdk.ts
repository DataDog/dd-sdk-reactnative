/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { getGlobalInstance } from '../utils/singletonUtils';

import { DdSdkWrapper } from './DdSdkInternal';
import type { DdSdkType } from './DdSdkInternal';

const CORE_MODULE = 'com.datadog.reactnative.core';
export const DdSdk = getGlobalInstance(
    CORE_MODULE,
    () => new DdSdkWrapper()
) as DdSdkType;
