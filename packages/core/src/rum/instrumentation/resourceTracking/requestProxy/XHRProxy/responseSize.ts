/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../../InternalLog';
import { SdkVerbosity } from '../../../../../SdkVerbosity';

const MISSING_RESOURCE_SIZE = -1;
export const RESOURCE_SIZE_ERROR_MESSAGE =
    "Couldn't get resource size, because an error occured: ";

function byteLength(str: string): number {
    // This is a weird trick, but it works.
    // Output is the same as TextEncoder.encode(...).length
    return unescape(encodeURI(str)).length;
}

function getResponseContentLengthFromHeader(
    xhr: XMLHttpRequest
): number | null {
    const contentLengthHeader = parseInt(
        xhr.getResponseHeader('Content-Length') ?? '',
        10
    );
    if (!isNaN(contentLengthHeader)) {
        return contentLengthHeader;
    }
    return null;
}

export function calculateResponseSize(xhr: XMLHttpRequest): number {
    const contentLengthHeader = getResponseContentLengthFromHeader(xhr);
    if (contentLengthHeader != null) {
        return contentLengthHeader as number;
    }

    const response = xhr.response;
    if (!response) {
        return MISSING_RESOURCE_SIZE;
    }

    let size;
    try {
        switch (xhr.responseType) {
            case '':
            case 'text':
                // String
                size = byteLength(response);
                break;
            case 'blob':
                size = response.size;
                break;
            case 'arraybuffer':
                size = response.byteLength;
                break;
            case 'document':
                // currently not supported by RN as of 0.66
                // HTML Document or XML Document
                break;
            case 'json':
                // plain JS object
                // original size was lost, because this is the object which was parsed.
                // We can only convert back to the string and calculate the size,
                // which will roughly match original.
                size = byteLength(JSON.stringify(response));
                break;
            default:
                break;
        }
    } catch (e) {
        InternalLog.log(
            `${RESOURCE_SIZE_ERROR_MESSAGE}${e}`,
            SdkVerbosity.ERROR
        );
    }

    if (typeof size !== 'number') {
        return MISSING_RESOURCE_SIZE;
    }
    return size;
}
