/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { generate } = require('./generate-sdk-version.cjs');

for (const version of ['3.9.0', '4.0.0', '4.1.0-rc.2+build.42']) {
    test(`generates all three shipped identities from ${version}`, t => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-sdk-version-'));
        t.after(() => fs.rmSync(root, { recursive: true, force: true }));
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version }));
        generate(root);
        generate(root, true);
        for (const relative of ['src/version.ts', 'ios/Sources/SdkVersion.swift', 'android/src/main/kotlin/com/datadog/reactnative/SdkVersion.kt']) {
            assert.ok(fs.readFileSync(path.join(root, relative), 'utf8').includes(version));
        }
        fs.writeFileSync(path.join(root, 'src/version.ts'), 'stale');
        assert.throws(() => generate(root, true), /stale/);
        generate(root);
        fs.unlinkSync(path.join(root, 'ios/Sources/SdkVersion.swift'));
        assert.throws(() => generate(root, true), /Missing/);
        generate(root);
        generate(root, true);
    });
}

test('rejects absent and invalid package versions', t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-sdk-version-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    for (const version of [undefined, '', '1.2', '01.2.3', '1.2.3-01']) {
        fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version }));
        assert.throws(() => generate(root), /SemVer/);
    }
});
