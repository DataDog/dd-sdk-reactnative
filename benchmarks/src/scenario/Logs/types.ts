/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import type { TestConfig } from "../../testSetup/types/testConfig";
import { Platform } from 'react-native';

export enum PayloadSize {
    Small = 'Small',
    Medium = 'Medium',
    Large = 'Large',
}

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}

export type LogsCustomScenarioProps = {
    testConfig?: TestConfig,
}

export type LogsHeavyTrafficScenarioProps = {
    testConfig?: TestConfig,
}

export type ImageListProps = {
    testConfig?: TestConfig,
}

export type LogsHeavyTrafficConfigParams = {
    logMessage?: string;
    logLevel?: LogLevel;
    payloadSize?: PayloadSize;
    logsPerBatch?: number;
}

export const PAYLOADS_BY_SIZE = {
    Small: {
        log_type: "simple",
    },
    Medium: {
        user: {
            id: "ded3deb2-08cf-4c4f-8c41-fb64765071f0",
            name: "John Doe",
            email: "johndoe@example.com",
        },
        device: {
            type: Platform.OS === 'ios' ? "iPhone" : "Android Phone",
            os: Platform.OS === 'ios' ? "iOS 17.0" : "Android 15",
        },
        log_type: "user_event",
    },
    Large: {
        log_type: "user_event",
        session: {
            id: "23091509-8e00-4802-ae41-dcb89b7ff999",
            startTime: "2024-02-27T12:00:00Z",
            duration: "2450",
        },
        user: {
            id: "a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6",
            name: "John Doe",
            email: "johndoe@example.com",
        },
        location: {
            city: "San Francisco",
            country: "USA",
        },
        device: {
            model:  Platform.OS === 'ios' ? "iPhone 15 Pro" : "Google Pixel 8",
            os: Platform.OS === 'ios' ? "iOS 17.0" : "Android 15",
            battery: "80%",
        },
        network: {
            type: "WiFi",
            carrier: "Verizon",
        },
        errorStack: {
            stackTrace: "Error at module XYZ -> function ABC",
            crashType: "NullPointerException",
        },
    },
};