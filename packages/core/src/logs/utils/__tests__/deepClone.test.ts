/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { deepClone } from '../deepClone';

describe('deepClone', () => {
    it('clones a simple object with primitive types', () => {
        const object = {
            string: 'something',
            number: 24,
            boolean: true,
            undefinedValue: undefined,
            null: null
        };

        const clone = deepClone(object);
        expect(clone).toEqual(object);

        object['additionalProperty'] = 'value';
        expect(clone).not.toEqual(object);
    });
    it('clones a nested object with nested arrays', () => {
        const object = {
            nestedObject: { string: 'something' },
            nestedArray: [
                {
                    nestedObject: { string: 'something' }
                }
            ]
        };
        const clone = deepClone(object);
        expect(clone).toEqual(object);

        object.nestedObject.string = 'something else';
        expect(clone.nestedObject).not.toEqual(object.nestedObject);

        object.nestedArray.push({
            nestedObject: { string: 'something' }
        });
        expect(clone.nestedArray).not.toEqual(object.nestedArray);

        object.nestedArray[0].nestedObject.string = 'something else';
        expect(clone.nestedArray[0].nestedObject).not.toEqual(
            object.nestedArray[0].nestedObject
        );
    });
    it('clones an object with circular references', () => {
        let error: Error | null = null;
        const object = {
            property: 'something'
        };
        object['nested'] = object;
        try {
            deepClone(object);
        } catch (e) {
            error = e;
        }
        expect(error).toBeNull();
    });
    it('clones an object with maps and sets', () => {
        const someMap = new Map();
        const someSet = new Set();
        const object = {
            someMap,
            someSet
        };
        const clone = deepClone(object);
        expect(clone).toEqual(object);

        object.someMap.set('key', 'value');
        expect(clone.someMap).not.toEqual(object.someMap);

        object.someSet.add('value');
        expect(clone.someSet).not.toEqual(object.someSet);
    });
});
