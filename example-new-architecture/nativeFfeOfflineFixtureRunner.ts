import {DdSdkReactNative} from '@datadog/mobile-react-native';
import type {
  FlagEvaluationResult,
  FlagValue,
  FlagsEvaluationContext,
  FlagsProviderDebugState,
} from '@datadog/mobile-react-native';

import ufcConfig from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/ufc-config.json';
import testCaseBooleanFalseAssignment from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-boolean-false-assignment.json';
import testCaseBooleanOneOfMatches from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-boolean-one-of-matches.json';
import testCaseComparatorOperatorFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-comparator-operator-flag.json';
import testCaseDisabledFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-disabled-flag.json';
import testCaseEmptyFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-empty-flag.json';
import testCaseEmptyStringVariation from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-empty-string-variation.json';
import testCaseFalsyValueAssignments from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-falsy-value-assignments.json';
import testCaseFlagWithEmptyString from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-flag-with-empty-string.json';
import testCaseIntegerFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-integer-flag.json';
import testCaseKillSwitchFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-kill-switch-flag.json';
import testCaseMalformedFlagIsolation from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-malformed-flag-isolation.json';
import testCaseMicrosecondDateFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-microsecond-date-flag.json';
import testCaseMissingSplitShardsIsolation from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-missing-split-shards-isolation.json';
import testCaseNewUserOnboardingFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-new-user-onboarding-flag.json';
import testCaseNoAllocationsFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-no-allocations-flag.json';
import testCaseNullOperatorFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-null-operator-flag.json';
import testCaseNullTargetingKey from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-null-targeting-key.json';
import testCaseNumericFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-numeric-flag.json';
import testCaseNumericOneOfDefault from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-numeric-one-of-default.json';
import testCaseNumericOneOf from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-numeric-one-of.json';
import testCaseOf7EmptyTargetingKey from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-of-7-empty-targeting-key.json';
import testCaseRegexFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-regex-flag.json';
import testCaseStartAndEndDateFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-start-and-end-date-flag.json';
import testCaseUnknownFieldsTolerance from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-unknown-fields-tolerance.json';
import testCaseUnknownOperatorIsolation from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-case-unknown-operator-isolation.json';
import testFlagThatDoesNotExist from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-flag-that-does-not-exist.json';
import testJsonConfigFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-json-config-flag.json';
import testNoAllocationsFlag from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-no-allocations-flag.json';
import testSpecialCharacters from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-special-characters.json';
import testStringWithSpecialCharacters from '../packages/core/src/flags/__fixtures__/ffe-system-test-data/evaluation-cases/test-string-with-special-characters.json';

type FixtureResult = {
  reason: string;
  value: FlagValue;
  errorCode?: string;
};

type EvaluationCase = {
  attributes?: Record<string, unknown>;
  defaultValue: FlagValue;
  flag: string;
  result: FixtureResult;
  targetingKey?: string | null;
  variationType: 'BOOLEAN' | 'STRING' | 'INTEGER' | 'NUMERIC' | 'JSON';
};

type EvaluationCaseFixture = [string, EvaluationCase[]];

export type NativeFfeOfflineFixtureReport = {
  summary: string;
  details: {
    caseCount: number;
    fixtureCount: number;
    configuration: {
      etag?: string;
      kind?: string;
      version?: number;
    };
    serializedWireBytes: number;
    saveState: FlagsProviderDebugState;
    setState: FlagsProviderDebugState;
    finalState: FlagsProviderDebugState;
  };
};

export const NATIVE_FFE_OFFLINE_FIXTURE_SUCCESS_PREFIX =
  'Native FFE offline fixture pass';

export const NATIVE_FFE_SHARED_RULES_WIRE = JSON.stringify({
  version: 2,
  server: {
    response: JSON.stringify(ufcConfig),
    etag: 'ffe-system-test-data',
  },
});

const NATIVE_FFE_FIXTURE_STORAGE_OPTIONS = {
  slot: 'offline-fixture-corpus',
};

const NUMERIC_TOLERANCE = 0.0000001;

