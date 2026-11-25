# Unless explicitly stated otherwise all files in this repository are licensed
# under the Apache License Version 2.0.
#
# This product includes software developed at Datadog
# (https://www.datadoghq.com/). Copyright 2016-Present Datadog, Inc.

# SDK 0.7.0 returns non-null no-op logging handles on registration failure.
# Compile a private nullable copy so the bridge can distinguish failure without
# modifying the dependency checkout (including Datadog_SOURCE_DIR overrides).
function(datadog_vega_patch_logging_registration sdk_source_dir)
    get_directory_property(sdk_version DIRECTORY "${sdk_source_dir}" DEFINITION ddsdkcpp_VERSION)
    if(NOT sdk_version STREQUAL "0.7.0")
        message(FATAL_ERROR "Vega logging compatibility requires dd-sdk-cpp 0.7.0; review this patch when changing SDK versions")
    endif()
    set(original "${sdk_source_dir}/src/datadog/cpp/logging.cpp")
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
    get_target_property(sources ddsdkcpp SOURCES)
    list(FIND sources "datadog/cpp/logging.cpp" source_index)
    if(source_index EQUAL -1)
        message(FATAL_ERROR "Cannot locate the dd-sdk-cpp logging source to apply the Vega compatibility patch")
    endif()
    list(REMOVE_AT sources ${source_index})
    list(APPEND sources "${copy}")
    set_property(TARGET ddsdkcpp PROPERTY SOURCES "${sources}")
endfunction()
