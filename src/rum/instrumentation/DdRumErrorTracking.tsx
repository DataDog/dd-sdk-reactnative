/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react'
import { DdRum } from '../../index';


const EMPTY_STACK_TRACE = ""
const TYPE_SOURCE = "SOURCE"

/**
* Provides RUM auto-instrumentation feature to track errors as RUM events.
*/
export class DdRumErrorTracking {

    private static sIsTracking = false

    private static defaultErrorHandler = (error: any, isFatal?: boolean) => {}

    /**
     * Starts tracking errors and sends a RUM Error event every time an error is detected.
     */
    static startTracking(): void {
        // extra safety to avoid wrapping the Error handler twice
        if (this.sIsTracking) {
            return
        }
        
        if (ErrorUtils) {
            this.defaultErrorHandler = ErrorUtils.getGlobalHandler();

            ErrorUtils.setGlobalHandler(this.onError);

            this.sIsTracking = true;
        }

    }

    static onError(error: any, isFatal?: boolean) {
        // Stack trace
        let stack = EMPTY_STACK_TRACE
        if (error.hasOwnProperty('componentStack')) {
            stack = String(error.componentStack);
        } else if (error.hasOwnProperty('sourceURL') && error.hasOwnProperty('line') && error.hasOwnProperty('column')) {
            stack = "at " + error.sourceURL + ":" + error.line + ":" + error.column
        }

        DdRum.addError(String(error), TYPE_SOURCE, stack, new Date().getTime(), error).then(() => {
            this.defaultErrorHandler(error, isFatal)
        });
    }

}

