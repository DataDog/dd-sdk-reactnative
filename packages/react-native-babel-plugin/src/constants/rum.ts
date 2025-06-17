/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const RumActionConstants = {
    ACTION_CLASS: 'DdBabelInteractionTracking',
    ACTION_CLASS_INSTANCE: 'getInstance',
    ACTION_FUNCTION_WRAPPER: 'wrapRumAction',
    IMPORT_PACKAGE: '@datadog/mobile-react-native'
} as const;

export const RumAction = {
    /** User tapped on a widget. */
    TAP: 'TAP',
    /** User scrolled a view. */
    SCROLL: 'SCROLL',
    /** User swiped on a view. */
    SWIPE: 'SWIPE',
    /** User pressed hardware back button (Android only). */
    BACK: 'BACK',
    /** A custom action. */
    CUSTOM: 'CUSTOM'
} as const;

export const tapElementsMap: Record<string, string[]> = {
    Button: ['onPress'],
    Pressable: ['onPress', 'onLongPress'],
    TouchableOpacity: ['onPress'],
    TouchableHighlight: ['onPress'],
    TouchableWithoutFeedback: ['onPress'],
    TouchableNativeFeedback: ['onPress'],
    Switch: ['onValueChange'],
    TextInput: ['onFocus']
};
