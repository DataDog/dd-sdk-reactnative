import type { TestConfig } from "benchmarks/src/testSetup/types/testConfig";

export type SessionReplayScenarioProps = {
    testConfig?: TestConfig,
};

export type SessionReplayStackParamList = {
  UICatalogMenu: undefined;
  UIDetailView: {
    component: string;
  };
};

export enum UIElement {
    Views = "Views",
    Images = "Images",
    TextViews = "TextViews",
    TextInputs = "TextInputs",
    Switches = "Switches",
    Buttons = "Buttons",
    ActivityIndicators = "Activity Indicators",
    Picker = "Pickers",
    Sliders = "Sliders",
    WebView = "WebView",
    SectionList = "SectionList",
    Modal = "Modal",
    Svg = "Svg",
}
