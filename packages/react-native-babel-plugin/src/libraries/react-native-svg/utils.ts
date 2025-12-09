/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

type RNShadow = { width?: number; height?: number };

/**
 * Converts a React Native-style `style` object into a flat CSS-compatible object,
 * mapping values like `marginTop`, `paddingHorizontal`, `shadowColor`, `transform`, etc.,
 * to kebab-case CSS keys and serializing values appropriately (e.g., with `px`, `rgba`).
 *
 * @param style - The input React Native style object.
 * @param options - Optional settings like RTL layout direction.
 * @returns A plain object mapping CSS keys to string/number values for inline style injection.
 */
export function convertStyleObjToCssObj(
    style: any,
    { isRTL = false }: { isRTL?: boolean } = {}
) {
    const css: Record<string, any> = {};

    // Sizing
    for (const k of [
        'width',
        'height',
        'minWidth',
        'minHeight',
        'maxWidth',
        'maxHeight'
    ]) {
        if (style[k] != null) {
            css[kebabCase(k)] = addPx(style[k]);
        }
    }

    // Positioning / display / overflow / opacity
    if (style.position) {
        css.position = style.position;
    }
    if (style.top != null) {
        css.top = addPx(style.top);
    }
    if (style.bottom != null) {
        css.bottom = addPx(style.bottom);
    }
    if (style.left != null) {
        css.left = addPx(style.left);
    }
    if (style.right != null) {
        css.right = addPx(style.right);
    }
    if (style.start != null) {
        css[isRTL ? 'right' : 'left'] = addPx(style.start);
    }
    if (style.end != null) {
        css[isRTL ? 'left' : 'right'] = addPx(style.end);
    }
    if (style.zIndex != null) {
        css['z-index'] = style.zIndex;
    }
    if (style.display) {
        css.display = style.display;
    }
    if (style.overflow) {
        css.overflow = style.overflow;
    }
    if (style.opacity != null) {
        css.opacity = style.opacity;
    }

    // Margin
    if (style.margin != null) {
        css.margin = addPx(style.margin);
    }
    if (style.marginTop != null) {
        css['margin-top'] = addPx(style.marginTop);
    }
    if (style.marginRight != null) {
        css['margin-right'] = addPx(style.marginRight);
    }
    if (style.marginBottom != null) {
        css['margin-bottom'] = addPx(style.marginBottom);
    }
    if (style.marginLeft != null) {
        css['margin-left'] = addPx(style.marginLeft);
    }
    if (style.marginHorizontal != null) {
        css['margin-left'] = addPx(style.marginHorizontal);
        css['margin-right'] = addPx(style.marginHorizontal);
    }
    if (style.marginVertical != null) {
        css['margin-top'] = addPx(style.marginVertical);
        css['margin-bottom'] = addPx(style.marginVertical);
    }

    // Padding
    if (style.padding != null) {
        css.padding = addPx(style.padding);
    }
    if (style.paddingTop != null) {
        css['padding-top'] = addPx(style.paddingTop);
    }
    if (style.paddingRight != null) {
        css['padding-right'] = addPx(style.paddingRight);
    }
    if (style.paddingBottom != null) {
        css['padding-bottom'] = addPx(style.paddingBottom);
    }
    if (style.paddingLeft != null) {
        css['padding-left'] = addPx(style.paddingLeft);
    }
    if (style.paddingHorizontal != null) {
        css['padding-left'] = addPx(style.paddingHorizontal);
        css['padding-right'] = addPx(style.paddingHorizontal);
    }
    if (style.paddingVertical != null) {
        css['padding-top'] = addPx(style.paddingVertical);
        css['padding-bottom'] = addPx(style.paddingVertical);
    }

    // Background / borders
    if (style.backgroundColor) {
        css['background-color'] = style.backgroundColor;
    }
    if (style.borderWidth != null) {
        css['border-width'] = addPx(style.borderWidth);
    }
    if (style.borderColor) {
        css['border-color'] = style.borderColor;
    }
    if (style.borderStyle) {
        css['border-style'] = style.borderStyle;
    }
    if (style.borderRadius != null) {
        css['border-radius'] = addPx(style.borderRadius);
    }
    if (style.borderTopLeftRadius != null) {
        css['border-top-left-radius'] = addPx(style.borderTopLeftRadius);
    }
    if (style.borderTopRightRadius != null) {
        css['border-top-right-radius'] = addPx(style.borderTopRightRadius);
    }
    if (style.borderBottomRightRadius != null) {
        css['border-bottom-right-radius'] = addPx(
            style.borderBottomRightRadius
        );
    }
    if (style.borderBottomLeftRadius != null) {
        css['border-bottom-left-radius'] = addPx(style.borderBottomLeftRadius);
    }

    // Per-side border widths/colors
    if (style.borderTopWidth != null) {
        css['border-top-width'] = addPx(style.borderTopWidth);
    }
    if (style.borderRightWidth != null) {
        css['border-right-width'] = addPx(style.borderRightWidth);
    }
    if (style.borderBottomWidth != null) {
        css['border-bottom-width'] = addPx(style.borderBottomWidth);
    }
    if (style.borderLeftWidth != null) {
        css['border-left-width'] = addPx(style.borderLeftWidth);
    }
    if (style.borderTopColor) {
        css['border-top-color'] = style.borderTopColor;
    }
    if (style.borderRightColor) {
        css['border-right-color'] = style.borderRightColor;
    }
    if (style.borderBottomColor) {
        css['border-bottom-color'] = style.borderBottomColor;
    }
    if (style.borderLeftColor) {
        css['border-left-color'] = style.borderLeftColor;
    }

    // Flex
    if (style.flex != null) {
        css.flex = style.flex;
    }
    if (style.flexDirection) {
        css['flex-direction'] = style.flexDirection;
    }
    if (style.flexWrap) {
        css['flex-wrap'] = style.flexWrap;
    }
    if (style.flexGrow != null) {
        css['flex-grow'] = style.flexGrow;
    }
    if (style.flexShrink != null) {
        css['flex-shrink'] = style.flexShrink;
    }
    if (style.flexBasis != null) {
        css['flex-basis'] = addPx(style.flexBasis);
    }
    if (style.justifyContent) {
        css['justify-content'] = style.justifyContent;
    }
    if (style.alignItems) {
        css['align-items'] = style.alignItems;
    }
    if (style.alignContent) {
        css['align-content'] = style.alignContent;
    }
    if (style.alignSelf) {
        css['align-self'] = style.alignSelf;
    }
    if (style.gap != null) {
        css['gap'] = addPx(style.gap);
    }
    if (style.rowGap != null) {
        css['row-gap'] = addPx(style.rowGap);
    }
    if (style.columnGap != null) {
        css['column-gap'] = addPx(style.columnGap);
    }

    // Transform properties (translateX, scaleX, rotate, etc.) are NOT handled here as they are igonore if set on a style attribute
    // They should be extracted separately and set as SVG transform attributes,

    // Shadows / elevation → box-shadow
    if (
        style.shadowColor ||
        style.shadowOffset ||
        style.shadowOpacity != null ||
        style.shadowRadius != null
    ) {
        const color = rgba(
            style.shadowColor || '#000',
            style.shadowOpacity ?? 1
        );
        const off: RNShadow = style.shadowOffset || {};
        const blur = style.shadowRadius != null ? style.shadowRadius : 0;

        css['box-shadow'] = `${addPx(off.width || 0)} ${addPx(
            off.height || 0
        )} ${addPx(blur)} 0 ${color}`;
    } else if (style.elevation != null) {
        const e = style.elevation;
        css['box-shadow'] = `0 ${addPx(e)} ${addPx(1.5 * e)} 0 rgba(0,0,0,0.3)`;
    }

    // Pointer events
    if (style.pointerEvents === 'none') {
        css['pointer-events'] = 'none';
    } else if (style.pointerEvents === 'auto') {
        css['pointer-events'] = 'auto';
    }

    // Other
    if (style.direction) {
        css.direction = style.direction;
    }
    if (style.aspectRatio != null) {
        css['aspect-ratio'] = String(style.aspectRatio);
    }

    // SVG-specific properties
    if (style.fill) {
        css.fill = style.fill;
    }
    if (style.fillOpacity != null) {
        css['fill-opacity'] = style.fillOpacity;
    }
    if (style.fillRule) {
        css['fill-rule'] = style.fillRule;
    }
    if (style.stroke) {
        css.stroke = style.stroke;
    }
    if (style.strokeWidth != null) {
        css['stroke-width'] = style.strokeWidth;
    }
    if (style.strokeOpacity != null) {
        css['stroke-opacity'] = style.strokeOpacity;
    }
    if (style.strokeLinecap) {
        css['stroke-linecap'] = style.strokeLinecap;
    }
    if (style.strokeLinejoin) {
        css['stroke-linejoin'] = style.strokeLinejoin;
    }
    if (style.strokeDasharray) {
        css['stroke-dasharray'] = Array.isArray(style.strokeDasharray)
            ? style.strokeDasharray.join(',')
            : style.strokeDasharray;
    }
    if (style.strokeDashoffset != null) {
        css['stroke-dashoffset'] = style.strokeDashoffset;
    }
    if (style.strokeMiterlimit != null) {
        css['stroke-miterlimit'] = style.strokeMiterlimit;
    }

    return css;
}

