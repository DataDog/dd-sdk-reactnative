export const getGlobalInstance = <T>(
    key: string,
    objectConstructor: () => T
): T => {
    const symbol = Symbol.for(key);
    const g = (globalThis as unknown) as Record<PropertyKey, unknown>;

    if (!(symbol in g)) {
        g[symbol] = objectConstructor();
    }
    return g[symbol] as T;
};
