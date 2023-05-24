/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdNativeSdkType } from '../nativeModulesTypes';

// eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
const DdSdk: DdNativeSdkType = require('../specs/NativeDdSdk').default;

export { DdSdk };
