/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { AttributesSingleton } from '../AttributesSingleton';

describe('AttributesSingleton', () => {
    beforeEach(() => {
        AttributesSingleton.reset();
    });

    it('adds, returns and resets the attributes', () => {
        AttributesSingleton.getInstance().addAttributes({
            appType: 'student',
            extraInfo: {
                loggedIn: true
            }
        });

        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            appType: 'student',
            extraInfo: {
                loggedIn: true
            }
        });

        AttributesSingleton.getInstance().removeAttribute('appType');
        AttributesSingleton.getInstance().addAttribute('newAttribute', false);

        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            newAttribute: false,
            extraInfo: {
                loggedIn: true
            }
        });

        // Resetting attributes
        AttributesSingleton.reset();

        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({});
    });

    it('addAttribute sets a single key and getAttribute returns it', () => {
        AttributesSingleton.getInstance().addAttribute('userId', '123');
        expect(AttributesSingleton.getInstance().getAttribute('userId')).toBe(
            '123'
        );
        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            userId: '123'
        });
    });

    it('removeAttribute removes a single key and leaves others intact', () => {
        AttributesSingleton.getInstance().addAttributes({
            a: 1,
            b: 2
        });

        AttributesSingleton.getInstance().removeAttribute('a');

        expect(
            AttributesSingleton.getInstance().getAttribute('a')
        ).toBeUndefined();
        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            b: 2
        });
    });

    it('removeAttributes removes multiple keys (missing keys are ignored)', () => {
        AttributesSingleton.getInstance().addAttributes({
            keyToKeep: 'yes',
            keyToRemove1: true,
            keyToRemove2: false
        });

        AttributesSingleton.getInstance().removeAttributes([
            'keyToRemove1',
            'keyToRemove2',
            'keyToIgnore'
        ]);

        expect(AttributesSingleton.getInstance().getAttributes()).toEqual({
            keyToKeep: 'yes'
        });
    });
});
