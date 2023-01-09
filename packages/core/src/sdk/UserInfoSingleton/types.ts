export type UserInfo = {
    readonly id?: string;
    readonly name?: string;
    readonly email?: string;
    extraInfo?: {
        [key: string]: unknown;
    };
};
