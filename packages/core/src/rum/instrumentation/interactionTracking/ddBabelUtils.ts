// dd-content-helpers.ts
import * as React from 'react';

const LABEL_PROPS = ['children', 'label', 'title', 'text'];

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

export function __ddExtractText(node: any, prefer?: any[]): string[] {
    // 0) If caller provided preferred values (title/label/etc.), use those first.
    if (Array.isArray(prefer)) {
        const preferred = prefer
            .flatMap(v => __ddExtractText(v)) // recurse so expressions/arrays work
            .map(norm)
            .filter(Boolean);

        if (preferred.length) {
            return preferred;
        }
    }

    // 1) Base cases
    if (node == null || typeof node === 'boolean') {
        return [];
    }

    if (typeof node === 'string' || typeof node === 'number') {
        return [norm(String(node))];
    }

    // 2) Arrays / iterables → flatten results (don’t concatenate yet)
    if (Array.isArray(node)) {
        return node
            .flatMap(x => __ddExtractText(x))
            .map(norm)
            .filter(Boolean);
    }

    if (typeof node === 'object' && Symbol.iterator in node) {
        return Array.from(node as Iterable<any>)
            .flatMap(x => __ddExtractText(x))
            .map(norm)
            .filter(Boolean);
    }

    // 3) Zero-arg render prop
    if (typeof node === 'function' && node.length === 0) {
        try {
            return __ddExtractText(node());
        } catch {
            return [];
        }
    }

    // 4) React elements
    if (React.isValidElement(node)) {
        const props: any = (node as any).props ?? {};

        // 4a) If the element itself has a direct label-ish prop, prefer it.
        for (const k of LABEL_PROPS) {
            if (k === 'children') {
                continue; // handle children below
            }

            const v = props[k];
            if (v != null) {
                const got = __ddExtractText(v).map(norm).filter(Boolean);
                if (got.length) {
                    return got;
                }
            }
        }

        // 4b) Inspect children. Decide whether to return ONE joined label or MANY.
        const kids = React.Children.toArray(props.children);
        if (kids.length === 0) {
            return [];
        }

        // Extract each child to a list of strings (not joined)
        const perChild = kids.map(ch => __ddExtractText(ch));

        // Heuristic: treat as *compound* if multiple children look like “items”
        // i.e., at least two direct children have a label-ish prop or yield non-empty text individually.
        let labelledChildCount = 0;
        kids.forEach((ch, i) => {
            let hasLabelProp = false;

            if (React.isValidElement(ch)) {
                const cp: any = (ch as any).props ?? {};
                hasLabelProp = LABEL_PROPS.some(k => cp?.[k] != null);
            }

            const childTextCount = perChild[i].filter(Boolean).length;
            if (hasLabelProp || childTextCount > 0) {
                labelledChildCount++;
            }
        });

        const flat = perChild.flat().map(norm).filter(Boolean);

        // If there are multiple *direct* labelled children, return many (compound).
        // Otherwise, return a single joined label.
        if (labelledChildCount > 1) {
            // De-duplicate while preserving order
            const seen = new Set<string>();
            const out: string[] = [];
            for (const s of flat) {
                const key = s;
                if (!seen.has(key)) {
                    seen.add(key);
                    out.push(s);
                }
            }
            return out;
        }

        // Not “compound”: join everything into one readable string
        const joined = norm(flat.join(' '));
        return joined ? [joined] : [];
    }

    return [];
}
