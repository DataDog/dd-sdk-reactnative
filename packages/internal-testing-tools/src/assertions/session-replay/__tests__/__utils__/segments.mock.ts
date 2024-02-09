/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { MobileRecord, Wireframe } from 'rum-events-format';

import type { SessionReplayEvent } from '../../../../types/events';

export const mockSessionReplayFullSnapshotSegment = ({
    viewID,
    wireframes
}: {
    viewID: string;
    wireframes: Wireframe[];
}): SessionReplayEvent => {
    return {
        viewID,
        records: [
            {
                type: 10,
                data: {
                    wireframes
                }
            }
        ]
    } as SessionReplayEvent;
};

export const mockSessionReplaySegment = ({
    viewID,
    records
}: {
    viewID: string;
    records: MobileRecord[];
}): SessionReplayEvent => {
    return {
        viewID,
        records
    } as SessionReplayEvent;
};
