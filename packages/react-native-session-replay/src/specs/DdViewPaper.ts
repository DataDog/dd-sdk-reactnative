import { requireNativeComponent } from 'react-native';

import type { DdViewProps } from '../types/DdView';

const DdView = requireNativeComponent<DdViewProps>('DdView');

export default DdView;
