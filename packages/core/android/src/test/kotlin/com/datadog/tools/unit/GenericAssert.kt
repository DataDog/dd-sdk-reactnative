/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.datadog.tools.unit

import org.assertj.core.api.AbstractAssert
import org.assertj.core.api.Assertions.assertThat

class GenericAssert(actual: Any) :
    AbstractAssert<GenericAssert, Any>(actual, GenericAssert::class.java) {

    fun doesNotHaveField(name: String): GenericAssert {
        val field: Any? = actual.getFieldValue(name)
        assertThat(field)
            .overridingErrorMessage(
                "Expecting object to not have $name, but found it having value $field"
            )
            .isNull()
        return this
    }

    fun <T> getActualValue(name: String): T {
        val field: Any? = actual.getFieldValue(name)
        assertThat(field)
            .overridingErrorMessage(
                "Expecting object to have a non null field named $name, but field was null"
            )
            .isNotNull()
        return field!! as T
    }

    fun hasField(name: String, nestedAssert: (GenericAssert) -> Unit = {}): GenericAssert {
        val field: Any? = actual.getFieldValue(name)
        assertThat(field)
            .overridingErrorMessage(
                "Expecting object to have a non null field named $name, but field was null"
            )
            .isNotNull()
        nestedAssert(GenericAssert(field!!))
        return this
    }

    fun <F> hasFieldEqualTo(name: String, expected: F): GenericAssert {
        val field: Any? = actual.getFieldValue(name)
        assertThat(field).isEqualTo(expected)
        return this
    }

    fun hasFieldWithClass(name: String, expectedClassName: String): GenericAssert {
        val field: Any? = actual.getFieldValue(name)
        assertThat(field?.javaClass?.name).isEqualTo(expectedClassName)
        return this
    }

    fun isInstanceOf(expectedClassName: String): GenericAssert {
        val className = actual.javaClass.canonicalName!!
        assertThat(className).isEqualTo(expectedClassName)
        return this
    }

    companion object {
        fun assertThat(actual: Any): GenericAssert {
            return GenericAssert(actual)
        }
    }
}
