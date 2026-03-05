declare module '@babel/helper-module-imports' {
    import type { NodePath, types } from '@babel/core';

    export function addNamed(
        path: NodePath,
        name: string,
        source: string,
        opts?: {
            nameHint?: string;
            importedType?: 'es6' | 'commonjs';
            importedInterop?: 'babel' | 'node' | 'compiled' | 'uncompiled';
            importPosition?: 'before' | 'after';
        }
    ): types.Identifier;

    export function addDefault(
        path: NodePath,
        source: string,
        opts?: {
            nameHint?: string;
            importedType?: 'es6' | 'commonjs';
            importedInterop?: 'babel' | 'node' | 'compiled' | 'uncompiled';
            importPosition?: 'before' | 'after';
        }
    ): types.Identifier;
}
