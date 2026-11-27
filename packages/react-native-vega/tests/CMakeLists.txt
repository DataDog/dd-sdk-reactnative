# Unless explicitly stated otherwise all files in this repository are licensed
# under the Apache License Version 2.0.
#
# This product includes software developed at Datadog
# (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

cmake_minimum_required(VERSION 3.15)
project(VegaHttpProxyTests LANGUAGES CXX)
enable_testing()
find_package(Threads REQUIRED)

add_executable(HttpJsProxyTest
    HttpJsProxyTest.cpp
    ../kepler/turbo-modules/HttpJsProxy.cpp)
target_compile_features(HttpJsProxyTest PRIVATE cxx_std_17)
target_link_libraries(HttpJsProxyTest PRIVATE Threads::Threads)
add_test(NAME HttpJsProxy COMMAND HttpJsProxyTest)
set_tests_properties(HttpJsProxy PROPERTIES TIMEOUT 10)

set(DATADOG_CPP_SOURCE_DIR "" CACHE PATH "C++ SDK source directory")
set(KEPLER_INCLUDE_DIR "" CACHE PATH "Kepler headers")
set(NODE_API_INCLUDE_DIR "" CACHE PATH "Node API headers")
option(VEGA_TEST_INITIALIZATION "Test initialization against the actual C++ SDK" OFF)
# Loading SDK sources is optional so transport tests remain standalone.
if(DATADOG_CPP_SOURCE_DIR AND KEPLER_INCLUDE_DIR AND NODE_API_INCLUDE_DIR)
    set(DD_BUILD_SHARED OFF CACHE BOOL "" FORCE)
    set(DD_HTTP_CLIENT "none" CACHE STRING "" FORCE)
    set(DD_CRASH_MODE "noop" CACHE STRING "" FORCE)
    add_subdirectory("${DATADOG_CPP_SOURCE_DIR}" datadog)
    function(vega_sdk_test target)
        target_compile_features(${target} PRIVATE cxx_std_17)
        target_compile_definitions(${target} PRIVATE DD_VEGA_CPP_HTTP_OPTIONS)
        target_include_directories(${target} PRIVATE
            ../kepler/turbo-modules
            ${DATADOG_CPP_SOURCE_DIR}/src/core
            ${DATADOG_CPP_SOURCE_DIR}/src/types
            ${KEPLER_INCLUDE_DIR}
            ${KEPLER_INCLUDE_DIR}/Kepler/turbomodule
            ${NODE_API_INCLUDE_DIR})
        target_link_libraries(${target} PRIVATE Datadog::sdk Threads::Threads)
    endfunction()
    add_executable(AttributeConverterTest
        AttributeConverterTest.cpp
        ../kepler/turbo-modules/AttributeConverter.cpp
        ../kepler/turbo-modules/EnumParsers.cpp)
    vega_sdk_test(AttributeConverterTest)
    target_compile_definitions(AttributeConverterTest PRIVATE NDEBUG)
    add_test(NAME AttributeConverter COMMAND AttributeConverterTest)
elseif(VEGA_TEST_INITIALIZATION)
    message(FATAL_ERROR "Initialization tests require C++ SDK, Kepler, and Node include paths")
endif()

if(VEGA_TEST_INITIALIZATION)
    add_executable(SdkInitializationTest
        SdkInitializationTest.cpp
        ../kepler/turbo-modules/SdkInitialization.cpp
        ../kepler/turbo-modules/DatadogGlobalState.cpp
        ../kepler/turbo-modules/EnumParsers.cpp
        ../kepler/turbo-modules/HttpJsProxy.cpp
        ../kepler/turbo-modules/http_js_proxy_client.cpp)
    vega_sdk_test(SdkInitializationTest)
    add_test(NAME SdkInitialization COMMAND SdkInitializationTest "${CMAKE_CURRENT_BINARY_DIR}/sdk-test-data")
    set_tests_properties(SdkInitialization PROPERTIES TIMEOUT 15)
endif()
