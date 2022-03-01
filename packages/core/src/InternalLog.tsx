/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {SdkVerbosity} from './SdkVerbosity'

export class InternalLog {

    public static verbosity: SdkVerbosity|undefined = undefined

    public static log (message: any, verbosity: SdkVerbosity) {
        if (verbosity == SdkVerbosity.ERROR && (
                (InternalLog.verbosity == SdkVerbosity.ERROR) ||
                (InternalLog.verbosity == SdkVerbosity.WARN) ||
                (InternalLog.verbosity == SdkVerbosity.INFO) ||
                (InternalLog.verbosity == SdkVerbosity.DEBUG)
        )) {
            console.error(message)
        }

        if (verbosity == SdkVerbosity.WARN && (
                (InternalLog.verbosity == SdkVerbosity.WARN) ||
                (InternalLog.verbosity == SdkVerbosity.INFO) ||
                (InternalLog.verbosity == SdkVerbosity.DEBUG)
        )) {
            console.warn(message)
        }

        if (verbosity == SdkVerbosity.INFO && (
                (InternalLog.verbosity == SdkVerbosity.INFO) ||
                (InternalLog.verbosity == SdkVerbosity.DEBUG)
        )) {
            console.log(message)
        }

        if (verbosity == SdkVerbosity.DEBUG && (
                (InternalLog.verbosity == SdkVerbosity.DEBUG)
        )) {
            console.log(message)
        }
    }
}