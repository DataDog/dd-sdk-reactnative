/**
 * Main entry point for Datadog's Log feature
 */
export declare type DdLogsType = {
    /**
     * Initialize Datadog's Logs feature
     */
    init(configuration: DdLogsConfiguration): Promise<void>;
    /**
     * Logs a message with level INFO
     * message: The message to log.
     * attributes: The attributes to attach to the logs.
     */
    info(message: string, attributes: object): Promise<void>;
};
/**
 * Configuration class for Datadog's Log feature
 */
export declare class DdLogsConfiguration {
    readonly clientToken: string;
    readonly env: string;
    readonly service: string;
    constructor(clientToken: string, env: string, service: string);
}
