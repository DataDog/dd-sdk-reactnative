import { RumActionType } from "@datadog/mobile-react-native";
import { RUMEvent } from "./types";

export const RUM_EVENTS = Object.entries(RUMEvent).map(([key, value]) => ({
  label: key,
  value,
}));

export const RUM_ACTION_TYPES = Object.entries(RumActionType).map(([key, value]) => ({
  label: key,
  value,
}));