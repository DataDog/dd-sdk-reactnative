import { NativeModules } from 'react-native';

import { SessionReplay } from '../SessionReplay';

beforeEach(() => {
    NativeModules.DdSessionReplay.enable.mockClear();
});

describe('SessionReplay', () => {
    describe('enable', () => {
        it('calls native session replay with correct configuration', () => {
            SessionReplay.enable();

            expect(NativeModules.DdSessionReplay.enable).toHaveBeenCalled();
        });
    });
});
