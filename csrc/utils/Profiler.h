#pragma once

#include <CL/sycl.hpp>
#include <c10/core/Device.h>

#include <utils/Macros.h>

namespace xpu {
namespace dpcpp {

bool is_profiler_enabled();

void dpcpp_mark(std::string name, sycl::event& event);

void dpcpp_mark(
    std::string name,
    sycl::event& start_event,
    sycl::event& end_event);

void dpcpp_log(std::string name, sycl::event& event);

void dpcpp_log(
    std::string name,
    sycl::event& start_event,
    sycl::event& end_event);

void reportMemoryUsage(
    void* ptr,
    int64_t alloc_size,
    at::DeviceIndex device_id);

} // namespace dpcpp
} // namespace xpu