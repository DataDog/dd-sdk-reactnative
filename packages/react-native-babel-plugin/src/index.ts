/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as Babel from '@babel/core';
import { declare } from '@babel/helper-plugin-utils';

import { insertSetupFlag } from './actions/global';
import type { PluginOptions } from './types';
import { getFileInfo } from './utils/index';

export default declare(
    (
        api: typeof Babel & Babel.ConfigAPI,
        _options: PluginOptions,
        _dirname: string
    ): Babel.PluginObj<Babel.PluginPass> => {
        api.assertVersion(7);

        return {
            visitor: {
                Program(path, _state) {
                    const { path: _p, name: _name } = getFileInfo(this);
                    insertSetupFlag(path, api.types);
                }
            }
        };
    }
);
