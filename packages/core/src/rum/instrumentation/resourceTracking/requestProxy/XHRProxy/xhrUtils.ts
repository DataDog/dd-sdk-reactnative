/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { InternalLog } from '../../../../../InternalLog';
import { SdkVerbosity } from '../../../../../SdkVerbosity';

/**
 * Safely parses a JSON string.
 *
 * @param text - JSON string to parse.
 * @returns Parsed value or `null` if parsing fails.
 */
export function safeJsonParse<T = any>(
    text: string | null | undefined
): T | null {
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        return null;
    }
}

/**
 * Safely reads `responseText` from an XHR object.
 *
 * @param xhr - XHR-like object.
 * @returns Response text or `null` if unavailable.
 */
export function safeGetResponseText(xhr: any): string | null {
    // RN can throw if responseType is "blob"
    try {
        return typeof xhr?.responseText === 'string' ? xhr.responseText : null;
    } catch {
        return null;
    }
}

/**
 * Converts a Blob-like object to text.
 *
 * @param blob - Blob or Blob-like value.
 * @returns Text content or `null` if conversion fails.
 */
export async function blobToText(blob: any): Promise<string | null> {
    if (!blob) {
        return null;
    }

    // 'data' field is sometimes available in a blob, use should use that if available
    const data = blob?._data;
    if (typeof data === 'string') {
        return data;
    }

    if (typeof blob.text === 'function') {
        try {
            return await blob.text();
        } catch (error) {
            const errorData = getErrorData(error);
            if (errorData) {
                InternalLog.log(
                    `Unable to transform blob to text using 'blob.text()': ${errorData}`,
                    SdkVerbosity.WARN
                );
            }
        }
    }

    if (typeof FileReader !== 'undefined') {
        try {
            return await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result ?? ''));
                reader.onerror = () => reject(new Error('FileReader error'));
                reader.readAsText(blob);
            });
        } catch (error) {
            const errorData = getErrorData(error);
            if (errorData) {
                InternalLog.log(
                    `Unable to transform blob to text using 'FileReader': ${errorData}`,
                    SdkVerbosity.WARN
                );
            }
        }
    }

    return null;
}

/**
 * Reads and parses an XHR response body as JSON.
 *
 * @param xhr - XHR-like object.
 * @returns Parsed JSON or `null` if not readable.
 */
export async function readXhrJsonBody(xhr: any): Promise<any | null> {
    // If responseType allows it, responseText is the simplest
    if (xhr?.responseType === '' || xhr?.responseType === 'text') {
        const t = safeGetResponseText(xhr);
        const parsed = safeJsonParse(t);

        if (parsed) {
            return parsed;
        }
    }

    // Use xhr.response
    const response = xhr?.response;

    // Already parsed JSON
    if (response && typeof response === 'object' && !('size' in response)) {
        return response;
    }

    // String
    if (typeof response === 'string') {
        return safeJsonParse(response);
    }

    // Blob
    if (response && typeof response === 'object') {
        const text = await blobToText(response);
        return safeJsonParse(text);
    }

    return null;
}

/**
 * Extracts basic error data for logging.
 *
 * @param error - Unknown error value.
 * @returns Serialized error info or `null`.
 */
export function getErrorData(error: unknown) {
    if (error instanceof Error) {
        return JSON.stringify({
            name: error.name,
            message: error.message,
            stack: error.stack
        });
    }

    return null;
}
