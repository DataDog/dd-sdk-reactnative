/* eslint-disable @typescript-eslint/no-var-requires */
import { UIManager } from 'react-native';

const isNewArch = UIManager.getViewManagerConfig?.('DdView') === undefined;

console.log('Is new arch enabled ? ', isNewArch);
console.log('Old arch view: ', UIManager.getViewManagerConfig?.('DdView'));

const NativeComponent = isNewArch
    ? require('./DdViewFabric').default
    : require('./DdViewPaper').default;

export default NativeComponent;
