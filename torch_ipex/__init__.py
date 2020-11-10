import os
import math
import sys

import torch
from torch.nn import Module
from torch.nn import Parameter
from torch.nn import init
from torch import device as _device
from ._utils import _get_device_index #, _dummy_type
from typing import List, Optional, Tuple, Union
from .lib import torch_ipex
from .version import __version__, __ipex_gitrev__
from .streams import Stream, Event


_device_t = Union[_device, str, int]


def version():
    print("ipex gpu version: {}".format(__version__))
    print("ipex gpu git sha: {}".format(__ipex_gitrev__))


# Customized operators:
# for now, we don't support bwk propagation
class LinearReLU(Module):
    __constants__ = ['in_features', 'out_features']

    def __init__(self, in_features, out_features, bias=True):
        super(LinearReLU, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.weight = Parameter(torch.Tensor(out_features, in_features))
        if bias:
            self.bias = Parameter(torch.Tensor(out_features))
        else:
            self.register_parameter('bias', None)
        self.reset_parameters()

    def reset_parameters(self):
        init.kaiming_uniform_(self.weight, a=math.sqrt(5))
        if self.bias is not None:
            fan_in, _ = init._calculate_fan_in_and_fan_out(self.weight)
            bound = 1 / math.sqrt(fan_in)
            init.uniform_(self.bias, -bound, bound)

    def forward(self, input):
        return torch_ipex.linear_relu(input, self.weight, self.bias)

    def extra_repr(self):
        return 'in_features={}, out_features={}, bias={}'.format(
            self.in_features, self.out_features, self.bias is not None
        )

class LinearSigmoid(Module):
    __constants__ = ['in_features', 'out_features']

    def __init__(self, in_features, out_features, bias=True):
        super(LinearSigmoid, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.weight = Parameter(torch.Tensor(out_features, in_features))
        if bias:
            self.bias = Parameter(torch.Tensor(out_features))
        else:
            self.register_parameter('bias', None)
        self.reset_parameters()

    def reset_parameters(self):
        init.kaiming_uniform_(self.weight, a=math.sqrt(5))
        if self.bias is not None:
            fan_in, _ = init._calculate_fan_in_and_fan_out(self.weight)
            bound = 1 / math.sqrt(fan_in)
            init.uniform_(self.bias, -bound, bound)

    def forward(self, input):
        return torch_ipex.linear_sigmoid(input, self.weight, self.bias)

    def extra_repr(self):
        return 'in_features={}, out_features={}, bias={}'.format(
            self.in_features, self.out_features, self.bias is not None
        )


def MulAdd(input, other, accumu, alpha=1.0):
    return torch_ipex.mul_add(input, other, accumu, alpha)


class ReLUDummy(Module):
    __constants__ = ['inplace']

    def __init__(self, inplace=False):
        super(ReLUDummy, self).__init__()
        self.inplace = inplace

    def forward(self, input):
        return input

    def extra_repr(self):
        inplace_str = 'inplace=True' if self.inplace else ''
        return inplace_str


def _lazy_init():
    pass


def is_available() -> bool:
    r"""Returns a bool indicating if XPU is currently available."""
    # if not hasattr(torch._C, '_cuda_getDeviceCount'):
    #     return False
    # This function never throws and returns 0 if driver is missing or can't
    # be initialized
    # return torch_ipex._C._cuda_getDeviceCount() > 0
    return True


def _find_dpcpp_home():
    pass


def _here_paths():
    here = os.path.abspath(__file__)
    torch_ipex_path = os.path.dirname(here)
    return torch_ipex_path


def include_paths():
    '''
    Get the include paths required to build a C++ extension.

    Returns:
        A list of include path strings.
    '''
    torch_ipex_path = _here_paths()
    lib_include = os.path.join(torch_ipex_path, 'include')
    paths = [
        lib_include,
        # os.path.join(lib_include, 'more')
    ]
    return paths


def library_paths():
    '''
    Get the library paths required to build a C++ extension.

    Returns:
        A list of library path strings.
    '''
    torch_ipex_path = _here_paths()
    lib_path = os.path.join(torch_ipex_path, 'lib')
    paths = [
        lib_path,
    ]
    return paths


def _usm_is_enabled():
    return torch_ipex._usm_is_enabled()

def _onedpl_is_enabled():
    return torch_ipex._onedpl_is_enabled()

def _onemkl_is_enabled():
    return torch_ipex._onemkl_is_enabled()

def _double_kernel_disabled():
    return torch_ipex._double_kernel_disabled()


def device_count() -> int:
    r"""Returns the number of XPUs device available."""
    if is_available():
        return torch_ipex._C._getDeviceCount()
    else:
        return 0


class device(object):
    r"""Context-manager that changes the selected device.

    Arguments:
        device (torch.device or int): device index to select. It's a no-op if
            this argument is a negative integer or ``None``.
    """

    def __init__(self, device):
        self.idx = _get_device_index(device, optional=True)
        self.prev_idx = -1

    def __enter__(self):
        if self.idx == -1:
            return
        self.prev_idx = torch_ipex._C._getDevice()
        if self.prev_idx != self.idx:
            torch_ipex._C._setDevice(self.idx)
        _lazy_init()

    def __exit__(self, *args):
        if self.prev_idx != self.idx:
            torch_ipex._C._setDevice(self.prev_idx)
        return False


class device_of(device):
    r"""Context-manager that changes the current device to that of given object.

    You can use both tensors and storages as arguments. If a given object is
    not allocated on a GPU, this is a no-op.

    Arguments:
        obj (Tensor or Storage): object allocated on the selected device.
    """
    pass
    # def __init__(self, obj):
    #     idx = obj.get_device() if obj.is_cuda else -1
    #     super(device_of, self).__init__(idx)


def set_device(device: _device_t) -> None:
    r"""Sets the current device.

    Usage of this function is discouraged in favor of :any:`device`. In most
    cases it's better to use ``CUDA_VISIBLE_DEVICES`` environmental variable.

    Arguments:
        device (torch.device or int): selected device. This function is a no-op
            if this argument is negative.
    """
    device = _get_device_index(device)
    if device >= 0:
        torch_ipex._C._setDevice(device)


def get_device_name(device: Optional[_device_t] = None) -> str:
    r"""Gets the name of a device.

    Arguments:
        device (torch.device or int, optional): device for which to return the
            name. This function is a no-op if this argument is a negative
            integer. It uses the current device, given by :func:`~torch.cuda.current_device`,
            if :attr:`device` is ``None`` (default).
    """
    return get_device_properties(device).name


def get_device_capability(device: Optional[_device_t] = None) -> Tuple[int, int]:
    r"""Gets the cuda capability of a device.

    Arguments:
        device (torch.device or int, optional): device for which to return the
            device capability. This function is a no-op if this argument is
            a negative integer. It uses the current device, given by
            :func:`~torch.cuda.current_device`, if :attr:`device` is ``None``
            (default).

    Returns:
        tuple(int, int): the major and minor cuda capability of the device
    """
    prop = get_device_properties(device)
    return prop.major, prop.minor


def get_device_properties(device: _device_t):# -> _CudaDeviceProperties:
    # _lazy_init()  # will define _get_device_properties
    # device = _get_device_index(device, optional=True)
    # if device < 0 or device >= device_count():
    #     raise AssertionError("Invalid device id")
    # return _get_device_properties(device)
    pass


def current_device() -> int:
    r"""Returns the index of a currently selected device."""
    _lazy_init()
    return torch_ipex._C._getDevice()


def synchronize(device: _device_t = None) -> None:
    r"""Waits for all kernels in all streams on a XPU device to complete.

    Arguments:
        device (torch.device or int, optional): device for which to synchronize.
            It uses the current device, given by :func:`~torch.xpu.current_device`,
            if :attr:`device` is ``None`` (default).
    """
    pass


def current_stream(device: Optional[_device_t] = None) -> Stream:
    r"""Returns the currently selected :class:`Stream` for a given device.

    Arguments:
        device (torch.device or int, optional): selected device. Returns
            the currently selected :class:`Stream` for the current device, given
            by :func:`~torch.xpu.current_device`, if :attr:`device` is ``None``
            (default).
    """
    # return Stream(_cdata=torch._C._cuda_getCurrentStream(
    #     _get_device_index(device, optional=True)))
    pass


def default_stream(device: Optional[_device_t] = None) -> Stream:
    r"""Returns the default :class:`Stream` for a given device.

    Arguments:
        device (torch.device or int, optional): selected device. Returns
            the default :class:`Stream` for the current device, given by
            :func:`~torch.xpu.current_device`, if :attr:`device` is ``None``
            (default).
    """
    # _lazy_init()
    # return Stream(_cdata=torch._C._cuda_getDefaultStream(
    #     _get_device_index(device, optional=True)))
    pass


current_module = sys.modules[__name__]
torch.add_runtime('xpu', current_module)
