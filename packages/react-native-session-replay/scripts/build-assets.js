/* Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

const assetsDir = path.resolve(__dirname, '..', 'assets');
const binPath = path.join(assetsDir, 'assets.bin');
const jsonPath = path.join(assetsDir, 'assets.json');

function ensureAssets() {
    try {
        if (fs.existsSync(assetsDir)) {
            fs.rmSync(assetsDir, { recursive: true, force: true });
        }

        fs.mkdirSync(assetsDir, { recursive: true });

        fs.writeFileSync(binPath, Buffer.alloc(0));

        fs.writeFileSync(jsonPath, JSON.stringify({}, null, 2));
    } catch (error) {
        console.error('Error creating assets:', error.message);
        process.exit(1);
    }
}

ensureAssets();
