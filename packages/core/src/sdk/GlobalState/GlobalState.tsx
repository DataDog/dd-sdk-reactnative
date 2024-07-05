/**
 * A singleton container for attributes that are shared internally across all
 * the SDK classes.
 */
export class GlobalState {
    /**
     * `true` if the SDK is initialized, `false` otherwise.
     */
    public isInitialized = false;

    // Singleton implementation
    private static _instance: GlobalState | undefined = undefined;
    public static get instance(): GlobalState {
        if (this._instance === undefined) {
            this._instance = new GlobalState();
        }

        return this._instance;
    }
}
