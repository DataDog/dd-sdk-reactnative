/* eslint-disable @typescript-eslint/ban-ts-comment */
import { formatAllowedHosts } from '../__utils__/formatAllowedHosts';

describe('Format allowed hosts', () => {
    it('returns the host in expected format', () => {
        const allowedHosts = ['host1.com', 'example.fr', 'api.com'];
        expect(formatAllowedHosts(allowedHosts)).toBe(
            '\'["host1.com","example.fr","api.com"]\''
        );
    });
    it('returns an empty array when the host is a number', () => {
        const allowedHosts = 1240;
        // @ts-ignore
        expect(formatAllowedHosts(allowedHosts)).toBe("'[]'");
    });
    it('returns an empty arrary when the host is a BigInt', () => {
        const allowedHosts = BigInt(1240);
        // @ts-ignore
        expect(formatAllowedHosts(allowedHosts)).toBe("'[]'");
    });
    it('returns an empty array when the host is a circular reference', () => {
        type circularReference = {
            host: string;
            name?: circularReference | string;
        };
        const allowedHosts: circularReference = { host: 'value', name: '' };
        allowedHosts.name = allowedHosts;
        // @ts-ignore
        expect(formatAllowedHosts(allowedHosts)).toBe("'[]'");
    });
    it('returns an empty array when the hosts are not given', () => {
        expect(formatAllowedHosts()).toBe("'[]'");
    });
});
