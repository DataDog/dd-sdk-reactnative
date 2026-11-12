/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transformSync } from '@babel/core';
import * as t from '@babel/types';
import fs from 'fs';
import os from 'os';
import path from 'path';

import plugin from '../../src/index';
import { ReactNativeSVG } from '../../src/libraries/react-native-svg';

export class SvgProject {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-svg-stack-'));
    assets = path.join(this.root, 'assets');

    constructor() {
        fs.mkdirSync(this.assets);
    }

    write(file: string, code: string): string {
        const filename = path.join(this.root, file);
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, code);
        return filename;
    }

    scan(): ReactNativeSVG {
        const instance = new ReactNativeSVG(this.root, this.assets);
        instance.setApiTypes(t);
        instance.buildSvgMap();
        return instance;
    }

    render(file = 'Screen.jsx', instance = this.scan()): string {
        const filename = path.join(this.root, file);
        return transformSync(fs.readFileSync(filename, 'utf8'), {
            filename,
            presets: [
                require.resolve('@babel/preset-react'),
                require.resolve('@babel/preset-typescript')
            ],
            plugins: [
                [
                    plugin,
                    {
                        sessionReplay: { svgTracking: true },
                        __internal_reactNativeSVG: instance
                    }
                ]
            ],
            configFile: false,
            babelrc: false
        })?.code as string;
    }

    asset(file = 'Screen.jsx', instance = this.scan()): string {
        const output = this.render(file, instance);
        const hash = output.match(/hash:\s*["']([0-9a-f]{32})["']/i)?.[1];
        expect(hash).toBeDefined();
        return fs.readFileSync(path.join(this.assets, `${hash}.svg`), 'utf8');
    }

    cleanup(): void {
        fs.rmSync(this.root, { recursive: true, force: true });
    }
}
