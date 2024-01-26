import type {
    Assertion,
    AssertionResult,
    EventTypeAssertions
} from '../types/report';

export class Report {
    assertions: AssertionResult[] = [];
    status: 'FAILED' | 'PASSED' | 'NOT_RUN' = 'NOT_RUN';

    // TODO: This typing enables to keep the arguments for each key.
    // However the return type of assertions is void instead of boolean.
    // This can be done by returning tuples for assertions instead of object.
    connectAssertionsToReport = <AssertionsType extends EventTypeAssertions>(
        assertions: AssertionsType
    ): AssertionsType => {
        const connectedAssertions: Record<string, Assertion> = {};

        Object.entries(assertions).forEach(([key, assertion]) => {
            connectedAssertions[key] = this.connectAssertion(key, assertion);
        });

        // TODO: try to remove the "as T" here
        return connectedAssertions as AssertionsType;
    };

    private connectAssertion = <AssertionType extends Assertion>(
        name: string,
        assertion: AssertionType
    ) => {
        return (...args: Parameters<AssertionType>) => {
            try {
                assertion(...args);
                if (this.status === 'NOT_RUN') {
                    this.status = 'PASSED';
                }
                this.assertions.push({
                    status: 'PASSED',
                    name
                });
                return true;
            } catch (error) {
                this.status = 'FAILED';
                this.assertions.push({
                    status: 'FAILED',
                    name,
                    error: error as Error
                });
                return false;
            }
        };
    };
}
