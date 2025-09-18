import * as React from 'react';

type ExtractChild =
    | string
    | number
    | boolean
    | React.ReactElement
    | Iterable<React.ReactNode>
    | React.ReactPortal;

const LABEL_PROPS = ['children', 'label', 'title', 'text'];

const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Extracts readable text from arbitrary values commonly found in React trees.
 *
 * @param node - Any value: primitives, arrays, iterables, functions, or React elements.
 * @param prefer - Optional list of preferred values (e.g., title/label) to attempt first.
 * @returns Array of strings.
 */
export function __ddExtractText(node: any, prefer?: any[]): string[] {
    // If caller provided preferred values (title/label/etc.), use those first.
    if (Array.isArray(prefer)) {
        const preferred = prefer
            .flatMap(v => __ddExtractText(v)) // recurse so expressions/arrays work
            .map(normalize)
            .filter(Boolean);

        if (preferred.length) {
            return preferred;
        }
    }

    // Base cases
    if (node == null || typeof node === 'boolean') {
        return [];
    }

    if (typeof node === 'string' || typeof node === 'number') {
        return [normalize(String(node))];
    }

    // Arrays / iterables → flatten results (don’t concatenate yet)
    if (Array.isArray(node)) {
        return node
            .flatMap(x => __ddExtractText(x))
            .map(normalize)
            .filter(Boolean);
    }

    if (typeof node === 'object' && Symbol.iterator in node) {
        return Array.from(node as Iterable<any>)
            .flatMap(x => __ddExtractText(x))
            .map(normalize)
            .filter(Boolean);
    }

    // Zero-arg render prop
    if (typeof node === 'function' && node.length === 0) {
        try {
            return __ddExtractText(node());
        } catch {
            return [];
        }
    }

    // React elements
    if (React.isValidElement(node)) {
        const props: any = (node as any).props ?? {};

        // If the element itself has a direct label-ish prop, prefer it.
        for (const propKey of LABEL_PROPS) {
            if (propKey === 'children') {
                continue; // handle children below
            }

            const propValue = props[propKey];
            if (propValue != null) {
                const got = __ddExtractText(propValue)
                    .map(normalize)
                    .filter(Boolean);

                if (got.length) {
                    return got;
                }
            }
        }

        // Inspect children. Decide whether to return ONE joined label or MANY.
        const rawChildData = (Array.isArray(props.children)
            ? props.children
            : [props.children]) as ExtractChild[];

        const children = rawChildData.filter(c => c != null && c !== false);

        if (children.length === 0) {
            return [];
        }

        // Extract each child to a list of strings (not joined)
        const perChild = children.map(child => __ddExtractText(child));

        // Heuristic: treat as *compound* if multiple children look like “items”
        // e.g., at least two direct children have a label-ish prop or yield non-empty text individually.
        let labeledChildCount = 0;
        children.forEach((child, i) => {
            let hasLabelProp = false;

            if (React.isValidElement(child)) {
                const childProps: any = (child as any).props ?? {};
                hasLabelProp = LABEL_PROPS.some(k => childProps?.[k] != null);
            }

            const childTextCount = perChild[i].filter(Boolean).length;
            if (hasLabelProp || childTextCount > 0) {
                labeledChildCount++;
            }
        });

        const flat = perChild.flat().map(normalize).filter(Boolean);

        // If there are multiple *direct* labelled children, return many (compound).
        // Otherwise, return a single joined label.
        if (labeledChildCount > 1) {
            // De-duplicate while preserving order
            const seen = new Set<string>();
            const out: string[] = [];

            for (const str of flat) {
                const key = str;
                if (!seen.has(key)) {
                    seen.add(key);
                    out.push(str);
                }
            }
            return out;
        }

        // Not “compound”: join everything into one readable string
        const joined = normalize(flat.join(' '));
        return joined ? [joined] : [];
    }

    return [];
}
