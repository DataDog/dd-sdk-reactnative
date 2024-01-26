import { Report } from '../Report';

const mockAssertions = {
    successfulAssertion: () => {},
    failingAssertion: () => {
        throw new Error('assertion failed');
    }
};

describe('Report', () => {
    it('adds assertions when successful', () => {
        const report = new Report();
        const assertions = report.connectAssertionsToReport(mockAssertions);
        assertions.successfulAssertion();

        expect(report.assertions).toMatchInlineSnapshot(`
            [
              {
                "name": "successfulAssertion",
                "status": "PASSED",
              },
            ]
        `);
        expect(report.status).toBe('PASSED');
    });

    it('adds assertions when failing', () => {
        const report = new Report();
        const assertions = report.connectAssertionsToReport(mockAssertions);
        assertions.failingAssertion();

        expect(report.assertions).toMatchInlineSnapshot(`
            [
              {
                "error": [Error: assertion failed],
                "name": "failingAssertion",
                "status": "FAILED",
              },
            ]
        `);
        expect(report.status).toBe('FAILED');
    });
});
