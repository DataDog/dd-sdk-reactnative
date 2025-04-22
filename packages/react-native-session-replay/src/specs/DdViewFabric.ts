import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { HostComponent, ViewProps } from 'react-native';

interface DdViewProps extends ViewProps {
    textAndInputPrivacy: string;
    imagePrivacy: string;
    touchPrivacy: string;
    hide: boolean;
}

export default codegenNativeComponent<DdViewProps>('DdView', {
    paperComponentName: 'DdView'
}) as HostComponent<DdViewProps>;
