import type { ViewProps } from 'react-native';

export interface DdViewProps extends ViewProps {
    textAndInputPrivacy: string;
    imagePrivacy: string;
    touchPrivacy: string;
    hide: boolean;
}
