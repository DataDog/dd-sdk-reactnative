package com.datadog.reactnative

import fr.xgouchet.elmyr.Forge
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.junit5.ForgeExtension
import okhttp3.Credentials
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class),
    ExtendWith(ForgeExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class ProxyAuthenticatorTest {

    @StringForgery
    lateinit var fakeUsername: String

    @StringForgery
    lateinit var fakePassword: String

    private lateinit var testedAuthenticator: ProxyAuthenticator

    @BeforeEach
    fun `set up`() {
        testedAuthenticator = ProxyAuthenticator(fakeUsername, fakePassword)
    }

    @Test
    fun `M return null W not supported response code`(forge: Forge) {
        // Given
        val response = forge.proxyResponse(
            statusCode =
            forge.anElementFrom(
                forge.anInt(min = 100, max = 407),
                forge.anInt(min = 408, max = 600)
            )
        )

        // When
        val request = testedAuthenticator.authenticate(null, response)

        // Then
        assertThat(request).isNull()
    }

    @Test
    fun `M return null W no known challenges { no Proxy-Authenticate header }`(forge: Forge) {
        // Given
        val response = forge.proxyResponse(statusCode = 407)

        // When
        val request = testedAuthenticator.authenticate(null, response)

        // Then
        assertThat(request).isNull()
    }

    @Test
    fun `M return null W no known challenges { all unsupported }`(forge: Forge) {
        // Given
        val response = forge.proxyResponse(
            statusCode = 407,
            headers = mapOf("Proxy-Authenticate" to forge.anAlphabeticalString())
        )

        // When
        val request = testedAuthenticator.authenticate(null, response)

        // Then
        assertThat(request).isNull()
    }

    @Test
    fun `M return request with credentials W supported challenge`(forge: Forge) {
        // Given
        val response = forge.proxyResponse(
            statusCode = 407,
            headers = mapOf(
                "Proxy-Authenticate" to forge.anElementFrom(
                    "OkHttp-Preemptive",
                    "Basic"
                )
            )
        )

        // When
        val request = testedAuthenticator.authenticate(null, response)

        // Then
        assertThat(request).isNotNull
        assertThat(request?.header("Proxy-Authorization")).isEqualTo(
            Credentials.basic(fakeUsername, fakePassword)
        )
    }

    private fun Forge.proxyResponse(
        statusCode: Int,
        headers: Map<String, String> = emptyMap()
    ): Response {
        return Response.Builder()
            .request(Request.Builder().url(aStringMatching("http(s?)://[a-z]+\\.com/\\w+")).build())
            .protocol(aValueFrom(Protocol::class.java))
            .code(statusCode)
            .apply {
                headers.forEach {
                    header(it.key, it.value)
                }
            }
            .message(anAlphabeticalString())
            .build()
    }
}
