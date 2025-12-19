/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

/**
 * Proxy server configuration.
 */
class ProxyConfiguration {
    username?: string;
    password?: string;

    constructor(
        /**
         * Proxy type.
         */
        readonly type: ProxyType,
        /**
         * Proxy address. Can be either in the IP address format, ex. "1.1.1.1", or hostname, ex. "example.com".
         */
        readonly address: string,
        /**
         * Proxy port.
         */
        readonly port: number,
        /**
         * Username for Basic authentication scheme.
         *
         * Note: "SOCKS + authentication" scheme is not supported.
         */
        username?: string,
        /**
         * Password for Basic authentication scheme.
         */
        password?: string
    ) {
        if (username && password) {
            if (type === ProxyType.SOCKS) {
                console.warn(
                    "SOCKS proxy configuration doesn't support Basic authentication."
                );
            } else {
                this.username = username;
                this.password = password;
            }
        }
    }
}

enum ProxyType {
    HTTP = 'http',
    HTTPS = 'https',
    SOCKS = 'socks'
}

export { ProxyConfiguration, ProxyType };
