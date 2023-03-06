import { getErrorMessage, getErrorStackTrace } from '../../errorUtils';
import { DdSdk } from '../../foundation';

export function formatAllowedHosts(allowedHosts?: string[]): string {
    try {
        return `'${JSON.stringify(allowedHosts)}'`;
    } catch (e: any) {
        DdSdk.telemetryError(
            getErrorMessage(e),
            getErrorStackTrace(e),
            'AllowedHostsError'
        );
        return "'[]'";
    }
}
