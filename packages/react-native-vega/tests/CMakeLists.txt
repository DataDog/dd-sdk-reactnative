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
