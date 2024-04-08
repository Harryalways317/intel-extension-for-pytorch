import torch
import sys
from typing import Tuple
from intel_extension_for_pytorch.transformers.models.xpu.fusions.activation_fusion import (  # noqa F401
    silu_mul_xpu,
    gelu_mul_xpu,
    add_rms_norm_xpu,
    add_layer_norm_xpu,
)
from intel_extension_for_pytorch.llm.modules import (
    RotaryEmbedding,
    RMSNorm,
    FastLayerNorm,
    VarlenAttention,
)


def rotary_embedding(
    query: torch.Tensor,
    key: torch.Tensor,
    sin: torch.Tensor,
    cos: torch.Tensor,
    rotary_dim: int,
    rotary_half: bool,
    position_ids: torch.Tensor = None,
):
    r"""
    Applies RotaryEmbedding (see https://huggingface.co/papers/2104.09864)
                              on the `query ` or `key` before their multi-head attention computation.
    Args:
    - query, key (torch.Tensor) : inputs to be applied with position embeddings, taking shape of
                                  [batch size, sequence length, num_head/num_kv_head, head_dim]
                                  or [num_tokens, num_head/num_kv_head, head_dim] (as well as the output shape).
    - sin/cos (torch.Tensor): [num_tokens, rotary_dim] the sin/cos value tensor generated to be applied on query/key.
    - rotary_ndims (int): the rotary dimension. e.g., 64 for GPTJ. head size for LLama.
    - head_dim (int) : head dim from the input shape.
    - rotary_half (bool) : if False. e.g., GPT-J 6B/ChatGLM, cos/sin is applied to the neighboring 2 elements,
                           so the offset is 1.
                           if True, e.g., for llama, cos/sin is applied to the neighboring rotary_dim elements,
                           so the offset is rotary_dim/2.
    - position_ids (torch.Tensor): Default is None and optional if sin/cos is provided. the according position_ids
                                   for the input. The shape should be [batch size, sequence length].
    Return
    - query, key (torch.Tensor): [batch size, sequence length, num_head/num_kv_head, head_dim]
                                 or [num_tokens, num_head/num_kv_head, head_dim].
    """
    return RotaryEmbedding.apply_function(
        query, key, sin, cos, rotary_dim, rotary_half, position_ids
    )


def rms_norm(hidden_states: torch.Tensor, weight: torch.Tensor, eps: float):
    r"""
    Applies RMSnorm on the input (hidden states).
    (see https://github.com/huggingface/transformers/blob/main/src/transformers/models/llama/modeling_llama.py#L76)
    Args:
    - hidden_states(torch.Tensor) : the input tensor to apply RMSNorm.
    - weight (torch.Tensor): the weight to apply RMSnorm.
    - eps (float) : the variance_epsilon to apply RMSnorm.
    """
    return RMSNorm.apply_function(hidden_states, weight, eps)


def fast_layer_norm(
    hidden_states: torch.Tensor,
    normalized_shape: Tuple[int, ...],
    weight: torch.Tensor,
    bias: torch.Tensor,
    eps: float,
):
    r"""
    Applies PyTorch Layernorm (see https://pytorch.org/docs/stable/generated/torch.nn.LayerNorm.html)
    on the input (hidden states).
    Args:
    - hidden_states(torch.Tensor) : the input tensor to apply normalization.
    - normalized_shape (int or list) or torch.Size) input shape from an expected input of size.
    - weight (torch.Tensor): the weight to apply normalization.
    - bias (torch.Tensor): an additive bias for normalization.
    - eps (float): a value added to the denominator for numerical stability.
    """

    return FastLayerNorm.apply_function(
        hidden_states, normalized_shape, weight, bias, eps
    )


def varlen_attention(
    query: torch.Tensor,
    key: torch.Tensor,
    value: torch.Tensor,
    out: torch.Tensor,
    seqlen_q: torch.Tensor,
    seqlen_k: torch.Tensor,
    max_seqlen_q: int,
    max_seqlen_k: int,
    pdropout: float,
    softmax_scale: float,
    zero_tensors: bool,
    is_causal: bool,
    return_softmax: bool,
    gen_: torch.Generator,
):
    r"""
    Applies PyTorch scaled_dot_product_attention on the inputs of query, key and value
                              (see https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html),
                              and accept the variant (different) sequence length among the query, key and value.
    Args:
        module init: this module does not have args for module init
        forward:
        - query (torch.Tensor): shape [query_tokens, num_head, head_size], where tokens is total sequence length among batch size.
        - key (torch.Tensor):  shape [key_tokens, num_head, head_size], where tokens is total sequence length among batch size.
        - value (torch.Tensor): shape [value_tokens, num_head, head_size], where tokens is total sequence length among batch size.
        - out (torch.Tensor): buffer to get the results, the shape is the same as query.
        - seqlen_q (torch.Tensor): shape [batch_size + 1], points the current query_tokens among total sequence length.
        - seqlen_k (torch.Tensor): shape [batch_size + 1], points the current key_tokens among total sequence length.
        - max_seqlen_q (int): max/total sequence length of query.
        - max_seqlen_k (int): max/total sequence length of key.
        - pdropout (float): dropout probability; if greater than 0.0, dropout is applied, default is 0.0.
        - softmax_scale (float): scaling factor applied is prior to softmax.
        - is_causal (bool): whether to apply causal attention masking, default is True.
    """
    return VarlenAttention.apply_function(
        query,
        key,
        value,
        out,
        seqlen_q,
        seqlen_k,
        max_seqlen_q,
        max_seqlen_k,
        pdropout,
        softmax_scale,
        zero_tensors,
        is_causal,
        return_softmax,
        gen_,
    )


def _get_function_from_device(device_type: str, f):
    assert device_type in [
        "cpu",
        "xpu",
    ], "The device is not in the supported device list."
    target_f_name = f.__name__ + "_" + device_type
    assert hasattr(
        sys.modules[__name__], target_f_name
    ), f"Target function {f.__name__} on {device_type} haven't implemented yet."
    target_f = getattr(sys.modules[__name__], target_f_name)
    return target_f


def silu_mul(x: torch.Tensor, y: torch.Tensor, out: torch.Tensor = None):
    f = _get_function_from_device(x.device.type, silu_mul)
    return f(x, y, out)


def gelu_mul(
    x: torch.Tensor, y: torch.Tensor, out: torch.Tensor = None, approximate="none"
):
    f = _get_function_from_device(x.device.type, gelu_mul)
    return f(x, y, out, approximate)


def add_rms_norm(
    add: torch.Tensor,
    x: torch.Tensor,
    weight: torch.Tensor,
    bias: torch.Tensor,
    eps: float,
    add_back: bool,
):
    f = _get_function_from_device(x.device.type, add_rms_norm)
    return f(add, x, weight, bias, eps, add_back)


def add_layer_norm(
    add: torch.Tensor,
    x: torch.Tensor,
    weight: torch.Tensor,
    bias: torch.Tensor,
    eps: float,
    add_back: bool,
):
    f = _get_function_from_device(x.device.type, add_layer_norm)
    return f(add, x, weight, bias, eps, add_back)
