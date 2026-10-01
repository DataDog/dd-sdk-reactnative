/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint quotes: ["off"] */
import { transform } from '@babel/core';
import * as parser from '@babel/parser';
import type { NodePath } from '@babel/traverse';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs';
import os from 'os';
import path from 'path';

import plugin from '../src/index';
import { RNSvgHandler } from '../src/libraries/react-native-svg/handlers/RNSvgHandler';
import { PathAliasResolver } from '../src/libraries/react-native-svg/pathAliasResolver';
import { ReactNativeSVG } from '../src/libraries/react-native-svg';

/**
 * Helper function to test SVG transformation
 */
function transformSvg(code: string): string | undefined {
    const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
    });

    let result: string | undefined;

    traverse(ast, {
        JSXElement(nodePath) {
            if (t.isJSXIdentifier(nodePath.node.openingElement.name)) {
                const name = nodePath.node.openingElement.name.name;
                if (name === 'Svg') {
                    const dimensions: Record<string, string> = {};
                    const handler = new RNSvgHandler(t, nodePath, name);
                    result = handler.transformSvgNode(dimensions);
                }
            }
        }
    });

    return result;
}

describe('React Native SVG Processing - RNSvgHandler', () => {
    describe('Basic SVG Transformation', () => {
        it('should transform a basic SVG element', () => {
            const input =
                '<Svg width="100" height="100"><Rect x="10" y="10" width="80" height="80" fill="red" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" fill="red" /></svg>"`
            );
        });

        it('should transform SVG with self-closing elements', () => {
            const input =
                '<Svg width="50" height="50"><Circle cx="25" cy="25" r="20" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="50" height="50" xmlns="http://www.w3.org/2000/svg"><circle cx="25" cy="25" r="20" /></svg>"`
            );
        });

        it('should transform nested SVG elements (g, rect, circle)', () => {
            const input =
                '<Svg width="200" height="200"><G><Rect x="0" y="0" width="100" height="100" /><Circle cx="150" cy="150" r="40" /></G></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><g><rect x="0" y="0" width="100" height="100" /><circle cx="150" cy="150" r="40" /></g></svg>"`
            );
        });

        it('should transform SVG with multiple child elements', () => {
            const input =
                '<Svg><Path d="M10 10 L90 90" /><Line x1="10" y1="90" x2="90" y2="10" /><Ellipse cx="50" cy="50" rx="30" ry="20" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L90 90" /><line x1="10" y1="90" x2="90" y2="10" /><ellipse cx="50" cy="50" rx="30" ry="20" /></svg>"`
            );
        });
    });

    describe('ViewBox Preservation', () => {
        it('should preserve viewBox attribute on SVG element', () => {
            const input =
                '<Svg viewBox="0 0 100 100" width="200" height="200"><Circle cx="50" cy="50" r="40" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg viewBox="0 0 100 100" width="200" height="200" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" /></svg>"`
            );
        });

        it('should preserve viewBox with different numeric formats (integers, decimals)', () => {
            const input =
                '<Svg viewBox="0 0 100.5 200.75"><Rect x="10.25" y="20.5" width="50" height="75" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg viewBox="0 0 100.5 200.75" xmlns="http://www.w3.org/2000/svg"><rect x="10.25" y="20.5" width="50" height="75" /></svg>"`
            );
        });
    });

    describe('Transform Attributes - Separate Properties', () => {
        it('should handle translateX transform attribute', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" translateX={20} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="translate(20)" /></svg>"`
            );
        });

        it('should handle translateY transform attribute', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" translateY={30} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="translate(0, 30)" /></svg>"`
            );
        });

        it('should handle both translateX and translateY attributes', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" translateX={20} translateY={30} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="translate(20, 30)" /></svg>"`
            );
        });

        it('should handle scaleX transform attribute', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="20" scaleX={1.5} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" transform="scale(1.5)" /></svg>"`
            );
        });

        it('should handle scaleY transform attribute', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="20" scaleY={2} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="20" transform="scale(1, 2)" /></svg>"`
            );
        });

        it('should handle both scaleX and scaleY attributes', () => {
            const input =
                '<Svg><Ellipse cx="50" cy="50" rx="30" ry="20" scaleX={1.5} scaleY={0.8} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="30" ry="20" transform="scale(1.5, 0.8)" /></svg>"`
            );
        });

        it('should handle rotate transform attribute', () => {
            const input =
                '<Svg><Rect x="40" y="40" width="20" height="20" rotate={45} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="40" y="40" width="20" height="20" transform="rotate(45)" /></svg>"`
            );
        });

        it('should handle skewX transform attribute', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" skewX={15} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="skewX(15)" /></svg>"`
            );
        });

        it('should handle skewY transform attribute', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" skewY={10} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="skewY(10)" /></svg>"`
            );
        });

        it('should handle matrix transform attribute', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" matrix={[1, 0, 0, 1, 30, 30]} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="matrix(1 0 0 1 30 30)" /></svg>"`
            );
        });

        it('should combine multiple separate transform attributes into single transform string', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" translateX={20} translateY={30} scaleX={1.2} rotate={45} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="translate(20, 30) scale(1.2) rotate(45)" /></svg>"`
            );
        });
    });

    describe('Transform Attributes - Array Format', () => {
        it('should handle transform attribute as array of objects', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" transform={[{ translateX: 20 }]} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="translate(20)" /></svg>"`
            );
        });

        it('should handle transform array with translate operations', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="30" transform={[{ translateX: 10 }, { translateY: 20 }]} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" transform="translate(10, 20)" /></svg>"`
            );
        });

        it('should handle transform array with scale operations', () => {
            const input =
                '<Svg><Ellipse cx="50" cy="50" rx="20" ry="30" transform={[{ scaleX: 1.5 }, { scaleY: 2 }]} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="20" ry="30" transform="scale(1.5, 2)" /></svg>"`
            );
        });

        it('should handle transform array with mixed transform operations', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="40" height="40" transform={[{ translateX: 15 }, { rotate: 30 }, { scaleX: 1.2 }]} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="40" height="40" transform="translate(15) scale(1.2) rotate(30)" /></svg>"`
            );
        });

        it('should handle transform array containing matrix', () => {
            const input =
                '<Svg><Path d="M10 10 L50 50" transform={[{ matrix: [1, 0, 0, 1, 10, 10] }]} stroke="black" strokeWidth="2" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L50 50" stroke="black" stroke-width="2" transform="matrix(1 0 0 1 10 10)" /></svg>"`
            );
        });
    });

    describe('Transform Attributes - Style Object', () => {
        it('should extract and process transform properties from style object', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" style={{ translateX: 20, translateY: 30 }} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" transform="translate(20, 30)" /></svg>"`
            );
        });

        it('should handle transform in style object alongside other CSS properties', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="30" style={{ fill: "blue", opacity: 0.8, translateX: 15 }} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" style="opacity:0.8;fill:blue" transform="translate(15)" /></svg>"`
            );
        });

        it('should handle multiple transform properties within style object', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="40" height="40" style={{ translateX: 10, translateY: 20, scaleX: 1.5, rotate: 45 }} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="40" height="40" transform="translate(10, 20) scale(1.5) rotate(45)" /></svg>"`
            );
        });

        it('should convert non-transform style properties to inline CSS string', () => {
            const input =
                '<Svg><Path d="M10 10 L50 50" style={{ stroke: "red", strokeWidth: 2, fill: "none" }} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L50 50" style="fill:none;stroke:red;stroke-width:2" /></svg>"`
            );
        });
    });

    describe('Dimension Handling - Width and Height', () => {
        it('should extract and preserve static width and height values', () => {
            const input =
                '<Svg width="100" height="200"><Rect x="0" y="0" width="50" height="100" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="100" height="200" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="50" height="100" /></svg>"`
            );
        });

        it('should handle numeric width and height without units', () => {
            const input =
                '<Svg width={150} height={250}><Circle cx="75" cy="125" r="50" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="150" height="250" xmlns="http://www.w3.org/2000/svg"><circle cx="75" cy="125" r="50" /></svg>"`
            );
        });

        it('should handle percentage-based width and height', () => {
            const input =
                '<Svg width="100%" height="50%"><Path d="M0 0 L100 100" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="100%" height="50%" xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L100 100" /></svg>"`
            );
        });

        it('should resolve width and height from variables in component scope', () => {
            const input =
                'const width = 300; <Svg width={width} height={200}><Rect x="0" y="0" width="100" height="100" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="100" /></svg>"`
            );
        });

        it('should remove width/height attributes when variables cannot be resolved', () => {
            const input =
                '<Svg width={unknownVar} height={anotherVar}><Circle cx="50" cy="50" r="40" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" /></svg>"`
            );
        });

        it('should handle SVG with only width specified', () => {
            const input =
                '<Svg width="100"><Rect x="10" y="10" width="80" height="80" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" /></svg>"`
            );
        });

        it('should handle SVG with only height specified', () => {
            const input =
                '<Svg height="100"><Ellipse cx="50" cy="50" rx="30" ry="40" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg height="100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="30" ry="40" /></svg>"`
            );
        });

        it('should handle SVG without width or height attributes', () => {
            const input =
                '<Svg viewBox="0 0 100 100"><Circle cx="50" cy="50" r="40" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" /></svg>"`
            );
        });
    });

    describe('Attribute Name Conversion', () => {
        it('should convert camelCase attribute names to kebab-case', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" strokeWidth="2" fillOpacity="0.5" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" stroke-width="2" fill-opacity="0.5" /></svg>"`
            );
        });

        it('should preserve attributes already in kebab-case format', () => {
            const input =
                '<Svg><Path d="M10 10 L90 90" stroke="black" stroke-width="3" fill="none" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L90 90" stroke="black" stroke-width="3" fill="none" /></svg>"`
            );
        });

        it('should preserve special SVG attributes that are camelCase in web spec', () => {
            const input =
                '<Svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"><Rect x="50" y="50" width="100" height="100" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><rect x="50" y="50" width="100" height="100" /></svg>"`
            );
        });
    });

    describe('Element Name Conversion', () => {
        it('should convert Svg component to svg element', () => {
            const input = '<Svg width="100" height="100" />';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" />"`
            );
        });

        it('should convert Circle component to circle element', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="40" fill="blue" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="blue" /></svg>"`
            );
        });

        it('should convert Rect component to rect element', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="80" height="60" fill="green" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="60" fill="green" /></svg>"`
            );
        });

        it('should convert Path component to path element', () => {
            const input =
                '<Svg><Path d="M10 10 L90 90 L10 90 Z" fill="red" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><path d="M10 10 L90 90 L10 90 Z" fill="red" /></svg>"`
            );
        });

        it('should convert G component to g element', () => {
            const input =
                '<Svg><G opacity="0.8"><Circle cx="50" cy="50" r="30" fill="pink" /></G></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><g opacity="0.8"><circle cx="50" cy="50" r="30" fill="pink" /></g></svg>"`
            );
        });

        it('should convert Line component to line element', () => {
            const input =
                '<Svg><Line x1="0" y1="0" x2="100" y2="100" stroke="black" strokeWidth="2" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="100" y2="100" stroke="black" stroke-width="2" /></svg>"`
            );
        });

        it('should convert Polygon component to polygon element', () => {
            const input =
                '<Svg><Polygon points="50,10 90,90 10,90" fill="purple" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><polygon points="50,10 90,90 10,90" fill="purple" /></svg>"`
            );
        });

        it('should convert Polyline component to polyline element', () => {
            const input =
                '<Svg><Polyline points="10,10 50,50 90,10" stroke="orange" strokeWidth="3" fill="none" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><polyline points="10,10 50,50 90,10" stroke="orange" stroke-width="3" fill="none" /></svg>"`
            );
        });

        it('should convert Ellipse component to ellipse element', () => {
            const input =
                '<Svg><Ellipse cx="50" cy="50" rx="40" ry="25" fill="cyan" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="40" ry="25" fill="cyan" /></svg>"`
            );
        });

        it('should convert Text component to text element', () => {
            const input =
                '<Svg><Text x="10" y="50" fontSize="20" fill="black">Hello SVG</Text></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="50" font-size="20" fill="black">Hello SVG</text></svg>"`
            );
        });

        it('should convert ClipPath component to clipPath element', () => {
            const input =
                '<Svg><Defs><ClipPath id="clip"><Circle cx="50" cy="50" r="40" /></ClipPath></Defs><Rect width="100" height="100" fill="blue" clipPath="url(#clip)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip"><circle cx="50" cy="50" r="40" /></clipPath></defs><rect width="100" height="100" fill="blue" clip-path="url(#clip)" /></svg>"`
            );
        });

        it('should convert Defs component to defs element', () => {
            const input =
                '<Svg><Defs><Circle id="myCircle" cx="50" cy="50" r="40" /></Defs><Use href="#myCircle" fill="lightgreen" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><circle id="myCircle" cx="50" cy="50" r="40" /></defs><use href="#myCircle" fill="lightgreen" /></svg>"`
            );
        });

        it('should convert LinearGradient component to linearGradient element', () => {
            const input =
                '<Svg><Defs><LinearGradient id="grad1"><Stop offset="0%" stopColor="red" /><Stop offset="100%" stopColor="blue" /></LinearGradient></Defs><Rect width="100" height="100" fill="url(#grad1)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad1"><stop offset="0%" stop-color="red" /><stop offset="100%" stop-color="blue" /></linearGradient></defs><rect width="100" height="100" fill="url(#grad1)" /></svg>"`
            );
        });

        it('should convert RadialGradient component to radialGradient element', () => {
            const input =
                '<Svg><Defs><RadialGradient id="grad2"><Stop offset="0%" stopColor="white" /><Stop offset="100%" stopColor="black" /></RadialGradient></Defs><Circle cx="50" cy="50" r="50" fill="url(#grad2)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="grad2"><stop offset="0%" stop-color="white" /><stop offset="100%" stop-color="black" /></radialGradient></defs><circle cx="50" cy="50" r="50" fill="url(#grad2)" /></svg>"`
            );
        });

        it('should convert Stop component to stop element', () => {
            const input =
                '<Svg><Defs><LinearGradient id="grad"><Stop offset="0%" stopColor="yellow" stopOpacity="1" /><Stop offset="100%" stopColor="orange" stopOpacity="1" /></LinearGradient></Defs><Rect width="100" height="100" fill="url(#grad)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad"><stop offset="0%" stop-color="yellow" stop-opacity="1" /><stop offset="100%" stop-color="orange" stop-opacity="1" /></linearGradient></defs><rect width="100" height="100" fill="url(#grad)" /></svg>"`
            );
        });
    });

    describe('Array Attributes', () => {
        it('should convert points array to space-separated string', () => {
            const input =
                '<Svg><Polygon points={[50, 10, 90, 90, 10, 90]} fill="red" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><polygon points="50 10 90 90 10 90" fill="red" /></svg>"`
            );
        });

        it('should convert strokeDasharray array to comma-separated string', () => {
            const input =
                '<Svg><Line x1="0" y1="50" x2="100" y2="50" stroke="black" strokeDasharray={[5, 10, 15]} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="50" x2="100" y2="50" stroke="black" stroke-dasharray="5 10 15" /></svg>"`
            );
        });

        it('should convert gradientTransform array to proper format', () => {
            const input =
                '<Svg width="200" height="200"><Defs><LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0%" stopColor="blue" /><Stop offset="100%" stopColor="lightblue" /></LinearGradient></Defs><Rect width="200" height="200" fill="url(#grad)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="blue" /><stop offset="100%" stop-color="lightblue" /></linearGradient></defs><rect width="200" height="200" fill="url(#grad)" /></svg>"`
            );
        });

        it('should convert stdDeviation array to space-separated string', () => {
            const input =
                '<Svg><Defs><Filter id="blur"><FeGaussianBlur stdDeviation={[2, 4]} /></Filter></Defs><Rect width="200" height="200" fill="tomato" filter="url(#blur)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="blur"><feGaussianBlur stdDeviation="2 4" /></filter></defs><rect width="200" height="200" fill="tomato" filter="url(#blur)" /></svg>"`
            );
        });

        it('should convert values array to proper format', () => {
            const input =
                '<Svg><Defs><Filter id="matrix"><FeColorMatrix type="matrix" values={[1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0]} /></Filter></Defs><Rect width="200" height="200" fill="tomato" filter="url(#matrix)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><filter id="matrix"><feColorMatrix type="matrix" values="1;0;0;0;0;0;1;0;0;0;0;0;1;0;0;0;0;0;1;0" /></filter></defs><rect width="200" height="200" fill="tomato" filter="url(#matrix)" /></svg>"`
            );
        });
    });

    describe('React Native Specific Attributes', () => {
        it('should remove accessibilityLabel attribute from SVG output', () => {
            const input =
                '<Svg accessibilityLabel="My SVG"><Circle cx="50" cy="50" r="40" accessibilityLabel="My Circle" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" /></svg>"`
            );
        });

        it('should remove accessibilityRole attribute from SVG output', () => {
            const input =
                '<Svg accessibilityRole="image"><Rect x="10" y="10" width="80" height="80" accessibilityRole="button" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="80" height="80" /></svg>"`
            );
        });

        it('should convert style object to inline CSS string', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" style={{ opacity: 0.5, fill: "blue" }} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" style="opacity:0.5;fill:blue" /></svg>"`
            );
        });

        it('should remove __self debugging attribute', () => {
            const input =
                '<Svg __self="this"><Circle cx="50" cy="50" r="30" __self="this" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" /></svg>"`
            );
        });
    });

    describe('Invalid and Unsupported Attributes', () => {
        it('should remove attributes not in SVG spec', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" customProp="value" unknownAttr="test" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" /></svg>"`
            );
        });

        it('should remove JSX spread attributes', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="40" fill="red" {...props} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red" /></svg>"`
            );
        });
    });

    describe('Complex Scenarios', () => {
        it('should handle SVG with dimensions, viewBox, transforms, and nested elements', () => {
            const input =
                '<Svg width="200" height="200" viewBox="0 0 100 100"><G translateX={10} translateY={10}><Rect x="10" y="10" width="30" height="30" fill="blue" /><Circle cx="70" cy="70" r="20" fill="red" /></G></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="200" height="200" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g transform="translate(10, 10)"><rect x="10" y="10" width="30" height="30" fill="blue" /><circle cx="70" cy="70" r="20" fill="red" /></g></svg>"`
            );
        });

        it('should handle SVG with linearGradient, radialGradient, and filter elements', () => {
            const input =
                '<Svg><Filter id="blurMe"><FeGaussianBlur stdDeviation="5" /></Filter><Defs><LinearGradient id="lg"><Stop offset="0%" stopColor="red" /><Stop offset="100%" stopColor="blue" /></LinearGradient><RadialGradient id="rg"><Stop offset="0%" stopColor="white" /><Stop offset="100%" stopColor="black" /></RadialGradient></Defs><Rect width="50" height="50" fill="url(#lg)" /><Circle cx="75" cy="75" r="25" fill="url(#rg)" filter="url(#blurMe)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><filter id="blurMe"><feGaussianBlur stdDeviation="5" /></filter><defs><linearGradient id="lg"><stop offset="0%" stop-color="red" /><stop offset="100%" stop-color="blue" /></linearGradient><radialGradient id="rg"><stop offset="0%" stop-color="white" /><stop offset="100%" stop-color="black" /></radialGradient></defs><rect width="50" height="50" fill="url(#lg)" /><circle cx="75" cy="75" r="25" fill="url(#rg)" filter="url(#blurMe)" /></svg>"`
            );
        });

        it('should handle SVG with clipPath', () => {
            const input =
                '<Svg><Defs><ClipPath id="clip1"><Circle cx="50" cy="50" r="40" /></ClipPath></Defs><Rect width="100" height="100" fill="green" clipPath="url(#clip1)" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="clip1"><circle cx="50" cy="50" r="40" /></clipPath></defs><rect width="100" height="100" fill="green" clip-path="url(#clip1)" /></svg>"`
            );
        });

        it('should handle SVG with text, tspan, and textPath elements', () => {
            const input =
                '<Svg><Text x="10" y="50" fontSize="16" fill="black">Hello <Tspan fontWeight="bold">World</Tspan></Text></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="50" font-size="16" fill="black">Hello <tspan font-weight="bold">World</tspan></text></svg>"`
            );
        });

        it('should handle deeply nested SVG element hierarchy', () => {
            const input =
                '<Svg><G><G><G><G><Circle cx="50" cy="50" r="10" fill="purple" /></G></G></G></G></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><g><g><g><g><circle cx="50" cy="50" r="10" fill="purple" /></g></g></g></g></svg>"`
            );
        });

        it('should handle SVG with use elements referencing defs', () => {
            const input =
                '<Svg><Defs><G id="shape"><Circle cx="25" cy="25" r="20" fill="blue" /></G></Defs><Use href="#shape" x="0" y="0" /><Use href="#shape" x="50" y="50" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><defs><g id="shape"><circle cx="25" cy="25" r="20" fill="blue" /></g></defs><use href="#shape" x="0" y="0" /><use href="#shape" x="50" y="50" /></svg>"`
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty SVG element with no children', () => {
            const input = '<Svg width="100" height="100" />';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg" />"`
            );
        });

        it('should handle SVG with text-only content', () => {
            const input = '<Svg><Text x="10" y="50">Plain text</Text></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><text x="10" y="50">Plain text</text></svg>"`
            );
        });

        it('should handle or strip JSX comments in SVG', () => {
            const input =
                '<Svg>{/* This is a comment */}<Circle cx="50" cy="50" r="40" /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg">{/* This is a comment */}<circle cx="50" cy="50" r="40" /></svg>"`
            );
        });

        it('should handle transform attributes with zero values', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" translateX={0} translateY={0} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" /></svg>"`
            );
        });

        it('should handle transform attributes with negative values', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="30" translateX={-10} translateY={-20} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" transform="translate(-10, -20)" /></svg>"`
            );
        });
    });

    describe('Error Handling', () => {
        it('should warn for unsupported element names and remove them from output', () => {
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const input = '<Svg><UnsupportedElement x="10" y="10" /></Svg>';
            const output = transformSvg(input);

            // Unsupported elements are now removed entirely rather than left in place.
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"></svg>"`
            );
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Removing unsupported element')
            );

            warnSpy.mockRestore();
        });

        it('should remove an unsupported element but keep its supported siblings', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="40" fill="#27ae60" /><UnsupportedElement x="10" y="10" /></Svg>';
            const output = transformSvg(input);

            expect(output).toContain(
                '<circle cx="50" cy="50" r="40" fill="#27ae60" />'
            );
            expect(output).not.toContain('unsupportedElement');
        });

        it('should remove an element whose tag name is a member expression (e.g. <Icons.Path />), rather than pass it through unconverted', () => {
            const input = `
                function Icon({ color }) {
                    return (
                        <Svg width="64" height="64" viewBox="0 0 64 64">
                            <Circle cx="32" cy="32" r="28" fill="#27ae60" />
                            <Icons.Path d="M18 32 L28 42 L46 20" fill={color} />
                        </Svg>
                    );
                }
            `;
            const output = transformSvg(input);

            expect(output).not.toContain('Icons.Path');
            expect(output).toContain(
                '<circle cx="32" cy="32" r="28" fill="#27ae60" />'
            );
        });

        it('should remove an unsupported element with dynamic/unresolvable attributes without throwing', () => {
            const input = `
                function Icon({ color, opacity }) {
                    return (
                        <Svg width="64" height="64" viewBox="0 0 64 64">
                            <Circle cx="32" cy="32" r="28" fill="#27ae60" />
                            <AnimatedPath
                                d="M18 32 L28 42 L46 20"
                                fill={color}
                                style={{ opacity }}
                            />
                        </Svg>
                    );
                }
            `;

            expect(() => transformSvg(input)).not.toThrow();

            const output = transformSvg(input);
            expect(output).toContain(
                '<circle cx="32" cy="32" r="28" fill="#27ae60" />'
            );
            expect(output).not.toContain('animatedPath');
            expect(output).not.toContain('fill={color}');
        });

        it('should preserve resolvable falsy values (0) instead of treating them as unresolved', () => {
            const input =
                '<Svg><Circle cx="50" cy="50" r="40" opacity={0} /></Svg>';
            const output = transformSvg(input);

            expect(output).toContain('opacity="0"');
        });

        it('should leave an unresolvable property value untouched rather than strip it or drop the element, deferring to native-side fill-in', () => {
            // Property-level resolution is intentionally out of scope for this fix (see PR
            // review discussion) — dropping properties/tags based on resolvability can affect
            // an SVG's bounds in ways that are hard to reason about. This fix only drops
            // unsupported *tags*; a follow-up PR will pass unresolvable runtime property
            // values through the native view to be filled in on the native side instead.
            const input = `
                function Icon({ color }) {
                    return (
                        <Svg>
                            <Circle cx="50" cy="50" r="40" fill={color} />
                        </Svg>
                    );
                }
            `;
            const output = transformSvg(input);

            expect(output).toContain('fill={color}');
        });

        it('should drop only the unsupported child inside a group, leaving the group and its other siblings intact', () => {
            const input = `
                function Icon() {
                    return <Svg><G><UnsupportedElement /></G><Rect x="1" y="1" width="1" height="1" /></Svg>;
                }
            `;
            const output = transformSvg(input);

            expect(output).toContain('<g></g>');
            expect(output).toContain(
                '<rect x="1" y="1" width="1" height="1" />'
            );
            expect(output).not.toContain('unsupportedElement');
        });

        it('should keep a polygon whose `points` use nested coordinate-pair arrays with signed numbers', () => {
            const input =
                '<Svg><Polygon points={[[-10, 20], [30, -40]]} fill="red" /></Svg>';
            const output = transformSvg(input);

            expect(output).toContain(
                '<polygon points="-10,20 30,-40" fill="red" />'
            );
        });

        it('should handle malformed transform array gracefully', () => {
            const input =
                '<Svg><Rect x="10" y="10" width="50" height="50" transform={[null, undefined, { invalid: true }]} /></Svg>';
            const output = transformSvg(input);
            expect(output).toMatchInlineSnapshot(
                `"<svg xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="50" height="50" /></svg>"`
            );
        });

        it('should return undefined from transformSvgNode when the root tag itself is unsupported, without mutating the node', () => {
            // Direct unit test of RNSvgHandler.transformSvgNode's own guard — the real plugin
            // never reaches this via <SvgUri> today (HandlerResolver disables that handler
            // first), but the guard exists so the root element is checked the same way as any
            // child before anything is mutated.
            const ast = parser.parse(
                '<SvgUri uri="https://example.com/x.svg" />',
                {
                    sourceType: 'module',
                    plugins: ['jsx', 'typescript']
                }
            );

            let result: string | undefined;
            let openingName: string | undefined;
            traverse(ast, {
                JSXElement(nodePath) {
                    const handler = new RNSvgHandler(t, nodePath, 'SvgUri');
                    result = handler.transformSvgNode({});
                    const name = nodePath.node.openingElement.name;
                    openingName = t.isJSXIdentifier(name)
                        ? name.name
                        : undefined;
                }
            });

            expect(result).toBeUndefined();
            expect(openingName).toBe('SvgUri');
        });

        it('should remove (not throw for) an element whose closing tag has a mismatched name form, so a malformed node never lingers in the tree', () => {
            // A real parser never produces an opening/closing tag pair with different node
            // types — this can only happen via direct AST manipulation, which is exactly what
            // this test does. It matters because throwing here (instead of returning false)
            // would leave the malformed node in the tree unrepaired; Babel's own code
            // generation can then fail on it later, corrupting the *whole file's* output, not
            // just this element. Returning false lets the caller splice it out cleanly.
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const ast = parser.parse(
                '<Svg width="10" height="10"><Circle cx="1" cy="1" r="1"></Circle></Svg>',
                { sourceType: 'module', plugins: ['jsx', 'typescript'] }
            );

            let svgPath: NodePath<t.JSXElement> | undefined;
            traverse(ast, {
                JSXElement(elPath) {
                    const name = elPath.node.openingElement.name;
                    if (t.isJSXIdentifier(name) && name.name === 'Svg') {
                        svgPath = elPath;
                    }
                    if (
                        t.isJSXIdentifier(name) &&
                        name.name === 'Circle' &&
                        elPath.node.closingElement
                    ) {
                        elPath.node.closingElement.name = t.jsxMemberExpression(
                            t.jsxIdentifier('Icons'),
                            t.jsxIdentifier('Circle')
                        );
                    }
                }
            });

            const handler = new RNSvgHandler(t, svgPath!, 'Svg');

            expect(() => handler.transformSvgNode({})).not.toThrow();
            expect(handler.transformSvgNode({})).toBe(
                '<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg"></svg>'
            );

            warnSpy.mockRestore();
        });

        it('should remove an element whose opening and closing tags are each individually supported but name different elements (e.g. <Circle>...</Rect>)', () => {
            // Both tags pass the individual "is this a supported element" check, but they
            // don't match each other. A real parser never produces this — mismatched
            // opening/closing tag names are a parse error — so this is exercised via direct
            // AST manipulation, simulating a malformed tree from an upstream transform.
            // Left unchecked, this would still generate invalid markup with the same
            // whole-file blast radius the other checks in this function guard against.
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            const ast = parser.parse(
                '<Svg width="10" height="10"><Circle cx="1" cy="1" r="1"></Circle></Svg>',
                { sourceType: 'module', plugins: ['jsx', 'typescript'] }
            );

            let svgPath: NodePath<t.JSXElement> | undefined;
            traverse(ast, {
                JSXElement(elPath) {
                    const name = elPath.node.openingElement.name;
                    if (t.isJSXIdentifier(name) && name.name === 'Svg') {
                        svgPath = elPath;
                    }
                    if (
                        t.isJSXIdentifier(name) &&
                        name.name === 'Circle' &&
                        elPath.node.closingElement
                    ) {
                        elPath.node.closingElement.name = t.jsxIdentifier(
                            'Rect'
                        );
                    }
                }
            });

            const handler = new RNSvgHandler(t, svgPath!, 'Svg');

            expect(() => handler.transformSvgNode({})).not.toThrow();
            expect(handler.transformSvgNode({})).toBe(
                '<svg width="10" height="10" xmlns="http://www.w3.org/2000/svg"></svg>'
            );

            warnSpy.mockRestore();
        });
    });
});

