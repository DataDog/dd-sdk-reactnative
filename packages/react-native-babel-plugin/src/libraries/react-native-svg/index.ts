import type * as Babel from '@babel/core';
import { jsxAttribute, jSXIdentifier, stringLiteral } from '@babel/types';
import fs from 'fs';
import pathFS from 'path';
import { v4 as uuidv4 } from 'uuid';

import { getJSXAttributeData, getNodeName } from '../../utils';

import {
    rnAttributeNames,
    rnSvgArrayAttributeValues,
    svgAttributesCC,
    svgAttributesKC,
    svgSupportedNames,
    xmlNamespace
} from './constants';

function kebabCase(str: string) {
    const KEBAB_REGEX = /\p{Lu}/gu;
    const result = str.replace(KEBAB_REGEX, match => `-${match.toLowerCase()}`);

    return result.startsWith('-') ? result.slice(1) : result;
}

const getAssetsPath = () => {
    const hasDevFlag = process.env.pluginDev;
    const modulePath =
        'node_modules/@datadog/mobile-react-native-session-replay';

    if (!hasDevFlag) {
        return pathFS.resolve(modulePath);
    }

    return pathFS.resolve('./assets');
};

const SVG_BINARY = 'svg.bin';
const SVG_JSON = 'svg.json';

type SvgOffset = {
    start: number;
    length: number;
};

class ReactNativeSVG {
    svgMap: Record<string, { file: string; [key: string]: string }> = {};

    assetsPath: string;

    svgOffset: Record<string, SvgOffset> = {};

    constructor() {
        this.assetsPath = getAssetsPath();

        this.ensureAssetsDir();
        this.clearAssetsDir();
    }

    processItem(
        name: string,
        path: Babel.NodePath<Babel.types.JSXElement>,
        t: typeof Babel.types
    ) {
        if (!svgSupportedNames.includes(name)) {
            return;
        }

        const clone = t.cloneNode(path.node, true);
        const dimensions: Record<string, string> = {};
        const id = uuidv4();

        this.setNamespace(clone);
        this.transformElement(clone, dimensions, t);
    }

    private setNamespace(el: Babel.types.JSXElement) {
        // TODO: only do it when we Have Svg and not SVGUri
        el.openingElement.attributes.push(
            jsxAttribute(
                jSXIdentifier(xmlNamespace[0]),
                stringLiteral(xmlNamespace[1])
            )
        );
    }

    private transformElement(
        el: Babel.types.JSXElement,
        dimensions: Record<string, string> = {},
        t: typeof Babel.types
    ) {
        const openingNode = el.openingElement.name;
        const isJSXIdentifierOpen = t.isJSXIdentifier(openingNode);

        // Fix casing for openingElement
        if (isJSXIdentifierOpen) {
            openingNode.name = this.convertAttributeCasing(openingNode.name);
        }

        const closingNode = el.closingElement?.name;
        const isJSXIdentifierClose = t.isJSXIdentifier(closingNode);

        // Fix casing for closingElement
        if (isJSXIdentifierClose) {
            closingNode.name = this.convertAttributeCasing(closingNode.name);
        }

        this.processAttributes(el, dimensions, t);
    }

    private processAttributes(
        jsxElement: Babel.types.JSXElement,
        dimensions: Record<string, string> = {},
        t: typeof Babel.types
    ) {
        const el = jsxElement.openingElement;
        const name = getNodeName(t, el);
        let transformAttrString = null;

        for (const [index, attr] of el.attributes.entries()) {
            if (!t.isJSXAttribute(attr)) {
                continue;
            }

            if (!t.isJSXIdentifier(attr.name)) {
                continue;
            }

            let attrName = attr.name.name;

            if (rnAttributeNames.includes(attrName)) {
                el.attributes.splice(index, 1);

                // TODO: Handle style attributes (1)
                continue;
            }

            // This means that the attribute name is already in the right format
            if (!svgAttributesCC.includes(attrName)) {
                attrName = kebabCase(attrName);

                // This means that the attribute name is not a valid SVG attribute and should be ignored
                if (!svgAttributesKC.includes(attrName)) {
                    continue;
                }
            }

            /* If we reach this point we know we have a valid attribute name */

            if (name === 'svg') {
                this.handleSvgDimensions(attr, attrName, dimensions, t);
            }

            // Handle array attributes
            if (
                rnSvgArrayAttributeValues.includes(attrName) &&
                t.isJSXExpressionContainer(attr.value) &&
                t.isArrayExpression(attr.value.expression)
            ) {
                this.convertAttributeArrayValue(
                    attrName,
                    attr.value.expression,
                    t
                );

                el.attributes.splice(index, 1);
                continue;
            }

            // TODO: Handle separate transform attributes

            // TODO: Handle joined transform attributes
        }

        // TODO: Handle style attributes (2)

        for (const child of jsxElement.children) {
            if (t.isJSXElement(child)) {
                this.transformElement(child, dimensions, t);
            }
        }
    }

