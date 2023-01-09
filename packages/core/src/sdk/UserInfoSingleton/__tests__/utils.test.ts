import { formatUserInfo } from '../utils';

describe('formatUserInfo', () => {
    it('formats a user info with all data', () => {
        expect(
            formatUserInfo({
                id: 'id',
                name: 'name',
                email: 'email',
                other: { nested: 'value' }
            })
        ).toEqual({
            id: 'id',
            name: 'name',
            email: 'email',
            extraInfo: { other: { nested: 'value' } }
        });
    });
    it('formats an empty user info', () => {
        expect(formatUserInfo({})).toEqual({ extraInfo: {} });
    });
});
