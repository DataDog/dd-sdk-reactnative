import type { RumActionEvent } from 'rum-events-format';

export const mockRumAction = ({
    actionType,
    targetName
}: {
    actionType?: RumActionEvent['action']['type'];
    targetName?: string;
}): RumActionEvent => {
    return {
        type: 'action',
        action: {
            type: actionType || 'tap',
            target: { name: targetName || 'Tap on RCTView' }
        }
    } as RumActionEvent;
};
