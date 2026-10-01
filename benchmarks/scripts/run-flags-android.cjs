/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {
  validateReport: validateFollowup,
  createCollector,
} = require('./run-flags-followups.cjs');
const trackingModes = [
  'none',
  'bridge-only',
  'exposures',
  'evaluations',
  'both',
  'batching-none',
  'batching-current',
  'batching-control',
  'batching-buffered',
];
const sha256 = data => createHash('sha256').update(data).digest('hex');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function validateReport(report, mode) {
  assert.equal(report.correctness, 'passed');
  assert.equal(report.metadata.platform, 'android');
  assert.equal(report.metadata.simulator, true);
  assert.equal(report.metadata.debug, false);
  assert.equal(report.metadata.nativeDebug, false);
  assert.equal(report.metadata.hermes, true);
  assert.equal(report.metadata.newArchitecture, true);
  if (trackingModes.includes(mode)) {
    assert.equal(report.mode, mode);
    assert.equal(report.sink.initialization?.clientType, 'DatadogFlagsClient');
    if (!mode.startsWith('batching-')) {
      assert.equal(
        report.expected.exposures,
        ['exposures', 'both'].includes(mode) ? 3006 : 0,
      );
      assert.equal(
        report.expected.evaluationCount,
        ['evaluations', 'both'].includes(mode) ? 6012 : 0,
      );
    }
    return validateFollowup(report);
  }
  if (mode === 'hydration') {
    assert.equal(report.mode, mode);
    assert.equal(report.rows.length, 27);
    for (const row of report.rows) assert.equal(row.total.count, 30);
    return {hydrations: 810};
  }
  const smoke = mode === 'smoke';
  assert.equal(report.metadata.smoke, smoke);
  assert.equal(report.rows.length, smoke ? 9 : 95);
  const timings = report.rows.filter(row => row.warmRead);
  assert.equal(timings.length, smoke ? 6 : 90);
  for (const row of timings)
    assert.equal(row.warmRead.count, smoke ? 100 : 10000);
  assert.equal(new Set(timings.map(row => row.mode)).size, 6);
  return {placementRows: timings.length, timedReads: smoke ? 600 : 900000};
}

function sourceState(root, scope, output) {
  const git = args =>
    execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
  const paths = new Set(
    [
      ...git(['diff', '--name-only', 'HEAD', '--', scope]).split('\n'),
      ...git(['ls-files', '--others', '--exclude-standard', '--', scope]).split(
        '\n',
      ),
    ].filter(Boolean),
  );
  const changedFiles = {};
  for (const relative of paths) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) {
      changedFiles[relative] = 'deleted';
      continue;
    }
    const data = fs.readFileSync(source);
    changedFiles[relative] = sha256(data);
    const destination = path.join(output, relative);
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    fs.writeFileSync(destination, data);
  }
  return {
    head: git(['rev-parse', 'HEAD']),
    branch: git(['branch', '--show-current']),
    changedFiles,
  };
}

async function main() {
  const [serial, apk, output, androidRoot, mode = 'smoke'] =
    process.argv.slice(2);
  assert(
    serial && apk && output && androidRoot,
    'Usage: node scripts/run-flags-android.cjs <emulator-serial> <Release.apk> <new-results-directory> <android-repo> [smoke|full|hydration|none|bridge-only|exposures|evaluations|both|batching-none|batching-current|batching-control|batching-buffered]',
  );
  assert(
    ['smoke', 'full', 'hydration', ...trackingModes].includes(mode),
    'Unsupported experiment',
  );
  assert.match(serial, /^emulator-\d+$/, 'Physical devices are not allowed');
  const adb = args =>
    execFileSync(process.env.ADB || 'adb', ['-s', serial, ...args], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    }).trim();
  assert.equal(
    adb(['shell', 'getprop', 'ro.kernel.qemu']),
    '1',
    'Target must be an emulator',
  );
  assert(
    !fs.existsSync(output),
    'Use a new result directory; existing evidence is never overwritten',
  );
  fs.mkdirSync(output, {recursive: true});
  const rnRoot = path.resolve(__dirname, '../..');
  const manifest = {
    recordedAt: new Date().toISOString(),
    serial,
    mode,
    host: {platform: process.platform, arch: process.arch},
    device: adb(['shell', 'getprop']),
    rn: sourceState(rnRoot, 'benchmarks', path.join(output, 'sources/rn')),
    android: sourceState(
      androidRoot,
      'prototypes/rules-evaluation',
      path.join(output, 'sources/android'),
    ),
    yarnLockSha256: sha256(fs.readFileSync(path.join(rnRoot, 'yarn.lock'))),
    apkSha256: sha256(fs.readFileSync(apk)),
    validation: null,
  };
  const bundle = 'com.benchmarkrunner';
  const reportPath = `/sdcard/Android/data/${bundle}/files/flags-benchmark-result.json`;
  const collector = trackingModes.includes(mode)
    ? await createCollector()
    : null;
  try {
    adb(['install', '-r', apk]);
    adb(['shell', 'am', 'force-stop', bundle]);
    // The dedicated benchmark app contains only synthetic data. Start each tracking mode clean.
    if (collector) {
      adb(['shell', 'pm', 'clear', bundle]);
      adb(['reverse', `tcp:${collector.port}`, `tcp:${collector.port}`]);
    }
    adb(['shell', 'rm', '-f', reportPath]);
    const launchedAt = Date.now();
    adb([
      'shell',
      'am',
      'start',
      '-W',
      '-n',
      `${bundle}/.MainActivity`,
      '--es',
      'flagsRun',
      mode === 'full' ? 'full' : 'smoke',
      ...(mode === 'hydration' || collector
        ? ['--es', 'flagsExperiment', mode]
        : []),
      ...(collector ? ['--ei', 'flagsSinkPort', String(collector.port)] : []),
    ]);
    let report;
    while (Date.now() - launchedAt < 15 * 60 * 1000) {
      await wait(1000);
      let candidate;
      try {
        candidate = JSON.parse(adb(['shell', 'cat', reportPath]));
      } catch {
        continue;
      }
      if (candidate.correctness === 'running') continue;
      const completed = Date.parse(
        candidate.completedAt || candidate.timestamp,
      );
      assert(
        completed >= launchedAt - 5000,
        'Stale report or emulator clock skew',
      );
      report = candidate;
      break;
    }
    assert(report, 'Timed out waiting for benchmark report');
    if (collector && report.sink) report.sink.requests = collector.requests;
    const json = JSON.stringify(report, null, 2);
    fs.writeFileSync(path.join(output, `${mode}.json`), json);
    manifest.reportSha256 = sha256(json);
    manifest.validation = validateReport(report, mode);
    console.log(JSON.stringify(manifest.validation));
  } finally {
    fs.writeFileSync(
      path.join(output, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
    try {
      fs.writeFileSync(
        path.join(output, 'logcat.txt'),
        adb(['logcat', '-d', '-t', '1500']),
      );
    } finally {
      try {
        adb(['shell', 'am', 'force-stop', bundle]);
        if (collector) adb(['reverse', '--remove', `tcp:${collector.port}`]);
      } finally {
        if (collector) await collector.close();
      }
    }
  }
}

module.exports = {validateReport};
if (require.main === module)
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
