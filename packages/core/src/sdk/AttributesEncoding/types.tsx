/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * A value that can safely be encoded as a Datadog Attribute.
 */
export type Encodable =
    | string
    | number
    | boolean
    | null
    | undefined
    | Encodable[]
    | { [key: string]: Encodable };

export type AttributeKey = string;
export type AttributeValue = Encodable;
export type EncodableAttributes = Record<AttributeKey, AttributeValue>;
export type Attributes = Record<AttributeKey, any>;

/**
 * Encoders define how to handle special object types (Date, Error, Map, etc.).
 * Each encoder is:
 *  - check: decides if the value can be handled by this encoder.
 *  - encode: converts the value into an Encodable.
 */
export interface AttributeEncoder<T> {
    check: (value: unknown) => boolean;
    encode: (value: T) => Encodable;
}
