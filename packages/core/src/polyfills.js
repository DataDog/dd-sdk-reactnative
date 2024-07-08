import { version as reactNativeVersion } from 'react-native/package.json';

function applyBigIntPolyfill() {
    const rnVersion = reactNativeVersion.split('.').map(Number);
    const isRn63 = rnVersion[0] === 0 && rnVersion[1] === 63;

    if (isRn63 && typeof BigInt === 'undefined') {
        try {
            // eslint-disable-next-line global-require, import/no-extraneous-dependencies
            global.BigInt = require('big-integer');
            console.warn(
                'React Native 0.63 does not support BigInt, which is required starting from v2.4.0 of Datadog React Native SDK. ' +
                    'The missing type has been polyfilled using `big-integer` to grant back-compatibility. ' +
                    'We strongly suggest updating to a greater version of React Native (>= 0.64).'
            );
        } catch (e) {
            if (e instanceof Error && e.code === 'MODULE_NOT_FOUND') {
                throw new Error(
                    'React Native 0.63 does not support BigInt, which is required starting from v2.4.0 of Datadog React Native SDK. ' +
                        'We strongly suggest updating to a greater version of React Native (>= 0.64).\n\n' +
                        'You can install `big-integer` to enable our polyfill that grants back-compatibility with RN 63:\n\n' +
                        '`yarn add big-integer`\n\nOR\n\n`npm install --save big-integer`'
                );
            } else {
                throw e;
            }
        }
    }
}

applyBigIntPolyfill();
