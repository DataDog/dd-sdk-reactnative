import type { TestConfig } from "../../testSetup/types/testConfig";

export type RUMManualScenarioProps = {
    testConfig?: TestConfig,
}

export enum RUMEvent {
    View = "View",
    Action = "Action",
    Resource = "Resource",
    Error = "Error",
};

