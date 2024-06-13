import { InternalLog } from '../InternalLog';
import { SdkVerbosity } from '../SdkVerbosity';

export const validateContext = (context: any) => {
    if (!context) {
        return {};
    }

    // eslint-disable-next-line eqeqeq
    if (context.constructor == Object) {
        return context;
    }

    if (Array.isArray(context)) {
        InternalLog.log(
            "The given context is an array, it will be nested in 'context' property inside a new object.",
            SdkVerbosity.WARN
        );
        return { context };
    }

    InternalLog.log(
        `The given context (${context}) is invalid - it must be an object. Context will be empty.`,
        SdkVerbosity.ERROR
    );

    return {};
};
