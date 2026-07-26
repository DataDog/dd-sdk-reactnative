/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { LocalSvgHandler } from './LocalSvgHandler';
import { RNSvgHandler } from './RNSvgHandler';
import type { SvgHandler } from './SvgHandler';

type Resolver = () => SvgHandler;

type Dependencies = {
    t: typeof Babel.types;
    path: Babel.NodePath<Babel.types.JSXElement>;
    name: string;
    // Already scoped to the current file's actual import bindings (see
    // ReactNativeSVG.resolveSvgImport) — null if this tag isn't a local SVG import.
    svgPath: string | null;
    readSvgContent: (path: string) => string;
};

export class HandlerResolver {
    private static registry: Record<string, Resolver>;
    private static dependencies: Dependencies | null = null;

    static configure(dependencies: Dependencies) {
        this.dependencies = dependencies;
        const { t, path, name, svgPath, readSvgContent } = dependencies;

        HandlerResolver.registry = {
            RNSvgHandler: () => new RNSvgHandler(t, path, name),
            // UriSvgHandler: () => new UriSvgHandler(t, path, name),
            LocalSvgHandler: () =>
                new LocalSvgHandler(
                    t,
                    path,
                    name,
                    svgPath as string,
                    readSvgContent
                )
        };
    }

    static create() {
        if (!this.dependencies) {
            throw new Error('HandlerResolver must be configured before use.');
        }

        const { name, svgPath } = this.dependencies;

        switch (name) {
            case 'Svg': {
                return HandlerResolver.registry.RNSvgHandler();
            }

            // case 'SvgUri': {
            //     return HandlerResolver.registry.UriSvgHandler();
            // }

            default: {
                return svgPath
                    ? HandlerResolver.registry.LocalSvgHandler()
                    : null;
            }
        }
    }
}
