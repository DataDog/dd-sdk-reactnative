/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import path from 'path';

import { SvgBindingMap } from '../src/libraries/react-native-svg/svgBindingMap';

import { SvgProject } from './helpers/svg-project';

describe('direct SVG import bindings', () => {
    let project: SvgProject;
    beforeEach(() => {
        project = new SvgProject();
    });
    afterEach(() => {
        project.cleanup();
    });

    it('keeps different SVGs bound to the same local name in separate files', () => {
        project.write(
            'circle.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>'
        );
        project.write(
            'square.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="5" height="5"/></svg>'
        );
        project.write(
            'A.jsx',
            "import Icon from './circle.svg'; export default () => <Icon/>;"
        );
        project.write(
            'B.jsx',
            "import Icon from './square.svg'; export default () => <Icon/>;"
        );
        const instance = project.scan();
        expect(project.asset('A.jsx', instance)).toContain('circle');
        expect(project.asset('B.jsx', instance)).not.toContain('circle');
    });

    it('does not use an imported SVG for a same-named function parameter', () => {
        project.write('icon.svg', '<svg/>');
        project.write(
            'Screen.jsx',
            "import Icon from './icon.svg'; export default function Screen({Icon}) { return <Icon/>; }"
        );
        expect(project.render()).not.toContain('SessionReplayView');
    });

    it('retains file-specific entries through a disk-cache round trip', () => {
        const map = new SvgBindingMap();
        map.setLocalSvgMapEntry('A.jsx', 'Icon', 'a.svg');
        map.setLocalSvgMapEntry('B.jsx', 'Icon', 'b.svg');
        const cache = path.join(project.root, 'map.json');
        map.saveToDisk(cache);
        const loaded = new SvgBindingMap();
        expect(loaded.loadFromDisk(cache)).toBe(true);
        expect(loaded.getLocalSvgEntry('A.jsx', 'Icon')?.path).toBe('a.svg');
        expect(loaded.getLocalSvgEntry('B.jsx', 'Icon')?.path).toBe('b.svg');
    });

    it('loads legacy caches with name-only lookups', () => {
        const cache = project.write(
            'legacy.json',
            JSON.stringify({ Icon: { path: 'icon.svg' } })
        );
        const map = new SvgBindingMap();
        expect(map.loadFromDisk(cache)).toBe(true);
        expect(map.getLocalSvgEntry('Screen.jsx', 'Icon')?.path).toBe(
            'icon.svg'
        );
    });

    it('preserves the existing direct re-export behavior', () => {
        project.write(
            'icon.svg',
            '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>'
        );
        project.write(
            'barrel.js',
            "export {default as Icon} from './icon.svg';"
        );
        project.write(
            'Screen.jsx',
            "import {Icon} from './barrel'; export default () => <Icon/>;"
        );
        expect(project.asset()).toContain('circle');
    });
});
