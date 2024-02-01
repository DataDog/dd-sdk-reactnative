export type AssertionResult = SuccessfulAssertion | FailedAssertion;

type SuccessfulAssertion = {
    name: string;
    status: 'PASSED';
};

type FailedAssertion = {
    name: string;
    status: 'FAILED';
    error: Error;
};

export type EventTypeAssertions = Record<string, (...args: any[]) => void>;

export type Assertion = (...args: any[]) => void;
