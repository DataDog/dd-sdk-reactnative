module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    parserOptions: {
        ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
        ecmaFeatures: {
            jsx: true // Allows for the parsing of JSX
        }
    },
    settings: {
        react: {
            version: 'detect' // Tells eslint-plugin-react to automatically detect the version of React to use
        }
    },
    extends: [
        'prettier',
        'plugin:react/recommended', // Uses the recommended rules from @eslint-plugin-react
        'plugin:@typescript-eslint/recommended' // Uses the recommended rules from @typescript-eslint/eslint-plugin
    ],
    plugins: [
        'import',
        'prettier',
        'react',
        'react-hooks',
        '@typescript-eslint',
        'arca'
    ],
    rules: {
        'react/prop-types': 0,
        '@typescript-eslint/no-inferrable-types': 0,
        '@typescript-eslint/no-explicit-any': 0,
        'prettier/prettier': 'error',
        // The next rules come from datadog's main ts repository
        'block-scoped-var': 'error',
        curly: ['error', 'all'],
        eqeqeq: [
            'error',
            'always',
            {
                null: 'ignore'
            }
        ],
        'guard-for-in': 'error',
        'no-alert': 'warn',
        'no-caller': 'error',
        'no-case-declarations': 'error',
        'no-empty-function': [
            'warn',
            {
                allow: ['arrowFunctions', 'functions', 'methods']
            }
        ],
        'no-empty-pattern': 'error',
        'no-eval': 'error',
        'no-extend-native': 'error',
        'no-extra-bind': 'error',
        'no-extra-label': 'error',
        'no-fallthrough': 'error',
        'no-global-assign': [
            'error',
            {
                exceptions: []
            }
        ],
        'no-implied-eval': 'error',
        'no-iterator': 'error',
        'no-labels': [
            'error',
            {
                allowLoop: false,
                allowSwitch: false
            }
        ],
        'no-lone-blocks': 'error',
        'no-loop-func': 'error',
        'no-multi-str': 'error',
        'no-new': 'error',
        'no-new-func': 'error',
        'no-new-wrappers': 'error',
        'no-octal': 'error',
        'no-octal-escape': 'error',
        'no-param-reassign': [
            'error',
            {
                props: false
            }
        ],
        'no-proto': 'error',
        '@typescript-eslint/no-redeclare': 'error',
        'no-return-assign': ['error', 'always'],
        'no-return-await': 'error',
        'no-script-url': 'error',
        'no-self-assign': [
            'error',
            {
                props: true
            }
        ],
        'no-self-compare': 'error',
        'no-sequences': 'error',
        'no-throw-literal': 'error',
        'no-unused-expressions': [
            'error',
            {
                allowShortCircuit: false,
                allowTernary: false,
                allowTaggedTemplates: false
            }
        ],
        'no-unused-labels': 'error',
        'no-useless-catch': 'error',
        'no-useless-concat': 'error',
        'no-useless-escape': 'error',
        'no-void': 'error',
        'no-with': 'error',
        'vars-on-top': 'error',
        yoda: 'error',
        'for-direction': 'error',
        'getter-return': [
            'error',
            {
                allowImplicit: true
            }
        ],
        'no-async-promise-executor': 'error',
        'no-await-in-loop': 'warn',
        'no-compare-neg-zero': 'error',
        'no-cond-assign': ['error', 'always'],
        'no-console': [
            'error',
            {
                allow: ['warn', 'error', 'info', 'debug']
            }
        ],
        'no-constant-condition': 'warn',
        'no-control-regex': 'error',
        'no-debugger': 'error',
        'no-dupe-args': 'error',
        'no-dupe-keys': 'error',
        'no-duplicate-case': 'error',
        'no-empty': 'error',
        'no-empty-character-class': 'error',
        'no-ex-assign': 'error',
        'no-extra-boolean-cast': 'error',
        'no-func-assign': 'error',
        'no-inner-declarations': 'error',
        'no-invalid-regexp': 'error',
        'no-irregular-whitespace': 'error',
        'no-misleading-character-class': 'error',
        'no-obj-calls': 'error',
        'no-prototype-builtins': 'error',
        'no-regex-spaces': 'error',
        'no-sparse-arrays': 'error',
        'no-template-curly-in-string': 'error',
        'no-unreachable': 'error',
        'no-unsafe-finally': 'error',
        'no-unsafe-negation': 'error',
        'use-isnan': 'error',
        'valid-typeof': [
            'error',
            {
                requireStringLiterals: true
            }
        ],
        'global-require': 'error',
        'no-buffer-constructor': 'error',
        'no-new-require': 'error',
        'no-path-concat': 'error',
        'comma-dangle': ['error', 'never'],
        'func-names': 'warn',
        'lines-around-directive': [
            'error',
            {
                before: 'always',
                after: 'always'
            }
        ],
        'no-array-constructor': 'error',
        'no-lonely-if': 'error',
        'no-multi-assign': ['error'],
        'no-new-object': 'error',
        'no-unneeded-ternary': [
            'error',
            {
                defaultAssignment: false
            }
        ],
        'one-var': ['error', 'never'],
        'operator-assignment': ['error', 'always'],
        quotes: [
            'error',
            'single',
            {
                avoidEscape: true
            }
        ],
        'spaced-comment': [
            'error',
            'always',
            {
                line: {
                    exceptions: ['-', '+'],
                    markers: ['=', '!']
                },
                block: {
                    exceptions: ['-', '+'],
                    markers: ['=', '!', ':', '::'],
                    balanced: true
                }
            }
        ],
        'no-delete-var': 'error',
        'no-label-var': 'error',
        '@typescript-eslint/no-shadow': 'error',
        'no-shadow-restricted-names': 'error',
        'no-undef-init': 'error',
        'constructor-super': 'error',
        'no-class-assign': 'error',
        'no-const-assign': 'error',
        'no-dupe-class-members': 'error',
        'no-new-symbol': 'error',
        'no-this-before-super': 'error',
        'no-useless-computed-key': 'error',
        'no-useless-rename': [
            'error',
            {
                ignoreDestructuring: false,
                ignoreImport: false,
                ignoreExport: false
            }
        ],
        'no-var': 'error',
        'object-shorthand': ['warn', 'always'],
        'prefer-const': [
            'error',
            {
                destructuring: 'any',
                ignoreReadBeforeAssign: true
            }
        ],
        'prefer-numeric-literals': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        'require-yield': 'error',
        'symbol-description': 'error',
        'import/export': 'error',
        'import/no-default-export': 'warn',
        'import/no-extraneous-dependencies': [
            'error',
            {
                devDependencies: [
                    'build/**',
                    '**/*.preval.js',
                    '*.config.js',
                    '**/webpack.config.js',
                    '**/test-helpers.*',
                    '**/*.test-helpers.*',
                    '**/*test.utils.*',
                    '.budget.js',
                    'internal-apps/docs-builder/webpack/**/*.{js,jsx,ts,tsx}'
                ]
            }
        ],
        'import/no-mutable-exports': 'error',
        'import/no-amd': 'error',
        'import/first': 'error',
        'import/no-duplicates': 'error',
        'import/newline-after-import': 'error',
        'import/no-absolute-path': 'error',
        'import/no-dynamic-require': 'error',
        'import/no-named-default': 'error',
        'import/no-self-import': 'error',
        'import/no-useless-path-segments': 'error',
        strict: ['error', 'never'],
        'react/jsx-filename-extension': [
            'error',
            { extensions: ['.tsx', '.jsx'] }
        ],
        'react/jsx-key': 'error',
        'react/jsx-no-comment-textnodes': 'error',
        'react/jsx-no-constructed-context-values': 'warn',
        'react/jsx-no-duplicate-props': 'error',
        'react/jsx-no-target-blank': 'error',
        'react/jsx-no-undef': 'error',
        'react/jsx-uses-vars': 'error',
        'react/no-children-prop': 'error',
        'react/no-danger-with-children': 'error',
        'react/no-deprecated': 'error',
        'react/no-direct-mutation-state': 'error',
        'react/no-is-mounted': 'error',
        'react/no-render-return-value': 'error',
        'react/no-unknown-property': 'error',
        'react/require-render-return': 'error',
        'react/no-unsafe': ['warn', { checkAliases: true }], // TODO: turn to error
        'react/self-closing-comp': [
            'error',
            {
                component: true,
                html: true
            }
        ],
        'react/no-danger': 'error',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': [
            'warn',
            {
                additionalHooks: '^use[A-Z][a-zA-Z_0-9]+Effect$'
            }
        ],
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                ignoreRestSiblings: true,
                // args should be set to 'after-used' or to 'all'
                // and it should be used with argsIgnorePattern
                // argsIgnorePattern: '^_',
                args: 'none'
            }
        ],
        '@typescript-eslint/consistent-type-imports': [
            'error',
            {
                prefer: 'type-imports',
                disallowTypeAnnotations: false
            }
        ],
        'arca/import-ordering': ['error'],
        'arca/newline-after-import-section': ['error']
    }
};
