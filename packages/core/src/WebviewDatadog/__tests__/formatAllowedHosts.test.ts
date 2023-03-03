/* eslint-disable @typescript-eslint/ban-ts-comment */
import { NativeModules } from 'react-native';

import { formatAllowedHosts } from '../__utils__/formatAllowedHosts';

describe('Format allowed hosts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('returns the host in expected format', () => {
        const allowedHosts = ['host1.com', 'example.fr', 'api.com'];
        expect(formatAllowedHosts(allowedHosts)).toBe(
            '\'["host1.com","example.fr","api.com"]\''
        );
    });
    it('returns an empty arrary when the host is a BigInt', () => {
        const allowedHosts = BigInt(1240);
        // @ts-ignore
        const result = formatAllowedHosts(allowedHosts);
        expect(NativeModules.DdSdk.telemetryError).toBeCalled();
        expect(result).toBe("'[]'");
    });
    it('returns an empty array when the host is a circular reference', () => {
        type circularReference = {
            host: string;
            name?: circularReference | string;
        };
        const allowedHosts: circularReference = { host: 'value', name: '' };
        allowedHosts.name = allowedHosts;
        // @ts-ignore
        const result = formatAllowedHosts(allowedHosts);
        expect(NativeModules.DdSdk.telemetryError).toBeCalled();
        expect(result).toBe("'[]'");
    });
});
