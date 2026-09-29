/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// The binding graph (built in index.ts's buildSvgMap()) has two distinct
// kinds of node that can share the same (file, name) text without being
// the same thing: a LOCAL node is "the binding named `name` in `file`'s
// own scope" (what a JSX identifier always refers to, and what a plain
// `import`'s local specifier creates); an EXPORT node is "the entry named
// `name` in `file`'s export table" (what an `import {name} from 'file'` in
// ANOTHER file reaches into, and what a re-export declaration's exported
// name refers to). A file can legally have an unrelated local import and a
// re-export both using the same text -- `import Icon from 'ui-lib'; export
// { Icon } from './svgBarrel';` -- so conflating the two into one key
// space would let a JSX usage of the real local `Icon` incorrectly walk
// into the re-exported barrel's `Icon`. Keys are tagged with a
// one-character kind prefix so the two spaces can never collide even when
// `file`+`name` are identical.
//
// Lives in its own module (rather than as private helpers in index.ts) so
// other modules can build/split the same kind of key without creating a
// circular import back into index.ts. The main consumer is
// `ReactNativeSVG.getLocalSvgEntry` in index.ts itself, which uses `nodeKey`
// to disambiguate a JSX identifier's local binding at consumption time.
export function nodeKey(file: string, name: string): string {
    return `L\0${file}\0${name}`;
}

export function exportNodeKey(file: string, name: string): string {
    return `E\0${file}\0${name}`;
}

/** Inverse of `nodeKey`/`exportNodeKey` -- the key is always exactly
 * `<kind>\0<file>\0<name>` and file paths never contain a NUL byte, so a
 * plain split unambiguously recovers all three parts. */
export function splitNodeKey(
    key: string
): [kind: 'local' | 'export', file: string, name: string] {
    const [kindTag, file, name] = key.split('\0');
    return [kindTag === 'E' ? 'export' : 'local', file, name];
}
