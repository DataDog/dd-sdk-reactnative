/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { AttributesSingleton } from '../AttributesSingleton';

describe('AttributesSingleton', () => {
    it('adds, returns and resets the user info', () => {
        // Adding first attributes
        AttributesSingleton.getInstance().setAttributes({
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

        // Removing and adding new attributes
        AttributesSingleton.getInstance().setAttributes({
            appType: undefined,
            newAttribute: false
        });

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
});
