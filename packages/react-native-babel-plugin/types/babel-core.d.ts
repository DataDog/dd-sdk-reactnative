export {};

declare module '@babel/core' {
    interface TransformCaller {
        platform?: string;
    }
}
