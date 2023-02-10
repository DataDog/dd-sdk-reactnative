import { TraceIdentifier } from '../distributedTracing';

describe('TraceIdentifier', () => {
    it('M return an unique identifier W toString', async () => {
        // GIVEN
        const generatedIds = new Set<string>();
        const iterations = 100;
        let counter = iterations;

        // WHEN
        while (counter-- > 0) {
            generatedIds.add(new TraceIdentifier().toString(10));
        }

        // THEN
        expect(generatedIds.size).toBe(iterations);
    });

    it('M return an 64 bits positive integer W toString', async () => {
        let iterations = 100;
        while (iterations-- > 0) {
            // GIVEN
            const id = new TraceIdentifier().toString(10);

            // THEN
            expect(id).toMatch(/[1-9]{1,19}/);
            // should be less than the max 64 bits integer
            if (id.length === 19) {
                expect(id < '9223372036854775807').toBeTruthy();
            }
        }
    });

    it('M return an 64 bits positive hex W toString(16)', async () => {
        let iterations = 100;
        while (iterations-- > 0) {
            // GIVEN
            const trace = new TraceIdentifier();
            const id = trace.toString(16);
            const paddedId = trace.toPaddedString(16, 16);

            // THEN
            expect(id).toMatch(/[1-9a-f]{1,16}/);
            expect(paddedId).toMatch(/[0-9a-f]{16}/);
        }
    });

    it('M return an 64 bits positive padded hex W toPaddedString(16, 32)', async () => {
        let iterations = 100;
        while (iterations-- > 0) {
            // GIVEN
            const id = new TraceIdentifier().toPaddedString(16, 32);

            // THEN
            expect(id).not.toMatch(/[0]{32}/);
            expect(id).toMatch(/[0]{16}[0-9a-f]{16}/);
        }
    });

    it('M return original string hex W toPaddedString(16, 10)', async () => {
        let iterations = 100;
        while (iterations-- > 0) {
            // GIVEN
            const id = new TraceIdentifier().toPaddedString(16, 10);

            // THEN
            expect(id).not.toMatch(/[0]{10}/);
            expect(id).toMatch(/[0-9a-f]{10}/);
        }
    });
});
