/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

export const sortNumbers = (count: number): void => {
    const values = Array.from({ length: count }, () => Math.random());
    values.sort((a, b) => a - b);
};

export const fibonacci = (n: number): number => {
    if (n < 2) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
};

export const computePrimes = (limit: number): number => {
    const isComposite = new Uint8Array(limit + 1);
    let count = 0;
    for (let i = 2; i <= limit; i++) {
        if (!isComposite[i]) {
            count++;
            for (let j = i * i; j <= limit; j += i) {
                isComposite[j] = 1;
            }
        }
    }
    return count;
};
