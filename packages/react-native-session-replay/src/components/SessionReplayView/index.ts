/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { HideView } from './HideView';
import { MaskAllView } from './MaskAllView';
import { MaskNoneView } from './MaskNoneView';
import { PrivacyView } from './PrivacyView';

/**
 * A collection of preconfigured React components for controlling privacy in Datadog Session Replay.
 *
 * These components can be used to control how different parts of the UI appear in session recordings:
 *
 * - `SessionReplayView.MaskAll`: Masks all text, inputs, and images. Hides touch interactions by default.
 *   Use for highly sensitive sections.
 *
 * - `SessionReplayView.MaskNone`: Displays most content as-is, except for sensitive inputs which are still masked.
 *   Use when visibility is safe and desired.
 *
 * - `SessionReplayView.Hide`: Completely hides the view and its children from session replays.
 *   Use for content that should not appear at all in recordings.
 *
 * - `SessionReplayView.Privacy`: A low-level configurable component for fine-tuned privacy control.
 *   Use this if none of the presets meet your needs.
 */
export const SessionReplayView = {
    Privacy: PrivacyView,
    MaskAll: MaskAllView,
    MaskNone: MaskNoneView,
    Hide: HideView
};
