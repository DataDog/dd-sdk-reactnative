import { NativeModules } from 'react-native';

import { SessionReplay, SessionReplayPrivacy } from '../SessionReplay';

beforeEach(() => {
    NativeModules.DdSessionReplay.enable.mockClear();
});

describe('SessionReplay', () => {
    describe('enable', () => {
        it('calls native session replay with default configuration', () => {
            SessionReplay.enable();

            expect(NativeModules.DdSessionReplay.enable).toHaveBeenCalledWith(
                20,
                'MASK'
            );
        });

        it('calls native session replay with provided configuration', () => {
            SessionReplay.enable({
                replaySampleRate: 100,
                defaultPrivacyLevel: SessionReplayPrivacy.ALLOW
            });

            expect(NativeModules.DdSessionReplay.enable).toHaveBeenCalledWith(
                100,
                'ALLOW'
            );
        });

        it('calls native session replay with edge cases in configuration', () => {
            SessionReplay.enable({
                replaySampleRate: 0
            });

            expect(NativeModules.DdSessionReplay.enable).toHaveBeenCalledWith(
                0,
                'MASK'
            );
        });
    });
});
