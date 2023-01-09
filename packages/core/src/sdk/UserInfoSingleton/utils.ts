import type { RawUserInfo, UserInfo } from './types';

export const formatUserInfo = (rawUserInfo: RawUserInfo): UserInfo => {
    const { id, email, name, ...extraInfo } = rawUserInfo;
    return {
        id,
        email,
        name,
        extraInfo
    };
};
