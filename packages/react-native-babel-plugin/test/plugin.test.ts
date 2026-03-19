/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0. This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { transform } from '@babel/core';

import plugin from '../src/index';
import type { PluginOptions } from '../src/types';

function transformCode(code: string, pluginOptions?: Partial<PluginOptions>) {
    const defaultOptions: PluginOptions = {
        actionNameAttribute: 'example-button-prop',
        components: {
            useContent: true,
            useNamePrefix: true,
            tracked: []
        },
        sessionReplay: {
            svgTracking: false
        }
    };

    const options = {
        ...defaultOptions,
        ...pluginOptions,
        components: {
            ...defaultOptions.components,
            ...pluginOptions?.components
        },
        sessionReplay: {
            ...defaultOptions.sessionReplay,
            ...pluginOptions?.sessionReplay
        }
    };

    return transform(code, {
        filename: 'file.tsx',
        presets: ['@babel/preset-react', '@babel/preset-typescript'],
        plugins: [[plugin, options]],
        configFile: false
    })?.code;
}

describe('Babel plugin: initialization', () => {
    it('should set a global flag signaling the plugin is enabled', () => {
        const output = transformCode('');
        expect(output).toMatchInlineSnapshot(
            '"globalThis.__DD_RN_BABEL_PLUGIN_ENABLED__ = true;"'
        );
    });
});

