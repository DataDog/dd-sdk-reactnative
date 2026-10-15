/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transform } from '@babel/core';
import * as t from '@babel/types';
import fs from 'fs';
import os from 'os';
import path from 'path';

import plugin from '../src/index';
import {
    PathAliasResolver,
    resolveModuleFileFromBase
} from '../src/libraries/react-native-svg/pathAliasResolver';
import { SvgBindingMap } from '../src/libraries/react-native-svg/svgBindingMap';
import { ReactNativeSVG } from '../src/libraries/react-native-svg';

describe('SVG discovery regressions', () => {
    let root: string;
    let assets: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-svg-regressions-'));
        assets = path.join(root, 'assets');
        fs.mkdirSync(assets);
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fs.rmSync(root, { recursive: true, force: true });
    });

    function write(file: string, content: string): string {
        const filename = path.join(root, file);
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, content);
        return filename;
    }

    function scan(platform?: string): ReactNativeSVG {
        const instance = new ReactNativeSVG(root, assets);
        instance.setApiTypes(t);
        instance.buildSvgMap(platform);
        return instance;
    }

    function render(instance: ReactNativeSVG, platform = 'android'): string {
        return transform(
            fs.readFileSync(path.join(root, 'Screen.jsx'), 'utf8'),
            {
                filename: path.join(root, 'Screen.jsx'),
                presets: [require.resolve('@babel/preset-react')],
                plugins: [
                    [
                        plugin,
                        {
                            sessionReplay: { svgTracking: true },
                            __internal_reactNativeSVG: instance
                        }
                    ]
                ],
                caller: { name: 'metro', platform },
                configFile: false,
                babelrc: false
            }
        )?.code as string;
    }

    function renderedAsset(
        instance: ReactNativeSVG,
        platform?: string
    ): string {
        const output = render(instance, platform);
        const hash = output.match(/hash:\s*["']([0-9a-f]{32})["']/i)?.[1];
        expect(hash).toBeDefined();
        return fs.readFileSync(path.join(assets, `${hash}.svg`), 'utf8');
    }

    function configureAliases(
        kind: string,
        aliases: Record<string, string>
    ): void {
        if (kind === 'babel') {
            write(
                'babel.config.js',
                `module.exports = { plugins: [[${JSON.stringify(
                    require.resolve('babel-plugin-module-resolver')
                )}, { alias: ${JSON.stringify(aliases)} }]] };`
            );
        } else if (kind === 'metro') {
            write(
                'metro.config.js',
                `module.exports = { resolver: { extraNodeModules: ${JSON.stringify(
                    aliases
                )} } };`
            );
        } else {
            write(
                'tsconfig.json',
                JSON.stringify({
                    compilerOptions: {
                        baseUrl: '.',
                        paths: Object.fromEntries(
                            Object.entries(aliases).map(([name, target]) => [
                                name,
                                [path.relative(root, target)]
                            ])
                        )
                    }
                })
            );
        }
    }

    function platformFiles(): void {
        write(
            'ios.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5" fill="red"/></svg>'
        );
        write(
            'android.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="20" height="20" fill="blue"/></svg>'
        );
        write('Icon.ios.ts', "export { default as Logo } from './ios.svg';");
        write(
            'Icon.android.ts',
            "export { default as Logo } from './android.svg';"
        );
    }

    it('does not wrap an unrelated component when the only SVG is an unused re-export', () => {
        write('icon.svg', '<svg/>');
        write('barrel.ts', "export { default as Logo } from './icon.svg';");
        write(
            'Screen.jsx',
            "import Logo from 'ui-library'; export default () => <Logo/>;"
        );

        const instance = scan();

        expect(instance.localSvgMap.Logo).toBeDefined();
        expect(render(instance)).not.toContain('SessionReplayView');
        expect(fs.readdirSync(assets)).toEqual([]);
    });

    it('preserves binding isolation after saving an export-only map with no consumers', () => {
        const cachePath = path.join(root, 'map.json');
        const map = new SvgBindingMap();
        map.setFlatSvgMapEntry(
            path.join(root, 'barrel.ts'),
            'Logo',
            'icon.svg',
            new Map()
        );
        map.saveToDisk(cachePath);
        const loaded = new SvgBindingMap();

        expect(loaded.loadFromDisk(cachePath)).toBe(true);
        expect(
            loaded.getLocalSvgEntry(path.join(root, 'Screen.jsx'), 'Logo')
        ).toBeUndefined();
        expect(loaded.getLocalSvgEntry('', 'Logo')?.path).toBe('icon.svg');
    });

    it('preserves name-only lookup for a legacy disk cache', () => {
        const cachePath = write(
            'legacy.json',
            JSON.stringify({ Logo: { path: 'icon.svg' } })
        );
        const map = new SvgBindingMap();

        expect(map.loadFromDisk(cachePath)).toBe(true);
        expect(
            map.getLocalSvgEntry(path.join(root, 'Screen.jsx'), 'Logo')?.path
        ).toBe('icon.svg');
    });

    it.each(['import', 're-export', 'wildcard', 'aliased wildcard'])(
        'uses the active platform through the %s chain',
        chain => {
            platformFiles();
            let source = './Icon';
            if (chain === 're-export') {
                write('barrel.ts', "export { Logo } from './Icon';");
                source = './barrel';
            } else if (chain === 'wildcard') {
                write('barrel.ts', "export * from './Icon';");
                source = './barrel';
            } else if (chain === 'aliased wildcard') {
                write(
                    'metro.config.js',
                    `module.exports = { resolver: { extraNodeModules: { icons: ${JSON.stringify(
                        path.join(root, 'Icon')
                    )} } } };`
                );
                write('barrel.ts', "export * from 'icons';");
                source = './barrel';
            }
            write(
                'Screen.jsx',
                `import { Logo } from '${source}'; export default () => <Logo/>;`
            );

            expect(renderedAsset(scan('android'))).toContain('#00f');
            expect(renderedAsset(scan('ios'), 'ios')).toContain('red');
        }
    );

    it('does not guess a platform-specific barrel when no platform was supplied', () => {
        platformFiles();
        write(
            'Screen.jsx',
            "import { Logo } from './Icon'; export default () => <Logo/>;"
        );

        expect(render(scan())).not.toContain('SessionReplayView');
    });

    it.each([
        ['native', 'android', 'Icon.native.ts'],
        ['plain', 'android', 'Icon.ts'],
        ['custom', 'windows', 'Icon.windows.ts'],
        ['index', 'android', 'Icon/index.android.ts']
    ])(
        'resolves the %s fallback without selecting an iOS file',
        (_, platform, expected) => {
            write('Icon.ios.ts', '');
            write(expected, '');

            expect(
                resolveModuleFileFromBase(path.join(root, 'Icon'), platform)
            ).toBe(path.join(root, expected));
        }
    );

    it('clears stale bindings when an instance is scanned again for another platform', () => {
        platformFiles();
        write(
            'Screen.jsx',
            "import { Logo } from './Icon'; export default () => <Logo/>;"
        );
        const instance = scan('ios');
        expect(renderedAsset(instance, 'ios')).toContain('red');

        fs.unlinkSync(path.join(root, 'Icon.android.ts'));
        instance.buildSvgMap('android');

        expect(render(instance)).not.toContain('SessionReplayView');
    });

    it('ignores a generic cache during a native build and loads only the matching platform cache', () => {
        platformFiles();
        const screen = write(
            'Screen.jsx',
            "import { Logo } from './Icon'; export default () => <Logo/>;"
        );
        const cacheDir = path.join(root, 'caches');
        fs.mkdirSync(cacheDir);
        const map = new SvgBindingMap();
        map.setLocalSvgMapEntry(
            screen,
            'Logo',
            path.join(root, 'ios.svg'),
            new Map()
        );
        map.saveToDisk(path.join(cacheDir, 'svg-map.json'));
        map.saveToDisk(path.join(cacheDir, 'svg-map-ios.json'));
        const loadFromDisk = SvgBindingMap.prototype.loadFromDisk;
        jest.spyOn(SvgBindingMap.prototype, 'loadFromDisk').mockImplementation(
            function loadCachedMap(cachePath: string) {
                return loadFromDisk.call(
                    this,
                    path.join(cacheDir, path.basename(cachePath))
                );
            }
        );

        expect(renderedAsset(scan('android'))).toContain('#00f');
        // A cache hit must still work if the source barrel is unavailable.
        fs.unlinkSync(path.join(root, 'Icon.ios.ts'));
        expect(renderedAsset(scan('ios'), 'ios')).toContain('red');
    });

    describe.each(['babel', 'metro', 'tsconfig'])(
        '%s directory aliases',
        kind => {
            it.each([
                'named import',
                'named re-export',
                'renamed re-export',
                'default import',
                'renamed import',
                'nested alias'
            ])('traces an SVG through a %s', chain => {
                write(
                    'icon.svg',
                    '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5" fill="red"/></svg>'
                );
                write(
                    'icons/index.ts',
                    "export { default as Logo } from '../icon.svg';"
                );
                configureAliases(kind, {
                    '@icons': path.join(root, 'icons'),
                    '@leaf': path.join(root, 'leaf')
                });
                let code =
                    "import { Logo } from '@icons'; export default () => <Logo/>;";
                if (chain === 'named re-export') {
                    write('barrel.ts', "export { Logo } from '@icons';");
                    code =
                        "import { Logo } from './barrel'; export default () => <Logo/>;";
                } else if (chain === 'renamed re-export') {
                    write(
                        'barrel.ts',
                        "export { Logo as Icon } from '@icons';"
                    );
                    code =
                        "import { Icon } from './barrel'; export default () => <Icon/>;";
                } else if (chain === 'default import') {
                    write(
                        'icons/index.ts',
                        "export { default } from '../icon.svg';"
                    );
                    code =
                        "import Logo from '@icons'; export default () => <Logo/>;";
                } else if (chain === 'renamed import') {
                    code =
                        "import { Logo as Icon } from '@icons'; export default () => <Icon/>;";
                } else if (chain === 'nested alias') {
                    write('icons/index.ts', "export { Logo } from '@leaf';");
                    write(
                        'leaf/index.ts',
                        "export { default as Logo } from '../icon.svg';"
                    );
                }
                write('Screen.jsx', code);

                expect(renderedAsset(scan('android'))).toContain('red');
            });

            it('chooses the active platform index even when no plain index exists', () => {
                platformFiles();
                write(
                    'icons/index.android.ts',
                    "export { default as Logo } from '../android.svg';"
                );
                write(
                    'icons/index.ios.ts',
                    "export { default as Logo } from '../ios.svg';"
                );
                configureAliases(kind, { '@icons': path.join(root, 'icons') });
                write(
                    'Screen.jsx',
                    "import { Logo } from '@icons'; export default () => <Logo/>;"
                );

                expect(renderedAsset(scan('android'))).toContain('#00f');
                expect(renderedAsset(scan('ios'), 'ios')).toContain('red');
            });
        }
    );

    it('does not resolve an unused directory alias due to an unrelated same-named JSX binding', () => {
        write('icon.svg', '<svg/>');
        write(
            'icons/index.ts',
            "export { default as Logo } from '../icon.svg';"
        );
        configureAliases('metro', { '@icons': path.join(root, 'icons') });
        write('unused.ts', "import { Logo } from '@icons';");
        write(
            'Screen.jsx',
            "import Logo from 'ui-library'; export default () => <Logo/>;"
        );
        const resolveSpy = jest.spyOn(PathAliasResolver.prototype, 'resolve');

        const instance = scan('android');

        expect(
            resolveSpy.mock.calls.filter(([source]) => source === '@icons')
        ).toEqual([]);
        expect(render(instance)).not.toContain('SessionReplayView');
    });

    it('terminates when aliased barrels form a cycle', () => {
        write('icons/index.ts', "export { Logo } from '@other';");
        write('other/index.ts', "export { Logo } from '@icons';");
        configureAliases('metro', {
            '@icons': path.join(root, 'icons'),
            '@other': path.join(root, 'other')
        });
        write(
            'Screen.jsx',
            "import { Logo } from '@icons'; export default () => <Logo/>;"
        );

        expect(render(scan('android'))).not.toContain('SessionReplayView');
    });

    describe.each(['babel', 'metro'])('%s invalid SVG targets', kind => {
        it.each(['missing', 'directory'])(
            'rejects %s targets for suffixed and extensionless SVG imports',
            targetKind => {
                const target = path.join(root, 'missing.svg');
                if (targetKind === 'directory') {
                    fs.mkdirSync(target);
                }
                configureAliases(kind, { '@icons': root, '@logo': target });
                write(
                    'Screen.jsx',
                    "import Logo from '@icons/missing.svg'; export default () => <Logo/>;"
                );
                write(
                    'Other.jsx',
                    "import OtherLogo from '@logo'; export default () => <OtherLogo/>;"
                );
                write(
                    'barrel.ts',
                    "export { default as ExportedLogo } from '@icons/missing.svg'; export { default as ExportedOther } from '@logo';"
                );
                write(
                    'Screen.jsx',
                    "import Logo from '@icons/missing.svg'; import { ExportedLogo, ExportedOther } from './barrel'; export default () => <><Logo/><ExportedLogo/><ExportedOther/></>;"
                );
                const warnSpy = jest.spyOn(console, 'warn');

                const instance = scan('android');

                expect(instance.localSvgMap.Logo).toBeUndefined();
                expect(instance.localSvgMap.OtherLogo).toBeUndefined();
                expect(instance.localSvgMap.ExportedLogo).toBeUndefined();
                expect(instance.localSvgMap.ExportedOther).toBeUndefined();
                expect(render(instance)).not.toContain('SessionReplayView');
                expect(warnSpy).not.toHaveBeenCalledWith(
                    expect.stringContaining('dynamic expressions')
                );
            }
        );
    });

    it('keeps the existing relative SVG import behavior for a missing file', () => {
        write(
            'Screen.jsx',
            "import Logo from './missing.svg'; export default () => <Logo/>;"
        );

        expect(scan('android').localSvgMap.Logo.path).toBe(
            path.join(root, 'missing.svg')
        );
    });
});
