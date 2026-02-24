/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

import { isSensitiveHeader } from '../sensitiveHeaderBlocklist';

describe('isSensitiveHeader', () => {
    describe('MUST BLOCK sensitive headers (returns true)', () => {
        const sensitiveHeaders = [
            // Standard auth
            'authorization',
            'Authorization',
            'AUTHORIZATION',
            'proxy-authorization',
            'Proxy-Authorization',
            // Cookies
            'cookie',
            'Cookie',
            'COOKIE',
            'set-cookie',
            'Set-Cookie',
            // Token patterns
            'x-access-token',
            'X-Access-Token',
            'x-auth-token',
            'x-csrf-token',
            'x-xsrf-token',
            'x-amz-security-token',
            // Secrets and passwords
            'secret',
            'x-secret-key',
            'password',
            'x-password',
            // Credentials
            'credential',
            'grpc-credential',
            'x-amz-credential',
            // Bearer
            'bearer',
            // API/secret/access/app key variants
            'api-key',
            'apikey',
            'api_key',
            'api.key',
            'secret-key',
            'secretkey',
            'access-key',
            'accesskey',
            'app-key',
            'appkey',
            // Forwarding / IP headers
            'forwarded',
            'x-forwarded-for',
            'x-real-ip',
            'x-connecting-ip',
            'cf-connecting-ip',
            'x-client-ip',
            'true-client-ip',
            // gRPC sensitive metadata
            'grpc-metadata-authorization',
            'grpc-metadata-cookie'
        ];

        it.each(sensitiveHeaders)('blocks "%s"', (headerName: string) => {
            expect(isSensitiveHeader(headerName)).toBe(true);
        });
    });

    describe('MUST ALLOW safe headers (returns false)', () => {
        const safeHeaders = [
            'content-type',
            'Content-Type',
            'cache-control',
            'Cache-Control',
            'etag',
            'x-request-id',
            'x-correlation-id',
            'x-custom-header',
            'accept',
            'accept-encoding',
            'accept-language',
            'content-length',
            'vary',
            'server-timing',
            'x-cache',
            'age',
            'expires',
            'content-encoding'
        ];

        it.each(safeHeaders)('allows "%s"', (headerName: string) => {
            expect(isSensitiveHeader(headerName)).toBe(false);
        });
    });

    describe('case-insensitive matching', () => {
        it('blocks both Authorization and authorization', () => {
            expect(isSensitiveHeader('Authorization')).toBe(true);
            expect(isSensitiveHeader('authorization')).toBe(true);
        });

        it('allows both Cache-Control and cache-control', () => {
            expect(isSensitiveHeader('Cache-Control')).toBe(false);
            expect(isSensitiveHeader('cache-control')).toBe(false);
        });
    });
});
