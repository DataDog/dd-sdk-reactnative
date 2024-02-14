/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type {
    Wireframe,
    RumEvent,
    WireframeType,
    MobileRecord,
    MobileFullSnapshotRecord,
    TextWireframe
} from 'rum-events-format';

import type { SessionReplayEvent } from '../../types/events';
import { AssertionError } from '../assertionError';

import { formatWireframe } from './formatWireframe';

const findViewIdFromRumEvents = (
    viewName: string,
    rumEvents: RumEvent[]
): string => {
    const viewID = rumEvents.find(event => {
        return event.type === 'view' && event.view.name === viewName;
    })?.view.id;
    if (!viewID) {
        throw new AssertionError(
            `Could not find view named ${viewName}`,
            viewName,
            rumEvents
                .filter(event => event.type === 'view' && !!event.view.name)
                .map(viewEvent => viewEvent.view.name)
                .join(', '),
            rumEvents
        );
    }
    return viewID;
};

const isFullSnapshotRecord = (
    record: MobileRecord
): record is MobileFullSnapshotRecord => {
    return record.type === 10;
};

/**
 * Android takes a full snapshot every 3 seconds, so we might end up with
 * duplicated wireframes.
 * This makes sure we only return a wireframe with a given id once.
 */
const uniqById = (wireframes: Wireframe[]): Wireframe[] => {
    const existingIds: Record<number, boolean> = {};
    return wireframes.filter(wireframe => {
        if (existingIds[wireframe.id]) {
            return false;
        }
        existingIds[wireframe.id] = true;
        return true;
    });
};

export const findViewWireframes = (
    type: WireframeType,
    events: SessionReplayEvent[],
    rumEvents: RumEvent[],
    { viewName }: { viewName: string }
): Wireframe[] => {
    const viewID = findViewIdFromRumEvents(viewName, rumEvents);

    const viewSegments = events.filter(event => {
        return event.viewID === viewID || event.view_id === viewID;
    });

    const viewWireframes = viewSegments.flatMap(segment =>
        segment.records
            .filter(isFullSnapshotRecord)
            .flatMap(fullSnapshotRecord => fullSnapshotRecord.data.wireframes)
            .filter(wireframe => wireframe.type === type)
            .map(formatWireframe)
    );

    if (viewWireframes.length === 0) {
        throw new AssertionError(
            'View does not contain wireframe of expected type.',
            `type: ${type}, viewName: ${viewName}`,
            undefined,
            []
        );
    }

    return uniqById(viewWireframes);
};

export const findViewTextWireframe = (
    events: SessionReplayEvent[],
    rumEvents: RumEvent[],
    { viewName, text }: { viewName: string; text: string }
): TextWireframe => {
    const textWireframes = findViewWireframes('text', events, rumEvents, {
        viewName
    }) as TextWireframe[];
    const allMatchingWireframes = textWireframes.filter(textWireframe =>
        textWireframe.text.includes(text)
    );
    if (allMatchingWireframes.length === 0) {
        throw new AssertionError(
            'Could not find text wireframe.',
            `text: ${text}`,
            undefined,
            textWireframes
        );
    }
    if (allMatchingWireframes.length > 1) {
        throw new AssertionError(
            'View contains more than 1 text wireframe matching expected text.',
            `text: ${text}`,
            undefined,
            allMatchingWireframes
        );
    }
    return allMatchingWireframes[0];
};
