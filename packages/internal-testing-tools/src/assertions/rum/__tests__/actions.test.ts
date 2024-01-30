import { buildRumActionAssertions } from '../actions';

import { mockRumAction } from './__utils__/actions.mock';

describe('actions assertions', () => {
    describe('toHaveActionWith', () => {
        it('does not throw if it contains an action with correct target and type', () => {
            const actions = [
                mockRumAction({}),
                mockRumAction({
                    actionType: 'custom',
                    targetName: 'Checkout done'
                })
            ];
            const actionAssertions = buildRumActionAssertions(actions);
            expect(() =>
                actionAssertions.toHaveActionWith({
                    type: 'custom',
                    target: 'Checkout done'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains an action with correct type', () => {
            const actions = [
                mockRumAction({}),
                mockRumAction({
                    actionType: 'custom',
                    targetName: 'Checkout done'
                })
            ];
            const actionAssertions = buildRumActionAssertions(actions);
            expect(() =>
                actionAssertions.toHaveActionWith({
                    type: 'custom'
                })
            ).not.toThrow();
        });
        it('does not throw if it contains an action with correct target', () => {
            const actions = [
                mockRumAction({}),
                mockRumAction({
                    actionType: 'custom',
                    targetName: 'Checkout done'
                })
            ];
            const actionAssertions = buildRumActionAssertions(actions);
            expect(() =>
                actionAssertions.toHaveActionWith({
                    target: 'Checkout done'
                })
            ).not.toThrow();
        });

        it('throws if it does not contain an action with correct target and type', () => {
            const actions = [
                mockRumAction({}),
                mockRumAction({
                    actionType: 'custom',
                    targetName: 'Checkout done'
                })
            ];
            const actionAssertions = buildRumActionAssertions(actions);
            expect(() =>
                actionAssertions.toHaveActionWith({
                    type: 'tap',
                    target: 'Checkout done'
                })
            ).toThrow();
            expect(() =>
                actionAssertions.toHaveActionWith({
                    type: 'custom',
                    target: 'Login'
                })
            ).toThrow();
        });
        it('throws if it does not contain an action with correct type', () => {
            const actions = [
                mockRumAction({}),
                mockRumAction({
                    actionType: 'custom',
                    targetName: 'Checkout done'
                })
            ];
            const actionAssertions = buildRumActionAssertions(actions);
            expect(() =>
                actionAssertions.toHaveActionWith({
                    type: 'back'
                })
            ).toThrow();
        });
        it('throws if it does not contain an action with correct target', () => {
            const actions = [
                mockRumAction({}),
                mockRumAction({
                    actionType: 'custom',
                    targetName: 'Checkout done'
                })
            ];
            const actionAssertions = buildRumActionAssertions(actions);
            expect(() =>
                actionAssertions.toHaveActionWith({
                    target: 'Login'
                })
            ).toThrow();
        });
        it('throws if no target or type were provided ', () => {
            const actions = [
                mockRumAction({}),
                mockRumAction({
                    actionType: 'custom',
                    targetName: 'Checkout done'
                })
            ];
            const actionAssertions = buildRumActionAssertions(actions);
            expect(() => actionAssertions.toHaveActionWith({})).toThrow();
        });
    });
});
