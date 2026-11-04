/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import type * as Babel from '@babel/core';

/** The SVG map describes module-level bindings. A nested binding with the
 * same name must neither make that module binding reachable nor consume its
 * cached SVG entry. Unbound names retain the existing fallback behavior. */
export function referencesModuleBinding(
    path: Babel.NodePath,
    name: string
): boolean {
    return (
        path.scope.getBinding(name) ===
        path.scope.getProgramParent().getBinding(name)
    );
}