describe('Babel plugin: wrap interaction handlers for RUM', () => {
    it('should not wrap unsupported property (onClick) on supported element (Button)', () => {
        const input = `
            import { Button } from 'react-native';
            <Button color="red" onClick={func} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { Button } from 'react-native';
            /*#__PURE__*/React.createElement(Button, {
              color: "red",
              onClick: func
            });"
        `);
    });

    it('should wrap supported property (onPress) on supported element (Button)', () => {
        const input = `
            import { Button } from 'react-native';
            <Button color="red" onPress={func} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Button } from 'react-native';
            /*#__PURE__*/React.createElement(Button, {
              color: "red",
              onPress: (...args) => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(func, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [...args],
                  "componentName": "Button"
                })(...args);else return func(...args);
              }
            });"
        `);
    });

    it('should wrap supported property (onFocus) on supported element (TextInput)', () => {
        const input = `
            import { TextInput } from 'react-native';
            <TextInput
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                onFocus={() => { console.log('test'); }}
            />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { TextInput } from 'react-native';
            /*#__PURE__*/React.createElement(TextInput, {
              placeholder: "Enter username",
              value: username,
              onChangeText: setUsername,
              style: styles.input,
              onFocus: () => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => {
                  console.log('test');
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "TextInput"
                })();else return (() => {
                  console.log('test');
                })();
              }
            });"
        `);
    });

    it('should add mandatory property (onFocus) on supported element (TextInput) when not present', () => {
        const input = `
            import { TextInput } from 'react-native';
            <TextInput
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
            />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { TextInput } from 'react-native';
            /*#__PURE__*/React.createElement(TextInput, {
              placeholder: "Enter username",
              value: username,
              onChangeText: setUsername,
              style: styles.input,
              onFocus: () => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => {}, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "TextInput"
                })();else return (() => {})();
              }
            });"
        `);
    });

    it('should not add mandatory property (onFocus) on supported element (TextInput) when not present if there`s options tracked component with the same name', () => {
        const options: Partial<PluginOptions> = {
            components: {
                useContent: true,
                useNamePrefix: true,
                tracked: [
                    {
                        name: 'TextInput',
                        handlers: [{ event: 'onFocus', action: 'TAP' }]
                    }
                ]
            }
        };

        const input = `
            import { TextInput } from 'react-native';
            <TextInput
                placeholder="Enter username"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
            />
        `;
        const output = transformCode(input, options);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { TextInput } from 'react-native';
            /*#__PURE__*/React.createElement(TextInput, {
              placeholder: "Enter username",
              value: username,
              onChangeText: setUsername,
              style: styles.input
            });"
        `);
    });

    it('should not add property (onFocus) on supported element (TextInput) when spreading props', () => {
        const input = `
            import { TextInput } from 'react-native';
            <TextInput {...props} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { TextInput } from 'react-native';
            /*#__PURE__*/React.createElement(TextInput, props);"
        `);
    });

    it('should wrap existing (onFocus) on supported element (TextInput) when spreading props', () => {
        const input = `
            import { TextInput } from 'react-native';
            <TextInput {...props} onFocus={() => console.log('Focused')}/>
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
            import { TextInput } from 'react-native';
            /*#__PURE__*/React.createElement(TextInput, _extends({}, props, {
              onFocus: () => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => console.log('Focused'), "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "TextInput"
                })();else return (() => console.log('Focused'))();
              }
            }));"
        `);
    });

    it('should not add property (onFocus) on custom element (TextInput) when not present', () => {
        const input = `
            import { TextInput } from './TextInput';
            <TextInput />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { TextInput } from './TextInput';
            /*#__PURE__*/React.createElement(TextInput, null);"
        `);
    });

    it('should not add property (onFocus) on custom element (TextInput - not tracked) when spreading props', () => {
        const input = `
            import { TextInput } from './TextInput';
            <TextInput {...props} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { TextInput } from './TextInput';
            /*#__PURE__*/React.createElement(TextInput, props);"
        `);
    });

    it('should not add property (onFocus) on custom element (TextInput - tracked) when spreading props', () => {
        const options: Partial<PluginOptions> = {
            components: {
                useContent: true,
                useNamePrefix: true,
                tracked: [
                    {
                        name: 'TextInput',
                        handlers: [{ event: 'onFocus', action: 'TAP' }]
                    }
                ]
            }
        };
        const input = `
            import { TextInput } from './TextInput';
            <TextInput {...props} />
        `;
        const output = transformCode(input, options);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { TextInput } from './TextInput';
            /*#__PURE__*/React.createElement(TextInput, props);"
        `);
    });

    it('should not wrap existing (onFocus) on custom element (TextInput - not tracked) when spreading props', () => {
        // Since it's a custom not-tracked component, the plugin doesn't know if this handler should be wraaped or not
        const input = `
            import { TextInput } from './TextInput';
            <TextInput {...props} onFocus={() => console.log('Focused')}/>
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
            import { TextInput } from './TextInput';
            /*#__PURE__*/React.createElement(TextInput, _extends({}, props, {
              onFocus: () => console.log('Focused')
            }));"
        `);
    });

    it('should wrap existing (onFocus) on custom element (TextInput - tracked) when spreading props', () => {
        // Since it's a custom tracked component, the plugin knows which handler to track
        const options: Partial<PluginOptions> = {
            components: {
                useContent: true,
                useNamePrefix: true,
                tracked: [
                    {
                        name: 'TextInput',
                        handlers: [{ event: 'onFocus', action: 'TAP' }]
                    }
                ]
            }
        };

        const input = `
            import { TextInput } from './TextInput';
            <TextInput {...props} onFocus={() => console.log('Focused')}/>
        `;

        const output = transformCode(input, options);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
            import { TextInput } from './TextInput';
            /*#__PURE__*/React.createElement(TextInput, _extends({}, props, {
              onFocus: () => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => console.log('Focused'), "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "TextInput"
                })();else return (() => console.log('Focused'))();
              }
            }));"
        `);
    });

    it('should wrap arrow function with one argument', () => {
        const input = `
            import { Pressable } from 'react-native';
            <Pressable onPress={(event) => {
                console.log('Testing: ', event);
            }} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: event => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(event => {
                  console.log('Testing: ', event);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [event],
                  "componentName": "Pressable"
                })(event);else return (event => {
                  console.log('Testing: ', event);
                })(event);
              }
            });"
        `);
    });

    it('should not wrap existing (onFocus) on custom element (TextInput - tracked) when spreading props', () => {
        // Since it's a custom not-tracked component, the plugin doesn't know if this handler should be wraaped or not
        const input = `
            import { TextInput } from './TextInput';
            <TextInput {...props} onFocus={() => console.log('Focused')}/>
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
            import { TextInput } from './TextInput';
            /*#__PURE__*/React.createElement(TextInput, _extends({}, props, {
              onFocus: () => console.log('Focused')
            }));"
        `);
    });

    it('should wrap existing (onFocus) on custom element (TextInput - tracked) when spreading props', () => {
        // Since it's a custom tracked component, the plugin knows which handler to track
        const options: Partial<PluginOptions> = {
            components: {
                useContent: true,
                useNamePrefix: true,
                tracked: [
                    {
                        name: 'TextInput',
                        handlers: [{ event: 'onFocus', action: 'TAP' }]
                    }
                ]
            }
        };

        const input = `
            import { TextInput } from './TextInput';
            <TextInput {...props} onFocus={() => console.log('Focused')}/>
        `;

        const output = transformCode(input, options);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
            import { TextInput } from './TextInput';
            /*#__PURE__*/React.createElement(TextInput, _extends({}, props, {
              onFocus: () => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => console.log('Focused'), "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "TextInput"
                })();else return (() => console.log('Focused'))();
              }
            }));"
        `);
    });

    it('should wrap arrow function with one argument', () => {
        const input = `
            import { Pressable } from 'react-native';
            <Pressable onPress={(event) => {
                console.log('Testing: ', event);
            }} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: event => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(event => {
                  console.log('Testing: ', event);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [event],
                  "componentName": "Pressable"
                })(event);else return (event => {
                  console.log('Testing: ', event);
                })(event);
              }
            });"
        `);
    });

    it('should wrap arrow function with multiple arguments', () => {
        const input = `
            import { Pressable } from 'react-native';
            <Pressable onPress={(test1, test2) => {
                console.log('Test1: ', test1);
                console.log('Test2: ', test2);
            }} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: (test1, test2) => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction((test1, test2) => {
                  console.log('Test1: ', test1);
                  console.log('Test2: ', test2);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [test1, test2],
                  "componentName": "Pressable"
                })(test1, test2);else return ((test1, test2) => {
                  console.log('Test1: ', test1);
                  console.log('Test2: ', test2);
                })(test1, test2);
              }
            });"
        `);
    });

    it('should wrap named arrow function reference', () => {
        const input = `
            import { Pressable } from 'react-native';
            const func = event => {
                console.log('Testing: ', event);
            };
            <Pressable color="red" onPress={func} />;
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            const func = event => {
              console.log('Testing: ', event);
            };
            /*#__PURE__*/React.createElement(Pressable, {
              color: "red",
              onPress: (...args) => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(func, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [...args],
                  "componentName": "Pressable"
                })(...args);else return func(...args);
              }
            });"
        `);
    });

    it('should wrap traditional function reference', () => {
        const input = `
            import { Pressable } from 'react-native';
            function func3() {
                console.log('Testing 3');
            }
            <Pressable color="red" onPress={func3} />;
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            function func3() {
              console.log('Testing 3');
            }
            /*#__PURE__*/React.createElement(Pressable, {
              color: "red",
              onPress: (...args) => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(func3, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [...args],
                  "componentName": "Pressable"
                })(...args);else return func3(...args);
              }
            });"
        `);
    });

    it('should wrap arrow function with default + rest args using spread call', () => {
        const input = `
            import { Pressable } from 'react-native';
            function a(event, data = 1, ...rest) {
                console.log(event, data, rest);
            }
            <Pressable onPress={a} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            function a(event, data = 1, ...rest) {
              console.log(event, data, rest);
            }
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: (...args) => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(a, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [...args],
                  "componentName": "Pressable"
                })(...args);else return a(...args);
              }
            });"
        `);
    });

    it('should wrap arrow function with destructured param', () => {
        const input = `
            import { Pressable } from 'react-native';
            <Pressable onPress={({ nativeEvent }) => {
                console.log(nativeEvent);
            }} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: _dd_arg0 => {
                const {
                  nativeEvent
                } = _dd_arg0;
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(({
                  nativeEvent
                }) => {
                  console.log(nativeEvent);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [_dd_arg0],
                  "componentName": "Pressable"
                })(_dd_arg0);else return (({
                  nativeEvent
                }) => {
                  console.log(nativeEvent);
                })(_dd_arg0);
              }
            });"
        `);
    });

    it('should wrap arrow function with mixed destructured and rest parameters', () => {
        const input = `
            import { Pressable } from 'react-native';
            <Pressable onPress={({ nativeEvent }, extra, [x, y], ...rest) => {
              console.log(nativeEvent, extra, x, y, rest);
            }} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: (_dd_arg0, extra, _dd_arg2, ...rest) => {
                const {
                  nativeEvent
                } = _dd_arg0;
                const [x, y] = _dd_arg2;
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(({
                  nativeEvent
                }, extra, [x, y], ...rest) => {
                  console.log(nativeEvent, extra, x, y, rest);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [_dd_arg0, extra, _dd_arg2, ...rest],
                  "componentName": "Pressable"
                })(_dd_arg0, extra, _dd_arg2, ...rest);else return (({
                  nativeEvent
                }, extra, [x, y], ...rest) => {
                  console.log(nativeEvent, extra, x, y, rest);
                })(_dd_arg0, extra, _dd_arg2, ...rest);
              }
            });"
        `);
    });

    it('should wrap arrow function with default parameter', () => {
        const input = `
            import { Pressable } from 'react-native';
            <Pressable onPress={(event, context = 'default') => {
              console.log(event, context);
            }} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: (event, context = 'default') => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction((event, context = 'default') => {
                  console.log(event, context);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [event, context],
                  "componentName": "Pressable"
                })(event, context);else return ((event, context = 'default') => {
                  console.log(event, context);
                })(event, context);
              }
            });"
        `);
    });

    it('should wrap arrow function with default value inside destructured param', () => {
        const input = `
            import { Pressable } from 'react-native';
            <Pressable onPress={({ x = 1 }) => {
              console.log(x);
            }} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            /*#__PURE__*/React.createElement(Pressable, {
              onPress: _dd_arg0 => {
                const {
                  x = 1
                } = _dd_arg0;
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(({
                  x = 1
                }) => {
                  console.log(x);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [_dd_arg0],
                  "componentName": "Pressable"
                })(_dd_arg0);else return (({
                  x = 1
                }) => {
                  console.log(x);
                })(_dd_arg0);
              }
            });"
        `);
    });

    it('should wrap arrow function on function defined outside component', () => {
        const input = `
            import { Pressable } from 'react-native';

            const handler = test => {
                console.log('Testing ', test);
            };

            function MyComponent() { 
                return(
                    <Pressable color="red" onPress={handler} />
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            const handler = test => {
              console.log('Testing ', test);
            };
            function MyComponent() {
              return /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: (...args) => {
                  if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(handler, "TAP", {
                    "options": {
                      "useContent": true,
                      "useNamePrefix": true
                    },
                    "getContent": () => {
                      return __ddExtractText(_jsx(_Fragment, {}), []);
                    },
                    "handlerArgs": [...args],
                    "componentName": "Pressable"
                  })(...args);else return handler(...args);
                }
              });
            }"
        `);
    });

    it('should wrap arrow function on function defined outside the file (assumed global)', () => {
        const input = `
            import { Pressable } from 'react-native';

            function MyComponent() { 
                return(
                    <Pressable color="red" onPress={handler} />
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            function MyComponent() {
              return /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: (...args) => {
                  if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(handler, "TAP", {
                    "options": {
                      "useContent": true,
                      "useNamePrefix": true
                    },
                    "getContent": () => {
                      return __ddExtractText(_jsx(_Fragment, {}), []);
                    },
                    "handlerArgs": [...args],
                    "componentName": "Pressable"
                  })(...args);else return handler(...args);
                }
              });
            }"
        `);
    });

    it('should wrap arrow function on function defined in `globalThis`', () => {
        const input = `
            import { Pressable } from 'react-native';

            function MyComponent() { 
                return(
                    <Pressable color="red" onPress={globalThis.handler} />
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Pressable } from 'react-native';
            function MyComponent() {
              return /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: (...args) => {
                  if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(globalThis.handler, "TAP", {
                    "options": {
                      "useContent": true,
                      "useNamePrefix": true
                    },
                    "getContent": () => {
                      return __ddExtractText(_jsx(_Fragment, {}), []);
                    },
                    "handlerArgs": [...args],
                    "componentName": "Pressable"
                  })(...args);else return globalThis.handler(...args);
                }
              });
            }"
        `);
    });

    it('should wrap arrow function when given function reference as prop', () => {
        const input = `
            import React from 'react';
            import { View, Pressable } from 'react-native';

            function MyComponent(props) { 
                return(
                    <View>
                        <Pressable color="red" onPress={props.onPress} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Pressable } from 'react-native';
            function MyComponent(props) {
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: (...args) => {
                  if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(props.onPress, "TAP", {
                    "options": {
                      "useContent": true,
                      "useNamePrefix": true
                    },
                    "getContent": () => {
                      return __ddExtractText(_jsx(_Fragment, {}), []);
                    },
                    "handlerArgs": [...args],
                    "componentName": "Pressable"
                  })(...args);else return props.onPress(...args);
                }
              }));
            }"
        `);
    });

    it('should wrap arrow function when given function reference as prop destructure', () => {
        const input = `
            import React from 'react';
            import { View, Pressable } from 'react-native';

            function MyComponent({item, onPress}) { 
                return(
                    <View>
                        <Pressable color="red" onPress={onPress} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Pressable } from 'react-native';
            function MyComponent({
              item,
              onPress
            }) {
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: (...args) => {
                  if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(onPress, "TAP", {
                    "options": {
                      "useContent": true,
                      "useNamePrefix": true
                    },
                    "getContent": () => {
                      return __ddExtractText(_jsx(_Fragment, {}), []);
                    },
                    "handlerArgs": [...args],
                    "componentName": "Pressable"
                  })(...args);else return onPress(...args);
                }
              }));
            }"
        `);
    });

    it('should wrap arrow function when given function reference as prop with arguments', () => {
        const input = `
            import React from 'react';
            import { View, Pressable } from 'react-native';

            function MyComponent({item, onPress}) { 
                return(
                    <View>
                        <Pressable color="red" onPress={() => onPress(item.id)} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Pressable } from 'react-native';
            function MyComponent({
              item,
              onPress
            }) {
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: () => {
                  if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => onPress(item.id), "TAP", {
                    "options": {
                      "useContent": true,
                      "useNamePrefix": true
                    },
                    "getContent": () => {
                      return __ddExtractText(_jsx(_Fragment, {}), []);
                    },
                    "handlerArgs": [],
                    "componentName": "Pressable"
                  })();else return (() => onPress(item.id))();
                }
              }));
            }"
        `);
    });

    it('should wrap arrow function on Button with arrow function handler inside class component', () => {
        const input = `
            import React from 'react';
            import { View, Button } from 'react-native';

            class MyClassComponent2 extends Component {
              handlePress = () => {
                Alert.alert('Button Pressed', 'You pressed the button!');
              };

              render() {
                return (
                  <View style={{borderWidth: 1, padding: 5}}>
                    <Button title="Press Me" onPress={() => this.handlePress()} />
                  </View>
                );
              }
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Button } from 'react-native';
            class MyClassComponent2 extends Component {
              handlePress = () => {
                Alert.alert('Button Pressed', 'You pressed the button!');
              };
              render() {
                return /*#__PURE__*/React.createElement(View, {
                  style: {
                    borderWidth: 1,
                    padding: 5
                  }
                }, /*#__PURE__*/React.createElement(Button, {
                  title: "Press Me",
                  onPress: () => {
                    if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => this.handlePress(), "TAP", {
                      "options": {
                        "useContent": true,
                        "useNamePrefix": true
                      },
                      "getContent": () => {
                        return __ddExtractText(_jsx(_Fragment, {}), ["Press Me"]);
                      },
                      "handlerArgs": [],
                      "componentName": "Button"
                    })();else return (() => this.handlePress())();
                  }
                }));
              }
            }"
        `);
    });

    it('should wrap arrow function on Button with function reference handler inside class component', () => {
        const input = `
            import React from 'react';
            import { View, Button } from 'react-native';

            class MyClassComponent extends Component {
              handlePress = () => {
                Alert.alert('Button Pressed', 'You pressed the button!');
              };

              render() {
                return (
                  <View style={{borderWidth: 1, padding: 5}}>
                    <Button title="Press Me" onPress={this.handlePress} />
                  </View>
                );
              }
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Button } from 'react-native';
            class MyClassComponent extends Component {
              handlePress = () => {
                Alert.alert('Button Pressed', 'You pressed the button!');
              };
              render() {
                return /*#__PURE__*/React.createElement(View, {
                  style: {
                    borderWidth: 1,
                    padding: 5
                  }
                }, /*#__PURE__*/React.createElement(Button, {
                  title: "Press Me",
                  onPress: (...args) => {
                    if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(this.handlePress, "TAP", {
                      "options": {
                        "useContent": true,
                        "useNamePrefix": true
                      },
                      "getContent": () => {
                        return __ddExtractText(_jsx(_Fragment, {}), ["Press Me"]);
                      },
                      "handlerArgs": [...args],
                      "componentName": "Button"
                    })(...args);else return this.handlePress(...args);
                  }
                }));
              }
            }"
        `);
    });

    it('should handle all datadog`s custom props (dd-action-name, actionNameAttribute, accessibilityLabel))', () => {
        const input = `
            import { Button } from 'react-native';
            <Button 
                dd-action-name="test-action-button" 
                example-button-prop="action-name-attr-button" 
                accessibilityLabel="accessibility-action-button" 
                color="red" 
                onPress={func} />
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { Button } from 'react-native';
            /*#__PURE__*/React.createElement(Button, {
              "dd-action-name": "test-action-button",
              "example-button-prop": "action-name-attr-button",
              accessibilityLabel: "accessibility-action-button",
              color: "red",
              onPress: (...args) => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(func, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "dd-action-name": ["test-action-button"],
                  "example-button-prop": ["action-name-attr-button"],
                  "accessibilityLabel": ["accessibility-action-button"],
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [...args],
                  "componentName": "Button"
                })(...args);else return func(...args);
              }
            });"
        `);
    });
});

