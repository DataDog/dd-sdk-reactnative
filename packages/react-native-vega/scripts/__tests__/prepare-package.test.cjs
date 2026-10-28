/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-var-requires */

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const packageRoot = path.resolve(__dirname, '../..');
const packageJson = JSON.parse(
    fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
);
const architectures = ['aarch64', 'armv7', 'x86_64'];
const buildTypes = ['release', 'debug'];

const createFixture = context => {
    const root = fs.mkdtempSync(
        path.join(os.tmpdir(), 'datadog-vega-packaging-')
    );
    context.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const manifestPath = path.join(root, 'dist/kepler/tm-manifest.json');
    const native = [];

    for (const arch of architectures) {
        for (const variant of buildTypes) {
            const directoryPath = `${arch}-${variant}`;
            const library = path.join(
                root,
                'dist/kepler',
                directoryPath,
                'lib/libDatadogVega.so'
            );
            fs.mkdirSync(path.dirname(library), { recursive: true });
            fs.writeFileSync(library, `${arch} ${variant} test library`);
            fs.writeFileSync(`${library}.debug`, 'separate debug symbols');
            native.push({ arch, variant, directoryPath });
        }
    }

    fs.writeFileSync(
        manifestPath,
        JSON.stringify({ schema: 1, fileSets: { native } }, null, 2)
    );
    fs.mkdirSync(path.join(root, 'scripts'));
    fs.copyFileSync(
        path.join(packageRoot, 'scripts/prepare-package.js'),
        path.join(root, 'scripts/prepare-package.js')
    );
    fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({
            ...packageJson,
            scripts: { prepack: packageJson.scripts.prepack }
        })
    );

    return { root, manifestPath };
};

const validate = root =>
    spawnSync(process.execPath, ['scripts/prepare-package.js'], {
        cwd: root,
        encoding: 'utf8'
    });

test('npm pack includes all native build variants and preserves their manifest', context => {
    const { root, manifestPath } = createFixture(context);
    const originalManifest = fs.readFileSync(manifestPath, 'utf8');
    fs.mkdirSync(path.join(root, 'build'));
    fs.writeFileSync(
        path.join(root, 'build/local-output'),
        'local build output'
    );
    fs.writeFileSync(path.join(root, 'CMakeUserPresets.json'), '{}');

    const result = spawnSync(
        process.platform === 'win32' ? 'npm.cmd' : 'npm',
        ['pack', '--json', '--cache', path.join(root, 'npm-cache')],
        { cwd: root, encoding: 'utf8' }
    );
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    const [packed] = JSON.parse(result.stdout);
    assert.ok(fs.existsSync(path.join(root, packed.filename)));
    const files = packed.files.map(file => file.path);

    assert.ok(files.includes('dist/kepler/tm-manifest.json'));
    for (const arch of architectures) {
        for (const variant of buildTypes) {
            assert.ok(
                files.includes(
                    `dist/kepler/${arch}-${variant}/lib/libDatadogVega.so`
                ),
                `Missing ${arch} ${variant} library in npm archive`
            );
        }
    }
    assert.ok(!files.some(file => file.endsWith('.so.debug')));
    assert.ok(!files.some(file => file.startsWith('build/')));
    assert.ok(!files.includes('CMakeUserPresets.json'));
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), originalManifest);
});

test('packing requires a native manifest', context => {
    const { root, manifestPath } = createFixture(context);
    fs.unlinkSync(manifestPath);
    const result = validate(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Missing dist\/kepler\/tm-manifest.json/);
    assert.match(result.stderr, /vega build -b Release/);
    assert.match(result.stderr, /vega build -b Debug/);
});

for (const arch of architectures) {
    for (const variant of buildTypes) {
        for (const missing of ['manifest entry', 'library']) {
            test(`packing rejects a missing ${arch} ${variant} ${missing}`, context => {
                const { root, manifestPath } = createFixture(context);
                const originalManifest = fs.readFileSync(manifestPath, 'utf8');
                if (missing === 'manifest entry') {
                    const manifest = JSON.parse(originalManifest);
                    manifest.fileSets.native = manifest.fileSets.native.filter(
                        entry =>
                            entry.arch !== arch || entry.variant !== variant
                    );
                    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
                } else {
                    fs.unlinkSync(
                        path.join(
                            root,
                            `dist/kepler/${arch}-${variant}/lib/libDatadogVega.so`
                        )
                    );
                }
                const beforeValidation = fs.readFileSync(manifestPath, 'utf8');
                const result = validate(root);
                assert.notEqual(result.status, 0);
                const buildType = variant === 'debug' ? 'Debug' : 'Release';
                assert.ok(
                    result.stderr.includes(
                        `Missing ${arch} ${buildType} library`
                    )
                );
                assert.ok(result.stderr.includes(`vega build -b ${buildType}`));
                assert.equal(
                    fs.readFileSync(manifestPath, 'utf8'),
                    beforeValidation
                );
            });
        }
    }
}