jest.mock('uuid', () => ({
    v4: () => '00000000-0000-0000-0000-000000000000'
}));

/**
 * Helper to run the full babel plugin with SVG tracking enabled.
 * Returns the transformed code string.
 */
function transformWithSvgTracking(code: string): string | undefined {
    const tmpDir = path.join(os.tmpdir(), 'dd-svg-test-assets');
    const reactNativeSVG = new ReactNativeSVG(process.cwd(), tmpDir);

    return transform(code, {
        filename: 'file.tsx',
        presets: ['@babel/preset-react', '@babel/preset-typescript'],
        plugins: [
            [
                plugin,
                {
                    sessionReplay: { svgTracking: true },
                    __internal_reactNativeSVG: reactNativeSVG
                }
            ]
        ],
        configFile: false
    })?.code as string | undefined;
}

describe('SessionReplayView.Privacy SVG Wrapper', () => {
    const tmpDir = path.join(os.tmpdir(), 'dd-svg-test-assets');

    afterAll(() => {
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            /* ignore cleanup errors */
        }
    });

    it('should wrap an inline SVG with the correct props', () => {
        const input =
            '<Svg width="24" height="24"><Path d="M12 2L2 12h10z" fill="black" /></Svg>';
        const output = transformWithSvgTracking(input);

        expect(output).toMatchSnapshot();
    });

    it('should leave SvgUri untouched, since its handler is disabled in HandlerResolver, rather than throw or produce a broken wrapper', () => {
        const input =
            '<SvgUri uri="https://example.com/x.svg" width="40" height="40" />';
        const output = transformWithSvgTracking(input);

        expect(output).not.toContain('SessionReplayView.Privacy');
        expect(output).toContain('SvgUri');
        expect(output).toContain('https://example.com/x.svg');
    });

    it('should wrap an SVG without explicit dimensions', () => {
        const input =
            '<Svg viewBox="0 0 100 100"><Circle cx="50" cy="50" r="40" fill="blue" /></Svg>';
        const output = transformWithSvgTracking(input);

        expect(output).toMatchSnapshot();
    });

    it('should not set a style prop on the wrapper', () => {
        const input =
            '<Svg width="24" height="24"><Path d="M12 2L2 12h10z" fill="black" /></Svg>';
        const output = transformWithSvgTracking(input);

        expect(output).not.toContain('flexShrink');
        expect(output).not.toContain('style');
    });

    it('should skip wrapping the SVG entirely when a supported child has an unresolvable property, rather than strip the property or the element', () => {
        // Property-level resolution is deferred to a follow-up PR (native-side fill-in). Until
        // then, an unresolvable property on an otherwise-supported tag is left in place, svgo
        // fails to parse the resulting invalid markup, and this SVG is skipped — same
        // (pre-existing) graceful-failure path as before this fix, just no longer reachable
        // for unsupported *tags* like AnimatedPath, which are now removed before svgo ever runs.
        const input = `
            function Icon({ color }) {
                return (
                    <Svg width="80" height="80" viewBox="0 0 100 100">
                        <Circle cx={50} cy={50} r={40} fill={color} />
                    </Svg>
                );
            }
        `;
        const output = transformWithSvgTracking(input);

        expect(output).not.toContain('SessionReplayView.Privacy');
        expect(output).toContain('fill: color');
    });

    it('should skip wrapping the SVG entirely when an unsupported tag is reachable only through a JSXExpressionContainer, e.g. conditional rendering', () => {
        // traverseAndTransformChildren only inspects direct JSXElement entries of
        // `jsxElement.children`. An unsupported tag reached through a JSXExpressionContainer
        // (conditional `{cond && <X/>}`, `{items.map(...)}`) or a JSXFragment child is a
        // different node type at that position, so it's skipped entirely rather than removed
        // — same deferred-limitation category as unresolvable properties above (see PR
        // discussion). This test locks in that current, known-limitation behavior so a partial
        // fix for one wrapper shape doesn't silently leave the others untested.
        const input = `
            function Icon({ showCheckmark, color }) {
                return (
                    <Svg width="64" height="64" viewBox="0 0 64 64">
                        <Circle cx="32" cy="32" r="28" fill="#27ae60" />
                        {showCheckmark && <AnimatedPath d="M18 32 L28 42 L46 20" fill={color} />}
                    </Svg>
                );
            }
        `;
        const output = transformWithSvgTracking(input);

        expect(output).not.toContain('SessionReplayView.Privacy');
    });

    it('should wrap the SVG and write a clean asset when an unsupported tag is removed, going through the real svgo/asset-writing pipeline', () => {
        // The mirror case of the test above, and the actual customer repro: unlike an
        // unresolvable property, an unsupported *tag* (AnimatedPath) is removed before the
        // string is ever handed to svgo, so this one — unlike the property case — must still
        // get wrapped. This exercises the real pipeline (svgo, asset file on disk), not just
        // RNSvgHandler's own output string.
        const assetDir = path.join(os.tmpdir(), 'dd-svg-test-assets');
        const input = `
            function Icon({ color, opacity }) {
                return (
                    <Svg width="64" height="64" viewBox="0 0 64 64">
                        <Circle cx="32" cy="32" r="28" fill="#27ae60" />
                        <AnimatedPath
                            d="M18 32 L28 42 L46 20"
                            fill={color}
                            style={{ opacity }}
                        />
                    </Svg>
                );
            }
        `;
        const output = transformWithSvgTracking(input);

        expect(output).toContain('SessionReplayView.Privacy');

        const match = output!.match(/hash:\s*["']([0-9a-f]{32})["']/i);
        expect(match?.[1]).toBeTruthy();
        const svgContent = fs.readFileSync(
            path.join(assetDir, `${match![1]}.svg`),
            'utf8'
        );
        expect(svgContent).toContain(
            '<circle cx="32" cy="32" r="28" fill="#27ae60"/>'
        );
        expect(svgContent).not.toContain('animatedPath');
        expect(svgContent).not.toContain('fill={color}');
    });
});

describe('ReactNativeSVG.buildSvgMap', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dd-buildsvgmap-'));
        fs.writeFileSync(
            path.join(tmpDir, 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should populate localSvgMap from a default import of an SVG file', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from './icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'icon.svg')
        );
    });

    it('should populate localSvgMap from a named import of an SVG file', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import { ReactComponent as StarIcon } from './icon.svg';\nexport default function C() { return <StarIcon />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['StarIcon']).toBeDefined();
    });

    it('should populate localSvgMap with the exported name for aliased re-exports', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export { default as Logo } from './icon.svg';`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'icon.svg')
        );
        expect(instance.localSvgMap['default']).toBeUndefined();
    });

    it('should populate localSvgMap with the exported name for non-aliased re-exports', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export { StarIcon } from './icon.svg';`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['StarIcon']).toBeDefined();
    });

    it('should produce the same localSvgMap across instances for the same source tree', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export { StarIcon } from './icon.svg';`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();
        const mapAfterFirstCall = { ...instance.localSvgMap };

        const freshInstance = new ReactNativeSVG(tmpDir, tmpDir, false);
        freshInstance.setApiTypes(t);
        freshInstance.buildSvgMap();

        expect(freshInstance.localSvgMap).toEqual(mapAfterFirstCall);
    });

    // generate-sr-assets passes its own (larger, user-configurable) ignore
    // list here instead of relying on the hardcoded default -- otherwise it
    // would scan directories the CLI was explicitly told to skip.
    it('should respect a custom scanIgnorePatterns list instead of the hardcoded default', () => {
        fs.mkdirSync(path.join(tmpDir, 'vendor'));
        fs.writeFileSync(
            path.join(tmpDir, 'vendor', 'icons.ts'),
            `export { StarIcon } from '../icon.svg';`
        );

        const defaultInstance = new ReactNativeSVG(tmpDir, tmpDir, false);
        defaultInstance.setApiTypes(t);
        defaultInstance.buildSvgMap();
        expect(defaultInstance.localSvgMap['StarIcon']).toBeDefined();

        const scopedInstance = new ReactNativeSVG(tmpDir, tmpDir, false, [
            '**/vendor/**'
        ]);
        scopedInstance.setApiTypes(t);
        scopedInstance.buildSvgMap();
        expect(scopedInstance.localSvgMap['StarIcon']).toBeUndefined();
    });

    it("should store a __proto__-named import as an ordinary own property, not reassign localSvgMap's own prototype", () => {
        // Read as a dynamic key rather than a literal `'__proto__'` string
        // both to mirror how `localSvgMap` is actually indexed in
        // production (always by a runtime-derived name) and to avoid
        // triggering ESLint's `no-proto` rule, which exists for the
        // opposite reason this test does -- accidental use of the special
        // accessor -- not for deliberately verifying it's been neutralized.
        const protoKey = '__proto__';
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import ${protoKey} from './icon.svg';\nexport default function C() { return <${protoKey} />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(Object.getPrototypeOf(instance.localSvgMap)).toBeNull();
        expect(
            Object.prototype.hasOwnProperty.call(instance.localSvgMap, protoKey)
        ).toBe(true);
        expect(instance.localSvgMap[protoKey].path).toBe(
            path.join(tmpDir, 'icon.svg')
        );
        // A totally unrelated lookup must still behave like a normal missing
        // key, not like a reassigned prototype leaking through.
        expect(instance.localSvgMap['SomethingElse']).toBeUndefined();
    });
});

describe('ReactNativeSVG.buildSvgMap with aliased paths', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-buildsvgmap-alias-')
        );
        fs.mkdirSync(path.join(tmpDir, 'src', 'components'), {
            recursive: true
        });
        fs.writeFileSync(
            path.join(tmpDir, 'src', 'components', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should resolve an aliased import using tsconfig.json baseUrl/paths', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve an aliased import using jsconfig.json baseUrl/paths', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'jsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.jsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve an aliased import using a tsconfig.json that extends a base config', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'base.tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({ extends: './base.tsconfig.json' })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve each of two monorepo subpackages using its OWN nearest tsconfig.json, not whichever one happened to resolve first for the whole scan', () => {
        fs.mkdirSync(path.join(tmpDir, 'packages', 'appA', 'src'), {
            recursive: true
        });
        fs.mkdirSync(path.join(tmpDir, 'packages', 'appB', 'assets'), {
            recursive: true
        });
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appA', 'src', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appB', 'assets', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="80" height="80"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appA', 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@a/*': ['src/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appB', 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@b/*': ['assets/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appA', 'Component.tsx'),
            `import IconA from '@a/icon.svg';\nexport default function A() { return <IconA />; }`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'packages', 'appB', 'Component.tsx'),
            `import IconB from '@b/icon.svg';\nexport default function B() { return <IconB />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['IconA']).toBeDefined();
        expect(instance.localSvgMap['IconA'].path).toBe(
            path.join(tmpDir, 'packages', 'appA', 'src', 'icon.svg')
        );
        expect(instance.localSvgMap['IconB']).toBeDefined();
        expect(instance.localSvgMap['IconB'].path).toBe(
            path.join(tmpDir, 'packages', 'appB', 'assets', 'icon.svg')
        );
    });

    it('should resolve an aliased import using babel-plugin-module-resolver config', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        root: ['./src'],
                        alias: { '@components': './src/components' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve a babel-plugin-module-resolver alias from babel.config.js at the project root even when the scan root (e.g. --path ./src) is a subdirectory of it', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        // babel.config.js lives at the project root, one level above the
        // scan root passed to ReactNativeSVG below. Its alias target is
        // written naturally relative to the project root (where the config
        // file itself lives) -- PathAliasResolver pins module-resolver's
        // `cwd` to whatever directory `loadPartialConfig` actually resolved
        // as the config root, not to its own (possibly narrower) rootDir.
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@components': './src/components' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'src', 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const scanRoot = path.join(tmpDir, 'src');
        const instance = new ReactNativeSVG(scanRoot, scanRoot, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it("should resolve a babel-plugin-module-resolver alias that maps to a real npm package name (rather than a relative/local path), a pattern the library's own README documents", () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        // A real installed "package" the alias points at, so the resolved
        // value (`fake-icon-lib/icon.svg`) is neither absolute nor
        // `./`/`../`-relative -- it can only be found via Node's own module
        // resolution, not by treating it as a filesystem path directly.
        fs.mkdirSync(path.join(tmpDir, 'node_modules', 'fake-icon-lib'), {
            recursive: true
        });
        fs.writeFileSync(
            path.join(tmpDir, 'node_modules', 'fake-icon-lib', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@icons': 'fake-icon-lib' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@icons/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        // `require.resolve` returns the canonicalized (symlink-resolved)
        // path -- e.g. macOS's /tmp -> /private/tmp -- unlike the other
        // resolvers here which just join path strings without touching the
        // filesystem, so compare against the realpath rather than the raw
        // `tmpDir` string.
        expect(instance.localSvgMap['Logo'].path).toBe(
            fs.realpathSync(
                path.join(tmpDir, 'node_modules', 'fake-icon-lib', 'icon.svg')
            )
        );
    });

    it('should resolve a babel-plugin-module-resolver alias to a real npm package .svg file even when the specifier itself omits the extension', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        // The specifier ('@icons/icon', no '.svg') means the alias
        // substitution also lands on an extensionless bare specifier
        // ('fake-icon-lib/icon') -- `require.resolve` alone won't find
        // `icon.svg` for that (it only tries .js/.json/.node by default),
        // so this needs the extension-guessing fallback.
        fs.mkdirSync(path.join(tmpDir, 'node_modules', 'fake-icon-lib'), {
            recursive: true
        });
        fs.writeFileSync(
            path.join(tmpDir, 'node_modules', 'fake-icon-lib', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@icons': 'fake-icon-lib' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@icons/icon';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            fs.realpathSync(
                path.join(tmpDir, 'node_modules', 'fake-icon-lib', 'icon.svg')
            )
        );
    });

    it('should resolve an aliased import using a .babelrc config', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, '.babelrc'),
            JSON.stringify({
                plugins: [
                    [
                        moduleResolverPath,
                        {
                            alias: {
                                '@components': './src/components'
                            }
                        }
                    ]
                ]
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve an aliased import when module-resolver is passed as a function', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `const moduleResolver = require(${JSON.stringify(
                moduleResolverPath
            )});
            module.exports = {
                plugins: [
                    [moduleResolver, {
                        alias: { '@components': './src/components' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should prefer babel-plugin-module-resolver over tsconfig.json when both are configured', () => {
        fs.mkdirSync(path.join(tmpDir, 'alt-components'));
        fs.writeFileSync(
            path.join(tmpDir, 'alt-components', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="1" cy="1" r="1"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['alt-components/*'] }
                }
            })
        );
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@components': './src/components' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should NOT populate localSvgMap for a bare, .svg-suffixed import that no alias mechanism can resolve, rather than fabricate a path relative to the importing file (which would be guaranteed not to exist on disk)', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        expect(() => instance.buildSvgMap()).not.toThrow();

        expect(instance.localSvgMap['Logo']).toBeUndefined();
    });

    it('should NOT populate localSvgMap when a configured alias does not match a file on disk, rather than fabricate a nonexistent path', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@missing/*': ['src/does-not-exist/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@missing/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        expect(() => instance.buildSvgMap()).not.toThrow();

        expect(instance.localSvgMap['Logo']).toBeUndefined();
    });

    it('should still resolve unaliased relative imports normally when alias config is present', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'tsconfig.json'),
            JSON.stringify({
                compilerOptions: {
                    baseUrl: '.',
                    paths: { '@components/*': ['src/components/*'] }
                }
            })
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from './src/components/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve an aliased import whose specifier has no .svg extension (alias points directly at the file)', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@logo';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve an extensionless aliased re-export even when the JSX usage is in a different file (performance guard checks JSX usage project-wide, not per file)', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // The extensionless-aliased import lives in a barrel file with no
        // JSX at all -- only Screen.tsx (a separate file) ever renders it.
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export { default as Logo } from '@logo';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './icons';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace an aliased import through a default re-export (`import X from "@alias"; export default X;`) to a JSX usage in a different file', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `import Logo from '@logo';\nexport default Logo;`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import Icon from './icons';\nexport default function Screen() { return <Icon />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace an aliased import through a sourceless local re-export (`import X from "@alias"; export { X as Y };`) to a JSX usage in a different file', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `import Logo from '@logo';\nexport { Logo as AppLogo };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { AppLogo } from './icons';\nexport default function Screen() { return <AppLogo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace an aliased import through a sourceless local re-export that does NOT rename (`import X from "@alias"; export { X };`) to a JSX usage in a different file', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // No rename here -- the exported name and the local binding name
        // are the same text ('Logo'), which is the common case for a
        // sourceless re-export and the one the fix specifically targets.
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `import Logo from '@logo';\nexport { Logo };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './icons';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace an aliased import through an `export * from` wildcard barrel whose target is itself a NON-renaming sourceless local re-export', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // barrel.ts's own export is a sourceless, non-renaming local
        // re-export of an aliased import -- the wildcard fan-out (an
        // export node) has to hand off into barrel.ts's LOCAL scope (via
        // recordLocalReexportEdges), not stay entirely within the export
        // namespace the way the other wildcard tests do.
        fs.writeFileSync(
            path.join(tmpDir, 'barrel.ts'),
            `import Logo from '@logo';\nexport { Logo };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export * from './barrel';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './icons';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace an aliased import through an `export * from` wildcard barrel to a JSX usage in a different file', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // icons/Icon1.ts named-re-exports the aliased SVG import; icons.ts
        // wildcard-re-exports everything from Icon1.ts under the same name.
        fs.mkdirSync(path.join(tmpDir, 'icons'), { recursive: true });
        fs.writeFileSync(
            path.join(tmpDir, 'icons', 'Icon1.ts'),
            `export { default as Logo } from '@logo';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export * from './icons/Icon1';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './icons';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace through the correct one of TWO `export * from` wildcards on the same barrel file, not just the first one visited', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // icons.ts wildcard-re-exports from BOTH IconsA (which exports
        // nothing named Logo) and IconsB (which does, via the aliased SVG
        // import). The wildcard for IconsA is declared first, so a naive
        // "first wildcard claims the name" implementation would wrongly
        // bind Logo to IconsA's (nonexistent) export and miss IconsB's.
        fs.mkdirSync(path.join(tmpDir, 'icons'), { recursive: true });
        fs.writeFileSync(
            path.join(tmpDir, 'icons', 'IconsA.ts'),
            `export const Unrelated = 1;`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'icons', 'IconsB.ts'),
            `export { default as Logo } from '@logo';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'icons.ts'),
            `export * from './icons/IconsA';\nexport * from './icons/IconsB';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './icons';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace an aliased import through an `export * from` wildcard whose OWN source is itself a bare/aliased specifier (not just a relative path)', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: {
                            '@logo': './src/components/icon.svg',
                            '@icons': './icons'
                        }
                    }]
                ]
            };`
        );
        fs.mkdirSync(path.join(tmpDir, 'icons'), { recursive: true });
        fs.writeFileSync(
            path.join(tmpDir, 'icons', 'index.ts'),
            `export { default as Logo } from '@logo';`
        );
        // The wildcard barrel's own source ('@icons') is a bare/aliased
        // specifier, not a relative path.
        fs.writeFileSync(
            path.join(tmpDir, 'barrel.ts'),
            `export * from '@icons';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './barrel';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should trace an aliased import through a re-export barrel whose target only exists as platform-specific files (e.g. Icon.ios.tsx/Icon.android.tsx, no plain Icon.tsx)', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // Icon.tsx re-exports the aliased SVG import, but only ever exists
        // as platform-split files -- no plain Icon.tsx fallback.
        fs.writeFileSync(
            path.join(tmpDir, 'Icon.ios.tsx'),
            `export { default as Logo } from '@logo';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Icon.android.tsx'),
            `export { default as Logo } from '@logo';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './Icon';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should prefer a platform-specific re-export target (Icon.ios.tsx) over a plain fallback (Icon.tsx) when both exist, matching real Metro resolution order', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: {
                            '@logoIos': './src/components/icon-ios.svg',
                            '@logoPlain': './src/components/icon-plain.svg'
                        }
                    }]
                ]
            };`
        );
        // Both a plain fallback AND a platform-specific variant exist --
        // Metro (and this resolver) must pick the platform-specific one.
        fs.writeFileSync(
            path.join(tmpDir, 'Icon.tsx'),
            `export { default as Logo } from '@logoPlain';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Icon.ios.tsx'),
            `export { default as Logo } from '@logoIos';`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Logo } from './Icon';\nexport default function Screen() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon-ios.svg')
        );
    });

    it('should NOT populate localSvgMap for an extensionless aliased import that is never rendered as JSX anywhere in the project (performance guard skips alias resolution)', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import UnusedLogo from '@logo';\nexport default function C() { return null; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['UnusedLogo']).toBeUndefined();
    });

    it('should NOT resolve an aliased import in one file just because an unrelated, identically-named component is rendered as JSX in a different file (the JSX-usage guard is per-binding, not a project-wide name match)', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@icons/button': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // A real, non-SVG "Button" is imported from an unrelated package and
        // rendered as JSX here -- this must not justify resolving the
        // unrelated aliased "Button" SVG import in IconButton.tsx below,
        // which is never itself rendered as JSX anywhere.
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { Button } from 'some-ui-library';\nexport default function Screen() { return <Button/>; }`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'IconButton.tsx'),
            `import Button from '@icons/button';\nexport default Button;`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Button']).toBeUndefined();
    });

    it("should NOT let a same-file re-export's exported name leak into an unrelated LOCAL import that merely happens to share the same text", () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'svgBarrel.ts'),
            `export { default as Icon } from '@logo';`
        );
        // Screen.tsx has an unrelated LOCAL "Icon" import (a real, non-SVG
        // component) AND separately re-exports a DIFFERENT "Icon" from the
        // SVG barrel above under the exact same name -- valid, non-
        // conflicting ES module syntax, since an `export { X } from
        // './y'` clause never references the importing file's own local
        // scope. The JSX usage below refers only to the local import.
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import Icon from 'some-ui-library';\nexport { Icon } from './svgBarrel';\nexport default function Screen() { return <Icon/>; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Icon']).toBeUndefined();
    });

    it('should only populate localSvgMap for the specific co-imported name proven JSX-reachable, not every name on the same aliased import statement', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@icons': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // A single, extensionless aliased (bare) import statement co-imports
        // two names -- both resolve to the SAME aliased .svg file, since
        // alias resolution operates on the whole import source, not per
        // specifier. Only RealIcon is ever rendered as JSX through this
        // import; UnrelatedName is merely co-imported alongside it.
        fs.writeFileSync(
            path.join(tmpDir, 'Icons.tsx'),
            `import { RealIcon, UnrelatedName } from '@icons';\nexport default function C() { return <RealIcon />; }`
        );
        // A completely unrelated, real (non-SVG) component happens to share
        // the co-imported-but-unused name and IS rendered as JSX elsewhere.
        fs.writeFileSync(
            path.join(tmpDir, 'Screen.tsx'),
            `import { UnrelatedName } from 'some-real-ui-lib';\nexport default function Screen() { return <UnrelatedName/>; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['RealIcon']).toBeDefined();
        expect(instance.localSvgMap['UnrelatedName']).toBeUndefined();
    });

    it('should never attempt alias resolution for a relative or absolute import, even when its name is rendered as JSX (they can never resolve via PathAliasResolver, so deferring them would be pure overhead)', () => {
        const resolveSpy = jest.spyOn(PathAliasResolver.prototype, 'resolve');

        fs.writeFileSync(
            path.join(tmpDir, 'Icon.tsx'),
            `export default function Icon() { return null; }`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Icon from './Icon';\nexport default function C() { return <Icon />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(resolveSpy).not.toHaveBeenCalled();
        expect(instance.localSvgMap['Icon']).toBeUndefined();

        resolveSpy.mockRestore();
    });

    it('should not let one aliased import whose resolution throws abort SVG detection for the rest of the project', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': './src/components/icon.svg' }
                    }]
                ]
            };`
        );
        // @broken is never configured, but the important part is that
        // resolving it throws (simulating a third-party resolver -- e.g.
        // tsconfig-paths' matchPath -- misbehaving on a malformed config)
        // rather than returning null.
        fs.writeFileSync(
            path.join(tmpDir, 'Broken.tsx'),
            `import Broken from '@broken';\nexport default function B() { return <Broken/>; }`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@logo';\nexport default function C() { return <Logo />; }`
        );

        const originalResolve = PathAliasResolver.prototype.resolve;
        const resolveSpy = jest
            .spyOn(PathAliasResolver.prototype, 'resolve')
            .mockImplementation(function (
                this: PathAliasResolver,
                source,
                file
            ) {
                if (source === '@broken') {
                    throw new Error('simulated third-party resolver failure');
                }
                return originalResolve.call(this, source, file);
            } as typeof PathAliasResolver.prototype.resolve);

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);

        expect(() => instance.buildSvgMap()).not.toThrow();
        expect(instance.localSvgMap['Broken']).toBeUndefined();
        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );

        resolveSpy.mockRestore();
    });

    it('should resolve an alias that maps directly to an absolute path', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        const absoluteIconPath = path.join(
            tmpDir,
            'src',
            'components',
            'icon.svg'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@logo': ${JSON.stringify(absoluteIconPath)} }
                    }]
                ]
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@logo';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(absoluteIconPath);
    });

    it('should resolve an aliased import using metro.config.js resolver.extraNodeModules', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        assets: ${JSON.stringify(
                            path.join(tmpDir, 'src', 'components')
                        )}
                    }
                }
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from 'assets/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should resolve a metro.config.js extraNodeModules alias from the project root even when the scan root (e.g. --path ./src) is a subdirectory of it', () => {
        // metro.config.js lives at the project root, one level above the
        // scan root passed to ReactNativeSVG below -- a single lookup
        // inside the scan root alone would miss it.
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        assets: ${JSON.stringify(
                            path.join(tmpDir, 'src', 'components')
                        )}
                    }
                }
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'src', 'Component.tsx'),
            `import Logo from 'assets/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const scanRoot = path.join(tmpDir, 'src');
        const instance = new ReactNativeSVG(scanRoot, scanRoot, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it("should resolve a scoped extraNodeModules alias only when the key matches the full specifier (single subpath segment), mirroring Metro's own parsing", () => {
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        '@assets/icon.svg': ${JSON.stringify(
                            path.join(tmpDir, 'src', 'components', 'icon.svg')
                        )}
                    }
                }
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@assets/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo']).toBeDefined();
        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it("should not match a scoped extraNodeModules alias against a one-slash specifier when the key is only the scope segment, mirroring Metro's own parsing", () => {
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        '@assets': ${JSON.stringify(
                            path.join(tmpDir, 'src', 'components')
                        )}
                    }
                }
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@assets/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        // No extraNodeModules key matches the full '@assets/icon.svg' specifier
        // (per Metro's own parsing, '@assets' alone isn't a match), so this
        // stays unresolved like any other bare specifier no alias mechanism
        // can find a real file for -- not populated in localSvgMap at all.
        expect(instance.localSvgMap['Logo']).toBeUndefined();
    });

    it('should not crash the whole scan when a bare import specifier matches an inherited Object.prototype member (e.g. "constructor/whatever") against a configured extraNodeModules map', () => {
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        assets: ${JSON.stringify(
                            path.join(tmpDir, 'src', 'components')
                        )}
                    }
                }
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Foo from 'constructor/whatever';\nexport default function C() { return <Foo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);

        expect(() => instance.buildSvgMap()).not.toThrow();
        expect(instance.localSvgMap['Foo']).toBeUndefined();
    });

    it('should prefer babel-plugin-module-resolver/tsconfig.json over metro.config.js when both are configured', () => {
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: { '@shared': './src/components' }
                    }]
                ]
            };`
        );
        fs.mkdirSync(path.join(tmpDir, 'other'), { recursive: true });
        fs.writeFileSync(
            path.join(tmpDir, 'other', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        '@shared': ${JSON.stringify(path.join(tmpDir, 'other'))}
                    }
                }
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from '@shared/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );
    });

    it('should pick up an edit to metro.config.js resolver.extraNodeModules after reset(), rather than reusing a require()-cached module', () => {
        fs.mkdirSync(path.join(tmpDir, 'other'), { recursive: true });
        fs.writeFileSync(
            path.join(tmpDir, 'other', 'icon.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        assets: ${JSON.stringify(
                            path.join(tmpDir, 'src', 'components')
                        )}
                    }
                }
            };`
        );
        fs.writeFileSync(
            path.join(tmpDir, 'Component.tsx'),
            `import Logo from 'assets/icon.svg';\nexport default function C() { return <Logo />; }`
        );

        const instance = new ReactNativeSVG(tmpDir, tmpDir, false);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'src', 'components', 'icon.svg')
        );

        // Edit metro.config.js in place (same path -- require()'s module
        // cache is keyed by resolved filename, so this only gets picked up
        // if the cache entry is dropped before re-requiring). jest.resetModules()
        // clears Jest's own sandboxed module registry, which doesn't otherwise
        // track this source's own require.cache manipulation the same way
        // plain Node does -- without it, this test would pass regardless of
        // whether the source actually clears require.cache itself.
        jest.resetModules();
        fs.writeFileSync(
            path.join(tmpDir, 'metro.config.js'),
            `module.exports = {
                resolver: {
                    extraNodeModules: {
                        assets: ${JSON.stringify(path.join(tmpDir, 'other'))}
                    }
                }
            };`
        );

        instance.buildSvgMap();

        expect(instance.localSvgMap['Logo'].path).toBe(
            path.join(tmpDir, 'other', 'icon.svg')
        );
    });
});

describe('ReactNativeSVG end-to-end: same local name aliased to different SVGs across files', () => {
    it('should embed the correct, distinct SVG content for each file when two unrelated files each alias a DIFFERENT SVG under the same local name', () => {
        const tmpDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-svg-collision-')
        );
        const assetsDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-svg-collision-assets-')
        );
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );

        fs.writeFileSync(
            path.join(tmpDir, 'circle.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="red"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'square.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" fill="blue"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: {
                            '@circle-icon': './circle.svg',
                            '@square-icon': './square.svg'
                        }
                    }]
                ]
            };`
        );

        const fileACode =
            "import Icon from '@circle-icon';\nexport default function A() { return <Icon width={24} height={24} />; }";
        const fileBCode =
            "import Icon from '@square-icon';\nexport default function B() { return <Icon width={24} height={24} />; }";
        const fileAPath = path.join(tmpDir, 'FileA.tsx');
        const fileBPath = path.join(tmpDir, 'FileB.tsx');
        fs.writeFileSync(fileAPath, fileACode);
        fs.writeFileSync(fileBPath, fileBCode);

        // One shared ReactNativeSVG instance and one buildSvgMap() scan --
        // exactly how a real build reuses it across every file compiled in
        // the same session (see src/index.ts's `pre()` hook).
        const instance = new ReactNativeSVG(tmpDir, assetsDir);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        const transformOpts = {
            presets: ['@babel/preset-react', '@babel/preset-typescript'],
            plugins: [
                [
                    plugin,
                    {
                        sessionReplay: { svgTracking: true },
                        __internal_reactNativeSVG: instance
                    }
                ]
            ],
            configFile: false
        };

        const outputA = transform(fileACode, {
            ...transformOpts,
            filename: fileAPath
        })?.code as string;
        const outputB = transform(fileBCode, {
            ...transformOpts,
            filename: fileBPath
        })?.code as string;

        const hashA = outputA.match(/hash:\s*["']([0-9a-f]{32})["']/i)?.[1];
        const hashB = outputB.match(/hash:\s*["']([0-9a-f]{32})["']/i)?.[1];
        expect(hashA).toBeTruthy();
        expect(hashB).toBeTruthy();

        const contentA = fs.readFileSync(
            path.join(assetsDir, `${hashA}.svg`),
            'utf8'
        );
        const contentB = fs.readFileSync(
            path.join(assetsDir, `${hashB}.svg`),
            'utf8'
        );

        // FileA aliased Icon to circle.svg -- must never end up with
        // FileB's square, and vice versa. svgo's optimizer converts the
        // <rect> into an equivalent <path> as part of its default preset,
        // so check for the shape actually surviving optimization (a
        // `<circle>`) landing on the right file, rather than assuming the
        // original tag names remain verbatim in the optimized output.
        expect(contentA).toContain('circle');
        expect(contentB).not.toContain('circle');
        expect(contentA).not.toBe(contentB);
    });

    it('should resolve a local import correctly even when the same file also re-exports an unrelated SVG under the identical name (local scope and export table are separate namespaces)', () => {
        const tmpDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-svg-collision-')
        );
        const assetsDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-svg-collision-assets-')
        );
        const moduleResolverPath = require.resolve(
            'babel-plugin-module-resolver'
        );

        fs.writeFileSync(
            path.join(tmpDir, 'circle.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="red"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'square.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" fill="blue"/></svg>'
        );
        fs.writeFileSync(
            path.join(tmpDir, 'babel.config.js'),
            `module.exports = {
                plugins: [
                    [${JSON.stringify(moduleResolverPath)}, {
                        alias: {
                            '@circle-icon': './circle.svg',
                            '@square-icon': './square.svg'
                        }
                    }]
                ]
            };`
        );

        // SameFile both LOCALLY imports Icon (from circle.svg) and
        // separately re-exports an unrelated Icon (from square.svg) under
        // its own export table -- two different namespaces that happen to
        // share a name. Its own JSX unambiguously refers to the local
        // import; the re-export only matters to another file that imports
        // {Icon} from SameFile, never to SameFile's own scope.
        const sameFileCode =
            "import Icon from '@circle-icon';\nexport { default as Icon } from '@square-icon';\nexport default function SameFile() { return <Icon width={24} height={24} />; }";
        // OtherFile is what makes the re-export actually reachable (and
        // therefore populated at all) -- without a cross-file consumer,
        // the performance guard would skip resolving '@square-icon'
        // entirely.
        const otherFileCode =
            "import { Icon } from './SameFile';\nexport default function OtherFile() { return <Icon width={24} height={24} />; }";
        const sameFilePath = path.join(tmpDir, 'SameFile.tsx');
        const otherFilePath = path.join(tmpDir, 'OtherFile.tsx');
        fs.writeFileSync(sameFilePath, sameFileCode);
        fs.writeFileSync(otherFilePath, otherFileCode);

        const instance = new ReactNativeSVG(tmpDir, assetsDir);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        const outputSameFile = transform(sameFileCode, {
            presets: ['@babel/preset-react', '@babel/preset-typescript'],
            plugins: [
                [
                    plugin,
                    {
                        sessionReplay: { svgTracking: true },
                        __internal_reactNativeSVG: instance
                    }
                ]
            ],
            configFile: false,
            filename: sameFilePath
        })?.code as string;

        const hash = outputSameFile.match(
            /hash:\s*["']([0-9a-f]{32})["']/i
        )?.[1];
        expect(hash).toBeTruthy();

        const content = fs.readFileSync(
            path.join(assetsDir, `${hash}.svg`),
            'utf8'
        );

        // SameFile's own `<Icon/>` must resolve to its LOCAL import
        // (circle.svg), never to the unrelated re-export (square.svg) that
        // merely happens to share the same exported name.
        expect(content).toContain('circle');
    });

    it("should NOT let a completely unrelated file's real, non-SVG component be misidentified as an SVG just because some OTHER, disconnected file legitimately aliases a DIFFERENT component under the same local name", () => {
        const tmpDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-svg-collision-')
        );
        const assetsDir = fs.mkdtempSync(
            path.join(os.tmpdir(), 'dd-svg-collision-assets-')
        );

        fs.writeFileSync(
            path.join(tmpDir, 'circle.svg'),
            '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="red"/></svg>'
        );

        // FileB legitimately aliases (a direct relative import here, but
        // the same risk applies to any resolution mechanism) a real SVG
        // under the name "Icon", and renders it -- this is what proves
        // the name reachable and gets it written to the flat
        // `localSvgMap`.
        const fileBCode =
            "import Icon from './circle.svg';\nexport default function B() { return <Icon width={24} height={24} />; }";
        // FileA has NO relationship to FileB whatsoever -- its own "Icon"
        // is a real, unrelated component from some other library. It
        // just happens to share the exact same local name.
        const fileACode =
            "import Icon from 'some-real-ui-lib';\nexport default function A() { return <Icon/>; }";
        const fileBPath = path.join(tmpDir, 'FileB.tsx');
        const fileAPath = path.join(tmpDir, 'FileA.tsx');
        fs.writeFileSync(fileBPath, fileBCode);
        fs.writeFileSync(fileAPath, fileACode);

        const instance = new ReactNativeSVG(tmpDir, assetsDir);
        instance.setApiTypes(t);
        instance.buildSvgMap();

        // The flat map still carries FileB's entry (backward-compatible,
        // documented residual imprecision) -- the bug is specifically
        // whether FileA's own JSX inherits it.
        expect(instance.localSvgMap['Icon']).toBeDefined();

        const outputFileA = transform(fileACode, {
            presets: ['@babel/preset-react', '@babel/preset-typescript'],
            plugins: [
                [
                    plugin,
                    {
                        sessionReplay: { svgTracking: true },
                        __internal_reactNativeSVG: instance
                    }
                ]
            ],
            configFile: false,
            filename: fileAPath
        })?.code as string;

        // FileA's unrelated `<Icon/>` must be left completely untouched --
        // never wrapped in SessionReplayView.Privacy, never given FileB's
        // circle.svg content, since it has no traceable relationship to
        // FileB at all.
        expect(outputFileA).not.toContain('SessionReplayView');
        expect(outputFileA).not.toMatch(/hash:\s*["'][0-9a-f]{32}["']/i);
    });
});
