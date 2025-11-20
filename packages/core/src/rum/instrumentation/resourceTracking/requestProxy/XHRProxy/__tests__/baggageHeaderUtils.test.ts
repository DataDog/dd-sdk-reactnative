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

    it('should percent-encode spaces and non-ASCII characters in values', () => {
        const entries = new Set(['user=Amélie', 'region=us east']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('user=Am%C3%A9lie,region=us%20east');
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

    it('should skip invalid entries without crashing', () => {
        const entries = new Set(['valid=ok', 'invalidEntry']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('valid=ok');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('Dropped invalid baggage header entry'),
            SdkVerbosity.WARN
        );
    });

    it('should skip entries with invalid key (non-token)', () => {
        const entries = new Set(['in valid=value', 'user=ok']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('user=ok');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('key not compliant'),
            SdkVerbosity.WARN
        );
    });

    it('should skip invalid properties (bad property key)', () => {
        const entries = new Set(['user=ok;invalid key=value;good=yes']);
        const result = formatBaggageHeader(entries);
        expect(result).toBe('user=ok;good=yes');
        expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('property key not compliant'),
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
            'traceId=abc123;sampled=true;debug',
            'test1  = this is a test'
        ]);
        const result = formatBaggageHeader(entries);
        expect(result).toBe(
            'traceId=abc123;sampled=true;debug,test1=this%20is%20a%20test'
        );
    });
});
