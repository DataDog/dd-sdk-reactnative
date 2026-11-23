/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Keep this folder without a package.json so exports-aware Metro uses the
// parent package's exports map. Legacy Metro follows this source entry instead.
export * from '../src/internal';
