import { UserInfoSingleton } from '../UserInfoSingleton';

describe('UserInfoSingleton', () => {
    it('sets, returns and resets the user info', () => {
        UserInfoSingleton.getInstance().setUserInfo({
            email: 'user@mail.com',
            extraInfo: {
                loggedIn: true
            }
        });

        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({
            email: 'user@mail.com',
            extraInfo: {
                loggedIn: true
            }
        });

        UserInfoSingleton.reset();

        expect(UserInfoSingleton.getInstance().getUserInfo()).toEqual({});
    });
});
