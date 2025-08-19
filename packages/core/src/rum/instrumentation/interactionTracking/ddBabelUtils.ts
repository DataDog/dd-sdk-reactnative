// dd-content-helpers.ts
import * as React from 'react';

const CANDIDATE_LABEL_PROPS = [
    'children',
    'label',
    'title',
    'text',
    'accessibilityLabel'
];

export function __ddExtractText(node: any): string {
    if (node == null || typeof node === 'boolean') {
        return '';
    }
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }

    // Arrays/fragments
    if (Array.isArray(node)) {
        return node.map(__ddExtractText).join('');
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

    // Render-prop child (rare for buttons). Safe attempt only if no args are required.
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
            .map(__ddExtractText)
            .join('');
    }

    return '';
}