/**
 * Adds a `px` suffix to a numeric value. Leaves string values unchanged.
 *
 * @param v - Value to format (number or string).
 * @returns - The value as a pixel string (e.g., "10px") or unchanged string.
 */
function addPx(v: any) {
    return typeof v === 'number' ? `${v}px` : v;
}

/**
 * Converts a hex color (e.g., `#000`, `#336699`) and an alpha value into an `rgba(...)` string.
 * Supports 3-digit and 6-digit hex codes. Returns input string if not a valid hex code.
 *
 * @param hexOrName - A hex color string or named color (fallback).
 * @param alpha - A numeric alpha value between 0 and 1.
 * @returns A valid CSS `rgba(...)` string or the original input color.
 */
function rgba(hexOrName: string, alpha: number) {
    if (!hexOrName) {
        return `rgba(0,0,0,${alpha})`;
    }

    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hexOrName)) {
        const hex =
            hexOrName.length === 4
                ? `#${[...hexOrName.slice(1)].map(c => c + c).join('')}`
                : hexOrName;

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        return `rgba(${r},${g},${b},${alpha})`;
    }

    return hexOrName;
}

/**
 * Converts a camelCase string into kebab-case (e.g., `marginTop` → `margin-top`).
 * Uses Unicode-aware regex to catch capital letters in all scripts.
 *
 * @param str - The camelCase input string.
 * @returns - The kebab-case equivalent string.
 */
export function kebabCase(str: string) {
    const KEBAB_REGEX = /\p{Lu}/gu;
    const result = str.replace(KEBAB_REGEX, match => `-${match.toLowerCase()}`);

    return result.startsWith('-') ? result.slice(1) : result;
}

/**
 * Converts a React Native SVG tag or attribute name to start with a lowercase letter,
 * preserving the rest of the casing (used for JSX tag/attribute normalization).
 *
 * Example: `LinearGradient` → `linearGradient`
 *
 * @param attribute - The original attribute or tag name.
 * @returns The transformed string with lowercase first letter.
 */
export function convertAttributeCasing(attribute: string) {
    const firstLetter = attribute.slice(0, 1).toLowerCase();
    const text = attribute.slice(1);

    return `${firstLetter}${text}`;
}
