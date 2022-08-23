import { renderWithProvider } from './renderWithProvider';

describe('DatadogProvider', () => {
    describe('initialization', () => {
        it('renders its children', () => {
            const { getByText } = renderWithProvider();
            getByText('I am a test application');
        });
    });
});
