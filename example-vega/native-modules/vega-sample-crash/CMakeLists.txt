cmake_minimum_required(VERSION 3.15)

project(VegaSampleCrash
    VERSION 1.0
    LANGUAGES CXX C)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

set(HEADERS
    kepler/turbo-modules/generated/VegaSampleCrashSpec.h
    kepler/turbo-modules/VegaSampleCrash.h
)

set(SOURCES
    kepler/turbo-modules/generated/VegaSampleCrashSpec.cpp
    kepler/turbo-modules/VegaSampleCrash.cpp
    kepler/AutoLinkInit.cpp
)

find_package(turbomoduleAPI CONFIG REQUIRED)

kepler_add_turbo_module_library(VegaSampleCrash SHARED ${HEADERS} ${SOURCES})

target_include_directories(VegaSampleCrash PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/kepler/turbo-modules
)

install(TARGETS VegaSampleCrash)
