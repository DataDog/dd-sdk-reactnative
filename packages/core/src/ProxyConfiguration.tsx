/**
 * Proxy server configuration.
 */
class ProxyConfiguration {
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
        readonly username?: string,
        /**
         * Password for Basic authentication scheme.
         */
        readonly password?: string
    ) { }
}

enum ProxyType {
    HTTP = "http",
    HTTPS = "https",
    SOCKS = "socks"
}

export { ProxyConfiguration, ProxyType }
