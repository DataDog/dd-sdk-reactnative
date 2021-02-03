/**
 * The SDK configuration class.
 * It will be used to configure the SDK functionality at initialization.
 */
export class DdRNSdkConfiguration {
    constructor(
        readonly clientToken: string,
        readonly env: string,
        readonly applicationId: string,
        readonly trackInteractions: boolean = false
    ) {

    }
}