    handleSvgDimensions(
        attr: Babel.types.JSXAttribute,
        attrName: string,
        dimensions: Record<string, string> = {},
        t: typeof Babel.types
    ) {
        const dimensionAttributes = ['width', 'height'];

        if (dimensionAttributes.includes(attrName)) {
            // TODO: is this needed ? do we need to add px to SVG value
            if (t.isStringLiteral(attr.value)) {
                attr.value = t.stringLiteral(attr.value.value);
                dimensions[attrName] = attr.value.value;
            }

            if (t.isJSXExpressionContainer(attr.value)) {
                if (t.isStringLiteral(attr.value.expression)) {
                    attr.value = attr.value.expression;
                    dimensions[attrName] = attr.value.value;
                } else if (t.isNumericLiteral(attr.value.expression)) {
                    attr.value = t.stringLiteral(
                        attr.value.expression.value.toString()
                    );
                    dimensions[attrName] = attr.value.value;
                }

                // TODO: if it's a variable try to find it in the closure
            }
        }
    }

    convertAttributeArrayValue(
        attrName: string,
        expression: Babel.types.ArrayExpression,
        t: typeof Babel.types
    ) {
        const value = this.convertArrayExpressionToArray([], expression, t);

        if (Array.isArray(value)) {
            switch (attrName) {
                case 'gradientTransform':
                    return `matrix(${value.join(' ')})`;

                case 'values':
                    return value.join(';');

                case 'points':
                    return value
                        .map(v => (Array.isArray(v) ? v.join(',') : v))
                        .join(' ');

                default:
                    return value.join(' ');
            }
        }

        return null;
    }

    convertArrayExpressionToArray(
        data: string[] | string[][],
        expression: Babel.types.ArrayExpression,
        t: typeof Babel.types
    ): typeof data {
        for (const element of expression.elements) {
            if (!element) {
                continue;
            }

            // Used when targeting nested arrays
            if (t.isArrayExpression(element)) {
                const nested = this.convertArrayExpressionToArray(
                    [],
                    element,
                    t
                );
                (data as string[][]).push(nested as string[]);
                continue;
            }

            // Used when targeting numeric values
            if (t.isNumericLiteral(element)) {
                (data as string[]).push(element.value.toString());
                continue;
            }

            // Used when targeting string values
            if (t.isStringLiteral(element)) {
                (data as string[]).push(element.value);
                continue;
            }

            // Used when targeting negative values
            if (
                t.isUnaryExpression(element) &&
                element.operator === '-' &&
                t.isNumericLiteral(element.argument)
            ) {
                (data as string[]).push(`-${element.argument.value}`);
                continue;
            }

            // Used when targeting string templates (``)
            if (
                t.isTemplateLiteral(element) &&
                element.quasis.length === 1 &&
                element.expressions.length === 0
            ) {
                const { cooked } = element.quasis[0].value;
                if (cooked) {
                    (data as string[]).push(cooked);
                }
                continue;
            }

            // Ignore unsupported elements (identifiers, spreads)
            console.warn('Unsupported array element in SVG prop:', element);
        }

        return data;
    }

    convertAttributeTransformArray(
        t: typeof Babel.types,
        attr: Babel.types.JSXAttribute,
        transformsArray: { name: string; value: string | number }[]
    ) {
        const data = getJSXAttributeData(t, attr);
        if (data.name && data.value) {
            transformsArray.push(data as typeof transformsArray[0]);
        }
    }

