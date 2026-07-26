/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import {
    parseCliArgs,
    DEFAULT_IGNORE_PATTERNS,
    normalizeIgnorePattern,
    generateSessionReplayAssets
} from '../src/cli/generate-sr-assets';
import * as assetsFs from '../src/libraries/react-native-svg/processing/fs';

jest.mock('../src/libraries/react-native-svg/processing/fs', () => ({
    ...jest.requireActual('../src/libraries/react-native-svg/processing/fs'),
    getAssetsPath: jest.fn()
}));

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

        it('should include vendor directory', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/vendor/**');
        });

        it('should include native code directories', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/ios/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/android/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/Pods/**');
        });

        it('should include Expo directory', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.expo/**');
        });

        it('should include cache and metadata directories', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.git/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.cache/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.yarn/**');
        });

        it('should include TypeScript declaration files', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.d.ts');
        });

        it('should include test files and directories', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.test.*');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.spec.*');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/__tests__/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/__mocks__/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/__snapshots__/**');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/coverage/**');
        });

        it('should include config files', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.config.js');
            expect(DEFAULT_IGNORE_PATTERNS).toContain('**/*.config.ts');
        });

        it('should have expected number of patterns', () => {
            expect(DEFAULT_IGNORE_PATTERNS).toHaveLength(21);
        });
    });

    describe('normalizeIgnorePattern', () => {
        const mockCwd = '/home/user/project';

        describe('simple folder names (no slashes, no glob)', () => {
            it('should convert simple folder name to wildcard glob pattern', () => {
                expect(normalizeIgnorePattern('legacy', mockCwd)).toBe(
                    '**/legacy/**'
                );
            });

            it('should convert folder name with hyphen to wildcard glob pattern', () => {
                expect(normalizeIgnorePattern('old-code', mockCwd)).toBe(
                    '**/old-code/**'
                );
            });

            it('should convert folder name with underscore to wildcard glob pattern', () => {
                expect(normalizeIgnorePattern('temp_files', mockCwd)).toBe(
                    '**/temp_files/**'
                );
            });
        });

        describe('relative paths (with ./ or ../)', () => {
            it('should resolve relative path starting with ./', () => {
                const result = normalizeIgnorePattern('./android', mockCwd);
                expect(result).toBe('/home/user/project/android/**');
            });

            it('should resolve relative path starting with ../', () => {
                const result = normalizeIgnorePattern('../other', mockCwd);
                expect(result).toBe('/home/user/other/**');
            });

            it('should resolve nested relative path', () => {
                const result = normalizeIgnorePattern('./src/legacy', mockCwd);
                expect(result).toBe('/home/user/project/src/legacy/**');
            });
        });

        describe('paths containing slashes (treated as relative)', () => {
            it('should resolve path with forward slash as relative', () => {
                const result = normalizeIgnorePattern('packages/app', mockCwd);
                expect(result).toBe('/home/user/project/packages/app/**');
            });

            it('should resolve nested path as relative', () => {
                const result = normalizeIgnorePattern(
                    'src/components/legacy',
                    mockCwd
                );
                expect(result).toBe(
                    '/home/user/project/src/components/legacy/**'
                );
            });
        });

        describe('absolute paths', () => {
            it('should append /** to absolute path', () => {
                const result = normalizeIgnorePattern(
                    '/home/dev/app/android',
                    mockCwd
                );
                expect(result).toBe('/home/dev/app/android/**');
            });

            it('should keep absolute path with /** unchanged', () => {
                const result = normalizeIgnorePattern(
                    '/home/dev/app/android/**',
                    mockCwd
                );
                expect(result).toBe('/home/dev/app/android/**');
            });
        });

        describe('glob patterns (with * ? [ ] { } ( ))', () => {
            it('should keep pattern with ** as-is', () => {
                expect(normalizeIgnorePattern('**/custom/**', mockCwd)).toBe(
                    '**/custom/**'
                );
            });

            it('should keep pattern with single * as-is', () => {
                expect(normalizeIgnorePattern('*.backup', mockCwd)).toBe(
                    '*.backup'
                );
            });

            it('should keep pattern with ? as-is', () => {
                expect(normalizeIgnorePattern('file?.txt', mockCwd)).toBe(
                    'file?.txt'
                );
            });

            it('should keep pattern with brackets as-is', () => {
                expect(normalizeIgnorePattern('[abc].txt', mockCwd)).toBe(
                    '[abc].txt'
                );
            });

            it('should keep pattern with braces as-is', () => {
                expect(normalizeIgnorePattern('*.{js,ts}', mockCwd)).toBe(
                    '*.{js,ts}'
                );
            });

            it('should keep complex glob pattern as-is', () => {
                expect(
                    normalizeIgnorePattern('**/src/**/*.test.ts', mockCwd)
                ).toBe('**/src/**/*.test.ts');
            });
        });
    });
});

describe('generateSessionReplayAssets', () => {
    // getAssetsPath is mocked (rather than chdir-ing into the tmp project) so
    // cwd stays the real repo root and Babel can still resolve
    // @babel/preset-react/@babel/preset-typescript by name.
    let projectDir: string;
    let assetsDir: string;
    let originalArgv: string[];
    let consoleInfoSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;
    let writeFileSyncSpy: jest.SpyInstance;

    // saveSvgMapToDisk writes svg-map.json to this package's real root, a
    // location every other test file's buildSvgMap() also reads as a cache.
    // Redirect just that one path into this test's own sandbox.
    const realSvgMapPath = path.join(
        path.resolve(__dirname, '..'),
        'svg-map.json'
    );
    const realWriteFileSync = fs.writeFileSync;

    beforeEach(() => {
        projectDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-generate-sr-assets-')
        );
        assetsDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-generate-sr-assets-out-')
        );
        fs.writeFileSync(
            path.join(projectDir, 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
        fs.writeFileSync(
            path.join(projectDir, 'Component.tsx'),
            "import Logo from './icon.svg';\nfunction C() { return <Logo />; }"
        );

        (assetsFs.getAssetsPath as jest.Mock).mockReturnValue(assetsDir);

        originalArgv = process.argv;
        process.argv = [...originalArgv, '--path', projectDir];

        consoleInfoSpy = jest
            .spyOn(console, 'info')
            .mockImplementation(() => undefined);
        consoleWarnSpy = jest
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined);

        writeFileSyncSpy = jest
            .spyOn(fs, 'writeFileSync')
            .mockImplementation((file, data, options) => {
                const target =
                    file === realSvgMapPath
                        ? path.join(assetsDir, 'svg-map.json')
                        : file;
                return realWriteFileSync(target, data, options);
            });
    });

    afterEach(() => {
        process.argv = originalArgv;
        writeFileSyncSpy.mockRestore();
        fs.rmSync(projectDir, { recursive: true, force: true });
        fs.rmSync(assetsDir, { recursive: true, force: true });
        consoleInfoSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    it('scans the project, wraps the SVG import, and writes a populated assets index', () => {
        generateSessionReplayAssets();

        const indexPath = path.join(assetsDir, 'assets.json');

        expect(fs.existsSync(indexPath)).toBe(true);

        const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        expect(Object.keys(index).length).toBeGreaterThan(0);

        expect(fs.existsSync(path.join(assetsDir, 'assets.bin'))).toBe(true);
    });
});
