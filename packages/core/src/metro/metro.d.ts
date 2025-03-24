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

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro-runtime/src/modules/types.flow.js#L16
declare type Bundle = {
    modules: [number, string][];
    post: string;
    pre: string;
};

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/DeltaBundler/Serializers/baseJSBundle.js#L25
declare module 'metro/src/DeltaBundler/Serializers/baseJSBundle' {
    const baseJSBundle: (
        entryPoint: string,
        preModules: ReadonlyArray<Module>,
        graph: ReadOnlyGraph,
        options: SerializerOptions
    ) => Bundle;
    export = baseJSBundle;
}

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/lib/bundleToString.js#L22
declare module 'metro/src/lib/bundleToString' {
    const bundleToString: (
        bundle: Bundle
    ) => {
        code: string;
        metadata: BundleMetadata;
    };

    export = bundleToString;
}

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/DeltaBundler/Serializers/sourceMapString.js#L22
declare module 'metro/src/DeltaBundler/Serializers/sourceMapString' {
    import type { MixedOutput, Module } from 'metro';

    const sourceMapString: (
        modules: Module<MixedOutput>[],
        options: {
            excludeSource?: boolean;
            processModuleFilter?: (module: Module<MixedOutput>) => boolean;
            shouldAddToIgnoreList?: (module: Module<MixedOutput>) => boolean;
            getSourceUrl?: (module: Module<MixedOutput>) => string;
        }
    ) => string;
    export = sourceMapString;
}

// https://github.com/facebook/metro/blob/a3d021a0d021b5706372059f472715c63019e044/packages/metro/src/lib/countLines.js#L16
declare module 'metro/src/lib/countLines' {
    const countLines: (code: string) => number;
    export = countLines;
}
