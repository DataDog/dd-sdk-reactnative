/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import countLines from 'metro/src/lib/countLines';

import type {
    MetroSerializer,
    MixedOutput,
    Module,
    MetroVirtualModuleOutput
} from '../../plugin/types/metroTypes';
import { createCountingSet } from '../../plugin/utils';

export const mockSerializerArgsForEmptyModule = (): Parameters<MetroSerializer> => {
    return [
        'index.js',
        [],
        {
            entryPoints: new Set(),
            dependencies: new Map(),
            transformOptions: {
                hot: false,
                dev: false,
                minify: false,
                type: 'script',
                unstable_transformProfile: 'hermes-stable'
            }
        },
        {
            asyncRequireModulePath: 'asyncRequire',
            createModuleId: (_filePath: string): number => 0,
            dev: false,
            getRunModuleStatement: (_moduleId: string | number): string => '',
            includeAsyncPaths: false,
            modulesOnly: false,
            processModuleFilter: (_module: Module<MixedOutput>) => true,
            projectRoot: '/project/root',
            runBeforeMainModule: [],
            runModule: false,
            serverRoot: '/server/root',
            shouldAddToIgnoreList: (_module: Module<MixedOutput>) => false
        }
    ];
};

export const mockSerializerArgsForSourceMappingURLModule = (): Parameters<MetroSerializer> => {
    const mockedCode = '//# sourceMappingURL=index.android.bundle.map';
    return [
        'index.js',
        [
            <Module<MetroVirtualModuleOutput>>{
                dependencies: new Map(),
                inverseDependencies: createCountingSet(),
                output: [
                    {
                        type: 'js/script/virtual',
                        data: {
                            code: mockedCode,
                            lineCount: countLines(mockedCode),
                            map: []
                        }
                    }
                ],
                path: 'index.js',
                getSource: () => {
                    return Buffer.from(mockedCode, 'utf-8');
                }
            }
        ],
        {
            entryPoints: new Set(),
            dependencies: new Map(),
            transformOptions: {
                hot: false,
                dev: false,
                minify: false,
                type: 'script',
                unstable_transformProfile: 'hermes-stable'
            }
        },
        {
            asyncRequireModulePath: 'asyncRequire',
            createModuleId: (_filePath: string): number => 0,
            dev: false,
            getRunModuleStatement: (_moduleId: string | number): string => '',
            includeAsyncPaths: false,
            modulesOnly: false,
            processModuleFilter: (_module: Module<MixedOutput>) => true,
            projectRoot: '/project/root',
            runBeforeMainModule: [],
            runModule: false,
            serverRoot: '/server/root',
            shouldAddToIgnoreList: (_module: Module<MixedOutput>) => false
        }
    ];
};
