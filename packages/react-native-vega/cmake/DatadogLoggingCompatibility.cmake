# Unless explicitly stated otherwise all files in this repository are licensed
# under the Apache License Version 2.0.
#
# This product includes software developed at Datadog
# (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

# SDK 0.7.0 and 0.10.0 return non-null no-op handles on registration failure.
# Compile a private nullable copy so the bridge can distinguish failure without
# modifying the dependency checkout (including Datadog_SOURCE_DIR overrides).
function(datadog_vega_patch_logging_registration sdk_source_dir)
    get_directory_property(sdk_version DIRECTORY "${sdk_source_dir}" DEFINITION ddsdkcpp_VERSION)
    if(sdk_version STREQUAL "0.7.0")
        set(logging_target ddsdkcpp)
        set(relative_source "datadog/cpp/logging.cpp")
        set(original "${sdk_source_dir}/src/${relative_source}")
    elseif(sdk_version STREQUAL "0.10.0" AND TARGET ddsdkcpp_logging)
        set(logging_target ddsdkcpp_logging)
        set(relative_source "datadog/cpp/logging_cpp_api.cpp")
        set(original "${sdk_source_dir}/src/logging/${relative_source}")
    else()
        message(FATAL_ERROR "Unsupported dd-sdk-cpp logging layout/version: ${sdk_version}; review the compatibility patch")
    endif()
    file(READ "${original}" source)
    set(noop "return std::make_shared<Logging>(Logging::PrivateCtorTag{});")
    string(REGEX MATCHALL "return std::make_shared<Logging>[(]Logging::PrivateCtorTag[{][}][)]" matches "${source}")
    list(LENGTH matches match_count)
    if(NOT match_count EQUAL 2)
        message(FATAL_ERROR "Unexpected dd-sdk-cpp logging registration implementation; refusing to apply the Vega compatibility patch")
    endif()
    string(REPLACE "${noop}" "return nullptr;" patched "${source}")
    if(patched MATCHES "return std::make_shared<Logging>[(]Logging::PrivateCtorTag[{][}][)]")
        message(FATAL_ERROR "Cannot replace the dd-sdk-cpp no-op logging returns; refusing to use an unpatched SDK")
    endif()
    set(copy "${CMAKE_CURRENT_BINARY_DIR}/datadog-compat/logging.cpp")
    file(MAKE_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/datadog-compat")
    file(WRITE "${copy}" "${patched}")
    get_target_property(sources ${logging_target} SOURCES)
    list(FIND sources "${relative_source}" source_index)
    if(source_index EQUAL -1)
        message(FATAL_ERROR "Cannot locate the dd-sdk-cpp logging source to apply the Vega compatibility patch")
    endif()
    list(REMOVE_AT sources ${source_index})
    list(APPEND sources "${copy}")
    set_property(TARGET ${logging_target} PROPERTY SOURCES "${sources}")
endfunction()
