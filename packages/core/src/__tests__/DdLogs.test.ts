import { NativeModules } from 'react-native';

import { LoggerLevel } from '../LoggerLevel';
import { DdLogs } from '../foundation';

describe('DdLogs', () => {
    it('does not send logs over the level when level is set', () => {
        DdLogs.setLevel(LoggerLevel.INFO);
        DdLogs.debug('debug');
        DdLogs.info('info');
        DdLogs.warn('warn');
        DdLogs.error('error');

        expect(NativeModules.DdLogs.debug).not.toHaveBeenCalled();
        expect(NativeModules.DdLogs.info).toHaveBeenCalledTimes(1);
        expect(NativeModules.DdLogs.warn).toHaveBeenCalledTimes(1);
        expect(NativeModules.DdLogs.error).toHaveBeenCalledTimes(1);
    });
});
