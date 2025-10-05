# Babel Plugin for React Native

The `@datadog/mobile-react-native-babel-plugin` enhances the Datadog React Native SDK by automatically enriching React components with contextual metadata. This helps improve the accuracy of features such as RUM Action tracking and Session Replay.

## Setup

**Note**: Make sure you've already integrated the [Datadog React Native SDK][1].

To install with NPM, run:

```sh
npm install @datadog/mobile-react-native-babel-plugin
```

To install with Yarn, run:

```sh
yarn add @datadog/mobile-react-native-babel-plugin
```

## Configure Babel

Add the plugin to your Babel configuration. Depending on your setup, you might be using a `babel.config.js`, `.babelrc`, or similar.

**Example configuration:**

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['@datadog/mobile-react-native-babel-plugin'] // <-- Add here
};
```

### Configuration Options

You can configure the plugin to adjust how it processes your code, giving you control over its behavior and allowing you to tailor it to your project’s needs.

#### Top-level options

| Option               | Type   | Default | Description |
|-----------------------|--------|---------|-------------|
| `actionNameAttribute` | string | –       | The chosen attribute name to use for action names. |
| `sessionReplay`          | object | –       | Session Replay options configuration. |
| `components`          | object | –       | Component tracking configuration. |

---

#### `sessionReplay` options

| Option          | Type    | Default | Description |
|-----------------|---------|---------|-------------|
| `svgTracking`    | boolean | true   | Whether to track SVG assets in the context of Session Replay. |

---

#### `components` options

| Option          | Type    | Default | Description |
|-----------------|---------|---------|-------------|
| `useContent`    | boolean | true   | Whether to use component content (for example: children, props) as the action name. |
| `useNamePrefix` | boolean | true   | Whether to prefix actions with the component name. |
| `tracked`       | array   | –       | List of component-specific tracking configs. |

---

#### `components.tracked[]` (per component)

Each entry in the `tracked` array is an object with the following shape:

| Option          | Type    | Default              | Description |
|-----------------|---------|----------------------|-------------|
| `name`          | string  | –                    | The component name to track (e.g., `Button`). |
| `useContent`    | boolean | inherits from global | Override `useContent` for this component. |
| `useNamePrefix` | boolean | inherits from global | Override `useNamePrefix` for this component. |
| `contentProp`   | string  | –                    | Property name to use for content instead of children (for example: `"subTitle"`). |
| `handlers`      | array   | –                    | List of event/action pairs to track. |

---

#### `components.tracked[].handlers[]`

| Field   | Type   | Description |
|---------|--------|-------------|
| `event` | string | The event name to intercept (such as `"onPress"`). |
| `action`| string | The RUM action name to associate with this event. _(Only `"TAP"` actions are currently supported)_ |

---

**Example configuration (_using configuration options_):**

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      '@datadog/mobile-react-native-babel-plugin',
      {
        actionNameAttribute: 'custom-prop-value',
        sessionReplay: {
          svgTracking: true
        },
        components: {
          useContent: true,
          useNamePrefix: true,
          tracked: [
            {
              name: 'CustomButton',
              contentProp: 'text'
              handlers: [{event: 'onPress', action: 'TAP'}],
            },
            {
              name: 'CustomTextInput',
              handlers: [{event: 'onFocus', action: 'TAP'}],
            },
            {
              useNamePrefix: false,
              useContent: false,
              name: 'Tab',
              handlers: [{event: 'onChange', action: 'TAP'}],
            },
          ],
        },
      },
    ],
  ],
};
```

## Troubleshooting

**Note**: If you're on an older React Native version, and using Typescript in your project, you may need to install the preset `@babel/preset-typescript`.

To install with NPM, run:

```sh
npm install @babel/preset-typescript
```

To install with Yarn, run:

```sh
yarn add @babel/preset-typescript 
```

Then update your Babel configuration file like using the following example:

```js
module.exports = {
  presets: [
    'module:@react-native/babel-preset',
    '@babel/preset-typescript' // <-- Add here
  ],
  plugins: ['@datadog/mobile-react-native-babel-plugin']
};
```

[1]: https://www.npmjs.com/package/@datadog/mobile-react-native
