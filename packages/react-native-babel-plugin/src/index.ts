/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as Babel from '@babel/core';
import generate from '@babel/generator';
import { v4 as uuidv4 } from 'uuid';

import fs from 'fs';
import pathFS from 'path';

import { declare } from '@babel/helper-plugin-utils';

import { insertSetupFlag, loadImportMap } from './actions/global';
import { handleRumActions, insertRumActionImport } from './actions/rum';
import type {
    PluginAPI,
    PluginOptions,
    PluginPassState,
    PluginResult
} from './types';
import { getFileInfo, getNodeName } from './utils/index';
import {
    jSXAttribute,
    jSXIdentifier,
    jsxAttribute,
    stringLiteral
} from '@babel/types';

function kebabCase(str: string) {
    const KEBAB_REGEX = /\p{Lu}/gu;
    const result = str.replace(KEBAB_REGEX, match => `-${match.toLowerCase()}`);

    return result.startsWith('-') ? result.slice(1) : result;
}

const svgMap: Record<string, { file: string; [key: string]: string }> = {};

const getPath = () =>
    !process.env.pluginDev
        ? pathFS.resolve(
              // 'node_modules/@datadog/mobile-react-native-babel-plugin'
              'node_modules/@datadog/mobile-react-native-session-replay'
          )
        : pathFS.resolve('.');

