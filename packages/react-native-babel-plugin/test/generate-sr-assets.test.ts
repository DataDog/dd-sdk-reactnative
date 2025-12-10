/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import {
    parseCliArgs,
    DEFAULT_IGNORE_PATTERNS
} from '../src/cli/generate-sr-assets';

describe('generate-sr-assets CLI', () => {
    describe('parseCliArgs', () => {
        describe('default values', () => {
            it('should return default options when no arguments are provided', () => {
                const result = parseCliArgs([]);

                expect(result).toEqual({
                    ignore: [],
                    verbose: false,
                    path: null,
                    followSymlinks: false
                });
            });
        });

        describe('--ignore flag', () => {
            it('should parse single --ignore flag', () => {
                const result = parseCliArgs(['--ignore', '**/legacy/**']);

                expect(result.ignore).toEqual(['**/legacy/**']);
            });

            it('should parse -i shorthand flag', () => {
                const result = parseCliArgs(['-i', '**/vendor/**']);

                expect(result.ignore).toEqual(['**/vendor/**']);
            });

            it('should parse multiple --ignore flags', () => {
                const result = parseCliArgs([
                    '--ignore',
                    '**/legacy/**',
                    '--ignore',
                    '**/vendor/**',
                    '-i',
                    '**/old/**'
                ]);

                expect(result.ignore).toEqual([
                    '**/legacy/**',
                    '**/vendor/**',
                    '**/old/**'
                ]);
            });

            it('should warn and skip when --ignore has no value', () => {
                const warnSpy = jest
                    .spyOn(console, 'warn')
                    .mockImplementation();

                const result = parseCliArgs(['--ignore']);

                expect(result.ignore).toEqual([]);
                expect(warnSpy).toHaveBeenCalledWith(
                    'Warning: --ignore flag requires a pattern argument'
                );

                warnSpy.mockRestore();
            });

            it('should warn and skip when --ignore is followed by another flag', () => {
                const warnSpy = jest
                    .spyOn(console, 'warn')
                    .mockImplementation();

                const result = parseCliArgs(['--ignore', '--verbose']);

                expect(result.ignore).toEqual([]);
                expect(result.verbose).toBe(true);
                expect(warnSpy).toHaveBeenCalledWith(
                    'Warning: --ignore flag requires a pattern argument'
                );

                warnSpy.mockRestore();
            });
        });

        describe('--verbose flag', () => {
            it('should parse --verbose flag', () => {
                const result = parseCliArgs(['--verbose']);

                expect(result.verbose).toBe(true);
            });

            it('should parse -v shorthand flag', () => {
                const result = parseCliArgs(['-v']);

                expect(result.verbose).toBe(true);
            });
        });

        describe('--path flag', () => {
            it('should parse --path flag', () => {
                const result = parseCliArgs(['--path', './src']);

                expect(result.path).toBe('./src');
            });

            it('should parse -p shorthand flag', () => {
                const result = parseCliArgs(['-p', '/absolute/path']);

                expect(result.path).toBe('/absolute/path');
            });

            it('should warn and skip when --path has no value', () => {
                const warnSpy = jest
                    .spyOn(console, 'warn')
                    .mockImplementation();

                const result = parseCliArgs(['--path']);

                expect(result.path).toBeNull();
                expect(warnSpy).toHaveBeenCalledWith(
                    'Warning: --path flag requires a directory path'
                );

                warnSpy.mockRestore();
            });

            it('should warn and skip when --path is followed by another flag', () => {
                const warnSpy = jest
                    .spyOn(console, 'warn')
                    .mockImplementation();

                const result = parseCliArgs(['--path', '-v']);

                expect(result.path).toBeNull();
                expect(result.verbose).toBe(true);
                expect(warnSpy).toHaveBeenCalledWith(
                    'Warning: --path flag requires a directory path'
                );

                warnSpy.mockRestore();
            });
        });

        describe('--followSymlinks flag', () => {
            it('should parse --followSymlinks flag', () => {
                const result = parseCliArgs(['--followSymlinks']);

                expect(result.followSymlinks).toBe(true);
            });

            it('should default to false when not provided', () => {
                const result = parseCliArgs([]);

                expect(result.followSymlinks).toBe(false);
            });
        });

        describe('combined flags', () => {
            it('should parse all flags together', () => {
                const result = parseCliArgs([
                    '--path',
                    './src',
                    '--ignore',
                    '**/legacy/**',
                    '--verbose',
                    '--followSymlinks',
                    '-i',
                    '**/vendor/**'
                ]);

                expect(result).toEqual({
                    path: './src',
                    ignore: ['**/legacy/**', '**/vendor/**'],
                    verbose: true,
                    followSymlinks: true
                });
            });

            it('should parse shorthand flags together', () => {
                const result = parseCliArgs([
                    '-p',
                    './app',
                    '-i',
                    '**/test/**',
                    '-v'
                ]);

                expect(result).toEqual({
                    path: './app',
                    ignore: ['**/test/**'],
                    verbose: true,
                    followSymlinks: false
                });
            });
        });

        describe('unknown flags', () => {
            it('should ignore unknown flags', () => {
                const result = parseCliArgs([
                    '--unknown',
                    '--verbose',
                    '--another-unknown',
                    'value'
                ]);

                expect(result.verbose).toBe(true);
                expect(result.ignore).toEqual([]);
                expect(result.path).toBeNull();
            });
        });
    });

    describe('DEFAULT_IGNORE_PATTERNS', () => {
        it('should include node_modules', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/node_modules/**');
        });

        it('should include lib directory', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/lib/**');
        });

        it('should include dist directory', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/dist/**');
        });

        it('should include build directory', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/build/**');
        });

        it('should include TypeScript declaration files', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.d.ts');
        });

        it('should include test files', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.test.*');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.spec.*');
        });

        it('should include config files', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.config.js');
        });

        it('should include __tests__ and __mocks__ directories', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/__tests__/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/__mocks__/**');
        });

        it('should have expected number of patterns', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toHaveLength(10);
        });
    });
});
