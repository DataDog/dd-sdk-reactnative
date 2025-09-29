/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { Attributes } from './types';

class AttributesProvider {
    private attributes: Attributes = {};

    addAttribute = (key: string, value: unknown) => {
        const newAttributes = { ...this.attributes };
        newAttributes[key] = value;
        this.attributes = newAttributes;
    };

    removeAttribute = (key: string) => {
        const updatedAttributes = { ...this.attributes };
        delete updatedAttributes[key];
        this.attributes = updatedAttributes;
    };

    addAttributes = (attributes: Attributes) => {
        this.attributes = {
            ...this.attributes,
            ...attributes
        };
    };

    removeAttributes = (keys: string[]) => {
        const updated = { ...this.attributes };
        for (const k of keys) {
            delete updated[k];
        }
        this.attributes = updated;
    };

    getAttribute = (key: string): unknown | undefined => {
        return this.attributes[key];
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
