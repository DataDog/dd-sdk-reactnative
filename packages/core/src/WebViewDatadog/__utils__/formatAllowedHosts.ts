import { getErrorMessage, getErrorStackTrace } from '../../errorUtils';
import { DdSdk } from '../../foundation';

export function formatAllowedHosts(allowedHosts?: string[]): string {
    try {
        return `'${JSON.stringify(allowedHosts)}'`;
    } catch (e) {
        DdSdk.telemetryError(
            getErrorMessage(e),
            getErrorStackTrace(e),
            getErrorMessage(e)
        );
        return "'[]'";
    }
}
