/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type { GestureResponderEvent } from 'react-native';

import type { AdditionalEventDataForMapper } from '../../sdk/EventMappers/EventMapper';
import { EventMapper } from '../../sdk/EventMappers/EventMapper';
import type { RumActionType } from '../types';

type RawAction = {
    readonly type: RumActionType;
    readonly name: string;
    context: object;
    readonly timestampMs: number;
    actionContext?: GestureResponderEvent;
};

type ActionEvent = RawAction & AdditionalEventDataForMapper;

type NativeAction = {
    type: RumActionType;
    name: string;
    context: object;
    timestampMs: number;
};

export type ActionEventMapper = (event: ActionEvent) => ActionEvent | null;

export const generateActionEventMapper = (
    eventMapper: ActionEventMapper | undefined
) =>
    new EventMapper(
        eventMapper,
        formatRawActionToActionEvent,
        formatActionEventToNativeAction,
        formatRawActionToNativeAction
    );

const formatRawActionToActionEvent = (
    action: RawAction,
    additionalInformation: AdditionalEventDataForMapper
): ActionEvent => {
    return {
        ...action,
        ...additionalInformation
    };
};

const formatRawActionToNativeAction = (action: RawAction): NativeAction => {
    return action;
};

const formatActionEventToNativeAction = (
    action: ActionEvent,
    originalEvent: ActionEvent
): NativeAction => {
    return {
        ...action,
        type: originalEvent.type,
        name: originalEvent.name,
        timestampMs: originalEvent.timestampMs
    };
};
