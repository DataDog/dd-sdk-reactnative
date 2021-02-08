import type EventsInterceptor from './EventsInterceptor'

export default class NoOpEventsInterceptor implements EventsInterceptor {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    interceptOnPress(..._args: any[]): void {
        // NoOp
    }
}