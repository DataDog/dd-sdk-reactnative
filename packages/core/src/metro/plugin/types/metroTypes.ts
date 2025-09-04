// MIT License

// Copyright (c) Meta Platforms, Inc. and affiliates.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// eslint-disable-next-line import/no-extraneous-dependencies
import type {
    Module,
    ReadOnlyGraph,
    SerializerOptions,
    MixedOutput,
    MetroConfig
} from 'metro';

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro-config/types/configTypes.d.ts#L128
export type MetroSerializerOutput =
    | string
    | MetroBundleWithMap
    | Promise<string | MetroBundleWithMap>;

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro-config/types/configTypes.d.ts#L122
export type MetroSerializer = (
    entryPoint: string,
    preModules: ReadonlyArray<Module>,
    graph: ReadOnlyGraph,
    options: SerializerOptions
) => MetroSerializerOutput;

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/lib/getAppendScripts.js#L61
// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/lib/getPrependedScripts.js#L107
export type MetroVirtualModuleOutput = {
    type: 'js/script/virtual';
    data: {
        code: string;
        lineCount: number;
        map: [];
    };
};

// https://github.com/facebook/metro/blob/v0.80.10/packages/metro/src/DeltaBundler/Serializers/sourceMapString.js#L22
export type SourceMapString = (
    modules: Module<MixedOutput>[],
    options: {
        excludeSource?: boolean;
        processModuleFilter?: (module: Module<MixedOutput>) => boolean;
        shouldAddToIgnoreList?: (module: Module<MixedOutput>) => boolean;
    }
) => string;

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro-runtime/src/modules/types.flow.js#L16
export type Bundle = {
    modules: Array<[id: number, code: string]>;
    post: string;
    pre: string;
};

/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
export type MetroBundleWithMap = { code: string; map: string };

export type DatadogMetroSerializer = (
    entryPoint: string,
    preModules: ReadonlyArray<Module>,
    graph: ReadOnlyGraph,
    options: SerializerOptions & {
        datadogBundleCallback?: (bundle: Bundle) => Bundle;
    }
) => Promise<string | MetroBundleWithMap>;

export type DatadogDebugIdModule = Module<MetroVirtualModuleOutput> & {
    setSource: (code: string) => void;
};

export type { MixedOutput, MetroConfig, Module, ReadOnlyGraph };
