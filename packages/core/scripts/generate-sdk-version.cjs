/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const fs = require('node:fs');
const path = require('node:path');

const license = `/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
`;

function generate(packageRoot, check = false) {
    const { version } = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
    const numeric = '(0|[1-9][0-9]*)';
    const prerelease = '(0|[1-9][0-9]*|[0-9]*[A-Za-z-][0-9A-Za-z-]*)';
    const semver = new RegExp(`^${numeric}\\.${numeric}\\.${numeric}(?:-${prerelease}(?:\\.${prerelease})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$`);
    if (typeof version !== 'string' || !semver.test(version)) {
        throw new Error('The core package must have a valid SemVer version.');
    }
    const generated = '// Generated from packages/core/package.json. Do not edit.\n';
    const outputs = {
        'src/version.ts': `${generated}export const version = '${version}';\n`,
        'ios/Sources/SdkVersion.swift': `${license}\nimport Foundation\n\n${generated}let SdkVersion = "${version}"\n`,
        'android/src/main/kotlin/com/datadog/reactnative/SdkVersion.kt': `${license}\npackage com.datadog.reactnative\n\n${generated}internal const val SDK_VERSION = "${version}"\n`
    };
    for (const [relative, expected] of Object.entries(outputs)) {
        const file = path.join(packageRoot, relative);
        if (check) {
            if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== expected) {
                throw new Error(`Missing or stale SDK version: ${relative}. Run yarn prepare.`);
            }
        } else {
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, expected);
        }
    }
}

if (require.main === module) {
    generate(path.resolve(__dirname, '..'), process.argv.includes('--check'));
}
module.exports = { generate };