    convertTransformArrayToString(
        transformsArray: { name: string; value: string | number }[]
    ): string | undefined {
        const transforms: string[] = [];

        const get = (key: string) =>
            transformsArray.find(t => t.name === key)?.value;

        const tx = get('translateX');
        const ty = get('translateY');
        if (tx !== undefined && ty !== undefined) {
            transforms.push(`translate(${tx}, ${ty})`);
        } else if (tx !== undefined) {
            transforms.push(`translate(${tx})`);
        } else if (ty !== undefined) {
            transforms.push(`translate(0, ${ty})`);
        }

        const sx = get('scaleX');
        const sy = get('scaleY');
        if (sx !== undefined && sy !== undefined) {
            transforms.push(`scale(${sx}, ${sy})`);
        } else if (sx !== undefined) {
            transforms.push(`scale(${sx})`);
        } else if (sy !== undefined) {
            transforms.push(`scale(1, ${sy})`);
        }

        const rot = get('rotation');
        if (rot !== undefined) {
            const value =
                typeof rot === 'string' ? rot.replace(/deg$/, '') : rot;
            transforms.push(`rotate(${value})`);
        }

        const skewX = get('skewX');
        if (skewX !== undefined) {
            const value =
                typeof skewX === 'string' ? skewX.replace(/deg$/, '') : skewX;
            transforms.push(`skewX(${value})`);
        }

        const skewY = get('skewY');
        if (skewY !== undefined) {
            const value =
                typeof skewY === 'string' ? skewY.replace(/deg$/, '') : skewY;
            transforms.push(`skewY(${value})`);
        }

        return transforms.length ? transforms.join(' ') : undefined;
    }

    // TODO: move to utils
    convertAttributeCasing(attribute: string) {
        const firstLetter = attribute.slice(0, 1).toLowerCase();
        const text = attribute.slice(1);

        return `${firstLetter}${text}`;
    }

    // TODO: move to processing/FS
    private ensureAssetsDir() {
        try {
            fs.accessSync(this.assetsPath, fs.constants.F_OK);
        } catch (error) {
            fs.mkdirSync(this.assetsPath);
        }
    }

    // TODO: move to processing/FS
    private clearAssetsDir() {
        try {
            const files = fs.readdirSync(this.assetsPath);
            for (const file of files) {
                const filePath = pathFS.join(this.assetsPath, file);

                if (fs.lstatSync(filePath).isFile()) {
                    fs.unlinkSync(filePath);
                }
            }
        } catch (error) {
            console.error('[clearAssetsDir]: ', error);
        }
    }

    // TODO: move to processing/FS
    private writeBinaryToDisk(id: string, svg: string) {
        const outputPath = pathFS.join(this.assetsPath, SVG_BINARY);
        const buffer = Buffer.from(svg, 'utf-8');
        const length = buffer.length;

        const fileDesc = fs.openSync(outputPath, 'a');
        const start = fs.statSync(outputPath).size;

        fs.writeSync(fileDesc, buffer, start, length);
        fs.closeSync(fileDesc);

        this.svgOffset[id] = { start, length };
    }

    // TODO: move to processing/FS
    private writeJSONToDisk() {
        const outputPath = pathFS.join(this.assetsPath, SVG_JSON);
        fs.writeFileSync(outputPath, JSON.stringify(this.svgOffset), 'utf-8');
    }
}

// convertAttributeArrayValue2(
//     attrName: string,
//     expression: Babel.types.ArrayExpression,
//     t: typeof Babel.types
// ) {
//     const value = this.convertArrayExpressionToArray([], expression, t);
//     if (Array.isArray(value)) {
//         if (attrName === 'gradientTransform') {
//             return `matrix(${value.join(' ')})`;
//         }
//         if (attrName === 'values') {
//             return value.join(';');
//         }
//         if (attrName === 'points') {
//             // Handle nested arrays
//             return value
//                 .map(v => (Array.isArray(v) ? v.join(',') : v))
//                 .join(' ');
//         }
//         // Fallback to comma or space
//         return value.join(',');
//     }
//     return null;
// }
//
// // move to utils
// convertArrayExpressionToArray2(
//     data: string[] | string[][],
//     expression: Babel.types.ArrayExpression,
//     t: typeof Babel.types
// ) {
//     for (const element of expression.elements) {
//         if (t.isArrayExpression(element)) {
//             const nestedData = this.convertArrayExpressionToArray(
//                 [],
//                 element,
//                 t
//             );
//             (data as string[][]).push(nestedData as string[]);
//             continue;
//         }
//
//         if (t.isNumericLiteral(element)) {
//             (data as string[]).push(element.value.toString());
//         }
//     }
//
//     return data;
// }
