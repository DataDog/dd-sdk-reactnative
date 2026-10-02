/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RUMResource } from '../interfaces/RumResource';

// The OpenFeature package's JavaScript tracking hooks send exposures and flag evaluations
// to these intake paths, either directly or through a `ddforward` proxy. They always put
// `ddsource=react-native` first, so other requests to the same paths are still tracked.
const FLAGGING_INTAKE_REGEX = new RegExp(
    '^https://browser-intake-[^/?#]+/api/v2/(exposures|flagevaluation)\\?ddsource=react-native&'
);

const FLAGGING_INTAKE_PROXY_REGEX = new RegExp(
    '[?&]ddforward=%2Fapi%2Fv2%2F(exposures|flagevaluation)%3Fddsource%3Dreact-native%26'
);

export const filterFlaggingIntakeResource = (
    resource: RUMResource
): RUMResource | null => {
    const url = resource.request.url;
    if (
        FLAGGING_INTAKE_REGEX.test(url) ||
        FLAGGING_INTAKE_PROXY_REGEX.test(url)
    ) {
        return null;
    }
    return resource;
};
