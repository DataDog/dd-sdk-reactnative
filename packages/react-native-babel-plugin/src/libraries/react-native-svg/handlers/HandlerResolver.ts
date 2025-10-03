/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { LocalSvgHandler } from './LocalSvgHandler';
import { RNSvgHandler } from './RNSvgHandler';
import type { SvgHandler } from './SvgHandler';
import { UriSvgHandler } from './UriSvgHandler';

type Resolver = () => SvgHandler;

type Dependencies = {
    t: typeof Babel.types;
    path: Babel.NodePath<Babel.types.JSXElement>;
    name: string;
    localSvgMap: Record<string, { path: string; content?: string }>;
};

export class HandlerResolver {
    private static registry: Record<string, Resolver>;
    private static dependencies: Dependencies | null = null;

    /**
     * Registers handler factories for supported JSX element types and stores shared dependencies.
     * This method must be called before invoking `create()`, as it initializes the internal registry
     * with handler constructors that are parameterized with the provided Babel context and configuration.
     *
     * @param dependencies - Shared Babel-related dependencies and contextual information,
     *                       including `types`, the current JSX `path`, tag `name`, and the `localSvgMap`.
     */
    static configure(dependencies: Dependencies) {
        this.dependencies = dependencies;
        const { t, path, name, localSvgMap } = dependencies;

        HandlerResolver.registry = {
            RNSvgHandler: () => new RNSvgHandler(t, path, name),
            UriSvgHandler: () => new UriSvgHandler(t, path, name),
            LocalSvgHandler: () =>
                new LocalSvgHandler(t, path, name, localSvgMap)
        };
    }

    /**
     * Resolves and returns the appropriate handler instance based on the JSX tag name.
     * @throws Error if `configure()` has not been called prior to invocation.
     *
     * @returns The resolved handler instance or `null` if no match exists.
     */
    static create() {
        if (!this.dependencies) {
            throw new Error('HandlerResolver must be configured before use.');
        }

        const { name, localSvgMap } = this.dependencies;

        switch (name) {
            case 'Svg': {
                return HandlerResolver.registry.RNSvgHandler();
            }

            case 'SvgUri': {
                return HandlerResolver.registry.UriSvgHandler();
            }

            default: {
                return localSvgMap[name]
                    ? HandlerResolver.registry.LocalSvgHandler()
                    : null;
            }
        }
    }
}
