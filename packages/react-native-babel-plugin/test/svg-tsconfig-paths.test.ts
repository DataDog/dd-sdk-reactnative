/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint quotes: ["off"] */
import * as t from '@babel/types';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ReactNativeSVG } from '../src/libraries/react-native-svg';

describe('SVG tsconfig paths', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-buildsvgmap-alias-')
        );
        fs.mkdirSync(path.join(tmpDir, 'src', 'components'), {
            recursive: true
        });
        fs.writeFileSync(
            path.join(tmpDir, 'src', 'components', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should resolve an aliased import using tsconfig.json baseUrl/paths', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve an aliased import using jsconfig.json baseUrl/paths', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'jsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.jsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve an aliased import using a tsconfig.json that extends a base config', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'base.tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({ extends: './base.tsconfig.json' })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve each of two monorepo subpackages using its OWN nearest tsconfig.json, not whichever one happened to resolve first for the whole scan', () => {
        fs.mkdirSync(path.join(tmpDir, 'packages', 'appA', 'src'), {
            recursive: true
        });
        fs.mkdirSync(path.join(tmpDir, 'packages', 'appB', 'assets'), {
            recursive: true
        });
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appA', 'src', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appB', 'assets', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appA', 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@a/*': ['src/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appB', 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@b/*': ['assets/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appA', 'Component.tsx'),
            `import IconA from '@a/icon.svg';\nexport default function A() { return <IconA />; }`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appB', 'Component.tsx'),
            `import IconB from '@b/icon.svg';\nexport default function B() { return <IconB />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['IconA']).toBeDefined();
        expect(instance.localSvgMap['IconA'].path).toBe(
            path.join(tmpDir, 'packages', 'appA', 'src', 'icon.svg')
        );
        expect(instance.localSvgMap['IconB']).toBeDefined();
        expect(instance.localSvgMap['IconB'].path).toBe(
            path.join(tmpDir, 'packages', 'appB', 'assets', 'icon.svg')
        );
    });

    it('should NOT populate localSvgMap for a bare, .svg-suffixed import that no alias mechanism can resolve, rather than fabricate a path relative to the importing file (which would be guaranteed not to exist on disk)', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        expect(() => instance.buildSvgMap()).not.toThrow();

        expect(instance.localSvgMap['Logo']).toBeUndefined();
    });

    it('should NOT populate localSvgMap when a configured alias does not match a file on disk, rather than fabricate a nonexistent path', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@missing/*': ['src/does-not-exist/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@missing/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        expect(() => instance.buildSvgMap()).not.toThrow();

        expect(instance.localSvgMap['Logo']).toBeUndefined();
    });

    it('should still resolve unaliased relative imports normally when alias config is present', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from './src/components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should only resolve configured aliases when paths are defined without baseUrl', () => {
        fs.mkdirSync(path.join(tmpDir, 'icons'));
        fs.writeFileSync(path.join(tmpDir, 'icons', 'logo.svg'), '<svg/>');
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    paths: { '@components/*': ['./src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nimport Stray from 'icons/logo.svg';\nexport default function C() { return <><Logo /><Stray /></>; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
        expect(instance.localSvgMap['Stray']).toBeUndefined();
    });

    it('should resolve inherited paths without baseUrl against the config that defines them', () => {
        fs.mkdirSync(path.join(tmpDir, 'shared'));
        fs.writeFileSync(path.join(tmpDir, 'shared', 'icon.svg'), '<svg/>');
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.base.json'),
            `{\n  // Shared aliases\n  "compilerOptions": {\n    "paths": { "@shared/*": ["./shared/*"] },\n  },\n}`
        );
        fs.mkdirSync(path.join(tmpDir, 'apps', 'mobile'), { recursive: true });
        fs.writeFileSync(
            path.join(tmpDir, 'apps', 'mobile', 'tsconfig.json'),
            JSON.stringify({ extends: '../../tsconfig.base.json' })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'apps', 'mobile', 'Component.tsx'),
            `import Logo from '@shared/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']?.path).toBe(
            path.join(tmpDir, 'shared', 'icon.svg')
        );
    });

    it('should resolve paths without baseUrl against the extending config when it overrides them', () => {
        fs.mkdirSync(path.join(tmpDir, 'apps', 'mobile', 'local'), {
            recursive: true
        });
        fs.writeFileSync(
            path.join(tmpDir, 'apps', 'mobile', 'local', 'icon.svg'),
            '<svg/>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.base.json'),
            JSON.stringify({
                compilerOptions: { paths: { '@shared/*': ['./shared/*'] } }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'apps', 'mobile', 'tsconfig.json'),
            JSON.stringify({
                extends: '../../tsconfig.base.json',
                compilerOptions: { paths: { '@shared/*': ['./local/*'] } }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'apps', 'mobile', 'Component.tsx'),
            `import Logo from '@shared/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']?.path).toBe(
            path.join(tmpDir, 'apps', 'mobile', 'local', 'icon.svg')
        );
    });
});
