/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const {gunzipSync} = require('node:zlib');
const assert = require('node:assert/strict');
const http = require('node:http');

const sha256 = data => createHash('sha256').update(data).digest('hex');
const command = (args, options = {}) =>
  execFileSync('xcrun', args, {encoding: 'utf8', ...options}).trim();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const batchingModes = [
  'batching-none',
  'batching-current',
  'batching-control',
  'batching-buffered',
];

async function createCollector() {
  const requests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      requests.push({
        receivedAt: Date.now(),
        url: `http://127.0.0.1:${server.address().port}${request.url}`,
        bodyBase64: body.toString('base64'),
        bodyBytes: body.length,
        contentEncoding: request.headers['content-encoding'] || '',
      });
      response.writeHead(202);
      response.end();
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    requests,
    port: server.address().port,
    async close() {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

function validateReport(report) {
  assert.equal(report.correctness, 'passed');
  assert.equal(report.metadata.simulator, true);
  assert.equal(report.metadata.debug, false);
  assert.equal(report.metadata.nativeDebug, false);
  if (report.mode === 'hydration') {
    assert.equal(report.rows.length, 27);
    for (const row of report.rows) assert.equal(row.total.count, 30);
    return {hydrations: 810};
  }
  const batching = batchingModes.includes(report.mode);
  const expectedExposures = new Map(),
    expectedEvaluations = new Map();
  if (batching) {
    assert.equal(report.metadata.hermes, true);
    assert.equal(report.metadata.newArchitecture, true);
    assert.equal(
      report.sink.initialization?.clientType,
      report.metadata.platform === 'android'
        ? 'DatadogFlagsClient'
        : 'FlagsClient',
    );
    const enabled = report.mode !== 'batching-none';
    const maxBatch = report.mode === 'batching-buffered' ? 25 : 1;
    assert.deepEqual(report.expected, {
      exposures: enabled ? 2772 : 0,
      evaluationCount: enabled ? 5544 : 0,
    });
    assert.deepEqual(report.policy, {
      maxBatch,
      maxWaitMs: maxBatch === 25 ? 50 : 0,
      nativeDeduplication: true,
      nativeAggregation: true,
    });
    assert.equal(report.rows.length, 24);
    const cases = new Set();
    for (const row of report.rows) {
      const count = {
        '10hz': 20,
        '100hz': 200,
        'screen-burst': 200,
        'stress-burst': 500,
      }[row.workload];
      assert(
        count &&
          ['repeated', 'changing'].includes(row.pattern) &&
          [0, 1, 2].includes(row.repetition),
      );
      const id = `${row.repetition}-${row.workload}-${row.pattern}`;
      assert(!cases.has(id), 'Duplicate workload');
      cases.add(id);
      assert.equal(row.client, `${report.mode}-${id}`);
      assert.equal(row.count, count);
      assert.equal(row.checksum, count);
      assert.equal(row.caller.count, count);
      assert.equal(row.callerMs.length, count);
      assert.deepEqual(row.drained, {buffered: 0, inFlight: 0});
      assert.equal(row.bridgeCalls, row.batchSizes.length);
      assert(
        row.batchSizes.every(
          size => Number.isInteger(size) && size > 0 && size <= maxBatch,
        ),
      );
      assert.equal(
        row.batchSizes.reduce((sum, size) => sum + size, 0),
        enabled ? count : 0,
      );
      assert.equal(row.acknowledgementMs.length, enabled ? count : 0);
      assert.equal(row.enqueueToSubmitMs.length, enabled ? count : 0);
      assert.equal(row.submissionMs.length, row.bridgeCalls);
      for (const field of [
        'callerMs',
        'acknowledgementMs',
        'enqueueToSubmitMs',
        'submissionMs',
        'offCallerFlushMs',
        'timerDelayMs',
      ]) {
        assert(
          row[field].every(value => Number.isFinite(value) && value >= 0),
          `Invalid ${field}`,
        );
      }
      assert(row.timerDelayMs.length > 0);
      assert(row.maxBufferedRecords <= maxBatch);
      if (!enabled) continue;
      expectedEvaluations.set(`${row.client}-warmup`, 1);
      for (let i = 0; i < count; i++) {
        const target = `${row.client}-${row.pattern === 'repeated' ? 0 : i}`;
        expectedExposures.set(target, 1);
        expectedEvaluations.set(
          target,
          (expectedEvaluations.get(target) || 0) + 1,
        );
      }
    }
  } else {
    assert.equal(report.rows.length, 12);
    for (const row of report.rows) {
      assert.equal(row.caller.count, 500);
      assert.equal(row.checksum, 500);
      assert.equal(row.pendingAtEnd, 0);
      assert.equal(row.bridgeCalls, report.mode === 'none' ? 0 : 500);
    }
  }
  const observedExposures = new Map(),
    observedEvaluations = new Map();
  const countTarget = (counts, target, count) => {
    assert.equal(typeof target, 'string');
    counts.set(target, (counts.get(target) || 0) + count);
  };
  let exposures = 0,
    evaluationCount = 0,
    evaluationRecords = 0,
    bodyBytes = 0;
  for (const request of report.sink.requests) {
    const url = new URL(request.url);
    assert.equal(url.hostname, '127.0.0.1');
    let bytes = Buffer.from(request.bodyBase64, 'base64');
    bodyBytes += bytes.length;
    if (request.contentEncoding === 'gzip') bytes = gunzipSync(bytes);
    if (url.pathname === '/exposures') {
      for (const line of bytes.toString('utf8').trim().split('\n')) {
        const exposure = JSON.parse(line);
        assert.equal(exposure.flag.key, 'flag-0');
        if (batching) countTarget(observedExposures, exposure.subject?.id, 1);
        exposures++;
      }
    } else if (url.pathname === '/evaluations') {
      const text = bytes.toString('utf8').trim();
      const evaluations =
        report.metadata.platform === 'android'
          ? text.split('\n').map(line => JSON.parse(line))
          : JSON.parse(text).flagEvaluations;
      for (const evaluation of evaluations) {
        assert.equal(evaluation.flag.key, 'flag-0');
        assert(
          Number.isSafeInteger(evaluation.evaluation_count) &&
            evaluation.evaluation_count > 0,
        );
        evaluationCount += evaluation.evaluation_count;
        if (batching)
          countTarget(
            observedEvaluations,
            evaluation.targeting_key,
            evaluation.evaluation_count,
          );
        evaluationRecords++;
      }
    } else throw new Error(`Unexpected request: ${url.pathname}`);
  }
  assert.equal(
    exposures,
    report.expected.exposures,
    'native exposure output/deduplication',
  );
  assert.equal(
    evaluationCount,
    report.expected.evaluationCount,
    'native aggregation did not lose evaluations',
  );
  if (batching) {
    assert.deepEqual(
      observedExposures,
      expectedExposures,
      'exposures match each targeting key',
    );
    assert.deepEqual(
      observedEvaluations,
      expectedEvaluations,
      'evaluations match each targeting key',
    );
  }
  return {
    exposures,
    evaluationCount,
    evaluationRecords,
    bodyBytes,
    requests: report.sink.requests.length,
  };
}

function sourceState(root, scopes, output) {
  const git = args =>
    execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
  const changed = new Set(
    [
      ...git(['diff', '--name-only', 'HEAD', '--', ...scopes]).split('\n'),
      ...git([
        'ls-files',
        '--others',
        '--exclude-standard',
        '--',
        ...scopes,
      ]).split('\n'),
    ].filter(Boolean),
  );
  const files = {};
  for (const file of changed) {
    const source = path.join(root, file);
    if (!fs.existsSync(source)) {
      files[file] = 'deleted';
      continue;
    }
    const data = fs.readFileSync(source);
    files[file] = sha256(data);
    const target = path.join(output, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, data);
  }
  return {
    head: git(['rev-parse', 'HEAD']),
    branch: git(['branch', '--show-current']),
    changedFiles: files,
  };
}

async function main() {
  const [simulator, app, output, iosRoot, ...selectedModes] =
    process.argv.slice(2);
  if (!simulator || !app || !output || !iosRoot)
    throw new Error(
      'Usage: node scripts/run-flags-followups.cjs <simulator-udid> <Release-simulator.app> <new-output-directory> <ios-repo>',
    );
  const devices = JSON.parse(command(['simctl', 'list', 'devices', '--json']));
  assert(
    Object.values(devices.devices)
      .flat()
      .some(device => device.udid === simulator && device.state === 'Booted'),
    'Boot the selected simulator first',
  );
  assert(
    !fs.existsSync(output),
    'Use a new result directory; existing evidence is never overwritten',
  );
  fs.mkdirSync(output, {recursive: true});
  const rnRoot = path.resolve(__dirname, '../..');
  const manifest = {
    recordedAt: new Date().toISOString(),
    simulator,
    rn: sourceState(rnRoot, ['benchmarks'], path.join(output, 'sources/rn')),
    ios: sourceState(
      iosRoot,
      ['DatadogFlags/Prototypes/RulesEvaluation'],
      path.join(output, 'sources/ios'),
    ),
    xcode: execFileSync('xcodebuild', ['-version'], {encoding: 'utf8'}).trim(),
    podLockSha256: sha256(
      fs.readFileSync(path.join(rnRoot, 'benchmarks/ios/Podfile.lock')),
    ),
    appExecutableSha256: sha256(
      fs.readFileSync(path.join(app, 'BenchmarkRunner')),
    ),
    hermesBundleSha256: sha256(
      fs.readFileSync(path.join(app, 'main.jsbundle')),
    ),
    reports: [],
  };
  const bundle = execFileSync(
    '/usr/libexec/PlistBuddy',
    ['-c', 'Print :CFBundleIdentifier', path.join(app, 'Info.plist')],
    {encoding: 'utf8'},
  ).trim();
  command(['simctl', 'install', simulator, app]);
  const collector = await createCollector();
  try {
    const modes = [
      'hydration',
      'none',
      'bridge-only',
      'exposures',
      'evaluations',
      'both',
      ...batchingModes,
    ];
    assert(
      selectedModes.every(mode => modes.includes(mode)),
      'Unknown experiment mode',
    );
    for (const mode of selectedModes.length
      ? selectedModes
      : modes.filter(mode => !batchingModes.includes(mode))) {
      collector.requests.length = 0;
      const launchAt = Date.now();
      command(
        [
          'simctl',
          'launch',
          '--terminate-running-process',
          `--stdout=${path.resolve(output, `${mode}.stdout.log`)}`,
          `--stderr=${path.resolve(output, `${mode}.stderr.log`)}`,
          simulator,
          bundle,
        ],
        {
          env: {
            ...process.env,
            SIMCTL_CHILD_DD_FLAGS_EXPERIMENT: mode,
            SIMCTL_CHILD_DD_FLAGS_SINK_PORT: String(collector.port),
          },
        },
      );
      const data = command([
        'simctl',
        'get_app_container',
        simulator,
        bundle,
        'data',
      ]);
      let report;
      while (Date.now() - launchAt < 120000) {
        await wait(500);
        try {
          const candidate = JSON.parse(
            fs.readFileSync(
              path.join(data, 'Documents/flags-benchmark-result.json'),
              'utf8',
            ),
          );
          if (
            candidate.correctness === 'failed' &&
            Date.parse(candidate.completedAt) >= launchAt
          ) {
            fs.writeFileSync(
              path.join(output, `${mode}-failed.json`),
              JSON.stringify(candidate, null, 2),
            );
            throw new Error(
              `App failed: ${candidate.error}\n${candidate.stack}`,
            );
          }
          if (
            candidate.mode === mode &&
            Date.parse(candidate.startedAt) >= launchAt &&
            candidate.correctness === 'passed'
          ) {
            report = candidate;
            break;
          }
        } catch (error) {
          if (error.message.startsWith('App failed:')) throw error;
        }
      }
      assert(report, `Timed out waiting for ${mode}`);
      if (mode !== 'hydration') report.sink.requests = collector.requests;
      const json = JSON.stringify(report, null, 2);
      const filename = `${mode}.json`;
      // Preserve the report even when its event-count gate fails, for diagnosis.
      fs.writeFileSync(path.join(output, filename), json);
      const validation = validateReport(report);
      manifest.reports.push({filename, sha256: sha256(json), validation});
      console.log(JSON.stringify({mode, validation}));
      await wait(1000);
    }
  } finally {
    fs.writeFileSync(
      path.join(output, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
    );
    command(['simctl', 'terminate', simulator, bundle]);
    await collector.close();
  }
}

module.exports = {validateReport, createCollector};
if (require.main === module)
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
