package com.datadog.reactnative.webview

import com.datadog.android.api.SdkCore
import com.datadog.android.core.InternalSdkCore
import com.datadog.android.webview.WebViewTracking
import com.datadog.reactnative.DatadogSDKWrapperStorage
import com.datadog.tools.unit.GenericAssert.Companion.assertThat
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.uimanager.ThemedReactContext
import com.reactnativecommunity.webview.RNCWebView
import com.reactnativecommunity.webview.RNCWebViewWrapper
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.api.extension.Extensions
import org.mockito.Mock
import org.mockito.MockedStatic
import org.mockito.Mockito
import org.mockito.Mockito.mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.junit.jupiter.MockitoSettings
import org.mockito.kotlin.any
import org.mockito.kotlin.doReturn
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.mockito.quality.Strictness

@Extensions(
    ExtendWith(MockitoExtension::class)
)
@MockitoSettings(strictness = Strictness.LENIENT)
internal class DatadogWebViewTest {

    @Mock
    lateinit var themedReactContext: ThemedReactContext

    @Mock
    lateinit var datadogCore: InternalSdkCore

    private lateinit var webViewTrackingMockedStatic: MockedStatic<WebViewTracking>

    @BeforeEach
    fun `set up`() {
        whenever(themedReactContext.runOnUiQueueThread(any())).thenAnswer { answer ->
            answer.getArgument<Runnable>(0).run()
            true
        }

        webViewTrackingMockedStatic = Mockito.mockStatic(WebViewTracking::class.java)
        webViewTrackingMockedStatic.`when`<Unit> {
            WebViewTracking.enable(
                webView = any(), // Mock the WebView parameter
                allowedHosts = any(), // Mock the list of allowed hosts
                logsSampleRate = any(), // Mock the logsSampleRate parameter
                sdkCore = any() // Mock the SdkCore parameter
            )
        }.then {} // Return Unit as the function has no return value
    }

    @AfterEach
    fun `tear down`() {
        webViewTrackingMockedStatic.close()
    }

    @Test
    fun `Datadog Core is set once initialized`() {
        val manager = DdSdkReactNativeWebViewManager(themedReactContext)
        assertThat(manager.datadogCore).isNull()

        DatadogSDKWrapperStorage.notifyOnInitializedListeners(datadogCore)

        assertThat(manager.datadogCore).isNotNull()
        assertThat(manager.datadogCore).isInstanceOf(SdkCore::class.java)
    }

    @Test
    fun `Registers to SdkCore listener if the SDK is not initialized`() {
        // =========
        //   Given
        // =========
        val manager = DdSdkReactNativeWebViewManager(themedReactContext)

        // When first initialized, the WebView manager core should be null
        assertThat(manager.datadogCore).isNull()

        // When first initialized, the WebView tracking should be disabled
        assertThat(manager.isWebViewTrackingEnabled).isEqualTo(false)

        // =========
        //   When
        // =========
        val rncWebView = mock(RNCWebView::class.java)
        val rncWebViewWrapper = mock(RNCWebViewWrapper::class.java)
        whenever(rncWebViewWrapper.webView) doReturn rncWebView

        // When tracking is enabled with a null core...
        val allowedHosts = JavaOnlyArray()
        allowedHosts.pushString("example.com")
        manager.setAllowedHosts(rncWebViewWrapper, allowedHosts)

        // =========
        //   Then
        // =========

        // When we notify listeners that the core is available...
        DatadogSDKWrapperStorage.notifyOnInitializedListeners(datadogCore)

        // ...the WebView should enable WebView tracking in the UI Thread.
        verify(themedReactContext).runOnUiQueueThread(any())

        // Native WebView tracking should be called
        webViewTrackingMockedStatic.verify {
            WebViewTracking.enable(rncWebView, listOf("example.com"), 100.0f, datadogCore)
        }

        // At this point 'isWebViewTrackingEnabled' should be true.
        assertThat(manager.isWebViewTrackingEnabled).isEqualTo(true)
    }
}
