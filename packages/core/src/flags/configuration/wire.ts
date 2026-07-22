/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Wire (de)serialization is reused from `@datadog/flagging-core` (the canonical
// implementation) rather than reimplemented here. `configurationFromString` is lenient:
// it returns an empty configuration (`{}`) for malformed input or an unsupported wire
// version rather than throwing. `configurationToString` is the inverse (its fix from
// https://github.com/DataDog/openfeature-js-client/pull/331 shipped in flagging-core 2.0.0).
export {
    configurationFromString,
    configurationToString
} from '@datadog/flagging-core';
