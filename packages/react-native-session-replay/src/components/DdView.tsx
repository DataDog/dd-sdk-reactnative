import type { ViewProps } from 'react-native';
import React from 'react';

import type {
    ImagePrivacyLevel,
    TextAndInputPrivacyLevel,
    TouchPrivacyLevel
} from '../SessionReplay';
import View from '../specs/DdViewNativeComponent';

type Props = ViewProps & {
    textAndInputPrivacy?: TextAndInputPrivacyLevel;
    imagePrivacy?: ImagePrivacyLevel;
    touchPrivacy?: TouchPrivacyLevel;
    hide?: boolean;
};

export default function DdView({
    children,
    textAndInputPrivacy,
    imagePrivacy,
    touchPrivacy,
    hide = false,
    ...props
}: Props) {
    return (
        <View
            {...props}
            textAndInputPrivacy={textAndInputPrivacy as string}
            imagePrivacy={imagePrivacy as string}
            touchPrivacy={touchPrivacy as string}
            hide={hide || false}
        >
            {children}
        </View>
    );
}
