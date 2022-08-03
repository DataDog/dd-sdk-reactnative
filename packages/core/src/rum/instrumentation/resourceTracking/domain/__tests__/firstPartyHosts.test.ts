import { firstPartyHostsRegexBuilder } from '../firstPartyHosts';

describe('firstPartyHosts', () => {
    describe('firstPartyHostsRegexBuilder', () => {
        it('returns a RegExp that matches hosts', () => {
            const regex = firstPartyHostsRegexBuilder(['api.example.com']);
            expect(regex.test('api.example.com')).toBe(true);
            expect(regex.test('api.myapi.com')).toBe(false);
        });

        it('escapes special characters in hosts', () => {
            const regex = firstPartyHostsRegexBuilder(['api.example.com']);
            expect(regex.test('apiiexample.com')).toBe(false);
        });
    });
});
