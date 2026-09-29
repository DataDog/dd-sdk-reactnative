/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

import { getNodeName } from '../../utils';

/** An `ExportSpecifier`'s `exported` field is the name consumers actually
 * import under ('default' would be wrong for `export { default as Logo }`)
 * -- extracted into one helper since every export-specifier-walking branch
 * that needs it (in both `buildSvgMap.ts` and `svgBindingMap.ts`) shares
 * this. */
export function getExportedName(
    t: typeof Babel.types,
    exported: Babel.types.Identifier | Babel.types.StringLiteral
): string | null {
    return getNodeName(
        t,
        t.isStringLiteral(exported) ? exported.value : exported.name
    );
}

/** A specifier's `local` side (import or export) is always an `Identifier`
 * -- never a `StringLiteral` -- across the specifier types this file deals
 * with, so unlike `getExportedName` there's no literal-vs-identifier
 * branching needed here. */
export function getLocalName(
    t: typeof Babel.types,
    local: Babel.types.Identifier
): string | null {
    return getNodeName(t, local.name);
}
