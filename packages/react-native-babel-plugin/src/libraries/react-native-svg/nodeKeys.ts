/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Local bindings (L) and exported names (E) are distinct, even in the same file.
// NUL separates fields because file paths cannot contain it.
export function nodeKey(file: string, name: string): string {
    return `L\0${file}\0${name}`;
}

export function exportNodeKey(file: string, name: string): string {
    return `E\0${file}\0${name}`;
}

export function splitNodeKey(
    key: string
): [kind: 'local' | 'export', file: string, name: string] {
    const [kindTag, file, name] = key.split('\0');
    return [kindTag === 'E' ? 'export' : 'local', file, name];
}
