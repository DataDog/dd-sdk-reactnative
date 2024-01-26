export class AssertionError extends Error {
    constructor(
        message: string,
        expected: string,
        actual: string,
        events: Event[]
    ) {
        super(
            `${message}\nExpected: ${expected}\nActual: ${actual}\n\nEvents:\n${JSON.stringify(
                events
            )}`
        );
        this.name = 'AssertionError';
    }
}
