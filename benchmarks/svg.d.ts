/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import React from 'react';
import { SvgProps } from 'react-native-svg';

declare module '*.svg' {
    const content: React.FC<SvgProps>;
    export default content;
}
