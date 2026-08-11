# Unless explicitly stated otherwise all files in this repository are licensed
# under the Apache License Version 2.0.
#
# This product includes software developed at Datadog
# (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

cmake_minimum_required(VERSION 3.15)

project(DatadogVega
    VERSION 1.0
    LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Fail at compile time for unresolved symbols.
if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_link_options("LINKER:--no-undefined" "LINKER:-z,defs")
endif()

if (CMAKE_SYSTEM_NAME STREQUAL Android)
  add_compile_definitions(ANDROID)
endif()

# dd-sdk-cpp integration
# Disable default UUID (Vega sysroot lacks libuuid) and use our /dev/urandom impl.
# Build dd-sdk-cpp without a built-in HTTP client (Vega sysroot lacks libcurl): with
# DD_HTTP_CLIENT=none the SDK is built as a static library with the IHttpClient symbols
# referenced but undefined, and we link our own JS-proxy implementation
# (http_js_proxy_client.cpp) into the DatadogVega turbo module below. Also disable the
# crash handler.
set(DD_UUID_USE_DEFAULT OFF CACHE BOOL "" FORCE)
set(DD_UUID_SRC "${CMAKE_CURRENT_SOURCE_DIR}/kepler/turbo-modules/uuid_urandom.cpp" CACHE STRING "" FORCE)
set(DD_HTTP_CLIENT "none" CACHE STRING "" FORCE)
set(DD_BUILD_SHARED OFF CACHE BOOL "" FORCE)
set(DD_CRASH_MODE "noop" CACHE STRING "" FORCE)

# Default to local dd-sdk-cpp checkout for development.
# Override with -DDatadog_SOURCE_DIR=/path/to/dd-sdk-cpp if needed.
if(NOT DEFINED Datadog_SOURCE_DIR)
    # Resolve relative to this repo's sibling checkout
    get_filename_component(_DD_CPP_DEFAULT
        "${CMAKE_CURRENT_SOURCE_DIR}/../../../dd-sdk-cpp" ABSOLUTE)
    if(EXISTS "${_DD_CPP_DEFAULT}/CMakeLists.txt")
        set(Datadog_SOURCE_DIR "${_DD_CPP_DEFAULT}")
    endif()
endif()

include(FetchContent)
if(DEFINED Datadog_SOURCE_DIR)
    message(STATUS "Using local dd-sdk-cpp: ${Datadog_SOURCE_DIR}")
    FetchContent_Declare(Datadog SOURCE_DIR ${Datadog_SOURCE_DIR})
else()
    message(STATUS "Fetching dd-sdk-cpp from GitHub")
    FetchContent_Declare(Datadog
        GIT_REPOSITORY https://github.com/DataDog/dd-sdk-cpp.git
        GIT_TAG 0.7.0
    )
endif()
FetchContent_MakeAvailable(Datadog)

set(HEADERS
    kepler/turbo-modules/generated/DdSdkSpec.h
    kepler/turbo-modules/generated/DdRumSpec.h
    kepler/turbo-modules/DdSdk.h
    kepler/turbo-modules/DdRum.h
    kepler/turbo-modules/EnumParsers.h
    kepler/turbo-modules/AttributeConverter.h
    kepler/turbo-modules/DatadogGlobalState.h
    kepler/turbo-modules/HttpJsProxy.h
)

set(SOURCES
    kepler/turbo-modules/generated/DdSdkSpec.cpp
    kepler/turbo-modules/generated/DdRumSpec.cpp
    kepler/turbo-modules/DdSdk.cpp
    kepler/turbo-modules/DdRum.cpp
    kepler/turbo-modules/EnumParsers.cpp
    kepler/turbo-modules/AttributeConverter.cpp
    kepler/turbo-modules/DatadogGlobalState.cpp
    kepler/turbo-modules/HttpJsProxy.cpp
    kepler/turbo-modules/http_js_proxy_client.cpp
    kepler/AutoLinkInit.cpp
)

find_package(turbomoduleAPI CONFIG REQUIRED)

kepler_add_turbo_module_library(DatadogVega SHARED ${HEADERS} ${SOURCES})

target_link_libraries(DatadogVega PRIVATE Datadog::sdk)

# http_js_proxy_client.cpp provides dd-sdk-cpp's IHttpClient implementation (the SDK is
# built with DD_HTTP_CLIENT=none), so DatadogVega needs dd-sdk-cpp's internal headers
# (datadog/impl/core/http/client.hpp et al.) in addition to our own turbo-module headers.
target_include_directories(DatadogVega PRIVATE
    ${datadog_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/kepler/turbo-modules
)

if (CMAKE_SYSTEM_NAME STREQUAL Android)
    target_link_libraries(DatadogVega PRIVATE android log)
endif()

install(TARGETS DatadogVega)
