/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

// Barrel file used to test Fix 6: ExportNamedDeclaration must use spec.exported.name
// not spec.local.name, otherwise 'export { default as HeartIcon }' stores 'default'
// as the key in localSvgMap instead of 'HeartIcon', and <HeartIcon/> is never found.
export { default as HeartIcon } from './heart.svg';
export { default as ShieldIcon } from './shield.svg';
