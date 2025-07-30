import { Platform } from "react-native";
import { LogLevel, PayloadSize } from "./types";

export const DEFAULT_LOG_MESSAGE = `Hello from the RN ${Platform.OS} Benchmark app`;
export const DEFAULT_LOGS_PER_SECOND = 10;
export const DEFAULT_LOGS_PER_BATCH = 10;
export const DEFAULT_LOG_INTERVAL = 1; // In seconds
export const DEFAULT_IMAGES_TO_LOAD = 1000;
export const DEFAULT_HEAVY_IMAGE_URL = "https://picsum.photos/800/600?random=";
export const MAX_LOG_OUTPUT_ENTRIES = 20;

export const LOG_LEVELS = Object.entries(LogLevel).map(([key, value]) => ({
  label: key,
  value,
}));

export const PAYLOAD_SIZES = Object.entries(PayloadSize).map(([key, value]) => ({
  label: key,
  value,
}));