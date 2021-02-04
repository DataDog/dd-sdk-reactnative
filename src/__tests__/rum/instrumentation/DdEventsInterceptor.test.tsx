import { DdEventsInterceptor, RumActionType, UNKNOWN_TARGET_NAME } from '../../../rum/instrumentation/DdEventsInterceptor'
import { DdRum } from '../../../index';

jest.mock('../../../index', () => {
    return {
        DdRum: {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            addAction: jest.fn().mockImplementation(() => { })
        },
    };
});


// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/src/NativeAnimatedHelper')
jest.useFakeTimers()

let testedEventsInterceptor: DdEventsInterceptor

beforeEach(() => {
    testedEventsInterceptor = new DdEventsInterceptor()
    jest.setTimeout(20000)
    DdRum.addAction.mockReset()
})

it('M send a RUM Action event W interceptOnPress { arguments with accesibilityLabel } ', async () => {
    // GIVEN
    const fakeAccessibilityLabel = "target_name"
    const fakeArguments = [{ _targetInst: { memoizedProps: { accessibilityLabel: fakeAccessibilityLabel } } }]

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments)

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1)
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf())
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeAccessibilityLabel)
})

it('M send only one RUM Action event W interceptOnPress { called multiple times for same target } ', async () => {
    // GIVEN
    const fakeAccessibilityLabel = "target_name"
    const fakeArguments = [{ _targetInst: { memoizedProps: { accessibilityLabel: fakeAccessibilityLabel } } }]

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments)
    testedEventsInterceptor.interceptOnPress(fakeArguments)
    testedEventsInterceptor.interceptOnPress(fakeArguments)
    testedEventsInterceptor.interceptOnPress(fakeArguments)

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1)
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf())
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeAccessibilityLabel)
})


it('M send a RUM Action event W interceptOnPress { no accesibilityLabel arguments } ', async () => {
    // GIVEN
    const fakeElementType = "element_type"
    const fakeArguments = [{ _targetInst: { elementType: fakeElementType } }]

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments)

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1)
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf())
    expect(DdRum.addAction.mock.calls[0][1]).toBe(fakeElementType)
})

it('M send a RUM Action event W interceptOnPress { no accesibilityLabel, no elementType } ', async () => {
    // GIVEN
    const fakeElementType = "element_type"
    const fakeArguments = [{ _targetInst: {} }]

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments)

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(1)
    expect(DdRum.addAction.mock.calls[0][0]).toBe(RumActionType.TAP.valueOf())
    expect(DdRum.addAction.mock.calls[0][1]).toBe(UNKNOWN_TARGET_NAME)
})

it('M do nothing W interceptOnPress { invalid arguments } ', async () => {
    // GIVEN
    const fakeElementType = "element_type"
    const fakeArguments = [{}]

    // WHEN
    testedEventsInterceptor.interceptOnPress(fakeArguments)

    // THEN
    expect(DdRum.addAction.mock.calls.length).toBe(0)
})