const evaluationCaseFixtures: EvaluationCaseFixture[] = [
  [
    'test-case-boolean-false-assignment.json',
    testCaseBooleanFalseAssignment as EvaluationCase[],
  ],
  [
    'test-case-boolean-one-of-matches.json',
    testCaseBooleanOneOfMatches as EvaluationCase[],
  ],
  [
    'test-case-comparator-operator-flag.json',
    testCaseComparatorOperatorFlag as EvaluationCase[],
  ],
  ['test-case-disabled-flag.json', testCaseDisabledFlag as EvaluationCase[]],
  ['test-case-empty-flag.json', testCaseEmptyFlag as EvaluationCase[]],
  [
    'test-case-empty-string-variation.json',
    testCaseEmptyStringVariation as EvaluationCase[],
  ],
  [
    'test-case-falsy-value-assignments.json',
    testCaseFalsyValueAssignments as EvaluationCase[],
  ],
  [
    'test-case-flag-with-empty-string.json',
    testCaseFlagWithEmptyString as EvaluationCase[],
  ],
  ['test-case-integer-flag.json', testCaseIntegerFlag as EvaluationCase[]],
  ['test-case-kill-switch-flag.json', testCaseKillSwitchFlag as EvaluationCase[]],
  [
    'test-case-malformed-flag-isolation.json',
    testCaseMalformedFlagIsolation as EvaluationCase[],
  ],
  [
    'test-case-microsecond-date-flag.json',
    testCaseMicrosecondDateFlag as EvaluationCase[],
  ],
  [
    'test-case-missing-split-shards-isolation.json',
    testCaseMissingSplitShardsIsolation as EvaluationCase[],
  ],
  [
    'test-case-new-user-onboarding-flag.json',
    testCaseNewUserOnboardingFlag as EvaluationCase[],
  ],
  [
    'test-case-no-allocations-flag.json',
    testCaseNoAllocationsFlag as EvaluationCase[],
  ],
  [
    'test-case-null-operator-flag.json',
    testCaseNullOperatorFlag as EvaluationCase[],
  ],
  [
    'test-case-null-targeting-key.json',
    testCaseNullTargetingKey as EvaluationCase[],
  ],
  ['test-case-numeric-flag.json', testCaseNumericFlag as EvaluationCase[]],
  [
    'test-case-numeric-one-of-default.json',
    testCaseNumericOneOfDefault as EvaluationCase[],
  ],
  ['test-case-numeric-one-of.json', testCaseNumericOneOf as EvaluationCase[]],
  [
    'test-case-of-7-empty-targeting-key.json',
    testCaseOf7EmptyTargetingKey as EvaluationCase[],
  ],
  ['test-case-regex-flag.json', testCaseRegexFlag as EvaluationCase[]],
  [
    'test-case-start-and-end-date-flag.json',
    testCaseStartAndEndDateFlag as EvaluationCase[],
  ],
  [
    'test-case-unknown-fields-tolerance.json',
    testCaseUnknownFieldsTolerance as EvaluationCase[],
  ],
  [
    'test-case-unknown-operator-isolation.json',
    testCaseUnknownOperatorIsolation as EvaluationCase[],
  ],
  ['test-flag-that-does-not-exist.json', testFlagThatDoesNotExist as EvaluationCase[]],
  ['test-json-config-flag.json', testJsonConfigFlag as EvaluationCase[]],
  ['test-no-allocations-flag.json', testNoAllocationsFlag as EvaluationCase[]],
  ['test-special-characters.json', testSpecialCharacters as EvaluationCase[]],
  [
    'test-string-with-special-characters.json',
    testStringWithSpecialCharacters as EvaluationCase[],
  ],
];

