/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026-Present Datadog, Inc.
 */

// Run after flags:compile-fixture. The destination must be an explicit file path.
const fs = require('node:fs');
const crypto = require('node:crypto');
const {
  configurationFromRulesBinary,
} = require('@datadog/flagging-core/rules-based');
const {evaluateRulesBasedConfiguration} = require('@datadog/flagging-core');
const {makeFixture, requests, comparable} = require('../build/flags/fixtures');

const destination = process.argv[2];
if (!destination)
  throw new Error('Usage: node scripts/export-flags-fixture.cjs <output.json>');
const logger = {debug() {}, info() {}, warn() {}, error() {}};
const configurations = [0, 1].map(revision => {
  const fixture = makeFixture(10, revision);
  const configuration = configurationFromRulesBinary(fixture.bytes).rules
    .response;
  const cases = requests.map(request => ({
    request,
    expected: comparable(
      evaluateRulesBasedConfiguration(
        configuration,
        'boolean',
        request.flagKey,
        false,
        request.context,
        logger,
      ),
    ),
  }));
  if (cases.some(({expected}) => expected.reason === 'ERROR'))
    throw new Error('Invalid fixture');
  return {
    revision,
    protobufBase64: Buffer.from(fixture.bytes).toString('base64'),
    protoJson: fixture.json,
    sha256: crypto.createHash('sha256').update(fixture.bytes).digest('hex'),
    cases,
  };
});
fs.writeFileSync(
  destination,
  JSON.stringify(
    {
      generator: 'dd-sdk-reactnative/benchmarks/src/flags/fixtures.ts',
      fixtureVersion: 1,
      flaggingCore: '3.1.1',
      protobufES: '2.15.0',
      configurations,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Wrote ${
    configurations.length * requests.length
  } reference cases to ${destination}`,
);
