/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { base64 } from '../base64';

describe('base64', () => {
    describe('decode', () => {
        it('decodes a base64 string', () => {
            const input =
                'eyJmZWF0dXJlX2ZsYWdzIjp7fSwidmlldyI6eyJlcnJvciI6eyJjb3VudCI6MH0sImNyYXNoIjp7ImNvdW50IjowfSwiYWN0aW9uIjp7ImNvdW50IjowfSwiZnJ1c3RyYXRpb24iOnsiY291bnQiOjB9LCJmcm96ZW5fZnJhbWUiOnsiY291bnQiOjB9LCJ1cmwiOiJDYXRlZ29yaWVzLXFDWDNibk4zbzhSZ29Oam5BSUVuQSIsImlzX3Nsb3dfcmVuZGVyZWQiOmZhbHNlLCJuYW1lIjoiQ2F0ZWdvcmllcyIsImlzX2FjdGl2ZSI6dHJ1ZSwiY3VzdG9tX3RpbWluZ3MiOnt9LCJpZCI6ImU3NzhjNjFhLThkM2UtNGU1ZC1iZjNhLTEzNTUxNGMzNWIxMSIsImxvbmdfdGFzayI6eyJjb3VudCI6MH0sInRpbWVfc3BlbnQiOjEsInJlc291cmNlIjp7ImNvdW50IjowfX0sImJ1aWxkX3ZlcnNpb24iOiIyMiIsInNlcnZpY2UiOiJjb20uZGF0YWRvZy5zaG9waXN0LnJlYWN0LW5hdGl2ZSIsInZlcnNpb24iOiIyMi4yMy4yNiIsInNlc3Npb24iOnsiaWQiOiI4OGU0ZDE1ZC03ZmRhLTQwMTItOWVkOS1hM2UyZGFmNTk0ZjAiLCJ0eXBlIjoidXNlciIsImlzX2FjdGl2ZSI6dHJ1ZX0sImRhdGUiOjE3MDEyNTAxNzIyMDYsIl9kZCI6eyJmb3JtYXRfdmVyc2lvbiI6MiwicmVwbGF5X3N0YXRzIjp7fSwic2Vzc2lvbiI6eyJwbGFuIjoxfSwiY29uZmlndXJhdGlvbiI6eyJzZXNzaW9uX3NhbXBsZV9yYXRlIjoxMDB9LCJkb2N1bWVudF92ZXJzaW9uIjoxfSwiYXBwbGljYXRpb24iOnsiaWQiOiI2NTZhMjNmZi00MjYyLTQ0ZGItOTg5NS1kZjE4YjUzNTA0MTgifSwiY29udGV4dCI6e30sImNvbm5lY3Rpdml0eSI6eyJpbnRlcmZhY2VzIjpbIndpZmkiXSwic3RhdHVzIjoiY29ubmVjdGVkIn0sImRldmljZSI6eyJhcmNoaXRlY3R1cmUiOiJhcm02NGUiLCJ0eXBlIjoibW9iaWxlIiwibW9kZWwiOiJpUGhvbmUxNiwxIFNpbXVsYXRvciIsImJyYW5kIjoiQXBwbGUiLCJuYW1lIjoiaVBob25lIn0sInR5cGUiOiJ2aWV3Iiwib3MiOnsidmVyc2lvbiI6IjE3LjAuMSIsInZlcnNpb25fbWFqb3IiOiIxNyIsImJ1aWxkIjoiMjJHMzIwIiwibmFtZSI6ImlPUyJ9LCJzb3VyY2UiOiJyZWFjdC1uYXRpdmUifQ==';

            expect(base64.decode(input)).toMatchInlineSnapshot(
                '"{"feature_flags":{},"view":{"error":{"count":0},"crash":{"count":0},"action":{"count":0},"frustration":{"count":0},"frozen_frame":{"count":0},"url":"Categories-qCX3bnN3o8RgoNjnAIEnA","is_slow_rendered":false,"name":"Categories","is_active":true,"custom_timings":{},"id":"e778c61a-8d3e-4e5d-bf3a-135514c35b11","long_task":{"count":0},"time_spent":1,"resource":{"count":0}},"build_version":"22","service":"com.datadog.shopist.react-native","version":"22.23.26","session":{"id":"88e4d15d-7fda-4012-9ed9-a3e2daf594f0","type":"user","is_active":true},"date":1701250172206,"_dd":{"format_version":2,"replay_stats":{},"session":{"plan":1},"configuration":{"session_sample_rate":100},"document_version":1},"application":{"id":"656a23ff-4262-44db-9895-df18b5350418"},"context":{},"connectivity":{"interfaces":["wifi"],"status":"connected"},"device":{"architecture":"arm64e","type":"mobile","model":"iPhone16,1 Simulator","brand":"Apple","name":"iPhone"},"type":"view","os":{"version":"17.0.1","version_major":"17","build":"22G320","name":"iOS"},"source":"react-native"}"'
            );
        });
    });
});
