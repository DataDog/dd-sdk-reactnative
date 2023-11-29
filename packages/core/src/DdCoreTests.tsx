/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { DdNativeCoreTestsType } from './nativeModulesTypes';
import { base64 } from './utils/base64';

class DdCoreTestsWrapper {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    nativeDdCoreTests: DdNativeCoreTestsType = require('./specs/NativeDdCoreTests')
        .default;
    clearData = () => {
        return this.nativeDdCoreTests.clearData();
    };
    getAllEventsData = async (feature: string) => {
        const events = await this.nativeDdCoreTests.getAllEventsData(feature);
        return (JSON.parse(events) as string[]).map(event =>
            JSON.parse(base64.decode(event))
        );
    };
}

export const DdCoreTests = new DdCoreTestsWrapper();
