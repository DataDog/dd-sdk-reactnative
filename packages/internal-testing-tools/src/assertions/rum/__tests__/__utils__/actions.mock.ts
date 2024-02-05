/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { RumActionEvent } from 'rum-events-format';

export const mockRumAction = ({
    actionType,
    targetName
}: {
    actionType?: RumActionEvent['action']['type'];
    targetName?: string;
}): RumActionEvent => {
    return {
        type: 'action',
        action: {
            type: actionType || 'tap',
            target: { name: targetName || 'Tap on RCTView' }
        }
    } as RumActionEvent;
};
