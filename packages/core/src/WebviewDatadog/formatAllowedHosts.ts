export function formatAllowedHosts(allowedHosts: string[]): string {
    try {
        if (typeof allowedHosts === 'number') {
            throw new Error('Input is a number');
        }
        return `'${JSON.stringify(allowedHosts)}'`;
    } catch (e) {
        return "'[]'";
    }
}
