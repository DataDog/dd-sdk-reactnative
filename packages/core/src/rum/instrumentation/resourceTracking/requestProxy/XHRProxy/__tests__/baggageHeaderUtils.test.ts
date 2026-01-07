import { InternalLog } from '../../../../../../InternalLog';
import { SdkVerbosity } from '../../../../../../SdkVerbosity';
import { formatBaggageHeader } from '../baggageHeaderUtils';

describe('formatBaggageHeader', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        logSpy = jest.spyOn(InternalLog, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        logSpy.mockRestore();
    });

    it('should format simple key=value entries correctly', () => {
        const entries = new Set(['userId=alice', 'isProduction=false']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('userId=alice,isProduction=false');
        expect(logSpy).not.toHaveBeenCalled();
    });

    it('should not encode non-datadog-specific property values and log a warning', () => {
        const entries = new Set(['user=Amélie', 'region=us east']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('user=Amélie,region=us east');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('invalid baggage header value detected'),
            SdkVerbosity.WARN
        );
    });

    it('should only encode datadog-specific property values', () => {
        const entries = new Set([
            'user=Amélie',
            'session.id=example session id',
            'user.id=example user id',
            'account.id=example account id',
            'region=us east'
        ]);
        const result = formatBaggageHeader(entries);
        expect(result).toBe(
            'user=Amélie,session.id=example%20session%20id,user.id=example%20user%20id,account.id=example%20account%20id,region=us east'
        );
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('invalid baggage header value detected'),
            SdkVerbosity.WARN
        );
    });

    it('should support properties with and without values', () => {
        const entries = new Set(['traceId=abc123;sampled=true;debug']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('traceId=abc123;sampled=true;debug');
    });

    it('should trim whitespace around keys, values, and properties', () => {
        const entries = new Set([' foo = bar ; p1 = one ; p2 ']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('foo=bar;p1=one;p2');
    });

    it('should warn of invalid entries without crashing', () => {
        const entries = new Set(['valid=ok', 'invalidEntry']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('valid=ok');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Dropped invalid baggage header entry'),
            SdkVerbosity.ERROR
        );
    });

    it('should warn of entries with invalid key (non-token)', () => {
        const entries = new Set(['in valid=value', 'user=ok']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('in valid=value,user=ok');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('invalid baggage header keys detected'),
            SdkVerbosity.WARN
        );
    });

    it('should warn of invalid properties (bad property key)', () => {
        const entries = new Set(['user=ok;invalid key=value;good=yes']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('user=ok;invalid key=value;good=yes');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('invalid baggage header key-value'),
            SdkVerbosity.WARN
        );
    });

    it('should log warning when too many members (>64)', () => {
        const entries = new Set<string>();
        for (let i = 0; i < 70; i++) {
            entries.add(`k${i}=v${i}`);
        }
        const result = formatBaggageHeader(entries);
        expect(result?.startsWith('k0=v0')).toBe(true);
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Too many baggage members'),
            SdkVerbosity.WARN
        );
    });

    it('should log warning when header exceeds byte limit', () => {
        const bigValue = 'x'.repeat(9000);
        const entries = new Set([`large=${bigValue}`]);
        const result = formatBaggageHeader(entries);
        expect(result).toContain('large=');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Baggage header too large'),
            SdkVerbosity.WARN
        );
    });

    it('should return null if all entries are invalid', () => {
        const entries = new Set(['badEntry', 'stillBad']);
        const result = formatBaggageHeader(entries);
        expect(result).toBeNull();
    });

    it('should preserve insertion order', () => {
        const entries = new Set(['first=1', 'second=2', 'third=3']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('first=1,second=2,third=3');
    });

    it('should trim keys and values', () => {
        const entries = new Set([
            'traceId=abc123; sampled=true;  debug',
            'test1  = this is a test'
        ]);
        const result = formatBaggageHeader(entries);
        expect(result).toBe(
            'traceId=abc123;sampled=true;debug,test1=this is a test'
        );
    });

    it('should not double encode non-datadog-specific percent-encoded values', () => {
        const entries = new Set([
            'user=foo%20bar',
            'name=Am%C3%A9lie',
            'path=%2Fapi%2Fv1%2Fusers'
        ]);

        const result = formatBaggageHeader(entries);

        expect(result).toBe(
            'user=foo%20bar,name=Am%C3%A9lie,path=%2Fapi%2Fv1%2Fusers'
        );
    });

    it('should not double encode non-datadog-specific percent-encoded property values', () => {
        const entries = new Set([
            'traceId=abc123;user=Am%C3%A9lie;note=hello%20world'
        ]);

        const result = formatBaggageHeader(entries);

        expect(result).toBe(
            'traceId=abc123;user=Am%C3%A9lie;note=hello%20world'
        );
    });

    it('should re-encode mixed encoded/decoded datadog-specific values only once', () => {
        const entries = new Set([
            // should not be encoded because "user" is not datadog-specific
            'user=hello%20world test',
            // partially encoded: "%25" + literal space
            'session.id=example%20session id',
            // contains a literal "%", not a valid escape sequence
            'user.id=example%user id',
            // not encoded
            'account.id=example account id'
        ]);

        const result = formatBaggageHeader(entries);

        expect(result).toBe(
            'user=hello%20world test,session.id=example%20session%20id,user.id=example%user%20id,account.id=example%20account%20id'
        );

        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('invalid baggage header value detected'),
            SdkVerbosity.WARN
        );
    });
});
