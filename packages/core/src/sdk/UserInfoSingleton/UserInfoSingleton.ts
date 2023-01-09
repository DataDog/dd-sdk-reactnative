import type { UserInfo } from './types';

class UserInfoProvider {
    private userInfo: UserInfo = {};

    setUserInfo = (userInfo: UserInfo) => {
        this.userInfo = userInfo;
    };

    getUserInfo = (): UserInfo => {
        return this.userInfo;
    };
}

export class UserInfoSingleton {
    private static userInfoProvider = new UserInfoProvider();

    static getInstance = (): UserInfoProvider => {
        return UserInfoSingleton.userInfoProvider;
    };

    static reset = () => {
        UserInfoSingleton.userInfoProvider = new UserInfoProvider();
    };
}
