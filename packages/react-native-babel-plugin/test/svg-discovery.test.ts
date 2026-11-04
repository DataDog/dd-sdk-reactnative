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

describe('ReactNativeSVG.buildSvgMap', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-buildsvgmap-'));
        fs.writeFileSync(
            path.join(tmpDir, 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should populate localSvgMap from a default import of an SVG file', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from './icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'icon.svg')
        );
    });

    it('should populate localSvgMap from a named import of an SVG file', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import { ReactComponent as StarIcon } from './icon.svg';\nexport default function C() { return <StarIcon />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['StarIcon']).toBeDefined();
    });

    it('should populate localSvgMap with the exported name for aliased re-exports', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export { default as Logo } from './icon.svg';`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'icon.svg')
        );
        expect(instance.localSvgMap['default']).toBeUndefined();
    });

    it('should populate localSvgMap with the exported name for non-aliased re-exports', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export { StarIcon } from './icon.svg';`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['StarIcon']).toBeDefined();
    });

    it('should produce the same localSvgMap across instances for the same source tree', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export { StarIcon } from './icon.svg';`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();
        const mapAfterFirstCall = { ...instance.localSvgMap };

        const freshInstance = new ReactNativeSVG(tmpDir, tmpDir, false);
        freshInstance.setApiTypes(t);
        freshInstance.buildSvgMap();

        expect(freshInstance.localSvgMap).toEqual(mapAfterFirstCall);
    });

    // generate-sr-assets passes its own (larger, user-configurable) ignore
    // list here instead of relying on the hardcoded default -- otherwise it
    // would scan directories the CLI was explicitly told to skip.
    it('should respect a custom scanIgnorePatterns list instead of the hardcoded default', () => {
        fs.mkdirSync(path.join(tmpDir, 'vendor'));
        fs.writeFileSync(
            path.join(tmpDir, 'vendor', 'icons.ts'),
            `export { StarIcon } from '../icon.svg';`
        );

        const defaultInstance = new ReactNativeSVG(tmpDir, tmpDir, false);
        defaultInstance.setApiTypes(t);
        defaultInstance.buildSvgMap();
        expect(defaultInstance.localSvgMap['StarIcon']).toBeDefined();

        const scopedInstance = new ReactNativeSVG(tmpDir, tmpDir, false, [
            '**/vendor/**'
        ]);
        scopedInstance.setApiTypes(t);
        scopedInstance.buildSvgMap();
        expect(scopedInstance.localSvgMap['StarIcon']).toBeUndefined();
    });
});