export default declare(
    (
        api: PluginAPI,
        _options: PluginOptions,
        _dirname: string
    ): PluginResult => {
        api.assertVersion(7);

        return {
            visitor: {
                Program: {
                    enter(path, state) {
                        const pluginState: PluginPassState = state;

                        // svgMap = {};
                        if (!pluginState.pluginInitialiazed) {
                            pluginState.pluginInitialiazed = true;
                            // console.log(
                            //     '**Plugin initialized**',
                            //     pluginState.pluginInitialiazed
                            // );

                            // console.log('getPath(): ', getPath());
                            // const fileExists = fs.existsSync(`${getPath()}/test.json`);
                            // if (fileExists) {
                            //     fs.rmSync(`${getPath()}/test.json`);
                            //     console.log('***Removed file***');
                            // }
                            // pathFS.resolve
                        }

                        const { path: p, name } = getFileInfo(this);

                        pluginState.fileInfo = { path: p, name };
                        insertSetupFlag(path, api.types);
                        loadImportMap(path, api.types, pluginState);
                    },
                    exit(path, state) {
                        const pluginState: PluginPassState = state;
                        const t = api.types;

                        if (pluginState.hasValidTapAction) {
                            insertRumActionImport(t, path);
                        }

                        let json = {};
                        try {
                            const fileExists = fs.existsSync(
                                `${getPath()}/test.json`
                            );

                            if (fileExists) {
                                const data = fs.readFileSync(
                                    `${getPath()}/test.json`,
                                    {
                                        encoding: 'utf8'
                                    }
                                );

                                json = data ? JSON.parse(data) : {};
                            }
                        } catch (error) {
                            console.log('***Error***', error);
                            json = {};
                        }

                        // console.log('***Writting test.json***');
                        fs.writeFileSync(
                            `${getPath()}/test.json`,
                            JSON.stringify({ ...svgMap, ...json }, null, 2),
                            'utf8'
                        );
                    }
                },
                JSXAttribute(path, state) {
                    const pluginState: PluginPassState = state;
                    handleRumActions(api.types, path, pluginState);
                },
                JSXElement(path, state) {
                    const pluginState: PluginPassState = state;
                    if (pluginState.fileInfo?.path?.includes('node_modules')) {
                        return;
                    }

                    // console.log(`path: ${path}, state: ${state}`);
                    const t = api.types;
                    // console.log('Path.node: ', path.node.openingElement);
                    const nodeName = getNodeName(t, path.node.openingElement);

                    // TODO: what happens if parts of the SVG are somewhere outside the code ?
                    // What happens when all of the SVG is outside the code ?
                    if (nodeName !== 'Svg') {
                        return;
                    }

                    console.log(
                        'FIle: ',
                        pluginState.fileInfo?.path,
                        pluginState.fileInfo?.name
                    );

                    const clone = t.cloneNode(path.node, true);

                    clone.openingElement.attributes.push(
                        jsxAttribute(
                            jSXIdentifier('xmlns'),
                            stringLiteral('http://www.w3.org/2000/svg')
                        )
                    );

                    const svgDimensions: Record<string, string> = {};

                    const transformElement = (el: Babel.types.JSXElement) => {
                        const tagNameNode = el.openingElement.name;
                        if (t.isJSXIdentifier(tagNameNode)) {
                            if (['LinearGradient'].includes(tagNameNode.name)) {
                                tagNameNode.name = `${tagNameNode.name
                                    .slice(0, 1)
                                    .toLowerCase()}${tagNameNode.name.slice(
                                    1
                                )}`;
                            } else {
                                tagNameNode.name = tagNameNode.name.toLowerCase();
                            }
                        }

                        if (
                            el.closingElement?.name &&
                            t.isJSXIdentifier(el.closingElement.name)
                        ) {
                            if (
                                ['LinearGradient'].includes(
                                    el.closingElement.name.name
                                )
                            ) {
                                el.closingElement.name.name = `${el.closingElement.name.name
                                    .slice(0, 1)
                                    .toLowerCase()}${el.closingElement.name.name.slice(
                                    1
                                )}`;
                            } else {
                                el.closingElement.name.name = el.closingElement?.name.name.toLowerCase();
                            }
                        }

                        for (const [
                            index,
                            attr
                        ] of el.openingElement.attributes.entries()) {
                            if (!t.isJSXAttribute(attr)) {
                                continue;
                            }

                            if (!t.isJSXIdentifier(attr.name)) {
                                continue;
                            }

                            if (attr.name.name === 'viewBox') {
                                continue;
                            }

                            if (attr.name.name === '__self') {
                                el.openingElement.attributes.splice(index, 1);
                                continue;
                            }

                            attr.name.name = kebabCase(attr.name.name);
                            // TODO: support this syntax <Svg width={100} height={100} instead of just width="100" height="100"
                            if (
                                ['width', 'height'].includes(attr.name.name) &&
                                t.isStringLiteral(attr.value)
                            ) {
                                console.log(
                                    '*** ATTR.name: ',
                                    attr.name.name,
                                    attr.value.value
                                );
                                if (+attr.value.value) {
                                    // TODO: handle dimensions for percentages as well
                                    svgDimensions[attr.name.name] =
                                        attr.value.value;

                                    attr.value = t.stringLiteral(
                                        `${attr.value.value}px`
                                    );
                                }
                            }
                        }

                        for (const child of el.children) {
                            if (t.isJSXElement(child)) {
                                transformElement(child);
                            }
                        }
                    };

                    transformElement(clone);

                    // TODO: handle the scenario where nativeID may already be set, if so, use that instead
                    const id = uuidv4();
                    const output = generate(clone).code;
                    console.log('Output: ', output);
                    svgMap[id] = {
                        file: encodeSvgToBase64(output),
                        // file: output,
                        ...svgDimensions
                    };
                    // svgMap[id] = output;
                    console.log('SVG_Map: ', svgMap);

                    path.node.openingElement.attributes.push(
                        jSXAttribute(
                            jSXIdentifier('nativeID'),
                            stringLiteral(id)
                        )
                    );

                    console.log('path.node: ', path.node);
                    // console.log('Clone: ', clone);
                    // console.log(`Nodename: ${nodeName}`);
                    // console.log('Output: ', output);
                }
            }
        };
    }
);

function shouldEncodeSvg(svg: string): boolean {
    const pathCount = (svg.match(/<path[\s>]/g) || []).length;
    const totalLength = svg.length;

    return totalLength > 5000 || pathCount > 20;
}

function encodeSvgToBase64(svgString: string): string {
    const cleanedSvg = svgString
        .replace(/\n+/g, '')
        .replace(/\t+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

    if (!shouldEncodeSvg(cleanedSvg)) {
        return cleanedSvg;
    }

    const base64 = Buffer.from(cleanedSvg, 'utf8').toString('base64');
    return base64;
    // return `data:image/svg+xml;base64,${base64}`;
}
