/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { md5 } from './md5';
import type { Shard } from './types';

export function matchesShard(shard: Shard, subjectKey: string): boolean {
    const assignedShard = getShard(`${shard.salt}-${subjectKey}`, shard.totalShards);
    return shard.ranges.some(
        range => range.start <= assignedShard && assignedShard < range.end
    );
}

function getShard(input: string, totalShards: number): number {
    if (totalShards <= 0) {
        return -1;
    }
    const hashOutput = md5(input);
    return parseInt(hashOutput.slice(0, 8), 16) % totalShards;
}
