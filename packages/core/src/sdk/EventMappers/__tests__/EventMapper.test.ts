/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { DdSdk } from '../../../foundation';
import { EventMapper } from '../EventMapper';

describe('EventMapper', () => {
    it('returns the original log when the event log mapper crashes', () => {
        const eventMapper = new EventMapper(
            (event: object) => {
                event['badData'] = 'bad data';
                throw new Error('crashed');
            },
            (event: object) => event,
            (event: object) => event,
            (event: object) => event
        );

        expect(
            eventMapper.applyEventMapper({
                someData: 'some data'
            })
        ).toEqual({
            someData: 'some data'
        });
        expect(DdSdk.telemetryDebug).toHaveBeenCalledWith(
            'Error while running the event mapper'
        );
    });

    it('returns null when the mappers returns null', () => {
        const eventMapper = new EventMapper(
            (event: object) => {
                return null;
            },
            (event: object) => event,
            (event: object) => event,
            (event: object) => event
        );

        expect(
            eventMapper.applyEventMapper({
                someData: 'some data'
            })
        ).toBeNull();
    });
});
