package com.datadog.reactnative

import fr.xgouchet.elmyr.annotation.IntForgery
import fr.xgouchet.elmyr.annotation.StringForgery
import fr.xgouchet.elmyr.junit5.ForgeExtension
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
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
internal class GlobalStateTest {

    @AfterEach
    fun `tear down`() {
        GlobalState.globalAttributes.clear()
    }

    @Test
    fun `𝕄 store attribute 𝕎 addAttribute() {String}`(
        @StringForgery key: String,
        @StringForgery value: String
    ) {
        // When
        GlobalState.addAttribute(key, value)

        // Then
        assertThat(GlobalState.globalAttributes)
            .hasSize(1)
            .containsEntry(key, value)
    }

    @Test
    fun `𝕄 store attribute 𝕎 addAttribute() {Int}`(
        @StringForgery key: String,
        @IntForgery value: Int
    ) {
        // When
        GlobalState.addAttribute(key, value)

        // Then
        assertThat(GlobalState.globalAttributes)
            .hasSize(1)
            .containsEntry(key, value)
    }

    @Test
    fun `𝕄 remove String attribute 𝕎 addAttribute() {null value}`(
        @StringForgery key: String,
        @StringForgery value: String
    ) {
        // Given
        GlobalState.addAttribute(key, value)

        // When
        GlobalState.addAttribute(key, null)

        // Then
        assertThat(GlobalState.globalAttributes)
            .isEmpty()
    }

    @Test
    fun `𝕄 remove Int attribute 𝕎 addAttribute() {null value}`(
        @StringForgery key: String,
        @IntForgery value: Int
    ) {
        // Given
        GlobalState.addAttribute(key, value)

        // When
        GlobalState.addAttribute(key, null)

        // Then
        assertThat(GlobalState.globalAttributes)
            .isEmpty()
    }

    @Test
    fun `𝕄 remove String attribute 𝕎 removeAttribute()`(
        @StringForgery key: String,
        @StringForgery value: String
    ) {
        // Given
        GlobalState.addAttribute(key, value)

        // When
        GlobalState.removeAttribute(key)

        // Then
        assertThat(GlobalState.globalAttributes)
            .isEmpty()
    }

    @Test
    fun `𝕄 remove Int attribute 𝕎 removeAttribute()`(
        @StringForgery key: String,
        @IntForgery value: Int
    ) {
        // Given
        GlobalState.addAttribute(key, value)

        // When
        GlobalState.removeAttribute(key)

        // Then
        assertThat(GlobalState.globalAttributes)
            .isEmpty()
    }
}
