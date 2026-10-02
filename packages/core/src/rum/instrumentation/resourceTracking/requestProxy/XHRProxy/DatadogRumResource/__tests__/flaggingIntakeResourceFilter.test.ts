/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { filterFlaggingIntakeResource } from '../../../common/flaggingIntakeResourceFilter';

import { ResourceMockFactory } from './__utils__/ResourceMockFactory';

const resourceMockFactory = new ResourceMockFactory();

const resourceWithUrl = (url: string) =>
    resourceMockFactory.getCustomResource({
        request: { method: 'POST', url, kind: 'fetch' }
    });

describe('filterFlaggingIntakeResource', () => {
    it.each([
        'https://browser-intake-datadoghq.com/api/v2/exposures?ddsource=react-native&dd-api-key=token',
        'https://browser-intake-us3-datadoghq.com/api/v2/flagevaluation?ddsource=react-native&dd-api-key=token',
        'https://browser-intake-datadoghq.eu/api/v2/exposures?ddsource=react-native&dd-api-key=token',
        'https://proxy.example.com/intake?ddforward=%2Fapi%2Fv2%2Fexposures%3Fddsource%3Dreact-native%26dd-api-key%3Dtoken',
        'https://proxy.example.com/intake?ddforward=%2Fapi%2Fv2%2Fflagevaluation%3Fddsource%3Dreact-native%26dd-api-key%3Dtoken'
    ])('returns null for the flagging intake request %s', url => {
        expect(filterFlaggingIntakeResource(resourceWithUrl(url))).toBeNull();
    });

    it.each([
        'https://browser-intake-datadoghq.com/api/v2/rum?ddsource=react-native',
        'https://api.example.com/api/v2/exposures?ddsource=react-native',
        'https://browser-intake-datadoghq.com.example.com/other/api/v2/exposures?x=1',
        'https://proxy.example.com/intake?ddforward=%2Fapi%2Fv2%2Frum%3Fddsource%3Dbrowser',
        'https://browser-intake-custom.example/api/v2/exposures?customer=1',
        'https://browser-intake-datadoghq.com/api/v2/flagevaluation?ddsource=browser&dd-api-key=token',
        'https://proxy.example.com/intake?ddforward=%2Fapi%2Fv2%2Fexposures%3Fcustomer%3D1'
    ])('returns the resource for %s', url => {
        const resource = resourceWithUrl(url);
        expect(filterFlaggingIntakeResource(resource)).toBe(resource);
    });
});
