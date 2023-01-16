/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Attributes } from './types';

class AttributesProvider {
    private attributes: Attributes = {};

    setAttributes = (attributes: Attributes) => {
        this.attributes = {
            ...this.attributes,
            ...attributes
        };
    };

    getAttributes = (): Attributes => {
        return this.attributes;
    };
}

export class AttributesSingleton {
    private static attributesProvider = new AttributesProvider();

    static getInstance = (): AttributesProvider => {
        return AttributesSingleton.attributesProvider;
    };

    static reset = () => {
        AttributesSingleton.attributesProvider = new AttributesProvider();
    };
}
