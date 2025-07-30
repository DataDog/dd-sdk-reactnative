/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

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