/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';
import path from 'path';
import { NativeModules } from 'react-native';

import { DdFlags } from '../DdFlags';
import {
    decodePrecomputedFlags,
    UnsupportedConfigurationError
} from '../configuration/precomputed';

jest.mock('../../InternalLog', () => ({
    InternalLog: { log: jest.fn() },
    DATADOG_MESSAGE_PREFIX: 'DATADOG:'
}));

type Filters = {
    _skip?: { platform: string }[];
    _include?: { platform: string }[];
};
const applies = (value: Filters): boolean =>
    !value._skip?.some(item => item.platform === 'react-native') &&
    (!value._include ||
        value._include.some(item => item.platform === 'react-native'));
const root = path.join(__dirname, 'fixtures/precomputed');
const discover = (directory: string): string[] =>
    fs
        .readdirSync(directory, { withFileTypes: true })
        .flatMap(entry => {
            const filename = path.join(directory, entry.name);
            return entry.isDirectory()
                ? discover(filename)
                : entry.name.endsWith('.json')
                ? [filename]
                : [];
        })
        .sort();
const files = discover(path.join(root, 'cases'));
if (!files.length) {
    throw new Error('Empty canonical precompute corpus');
}
const fixtures = files.map(
    filename =>
        [
            path.relative(root, filename),
            JSON.parse(fs.readFileSync(filename, 'utf8'))
        ] as const
);
if (!fixtures.some(([, fixture]) => applies(fixture))) {
    throw new Error('All canonical fixtures excluded');
}
const source = JSON.parse(
    fs.readFileSync(path.join(root, 'SOURCE.json'), 'utf8')
);

describe(`canonical precompute ${source.commit}`, () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        Object.assign(DdFlags, { isFeatureEnabled: false, clients: {} });
        await DdFlags.enable();
    });

    fixtures.forEach(([filename, fixture]) => {
        (applies(fixture) ? it : it.skip)(filename, async () => {
            if (fixture.expectedResponseError) {
                expect(fixture.expectedResponseError).toBe('INVALID_RESPONSE');
                expect(() => decodePrecomputedFlags(fixture.response)).toThrow(
                    UnsupportedConfigurationError
                );
                expect(
                    NativeModules.DdFlags.trackEvaluation
                ).not.toHaveBeenCalled();
                return;
            }
            const decoded = decodePrecomputedFlags(fixture.response);
            jest.spyOn(
                NativeModules.DdFlags,
                'setEvaluationContext'
            ).mockResolvedValue(Object.fromEntries(decoded));
            const client = DdFlags.getClient('canonical');
            await client.setEvaluationContext(fixture.context);
            let tracked = 0;
            for (const evaluation of fixture.evaluations.filter(applies)) {
                const { flag, defaultValue, expectedResult } = evaluation;
                const details = (() => {
                    switch (evaluation.variationType) {
                        case 'boolean':
                            return client.getBooleanDetails(flag, defaultValue);
                        case 'string':
                            return client.getStringDetails(flag, defaultValue);
                        case 'integer':
                        case 'float':
                            return client.getNumberDetails(flag, defaultValue);
                        case 'object':
                            return client.getObjectDetails(flag, defaultValue);
                        default:
                            throw new Error(
                                `Unsupported canonical getter: ${evaluation.variationType}`
                            );
                    }
                })();
                const actual = {
                    value: details.value,
                    reason: details.reason,
                    errorCode: details.errorCode ?? null,
                    variantKey: details.variant ?? null
                };
                expect(actual.value).toEqual(expectedResult.value);
                expect(actual).toMatchObject(expectedResult);
                if (!details.errorCode) {
                    const raw = fixture.response.data.attributes.flags[flag];
                    const expectedSerialId =
                        raw.serialId == null ? undefined : String(raw.serialId);
                    expect(decoded.get(flag)?.serialId).toBe(expectedSerialId);
                    tracked += 1;
                    expect(
                        NativeModules.DdFlags.trackEvaluation
                    ).toHaveBeenNthCalledWith(
                        tracked,
                        'canonical',
                        flag,
                        decoded.get(flag),
                        fixture.context.targetingKey,
                        fixture.context.attributes
                    );
                }
                expect(
                    NativeModules.DdFlags.trackEvaluation
                ).toHaveBeenCalledTimes(tracked);
            }
        });
    });
});
