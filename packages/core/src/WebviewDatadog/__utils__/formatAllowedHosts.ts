export function formatAllowedHosts(allowedHosts?: string[]): string {
    try {
        if (typeof allowedHosts === 'number') {
            throw new Error('Input is a number');
        }
        if (typeof allowedHosts === 'undefined') {
            throw new Error('Input is undefined');
        }
        return `'${JSON.stringify(allowedHosts)}'`;
    } catch (e) {
        return "'[]'";
    }
}
