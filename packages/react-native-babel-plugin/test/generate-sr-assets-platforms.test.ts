/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import * as t from '@babel/types';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { generateSessionReplayAssets } from '../src/cli/generate-sr-assets';
import { PathAliasResolver } from '../src/libraries/react-native-svg/pathAliasResolver';
import { getAssetsPath } from '../src/libraries/react-native-svg/processing/fs';
import { SvgBindingMap } from '../src/libraries/react-native-svg/svgBindingMap';
import { ReactNativeSVG } from '../src/libraries/react-native-svg';

jest.mock('../src/libraries/react-native-svg/processing/fs', () => ({
    ...jest.requireActual('../src/libraries/react-native-svg/processing/fs'),
    getAssetsPath: jest.fn()
}));

describe('generate-sr-assets platform caches and assets', () => {
    let root: string;
    let assets: string;
    let cacheDir: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-cli-platforms-'));
        assets = path.join(root, 'assets');
        cacheDir = path.join(root, 'caches');
        fs.mkdirSync(assets);
        fs.mkdirSync(cacheDir);
        jest.mocked(getAssetsPath).mockReturnValue(assets);
        jest.spyOn(console, 'info').mockImplementation();

        // Keep the real cache serialization, redirecting only its destination.
        const saveToDisk = SvgBindingMap.prototype.saveToDisk;
        const loadFromDisk = SvgBindingMap.prototype.loadFromDisk;
        jest.spyOn(SvgBindingMap.prototype, 'saveToDisk').mockImplementation(
            function saveCache(cachePath: string) {
                saveToDisk.call(
                    this,
                    path.join(cacheDir, path.basename(cachePath))
                );
            }
        );
        jest.spyOn(SvgBindingMap.prototype, 'loadFromDisk').mockImplementation(
            function loadCache(cachePath: string) {
                return loadFromDisk.call(
                    this,
                    path.join(cacheDir, path.basename(cachePath))
                );
            }
        );
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.mocked(getAssetsPath).mockReset();
        fs.rmSync(root, { recursive: true, force: true });
    });

    it('packs all platform assets and produces isolated caches that builds reuse without rescanning', () => {
        for (const [suffix, color] of [
            ['', 'green'],
            ['.ios', 'red'],
            ['.android', 'blue']
        ]) {
            fs.writeFileSync(
                path.join(root, `icon${suffix}.svg`),
                `<svg xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="5" fill="${color}"/></svg>`
            );
            fs.writeFileSync(
                path.join(root, `Icon${suffix}.ts`),
                `export { default as Logo } from './icon${suffix}.svg';`
            );
        }
        const screen = path.join(root, 'Screen.jsx');
        fs.writeFileSync(
            screen,
            "import { Logo } from './Icon'; export default () => <Logo/>;"
        );

        generateSessionReplayAssets(['--path', root]);

        expect(fs.readdirSync(cacheDir).sort()).toEqual([
            'svg-map-android.json',
            'svg-map-ios.json',
            'svg-map.json'
        ]);
        const packedAssets = fs.readFileSync(
            path.join(assets, 'assets.bin'),
            'utf8'
        );
        expect(packedAssets).toContain('green');
        expect(packedAssets).toContain('red');
        expect(packedAssets).toContain('#00f');
        const index = JSON.parse(
            fs.readFileSync(path.join(assets, 'assets.json'), 'utf8')
        );
        expect(Object.keys(index)).toHaveLength(3);

        // A cache miss must not be hidden by rediscovering the source barrels.
        for (const suffix of ['', '.ios', '.android']) {
            fs.unlinkSync(path.join(root, `Icon${suffix}.ts`));
        }
        const resetSpy = jest.spyOn(PathAliasResolver.prototype, 'reset');
        for (const platform of [undefined, 'ios', 'android']) {
            const suffix = platform ? `.${platform}` : '';
            const instance = new ReactNativeSVG(root, assets);
            instance.setApiTypes(t);
            instance.buildSvgMap(platform);

            expect(instance.localSvgMap.Logo).toBeDefined();
            const map = new SvgBindingMap();
            const cacheSuffix = platform ? `-${platform}` : '';
            expect(map.loadFromDisk(`svg-map${cacheSuffix}.json`)).toBe(true);
            expect(map.getLocalSvgEntry(screen, 'Logo')?.path).toBe(
                path.join(root, `icon${suffix}.svg`)
            );
        }
        expect(resetSpy).not.toHaveBeenCalled();
    });
});
