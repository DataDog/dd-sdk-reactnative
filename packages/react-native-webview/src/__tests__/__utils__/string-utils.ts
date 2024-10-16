/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Utility function to remove indentation from a given string
export function dedent(str: string) {
    const match = str.match(/^[ \t]*(?=\S)/gm);
    const indent = match ? Math.min(...match.map(el => el.length)) : 0;
    const regex = new RegExp(`^[ \\t]{${indent}}`, 'gm');
    return indent > 0 ? str.replace(regex, '') : str;
}
