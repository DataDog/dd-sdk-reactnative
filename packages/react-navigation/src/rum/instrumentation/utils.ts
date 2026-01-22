/**
 * Transforms the view key format from 'ScreenName-uniqueId' to 'ScreenName/uniqueId'.
 *
 * @example
 * // Input: key='Elements-lUQ9cId5lwk1o94euVh2B', screenName='Elements'
 * // Output: 'Elements/lUQ9cId5lwk1o94euVh2B'
 *
 * @param key - The route key (e.g., 'Elements-lUQ9cId5lwk1o94euVh2B')
 * @param screenName - The screen name (e.g., 'Elements')
 * @returns The transformed key, or the original key if not in expected format
 */
export function transformViewKey(
    key: string,
    screenName: string | null
): string {
    if (!screenName || !key) {
        return key;
    }

    const expectedPrefix = `${screenName}-`;
    if (key.startsWith(expectedPrefix)) {
        const uniqueId = key.slice(expectedPrefix.length);
        return `${screenName}/${uniqueId}`;
    }

    // Key is not in the expected format, use original
    return key;
}
