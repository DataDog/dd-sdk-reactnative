import { getGlobalInstance } from '../singletonUtils';

describe('singletonUtils', () => {
    const createdSymbols: symbol[] = [];
    const g = (globalThis as unknown) as Record<PropertyKey, unknown>;

    afterEach(() => {
        for (const symbol of createdSymbols) {
            delete g[symbol];
        }

        createdSymbols.length = 0;
        jest.restoreAllMocks();
    });

    it('only creates one instance for the same key', () => {
        const key = 'com.datadog.reactnative.test';
        const symbol = Symbol.for(key);
        createdSymbols.push(symbol);

        const objectConstructor = jest.fn(() => ({ id: 1 }));
        const a = getGlobalInstance(key, objectConstructor);
        const b = getGlobalInstance(key, objectConstructor);

        expect(a).toBe(b);
        expect(objectConstructor).toHaveBeenCalledTimes(1);
        expect(g[symbol]).toBe(a);
    });

    it('returns a pre-existing instance without creating a new one for the same key', () => {
        const key = 'com.datadog.reactnative.test';
        const symbol = Symbol.for(key);
        createdSymbols.push(symbol);

        const existing = { pre: true };
        g[symbol] = existing;

        const objectConstructor = jest.fn(() => ({ created: true }));
        const result = getGlobalInstance(key, objectConstructor);

        expect(result).toBe(existing);
        expect(objectConstructor).not.toHaveBeenCalled();
    });

    it('creates a new instance for a different key', () => {
        const keyA = 'com.datadog.reactnative.test.a';
        const keyB = 'com.datadog.reactnative.test.b';
        const symbolA = Symbol.for(keyA);
        const symbolB = Symbol.for(keyB);
        createdSymbols.push(symbolA, symbolB);

        const a = getGlobalInstance(keyA, () => ({ id: 'A' }));
        const b = getGlobalInstance(keyB, () => ({ id: 'B' }));

        expect(a).not.toBe(b);
        expect((a as any).id).toBe('A');
        expect((b as any).id).toBe('B');
    });

    it('does not overwrite existing instance if called with a different constructor', () => {
        const key = 'com.datadog.reactnative.test';
        const symbol = Symbol.for(key);
        createdSymbols.push(symbol);

        const firstObjectConstructor = jest.fn(() => ({ id: 1 }));
        const first = getGlobalInstance(key, firstObjectConstructor);

        const secondObjectConstructor = jest.fn(() => ({ id: 2 }));
        const second = getGlobalInstance(key, secondObjectConstructor);

        expect(first).toBe(second);
        expect(firstObjectConstructor).toHaveBeenCalledTimes(1);
        expect(secondObjectConstructor).not.toHaveBeenCalled();
    });
});
