/**
 * In the tests, performance.now sometimes does not change as fast as Date.now.
 * This results in short intervals sometimes having a duration of 0ms and flaky tests.
 */
global.performance.now = () => {
    return Date.now();
};