describe('Babel plugin: wrap interaction handlers for RUM ( with memoization )', () => {
    it('should wrap arrow function inside `useCallback` with parameter (gesture/native event)', () => {
        const input = `
            import { useCallback } from 'react';
            import { Pressable } from 'react-native';

            function MyComponent() {
                const handler = useCallback(event => {
                    console.log('Testing ', a, b, event);
                    setA(x => x + 1);
                    setB(x => x + 1);
                }, [a, b]);
                
                return(
                    <Pressable color="red" onPress={handler} />
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { useCallback } from 'react';
            import { Pressable } from 'react-native';
            function MyComponent() {
              const handler = useCallback(event => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(event => {
                  console.log('Testing ', a, b, event);
                  setA(x => x + 1);
                  setB(x => x + 1);
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [event],
                  "componentName": "Pressable"
                })(event);else return (event => {
                  console.log('Testing ', a, b, event);
                  setA(x => x + 1);
                  setB(x => x + 1);
                })(event);
              }, [a, b]);
              return /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              });
            }"
        `);
    });

    it('should wrap arrow function inside `useCallback` with parameter (user defined)', () => {
        const input = `
            import { useCallback } from 'react';
            import { Pressable } from 'react-native';

            function MyComponent() {
                const handler = useCallback(userParam => {
                    console.log('Testing ', a, b, userParam);
                    setA(x => x + 1);
                    setB(x => x + 1);
                }, [a, b]);
                
                return(
                    <Pressable color="red" onPress={() => handler('Test')} />
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { useCallback } from 'react';
            import { Pressable } from 'react-native';
            function MyComponent() {
              const handler = useCallback(userParam => {
                console.log('Testing ', a, b, userParam);
                setA(x => x + 1);
                setB(x => x + 1);
              }, [a, b]);
              return /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: () => {
                  if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => handler('Test'), "TAP", {
                    "options": {
                      "useContent": true,
                      "useNamePrefix": true
                    },
                    "getContent": () => {
                      return __ddExtractText(_jsx(_Fragment, {}), []);
                    },
                    "handlerArgs": [],
                    "componentName": "Pressable"
                  })();else return (() => handler('Test'))();
                }
              });
            }"
        `);
    });

    it('should wrap arrow function inside `useCallback` without parameter', () => {
        const input = `
            import { useCallback } from 'react';
            import { Pressable } from 'react-native';

            function MyComponent() {
                const handler = useCallback(() => {
                    console.log('Testing ');
                }, []);
                
                return(
                    <Pressable color="red" onPress={handler} />
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { useCallback } from 'react';
            import { Pressable } from 'react-native';
            function MyComponent() {
              const handler = useCallback(() => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => {
                  console.log('Testing ');
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "Pressable"
                })();else return (() => {
                  console.log('Testing ');
                })();
              }, []);
              return /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              });
            }"
        `);
    });

    it('should wrap arrow function inside `useCallback` and use the same function for multiple elements', () => {
        const input = `
            import { useCallback } from 'react';
            import { View, Pressable } from 'react-native';

            function MyComponent() {
                const handler = useCallback(() => {
                    console.log('Testing ');
                }, []);
                
                return(
                    <View>
                        <Pressable color="red" onPress={handler} />
                        <Pressable color="blue" onPress={handler} />
                    </View>
                );
            }
        `;
        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx, Fragment as _Fragment2, jsx as _jsx2 } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { useCallback } from 'react';
            import { View, Pressable } from 'react-native';
            function MyComponent() {
              const handler = useCallback(() => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(() => {
                  console.log('Testing ');
                }, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "Pressable"
                })();else return (() => {
                  console.log('Testing ');
                })();
              }, []);
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              }), /*#__PURE__*/React.createElement(Pressable, {
                color: "blue",
                onPress: handler
              }));
            }"
        `);
    });

    it('should wrap arrow function inside `useCallback` with function reference', () => {
        const input = `
            import { useCallback } from 'react';
            import { View, Pressable } from 'react-native';

            function MyComponent() {
                const funcN = test => {
                    console.log('Testing2 ', a, b, test);
                    setA(x => x + 1);
                    setB(x => x + 1);
                };

                const handler = useCallback(funcN, [a, b]);
                
                return(
                    <View>
                        <Pressable color="red" onPress={handler} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import { useCallback } from 'react';
            import { View, Pressable } from 'react-native';
            function MyComponent() {
              const funcN = test => {
                console.log('Testing2 ', a, b, test);
                setA(x => x + 1);
                setB(x => x + 1);
              };
              const handler = useCallback(test => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(funcN, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [test],
                  "componentName": "Pressable"
                })(test);else return funcN(test);
              }, [a, b]);
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              }));
            }"
        `);
    });

    it('should wrap arrow function inside `React.useCallback` with function reference', () => {
        const input = `
            import React from 'react';
            import { View, Pressable } from 'react-native';

            function MyComponent() {
                const funcN = test => {
                    console.log('Testing2 ', a, b, test);
                    setA(x => x + 1);
                    setB(x => x + 1);
                };

                const handler = React.useCallback(funcN, [a, b]);
                
                return(
                    <View>
                        <Pressable color="red" onPress={handler} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Pressable } from 'react-native';
            function MyComponent() {
              const funcN = test => {
                console.log('Testing2 ', a, b, test);
                setA(x => x + 1);
                setB(x => x + 1);
              };
              const handler = React.useCallback(test => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(funcN, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [test],
                  "componentName": "Pressable"
                })(test);else return funcN(test);
              }, [a, b]);
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              }));
            }"
        `);
    });

    it('should wrap arrow function inside `useCallback` with function reference outside the component', () => {
        const input = `
            import React from 'react';
            import { View, Pressable } from 'react-native';

            const funcN = test => {
                console.log('Testing ', test);
            };

            function MyComponent() {
                const handler = React.useCallback(funcN, [a, b]);
                
                return(
                    <View>
                        <Pressable color="red" onPress={handler} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Pressable } from 'react-native';
            const funcN = test => {
              console.log('Testing ', test);
            };
            function MyComponent() {
              const handler = React.useCallback(test => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(funcN, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [test],
                  "componentName": "Pressable"
                })(test);else return funcN(test);
              }, [a, b]);
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              }));
            }"
        `);
    });

    it('should not wrap arrow function inside `useCallback` with function reference imported from another file', () => {
        const input = `
            import React from 'react';
            import { View, Pressable } from 'react-native';
            import { funcN } from '../myFile';

            function MyComponent() {
                const handler = React.useCallback(funcN, [a, b]);
                
                return(
                    <View>
                        <Pressable color="red" onPress={handler} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Pressable } from 'react-native';
            import { funcN } from '../myFile';
            function MyComponent() {
              const handler = React.useCallback(funcN, [a, b]);
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              }));
            }"
        `);
    });

    it('should wrap arrow function inside `useMemo` with function reference outside the component', () => {
        const input = `
            import React from 'react';
            import { View, Pressable } from 'react-native';

            const funcN = () => {
                console.log('Testing');
            };

            function MyComponent() {
                const handler = React.useMemo(funcN, []);

                return(
                    <View>
                        <Pressable color="red" onPress={handler} />
                    </View>
                );
            }
        `;

        const output = transformCode(input);
        expect(output).toMatchInlineSnapshot(`
            "import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
            import { DdBabelInteractionTracking, __ddExtractText } from "@datadog/mobile-react-native";
            import React from 'react';
            import { View, Pressable } from 'react-native';
            const funcN = () => {
              console.log('Testing');
            };
            function MyComponent() {
              const handler = React.useMemo(() => {
                if (DdBabelInteractionTracking.getInstance()) return DdBabelInteractionTracking.getInstance().wrapRumAction(funcN, "TAP", {
                  "options": {
                    "useContent": true,
                    "useNamePrefix": true
                  },
                  "getContent": () => {
                    return __ddExtractText(_jsx(_Fragment, {}), []);
                  },
                  "handlerArgs": [],
                  "componentName": "Pressable"
                })();else return funcN();
              }, []);
              return /*#__PURE__*/React.createElement(View, null, /*#__PURE__*/React.createElement(Pressable, {
                color: "red",
                onPress: handler
              }));
            }"
        `);
    });

    it('should resolve member expression component names in getContent', () => {
        const options: Partial<PluginOptions> = {
            components: {
                useContent: true,
                useNamePrefix: true,
                tracked: [
                    {
                        name: 'Card',
                        handlers: [{ event: 'onPress', action: 'TAP' }]
                    }
                ]
            }
        };

        const input = `
            import { View, Text } from 'react-native';
            function Card({ children, onPress }: any) {
                return <View onPress={onPress}>{children}</View>;
            }
            Card.Title = ({ children }: any) => <Text>{children}</Text>;

            function Screen() {
                return (
                    <Card onPress={() => {}}>
                        <Card.Title>Welcome</Card.Title>
                    </Card>
                );
            }
        `;

        const output = transformCode(input, options);
        expect(output).not.toContain('(unknown,');
        expect(output).toContain('Card.Title');
    });
});
