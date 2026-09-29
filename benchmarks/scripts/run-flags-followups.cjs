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
  assert.equal(report.rows.length, 12);
  for (const row of report.rows) {
    assert.equal(row.caller.count, 500);
    assert.equal(row.checksum, 500);
    assert.equal(row.pendingAtEnd, 0);
    assert.equal(row.bridgeCalls, report.mode === 'none' ? 0 : 500);
  }
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
        exposures++;
      }
    } else if (url.pathname === '/evaluations') {
      const body = JSON.parse(bytes.toString('utf8'));
      for (const evaluation of body.flagEvaluations) {
        assert.equal(evaluation.flag.key, 'flag-0');
        evaluationCount += evaluation.evaluation_count;
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
  let captured = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on('data', chunk => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks);
      captured.push({
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
  try {
    const modes = [
      'hydration',
      'none',
      'bridge-only',
      'exposures',
      'evaluations',
      'both',
    ];
    assert(
      selectedModes.every(mode => modes.includes(mode)),
      'Unknown experiment mode',
    );
    for (const mode of selectedModes.length ? selectedModes : modes) {
      captured = [];
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
            SIMCTL_CHILD_DD_FLAGS_SINK_PORT: String(server.address().port),
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
      if (mode !== 'hydration') report.sink.requests = captured;
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
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

module.exports = {validateReport};
if (require.main === module)
  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
