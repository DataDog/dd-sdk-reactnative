export type UserInfo = {
    readonly id?: string;
    readonly name?: string;
    readonly email?: string;
    extraInfo?: {
        [key: string]: unknown;
    };
};

export type RawUserInfo = {
    id?: string;
    name?: string;
    email?: string;
    [key: string]: unknown;
};
