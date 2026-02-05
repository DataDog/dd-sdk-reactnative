cmake_minimum_required(VERSION 3.13)
project("crashtest")

add_library(crashtest SHARED crashtest.cpp)

find_library(log-lib log)
target_link_libraries(crashtest ${log-lib})
