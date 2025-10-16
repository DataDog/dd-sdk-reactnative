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
    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
    }

    // Create empty .bin if missing
    if (!fs.existsSync(binPath)) {
        fs.writeFileSync(binPath, Buffer.alloc(0));
    }

    // Create empty .json if missing
    if (!fs.existsSync(jsonPath)) {
        fs.writeFileSync(jsonPath, JSON.stringify({}, null, 2));
    }
}

ensureAssets();
