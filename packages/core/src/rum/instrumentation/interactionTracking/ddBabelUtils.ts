// dd-content-helpers.ts
import * as React from 'react';

const CANDIDATE_LABEL_PROPS = ['children', 'label', 'title', 'text'];

export function __ddExtractText(node: any, prefer?: any[]): string {
    if (Array.isArray(prefer)) {
        for (const v of prefer) {
            const s = __ddExtractText(v);
            if (s) {
                return s;
            }
        }
    }

    if (node == null || typeof node === 'boolean') {
        return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    // Arrays/fragments
    if (Array.isArray(node)) {
        return node.map(x => __ddExtractText(x)).join('');
    }

    // React element (works for compound pieces like <Tab.Item/>)
    if (React.isValidElement(node)) {
        const props: any = (node as any).props ?? {};
        // 1) Prefer children
        let from = props.children;

        // 2) If no children, try common label-ish props (e.g., <Button title="..." /> or <Label text="..."/>)
        if (from == null) {
            for (const key of CANDIDATE_LABEL_PROPS) {
                if (key in props && props[key] != null) {
                    from = props[key];
                    break;
                }
            }
        }

        // 3) If still nothing but there are *known* icon-only compounds, bail early
        return __ddExtractText(from);
    }

    // TODO: Double check this
    // Render-prop child. Attempt only if no args are required.
    if (typeof node === 'function' && node.length === 0) {
        try {
            return __ddExtractText(node());
        } catch {
            return '';
        }
    }

    // Iterables
    if (typeof node === 'object' && Symbol.iterator in node) {
        return Array.from(node as Iterable<any>)
            .map(x => __ddExtractText(x))
            .join('');
    }

    return '';
}