export async function runNativeFfeOfflineFixtureCorpus(): Promise<NativeFfeOfflineFixtureReport> {
  const startingState = await DdSdkReactNative.getProviderDebugState();
  const parsedConfiguration = await DdSdkReactNative.configurationFromString(
    NATIVE_FFE_SHARED_RULES_WIRE,
  );
  const serializedWire = await DdSdkReactNative.configurationToString(
    parsedConfiguration,
  );
  assertEqual(
    serializedWire,
    NATIVE_FFE_SHARED_RULES_WIRE,
    'configurationToString should preserve the original wire',
  );

  const reparsedConfiguration = await DdSdkReactNative.configurationFromString(
    serializedWire,
  );
  const saveState = await DdSdkReactNative.saveConfiguration(
    reparsedConfiguration,
    NATIVE_FFE_FIXTURE_STORAGE_OPTIONS,
  );
  const loadedConfiguration = await DdSdkReactNative.loadConfiguration(
    NATIVE_FFE_FIXTURE_STORAGE_OPTIONS,
  );
  const setState = await DdSdkReactNative.setConfiguration(loadedConfiguration);

  let caseCount = 0;
  for (const [fixtureName, cases] of evaluationCaseFixtures) {
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex += 1) {
      const evaluationCase = cases[caseIndex];
      await evaluateCase(fixtureName, caseIndex, evaluationCase);
      caseCount += 1;
    }
  }

  const finalState = await DdSdkReactNative.getProviderDebugState();
  assertEqual(
    finalState.fetchCount,
    startingState.fetchCount,
    'offline fixture runner should not perform network fetches',
  );
  assertEqual(
    finalState.evaluationCount - startingState.evaluationCount,
    caseCount,
    'offline fixture runner should evaluate every shared case exactly once',
  );

  return {
    summary: `${NATIVE_FFE_OFFLINE_FIXTURE_SUCCESS_PREFIX}: ${caseCount} cases across ${evaluationCaseFixtures.length} files.`,
    details: {
      caseCount,
      fixtureCount: evaluationCaseFixtures.length,
      configuration: {
        etag: loadedConfiguration.etag,
        kind: loadedConfiguration.kind,
        version: loadedConfiguration.version,
      },
      serializedWireBytes: serializedWire.length,
      saveState,
      setState,
      finalState,
    },
  };
}

async function evaluateCase(
  fixtureName: string,
  caseIndex: number,
  evaluationCase: EvaluationCase,
): Promise<void> {
  await DdSdkReactNative.setEvaluationContext(evaluationContext(evaluationCase));
  const result = await resolveEvaluation(evaluationCase);
  const source = `${fixtureName}[${caseIndex}]`;

  assertEqual(result.flagKey, evaluationCase.flag, `${source} flagKey`);
  assertEqual(result.reason, evaluationCase.result.reason, `${source} reason`);
  assertJsonValue(result.value, evaluationCase.result.value, `${source} value`);
  if (evaluationCase.result.errorCode !== undefined) {
    assertEqual(
      result.errorCode,
      evaluationCase.result.errorCode,
      `${source} errorCode`,
    );
  }
}

function evaluationContext(
  evaluationCase: EvaluationCase,
): FlagsEvaluationContext {
  return {
    ...(typeof evaluationCase.targetingKey === 'string'
      ? {targetingKey: evaluationCase.targetingKey}
      : {}),
    attributes: evaluationCase.attributes ?? {},
  };
}

function resolveEvaluation(
  evaluationCase: EvaluationCase,
): Promise<FlagEvaluationResult> {
  switch (evaluationCase.variationType) {
    case 'BOOLEAN':
      return DdSdkReactNative.resolveBooleanEvaluation(
        evaluationCase.flag,
        evaluationCase.defaultValue as boolean,
      );
    case 'STRING':
      return DdSdkReactNative.resolveStringEvaluation(
        evaluationCase.flag,
        evaluationCase.defaultValue as string,
      );
    case 'INTEGER':
    case 'NUMERIC':
      return DdSdkReactNative.resolveNumberEvaluation(
        evaluationCase.flag,
        evaluationCase.defaultValue as number,
      );
    case 'JSON':
      return DdSdkReactNative.resolveObjectEvaluation(
        evaluationCase.flag,
        evaluationCase.defaultValue as Record<string, unknown>,
      );
  }
}

function assertJsonValue(
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (!jsonValuesEqual(actual, expected)) {
    throw new Error(
      `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function jsonValuesEqual(actual: unknown, expected: unknown): boolean {
  if (typeof actual === 'number' && typeof expected === 'number') {
    return Math.abs(actual - expected) <= NUMERIC_TOLERANCE;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return arraysEqual(actual, expected);
  }
  if (isRecord(actual) && isRecord(expected)) {
    return recordsEqual(actual, expected);
  }
  return Object.is(actual, expected);
}

function arraysEqual(actual: unknown[], expected: unknown[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((item, index) => jsonValuesEqual(item, expected[index]))
  );
}

function recordsEqual(
  actual: Record<string, unknown>,
  expected: Record<string, unknown>,
): boolean {
  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  return (
    arraysEqual(actualKeys, expectedKeys) &&
    actualKeys.every(key => jsonValuesEqual(actual[key], expected[key]))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
