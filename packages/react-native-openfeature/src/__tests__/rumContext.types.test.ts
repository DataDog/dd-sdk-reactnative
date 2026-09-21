/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { spawnSync } from 'child_process';
import { resolve } from 'path';

it('typechecks RUM context inputs and outputs against the public API', () => {
    // Run tsc separately so Jest's React Native transforms do not process the compiler itself.
    const result = spawnSync(
        process.execPath,
        [
            require.resolve('typescript/bin/tsc'),
            '--project',
            resolve(__dirname, '__utils__/tsconfig.json'),
            '--pretty',
            'false'
        ],
        { encoding: 'utf8', timeout: 120000 }
    );

    expect(result.error).toBeUndefined();
    expect(result.stdout + result.stderr).toBe('');
    expect(result.status).toBe(0);
});
