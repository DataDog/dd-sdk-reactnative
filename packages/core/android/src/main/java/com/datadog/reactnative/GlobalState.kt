package com.datadog.reactnative

import java.util.concurrent.ConcurrentHashMap

internal object GlobalState {

    // Keeps a record of global attributes for logs / spans
    internal val globalAttributes: MutableMap<String, Any?> = ConcurrentHashMap()

    /**
     * Adds a global attribute to all future RUM events.
     * @param key the attribute key (non null)
     * @param value the attribute value (or null)
     */
    @JvmStatic
    fun addAttribute(key: String, value: Any?) {
        if (value == null) {
            globalAttributes.remove(key)
        } else {
            globalAttributes[key] = value
        }
    }

    /**
     * Removes a global attribute from all future RUM events.
     * @param key the attribute key (non null)
     */
    @JvmStatic
    fun removeAttribute(key: String) {
        globalAttributes.remove(key)
    }
}
